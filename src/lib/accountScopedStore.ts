import { StretProduct } from './productLogic';
import { ensureSupabaseUserId, isSupabaseConfigured, supabase } from './supabaseClient';

const INVENTORY_PREFIX = 'stretpos.inventory.retail.';
const SETTINGS_PREFIX = 'stretpos.settings.account.';

export interface AccountProgramSettings {
  language?: string;
  retailPosSearch?: string;
  retailPosCategory?: string;
  retailPosPayment?: 'CASH' | 'CARD' | 'STRET_PAY' | 'CHECK';
}

const getInventoryKey = (accountId: string) => `${INVENTORY_PREFIX}${accountId}`;
const getSettingsKey = (accountId: string) => `${SETTINGS_PREFIX}${accountId}`;
const toScopedAccountId = (accountId: string, userId: string) => `${accountId}|${userId}`;

const getLocalInventoryMap = (accountId: string): Record<string, number> => {
  if (!accountId) return {};
  try {
    const raw = localStorage.getItem(getInventoryKey(accountId));
    if (!raw) return {};
    const parsed = JSON.parse(raw) as Record<string, number>;
    return parsed && typeof parsed === 'object' ? parsed : {};
  } catch {
    return {};
  }
};

const setLocalInventoryMap = (accountId: string, value: Record<string, number>) => {
  if (!accountId) return;
  try {
    localStorage.setItem(getInventoryKey(accountId), JSON.stringify(value));
  } catch {}
};

const getLocalSettings = (accountId: string): AccountProgramSettings => {
  if (!accountId) return {};
  try {
    const raw = localStorage.getItem(getSettingsKey(accountId));
    if (!raw) return {};
    const parsed = JSON.parse(raw) as AccountProgramSettings;
    return parsed && typeof parsed === 'object' ? parsed : {};
  } catch {
    return {};
  }
};

const setLocalSettings = (accountId: string, patch: AccountProgramSettings) => {
  if (!accountId) return;
  try {
    const current = getLocalSettings(accountId);
    localStorage.setItem(getSettingsKey(accountId), JSON.stringify({ ...current, ...patch }));
  } catch {}
};

export const ensureRetailInventorySeed = async (accountId: string, products: StretProduct[]) => {
  if (!accountId) return;

  const local = getLocalInventoryMap(accountId);
  if (!Object.keys(local).length) {
    const seeded = Object.fromEntries(products.map((p) => [p.id, p.stock]));
    setLocalInventoryMap(accountId, seeded);
  }

  if (!isSupabaseConfigured) return;
  try {
    const userId = await ensureSupabaseUserId();
    if (!userId) return;
    const scopedAccountId = toScopedAccountId(accountId, userId);
    const { data, error } = await supabase
      .from('retail_inventory')
      .select('product_id')
      .eq('account_id', scopedAccountId)
      .limit(1);
    if (error) return;
    if (data && data.length > 0) return;

    const rows = products.map((p) => ({
      account_id: scopedAccountId,
      product_id: p.id,
      quantity: p.stock,
    }));
    await supabase.from('retail_inventory').upsert(rows, { onConflict: 'account_id,product_id' });
  } catch {}
};

export const getRetailInventoryMap = async (accountId: string): Promise<Record<string, number>> => {
  if (!accountId) return {};
  const local = getLocalInventoryMap(accountId);

  if (!isSupabaseConfigured) return local;
  try {
    const userId = await ensureSupabaseUserId();
    if (!userId) return local;
    const scopedAccountId = toScopedAccountId(accountId, userId);
    const { data, error } = await supabase
      .from('retail_inventory')
      .select('product_id,quantity')
      .eq('account_id', scopedAccountId);
    if (error || !data || data.length === 0) return local;
    const map = Object.fromEntries(data.map((row: any) => [row.product_id, Number(row.quantity) || 0]));
    setLocalInventoryMap(accountId, map);
    return map;
  } catch {
    return local;
  }
};

export const setRetailInventoryMap = async (accountId: string, value: Record<string, number>) => {
  if (!accountId) return;
  setLocalInventoryMap(accountId, value);

  if (!isSupabaseConfigured) return;
  try {
    const userId = await ensureSupabaseUserId();
    if (!userId) return;
    const scopedAccountId = toScopedAccountId(accountId, userId);
    const rows = Object.entries(value).map(([productId, quantity]) => ({
      account_id: scopedAccountId,
      product_id: productId,
      quantity,
    }));
    await supabase.from('retail_inventory').upsert(rows, { onConflict: 'account_id,product_id' });
  } catch {}
};

export const getAccountProgramSettings = async (accountId: string): Promise<AccountProgramSettings> => {
  if (!accountId) return {};
  const local = getLocalSettings(accountId);
  if (!isSupabaseConfigured) return local;

  try {
    const userId = await ensureSupabaseUserId();
    if (!userId) return local;
    const scopedAccountId = toScopedAccountId(accountId, userId);
    const { data, error } = await supabase
      .from('account_program_settings')
      .select('language,retail_pos_search,retail_pos_category,retail_pos_payment')
      .eq('account_id', scopedAccountId)
      .maybeSingle();
    if (error || !data) return local;
    const mapped: AccountProgramSettings = {
      language: data.language || undefined,
      retailPosSearch: data.retail_pos_search || undefined,
      retailPosCategory: data.retail_pos_category || undefined,
      retailPosPayment: data.retail_pos_payment || undefined,
    };
    setLocalSettings(accountId, mapped);
    return { ...local, ...mapped };
  } catch {
    return local;
  }
};

export const patchAccountProgramSettings = async (accountId: string, patch: AccountProgramSettings) => {
  if (!accountId) return;
  setLocalSettings(accountId, patch);

  if (!isSupabaseConfigured) return;
  try {
    const userId = await ensureSupabaseUserId();
    if (!userId) return;
    const scopedAccountId = toScopedAccountId(accountId, userId);
    await supabase.from('account_program_settings').upsert(
      {
        account_id: scopedAccountId,
        language: patch.language,
        retail_pos_search: patch.retailPosSearch,
        retail_pos_category: patch.retailPosCategory,
        retail_pos_payment: patch.retailPosPayment,
      },
      { onConflict: 'account_id' }
    );
  } catch {}
};
