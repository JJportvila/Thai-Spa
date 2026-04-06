import { getCachedSharedState, loadSharedState, saveSharedState } from './sharedStateStore';

const INVENTORY_OPS_KEY = 'inventory_ops_log';

export type InventoryOpType =
  | 'SALE'
  | 'RETURN'
  | 'CREATE_PRODUCT'
  | 'UPDATE_PRODUCT'
  | 'DELETE_PRODUCT'
  | 'STOCK_ADJUST';

export interface InventoryOpRecord {
  id: string;
  at: string;
  accountId: string;
  type: InventoryOpType;
  productId: string;
  productTitle: string;
  delta: number;
  stockAfter?: number;
  operator?: string;
  source: 'POS' | 'INVENTORY';
  note?: string;
  refNo?: string;
}

const ensureArray = (value: unknown): InventoryOpRecord[] => {
  if (!Array.isArray(value)) return [];
  return value as InventoryOpRecord[];
};

export const getInventoryOpsLog = async (accountId: string): Promise<InventoryOpRecord[]> => {
  if (!accountId) return [];
  const local = ensureArray(getCachedSharedState(accountId, INVENTORY_OPS_KEY, []));
  const remote = await loadSharedState(accountId, INVENTORY_OPS_KEY, local);
  return ensureArray(remote);
};

export const appendInventoryOpsLog = async (
  accountId: string,
  records: InventoryOpRecord[]
): Promise<InventoryOpRecord[]> => {
  if (!accountId || records.length === 0) return [];
  const current = await getInventoryOpsLog(accountId);
  const next = [...records, ...current].slice(0, 1000);
  await saveSharedState(accountId, INVENTORY_OPS_KEY, next);
  return next;
};
