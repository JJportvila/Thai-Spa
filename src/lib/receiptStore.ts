import { getCachedSharedState, loadSharedState, saveSharedState } from './sharedStateStore';

export type ReceiptRecordStatus = 'NORMAL' | 'REFUNDED' | 'VOID';

export interface ReceiptRecord {
  receiptNo: string;
  printedAt: string;
  paymentMethod: 'CASH' | 'CARD' | 'STRET_PAY' | 'CHECK';
  total: number;
  itemCount: number;
  items?: Array<{
    id: string;
    title: string;
    quantity: number;
    barcode?: string;
    batchNos?: string[];
    nearExpiryAutoDiscounted?: boolean;
  }>;
  kind: 'SALE' | 'REFUND';
  status: ReceiptRecordStatus;
  nvrPhotoDataUrl?: string;
  nvrCaptureStatus?: 'PENDING' | 'SUCCESS' | 'FAILED';
  nvrCaptureMessage?: string;
  nvrCaptureSource?: 'NVR' | 'BUILTIN' | 'USB';
  nvrCaptureAt?: string;
}

export interface NvrCaptureSettings {
  enabled: boolean;
  snapshotUrl: string;
  source?: 'NVR' | 'BUILTIN' | 'USB';
  usbDeviceId?: string;
  protocol?: 'HTTP' | 'RTSP_PROXY';
  username?: string;
  password?: string;
  vendor?: 'GENERIC' | 'HIKVISION' | 'DAHUA' | 'ONVIF' | 'EZVIZ' | 'XMEYE';
  deviceIp?: string;
  httpPort?: string;
  rtspPort?: string;
  channelNo?: string;
  streamType?: 'MAIN' | 'SUB';
  rtspUrl?: string;
  rtspProxyBaseUrl?: string;
}

export interface RefundSnapshotRecord {
  result: {
    paidAmount: number;
    changeAmount: number;
    receiptNo: string;
    printedAt: string;
  };
  items: Array<{
    id: string;
    title: string;
    barcode?: string;
    quantity: number;
    isReturn?: boolean;
    stock?: number;
    price?: number;
    category?: string;
    unit?: string;
    itemDiscountType?: 'PERCENT' | 'AMOUNT';
    itemDiscountValue?: number;
  }>;
  totals: {
    subtotal: number;
    discountAmount: number;
    vat: number;
    total: number;
  };
  paymentMethod: 'CASH' | 'CARD' | 'STRET_PAY' | 'CHECK';
}

const RECEIPTS_STATE_KEY = 'receipt_records';
const NVR_SETTINGS_STATE_KEY = 'nvr_capture_settings';
const REFUND_SNAPSHOTS_STATE_KEY = 'refund_snapshots';

export const getReceiptRecords = (accountId?: string): ReceiptRecord[] => {
  if (!accountId) return [];
  return getCachedSharedState(accountId, RECEIPTS_STATE_KEY, []);
};

export const syncReceiptRecords = async (accountId?: string): Promise<ReceiptRecord[]> => {
  if (!accountId) return [];
  return loadSharedState(accountId, RECEIPTS_STATE_KEY, getReceiptRecords(accountId));
};

const saveReceiptRecords = async (accountId: string | undefined, records: ReceiptRecord[]) => {
  if (!accountId) return;
  await saveSharedState(accountId, RECEIPTS_STATE_KEY, records);
};

export const appendReceiptRecord = async (accountId: string | undefined, record: ReceiptRecord) => {
  if (!accountId) return;
  const prev = getReceiptRecords(accountId);
  const next = [record, ...prev.filter((r) => r.receiptNo !== record.receiptNo)].slice(0, 500);
  await saveReceiptRecords(accountId, next);
};

export const patchReceiptRecord = async (
  accountId: string | undefined,
  receiptNo: string,
  patch: Partial<ReceiptRecord>
) => {
  if (!accountId) return false;
  const prev = getReceiptRecords(accountId);
  const exists = prev.some((item) => item.receiptNo === receiptNo);
  if (!exists) return false;
  const next = prev.map((item) => (item.receiptNo === receiptNo ? { ...item, ...patch } : item));
  await saveReceiptRecords(accountId, next);
  return true;
};

export const patchReceiptRecordStatus = async (
  accountId: string | undefined,
  receiptNo: string,
  status: ReceiptRecordStatus
) => {
  if (!accountId) return;
  const prev = getReceiptRecords(accountId);
  const next = prev.map((item) => (item.receiptNo === receiptNo ? { ...item, status } : item));
  await saveReceiptRecords(accountId, next);
};

export const getNvrCaptureSettings = (accountId?: string): NvrCaptureSettings => {
  if (!accountId) return { enabled: false, snapshotUrl: '' };
  const cached = getCachedSharedState<NvrCaptureSettings>(accountId, NVR_SETTINGS_STATE_KEY, {
    enabled: false,
    snapshotUrl: '',
  });
  return {
    enabled: Boolean(cached.enabled),
    snapshotUrl: String(cached.snapshotUrl || ''),
    source:
      cached.source === 'BUILTIN' || cached.source === 'USB' || cached.source === 'NVR'
        ? cached.source
        : 'NVR',
    usbDeviceId: String(cached.usbDeviceId || ''),
    protocol: cached.protocol === 'RTSP_PROXY' ? 'RTSP_PROXY' : 'HTTP',
    username: String(cached.username || ''),
    password: String(cached.password || ''),
    vendor:
      cached.vendor === 'HIKVISION' ||
      cached.vendor === 'DAHUA' ||
      cached.vendor === 'ONVIF' ||
      cached.vendor === 'EZVIZ' ||
      cached.vendor === 'XMEYE'
        ? cached.vendor
        : 'GENERIC',
    deviceIp: String(cached.deviceIp || ''),
    httpPort: String(cached.httpPort || ''),
    rtspPort: String(cached.rtspPort || ''),
    channelNo: String(cached.channelNo || ''),
    streamType: cached.streamType === 'SUB' ? 'SUB' : 'MAIN',
    rtspUrl: String(cached.rtspUrl || ''),
    rtspProxyBaseUrl: String(cached.rtspProxyBaseUrl || ''),
  };
};

export const syncNvrCaptureSettings = async (accountId?: string): Promise<NvrCaptureSettings> => {
  if (!accountId) return { enabled: false, snapshotUrl: '' };
  const cached = getNvrCaptureSettings(accountId);
  const synced = await loadSharedState(accountId, NVR_SETTINGS_STATE_KEY, cached);
  return {
    enabled: Boolean(synced.enabled),
    snapshotUrl: String(synced.snapshotUrl || ''),
    source:
      synced.source === 'BUILTIN' || synced.source === 'USB' || synced.source === 'NVR'
        ? synced.source
        : 'NVR',
    usbDeviceId: String(synced.usbDeviceId || ''),
    protocol: synced.protocol === 'RTSP_PROXY' ? 'RTSP_PROXY' : 'HTTP',
    username: String(synced.username || ''),
    password: String(synced.password || ''),
    vendor:
      synced.vendor === 'HIKVISION' ||
      synced.vendor === 'DAHUA' ||
      synced.vendor === 'ONVIF' ||
      synced.vendor === 'EZVIZ' ||
      synced.vendor === 'XMEYE'
        ? synced.vendor
        : 'GENERIC',
    deviceIp: String(synced.deviceIp || ''),
    httpPort: String(synced.httpPort || ''),
    rtspPort: String(synced.rtspPort || ''),
    channelNo: String(synced.channelNo || ''),
    streamType: synced.streamType === 'SUB' ? 'SUB' : 'MAIN',
    rtspUrl: String(synced.rtspUrl || ''),
    rtspProxyBaseUrl: String(synced.rtspProxyBaseUrl || ''),
  };
};

export const setNvrCaptureSettings = async (accountId: string | undefined, settings: NvrCaptureSettings) => {
  if (!accountId) return;
  await saveSharedState(accountId, NVR_SETTINGS_STATE_KEY, settings);
};

export const getRefundSnapshots = (accountId?: string): RefundSnapshotRecord[] => {
  if (!accountId) return [];
  return getCachedSharedState(accountId, REFUND_SNAPSHOTS_STATE_KEY, []);
};

export const syncRefundSnapshots = async (accountId?: string): Promise<RefundSnapshotRecord[]> => {
  if (!accountId) return [];
  return loadSharedState(accountId, REFUND_SNAPSHOTS_STATE_KEY, getRefundSnapshots(accountId));
};

export const setRefundSnapshots = async (accountId: string | undefined, snapshots: RefundSnapshotRecord[]) => {
  if (!accountId) return;
  await saveSharedState(accountId, REFUND_SNAPSHOTS_STATE_KEY, snapshots);
};
