import { createClient } from '@supabase/supabase-js';

const supabaseUrl = (import.meta as any).env.VITE_SUPABASE_URL || '';
const supabaseKey = (import.meta as any).env.VITE_SUPABASE_ANON_KEY || '';

export const isSupabaseConfigured =
  !!supabaseUrl &&
  !!supabaseKey &&
  !supabaseUrl.includes('your-project.supabase.co') &&
  !supabaseKey.includes('your-anon-key');

export const supabase = createClient(supabaseUrl || 'https://invalid.local', supabaseKey || 'invalid-key');

export const ensureSupabaseUserId = async (): Promise<string | null> => {
  if (!isSupabaseConfigured) return null;
  try {
    const current = await supabase.auth.getUser();
    if (current.data.user?.id) return current.data.user.id;

    const signed = await supabase.auth.signInAnonymously();
    if (signed.error) return null;
    return signed.data.user?.id || null;
  } catch {
    return null;
  }
};
