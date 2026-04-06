import { getCachedSharedState, loadSharedState, saveSharedState } from './sharedStateStore';

const CAPTURE_JOBS_KEY = 'receipt_capture_jobs';

export type CaptureJobStatus = 'PENDING' | 'PROCESSING' | 'SUCCESS' | 'FAILED';

export interface ReceiptCaptureJob {
  id: string;
  receiptNo: string;
  createdAt: string;
  updatedAt: string;
  status: CaptureJobStatus;
  message?: string;
  amount?: number;
  itemCount?: number;
}

export const getCaptureJobs = (accountId?: string): ReceiptCaptureJob[] => {
  if (!accountId) return [];
  return getCachedSharedState<ReceiptCaptureJob[]>(accountId, CAPTURE_JOBS_KEY, []);
};

export const syncCaptureJobs = async (accountId?: string): Promise<ReceiptCaptureJob[]> => {
  if (!accountId) return [];
  return loadSharedState(accountId, CAPTURE_JOBS_KEY, getCaptureJobs(accountId));
};

export const enqueueCaptureJob = async (
  accountId: string | undefined,
  payload: { receiptNo: string; amount?: number; itemCount?: number }
) => {
  if (!accountId) return null;
  const now = new Date().toISOString();
  const prev = getCaptureJobs(accountId);
  const nextItem: ReceiptCaptureJob = {
    id: `CAP-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`,
    receiptNo: payload.receiptNo,
    amount: payload.amount,
    itemCount: payload.itemCount,
    createdAt: now,
    updatedAt: now,
    status: 'PENDING',
    message: '等待本地 EXE 抓拍',
  };
  const next = [nextItem, ...prev].slice(0, 500);
  await saveSharedState(accountId, CAPTURE_JOBS_KEY, next);
  return nextItem;
};
