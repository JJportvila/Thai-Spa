import { StretProduct } from './productLogic';
import { getCachedSharedState, loadSharedState, saveSharedState } from './sharedStateStore';

const INVENTORY_STATE_KEY = 'retail_inventory';
const BATCH_INVENTORY_STATE_KEY = 'retail_batch_inventory';
const SETTINGS_STATE_KEY = 'account_program_settings';

export interface RetailBatchRecord {
  batchId: string;
  productId: string;
  title: string;
  barcode: string;
  batchNo: string;
  expiryDate?: string;
  remainingQuantity: number;
  receivedAt: string;
  sourceReceiptNo?: string;
  qualityFlags?: string[];
}

export interface AccountProgramSettings {
  language?: string;
  retailPosSearch?: string;
  retailPosCategory?: string;
  retailPosPayment?: 'CASH' | 'CARD' | 'STRET_PAY' | 'CHECK';
  retailReceiptPaper?: '58MM' | '80MM';
  retailCapturePreviewEnabled?: boolean;
  retailCapturePreviewAutoClose?: boolean;
  retailNearExpiryAutoDiscountEnabled?: boolean;
  retailNearExpiryDiscountDays?: number;
  retailNearExpiryDiscountPercent?: number;
  retailNearExpiryBlockEnabled?: boolean;
  retailNearExpiryBlockDays?: number;
  retailRealtimeReportEnabled?: boolean;
  retailBundleSaleEnabled?: boolean;
  retailPriceTier?: 'A' | 'B' | 'C';
  retailOfflineModeEnabled?: boolean;
  retailLabelPrintEnabled?: boolean;
  retailLabelDefaultTemplate?: 'PRICE' | 'SHELF' | 'BARCODE';
  retailLabelDefaultSize?: '40x30' | '50x30' | '60x40' | '70x50';
  retailLabelDefaultOrientation?: 'portrait' | 'landscape';
  retailLabelDefaultMargin?: 'narrow' | 'normal' | 'wide';
  retailLabelPresets?: Array<{
    id: string;
    name: string;
    template: 'PRICE' | 'SHELF' | 'BARCODE';
    size: '40x30' | '50x30' | '60x40' | '70x50';
    orientation: 'portrait' | 'landscape';
    margin: 'narrow' | 'normal' | 'wide';
  }>;
  retailLabelActivePresetId?: string;
  taxQrEnabled?: boolean;
  taxQrTemplate?: string;
  taxMerchantTin?: string;
  taxBranchCode?: string;
  bossOrderNotifyEnabled?: boolean;
  bossOrderNotifySoundEnabled?: boolean;
  commonShippingCompanies?: Array<{
    id: string;
    name: string;
    enabled: boolean;
    isDefault?: boolean;
    sortOrder?: number;
  }>;
}

const getLocalInventoryMap = (accountId: string): Record<string, number> => {
  return getCachedSharedState(accountId, INVENTORY_STATE_KEY, {});
};

const setLocalInventoryMap = (accountId: string, value: Record<string, number>) => {
  void saveSharedState(accountId, INVENTORY_STATE_KEY, value);
};

const getLocalSettings = (accountId: string): AccountProgramSettings => {
  return getCachedSharedState(accountId, SETTINGS_STATE_KEY, {});
};

const setLocalSettings = (accountId: string, patch: AccountProgramSettings) => {
  if (!accountId) return;
  const current = getLocalSettings(accountId);
  void saveSharedState(accountId, SETTINGS_STATE_KEY, { ...current, ...patch });
};

export const ensureRetailInventorySeed = async (accountId: string, products: StretProduct[]) => {
  if (!accountId) return;

  const local = getLocalInventoryMap(accountId);
  if (!Object.keys(local).length) {
    const seeded = Object.fromEntries(products.map((p) => [p.id, p.stock]));
    await saveSharedState(accountId, INVENTORY_STATE_KEY, seeded);
  }
};

export const getRetailInventoryMap = async (accountId: string): Promise<Record<string, number>> => {
  if (!accountId) return {};
  return loadSharedState(accountId, INVENTORY_STATE_KEY, getLocalInventoryMap(accountId));
};

export const setRetailInventoryMap = async (accountId: string, value: Record<string, number>) => {
  if (!accountId) return;
  await saveSharedState(accountId, INVENTORY_STATE_KEY, value);
};

export const getRetailBatchInventory = async (accountId: string): Promise<RetailBatchRecord[]> => {
  if (!accountId) return [];
  return loadSharedState(accountId, BATCH_INVENTORY_STATE_KEY, getCachedSharedState(accountId, BATCH_INVENTORY_STATE_KEY, []));
};

export const setRetailBatchInventory = async (accountId: string, value: RetailBatchRecord[]) => {
  if (!accountId) return;
  await saveSharedState(accountId, BATCH_INVENTORY_STATE_KEY, value);
};

export const appendRetailBatchInventory = async (
  accountId: string,
  records: RetailBatchRecord[]
) => {
  if (!accountId || records.length === 0) return;
  const current = await getRetailBatchInventory(accountId);
  await setRetailBatchInventory(accountId, [...records, ...current]);
};

export const consumeRetailBatchInventory = async (
  accountId: string,
  items: Array<{ productId: string; quantity: number }>
) => {
  if (!accountId || items.length === 0) return [] as Array<{ productId: string; batchNo: string; quantity: number }>;
  const current = await getRetailBatchInventory(accountId);
  const sorted = [...current].sort((a, b) => {
    const aTime = a.expiryDate ? new Date(a.expiryDate).getTime() : Number.MAX_SAFE_INTEGER;
    const bTime = b.expiryDate ? new Date(b.expiryDate).getTime() : Number.MAX_SAFE_INTEGER;
    return aTime - bTime;
  });
  const usage: Array<{ productId: string; batchNo: string; quantity: number }> = [];

  for (const item of items) {
    let need = Math.max(0, item.quantity);
    for (const batch of sorted) {
      if (batch.productId !== item.productId || batch.remainingQuantity <= 0 || need <= 0) continue;
      const used = Math.min(batch.remainingQuantity, need);
      batch.remainingQuantity -= used;
      need -= used;
      usage.push({ productId: item.productId, batchNo: batch.batchNo, quantity: used });
    }
  }

  await setRetailBatchInventory(
    accountId,
    sorted.filter((batch) => batch.remainingQuantity > 0)
  );
  return usage;
};

export const getAccountProgramSettings = async (accountId: string): Promise<AccountProgramSettings> => {
  if (!accountId) return {};
  return loadSharedState(accountId, SETTINGS_STATE_KEY, getLocalSettings(accountId));
};

export const patchAccountProgramSettings = async (accountId: string, patch: AccountProgramSettings) => {
  if (!accountId) return;
  const current = getLocalSettings(accountId);
  await saveSharedState(accountId, SETTINGS_STATE_KEY, { ...current, ...patch });
};
