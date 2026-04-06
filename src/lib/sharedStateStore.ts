import { isSupabaseConfigured, supabase } from './supabaseClient';

const SHARED_PREFIX = 'stretpos.shared.';
const TABLE_NAME = 'app_shared_state';
const SYNC_STATUS_KEY = `${SHARED_PREFIX}sync-status`;
const DIRTY_PREFIX = `${SHARED_PREFIX}dirty.`;

const getCacheKey = (accountId: string, stateKey: string) => `${SHARED_PREFIX}${accountId}.${stateKey}`;
const getDirtyKey = (accountId: string, stateKey: string) => `${DIRTY_PREFIX}${accountId}.${stateKey}`;

const isMeaningfulValue = (value: unknown) => {
  if (value == null) return false;
  if (Array.isArray(value)) return value.length > 0;
  if (typeof value === 'object') return Object.keys(value as Record<string, unknown>).length > 0;
  if (typeof value === 'string') return value.trim().length > 0;
  return true;
};

const setSyncStatus = (payload: { ok: boolean; accountId: string; stateKey: string; message: string; at: string }) => {
  try {
    localStorage.setItem(SYNC_STATUS_KEY, JSON.stringify(payload));
  } catch {}
};

const markDirtyState = (accountId: string, stateKey: string, dirty: boolean) => {
  try {
    const key = getDirtyKey(accountId, stateKey);
    if (dirty) {
      localStorage.setItem(key, new Date().toISOString());
    } else {
      localStorage.removeItem(key);
    }
  } catch {}
};

const upsertRemoteState = async <T>(accountId: string, stateKey: string, value: T) => {
  const { error } = await supabase.from(TABLE_NAME).upsert(
    {
      account_id: accountId,
      state_key: stateKey,
      payload: value,
      updated_at: new Date().toISOString(),
    },
    { onConflict: 'account_id,state_key' }
  );
  if (error) {
    setSyncStatus({
      ok: false,
      accountId,
      stateKey,
      message: error.message,
      at: new Date().toISOString(),
    });
    console.warn(`[sharedStateStore] sync failed for ${accountId}/${stateKey}: ${error.message}`);
    throw error;
  }
  markDirtyState(accountId, stateKey, false);
  setSyncStatus({
    ok: true,
    accountId,
    stateKey,
    message: 'ok',
    at: new Date().toISOString(),
  });
};

export const getSharedSyncStatus = () => {
  try {
    const raw = localStorage.getItem(SYNC_STATUS_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
};

export const getDirtySharedStateSummary = (accountId?: string) => {
  const entries = getDirtyStateKeys(accountId);
  return {
    count: entries.length,
    entries,
  };
};

export const getCachedSharedState = <T>(accountId: string, stateKey: string, fallback: T): T => {
  if (!accountId) return fallback;
  try {
    const raw = localStorage.getItem(getCacheKey(accountId, stateKey));
    if (!raw) return fallback;
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
};

export const setCachedSharedState = <T>(accountId: string, stateKey: string, value: T) => {
  if (!accountId) return;
  try {
    localStorage.setItem(getCacheKey(accountId, stateKey), JSON.stringify(value));
  } catch {}
};

const getDirtyStateKeys = (accountId?: string) => {
  try {
    return Object.keys(localStorage)
      .filter((key) => key.startsWith(DIRTY_PREFIX))
      .map((key) => key.slice(DIRTY_PREFIX.length))
      .filter((key) => {
        if (!accountId) return true;
        return key.startsWith(`${accountId}.`);
      })
      .map((key) => {
        const [id, ...rest] = key.split('.');
        return { accountId: id, stateKey: rest.join('.') };
      })
      .filter((item) => item.accountId && item.stateKey);
  } catch {
    return [];
  }
};

export const syncDirtySharedState = async (accountId?: string) => {
  if (!isSupabaseConfigured) return;
  const dirtyEntries = getDirtyStateKeys(accountId);
  await Promise.all(
    dirtyEntries.map(async ({ accountId: dirtyAccountId, stateKey }) => {
      const cached = getCachedSharedState(dirtyAccountId, stateKey, null);
      if (!isMeaningfulValue(cached)) {
        markDirtyState(dirtyAccountId, stateKey, false);
        return;
      }
      try {
        await upsertRemoteState(dirtyAccountId, stateKey, cached);
      } catch {}
    })
  );
};

export const loadSharedState = async <T>(accountId: string, stateKey: string, fallback: T): Promise<T> => {
  const cached = getCachedSharedState(accountId, stateKey, fallback);
  if (!accountId || !isSupabaseConfigured) {
    return cached;
  }
  try {
    const { data, error } = await supabase
      .from(TABLE_NAME)
      .select('payload')
      .eq('account_id', accountId)
      .eq('state_key', stateKey)
      .maybeSingle();
    if (error) {
      if (isMeaningfulValue(cached)) {
        markDirtyState(accountId, stateKey, true);
        try {
          await upsertRemoteState(accountId, stateKey, cached);
        } catch {}
      }
      setSyncStatus({
        ok: false,
        accountId,
        stateKey,
        message: error.message,
        at: new Date().toISOString(),
      });
      console.warn(`[sharedStateStore] load failed for ${accountId}/${stateKey}: ${error.message}`);
      return cached;
    }
    if (!data?.payload) {
      if (isMeaningfulValue(cached)) {
        try {
          await upsertRemoteState(accountId, stateKey, cached);
        } catch {}
      }
      return cached;
    }
    const payload = data.payload as T;
    setCachedSharedState(accountId, stateKey, payload);
    return payload;
  } catch {
    return cached;
  }
};

export const saveSharedState = async <T>(accountId: string, stateKey: string, value: T) => {
  if (!accountId) return;
  setCachedSharedState(accountId, stateKey, value);
  if (!isSupabaseConfigured) return;
  try {
    await upsertRemoteState(accountId, stateKey, value);
  } catch {
    markDirtyState(accountId, stateKey, true);
  }
};
