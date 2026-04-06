import React, { useEffect, useMemo, useState } from 'react';
import { Camera, Receipt, RefreshCw, Search } from 'lucide-react';
import { formatVT } from '../lib/utils';
import {
  getNvrCaptureSettings,
  ReceiptRecord,
  syncReceiptRecords,
} from '../lib/receiptStore';
import { captureReceiptPhoto } from '../lib/receiptCapture';

interface ReceiptManagementPageProps {
  accountId?: string;
}

const statusLabelMap: Record<ReceiptRecord['status'], string> = {
  NORMAL: '正常',
  REFUNDED: '已退',
  VOID: '作废',
};

const nvrStatusLabelMap: Record<NonNullable<ReceiptRecord['nvrCaptureStatus']>, string> = {
  PENDING: '抓拍中',
  SUCCESS: '已抓拍',
  FAILED: '失败',
};

const ReceiptManagementPage: React.FC<ReceiptManagementPageProps> = ({ accountId }) => {
  const [keyword, setKeyword] = useState('');
  const [records, setRecords] = useState<ReceiptRecord[]>([]);
  const [previewReceiptNo, setPreviewReceiptNo] = useState<string | null>(null);
  const [retryingReceiptNo, setRetryingReceiptNo] = useState<string | null>(null);
  const [captureOnlyFailed, setCaptureOnlyFailed] = useState(false);

  const load = async () => {
    setRecords(await syncReceiptRecords(accountId));
  };

  useEffect(() => {
    void load();
  }, [accountId]);

  const filtered = useMemo(() => {
    const k = keyword.trim().toLowerCase();
    return records.filter((record) => {
      if (captureOnlyFailed && record.nvrCaptureStatus !== 'FAILED') return false;
      if (!k) return true;
      return (
        record.receiptNo.toLowerCase().includes(k) ||
        record.printedAt.toLowerCase().includes(k) ||
        (record.kind === 'REFUND' ? '退款' : '销售').includes(k) ||
        String(record.nvrCaptureMessage || '').toLowerCase().includes(k)
      );
    });
  }, [records, keyword, captureOnlyFailed]);

  const previewRecord = useMemo(
    () => records.find((record) => record.receiptNo === previewReceiptNo) || null,
    [records, previewReceiptNo]
  );

  const failedCount = records.filter((record) => record.nvrCaptureStatus === 'FAILED').length;
  const successCount = records.filter((record) => record.nvrCaptureStatus === 'SUCCESS').length;

  const retryCapture = async (record: ReceiptRecord) => {
    if (!accountId || !record.items?.length) return;
    const nvrSettings = getNvrCaptureSettings(accountId);
    if (!nvrSettings.enabled) return;
    setRetryingReceiptNo(record.receiptNo);
    try {
      await captureReceiptPhoto({
        accountId,
        invoiceNo: record.receiptNo,
        amount: record.total,
        nvrSettings,
        items: record.items.map((item) => ({
          title: item.title,
          quantity: item.quantity,
        })),
      });
    } finally {
      setRetryingReceiptNo(null);
      await load();
    }
  };

  return (
    <div className="space-y-4 sm:space-y-6 pb-12">
      <div className="ui-card bg-white rounded-3xl border border-slate-200 p-5 sm:p-8 shadow-sm">
        <h2 className="text-xl sm:text-2xl font-black text-slate-900 flex items-center gap-3">
          <Receipt className="text-[#1a237e]" /> 小票管理
        </h2>
        <p className="mt-2 text-slate-500 text-sm">按发票号查询小票，查看抓拍状态、失败原因，并支持后台重试抓拍。</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1.5fr)_minmax(320px,1fr)] gap-4">
        <div className="ui-card bg-white rounded-3xl border border-slate-200 p-4 sm:p-5 shadow-sm">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="relative w-full max-w-md">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                value={keyword}
                onChange={(e) => setKeyword(e.target.value)}
                placeholder="搜索发票号、时间、抓拍原因"
                className="w-full h-10 rounded-xl border border-slate-200 bg-slate-50 pl-9 pr-3 text-sm outline-none focus:border-[#dbe7ff]"
              />
            </div>
            <label className="flex items-center gap-2 text-sm font-bold text-slate-600 whitespace-nowrap">
              <input type="checkbox" checked={captureOnlyFailed} onChange={(e) => setCaptureOnlyFailed(e.target.checked)} />
              只看抓拍失败
            </label>
          </div>
        </div>

        <div className="ui-card bg-white rounded-3xl border border-slate-200 p-4 sm:p-5 shadow-sm">
          <div className="flex items-center gap-2 text-slate-900 font-black">
            <Camera size={16} className="text-[#1a237e]" />
            抓拍诊断
          </div>
          <div className="mt-3 grid grid-cols-3 gap-3 text-center">
            <div className="rounded-2xl bg-slate-50 border border-slate-200 p-3">
              <div className="text-xs text-slate-500 font-bold">总记录</div>
              <div className="mt-1 text-xl font-black text-slate-900">{records.length}</div>
            </div>
            <div className="rounded-2xl bg-[#1a237e] border border-[#dbe7ff] p-3">
              <div className="text-xs text-[#1a237e] font-bold">已抓拍</div>
              <div className="mt-1 text-xl font-black text-[#1a237e]">{successCount}</div>
            </div>
            <div className="rounded-2xl bg-[#1a237e] border border-[#dbe7ff] p-3">
              <div className="text-xs text-[#1a237e] font-bold">失败</div>
              <div className="mt-1 text-xl font-black text-[#1a237e]">{failedCount}</div>
            </div>
          </div>
        </div>
      </div>

      <div className="ui-card bg-white rounded-3xl border border-slate-200 p-4 sm:p-5 shadow-sm overflow-x-auto">
        <div className="min-w-[1380px]">
          <div className="grid grid-cols-[150px_150px_80px_110px_70px_80px_90px_100px_180px_260px_240px_240px] gap-2 text-[11px] font-black text-slate-500 uppercase tracking-widest pb-2 border-b border-slate-200">
            <div>发票号</div>
            <div>时间</div>
            <div>类型</div>
            <div className="text-right">金额</div>
            <div className="text-center">商品数</div>
            <div className="text-center">状态</div>
            <div className="text-center">抓拍</div>
            <div className="text-center">来源</div>
            <div className="text-left">批次扣减</div>
            <div className="text-left">抓拍时间</div>
            <div className="text-left">抓拍结果</div>
            <div className="text-right">操作</div>
          </div>

          <div className="divide-y divide-slate-100">
            {filtered.map((record) => {
              const canRetry = Boolean(accountId && record.items?.length && getNvrCaptureSettings(accountId).enabled);
              const retrying = retryingReceiptNo === record.receiptNo;
              return (
                <div
                  key={record.receiptNo}
                  className="grid grid-cols-[150px_150px_80px_110px_70px_80px_90px_100px_180px_260px_240px_240px] gap-2 py-2 items-center text-sm"
                >
                  <div className="font-black text-slate-800">{record.receiptNo}</div>
                  <div className="text-slate-600">{record.printedAt}</div>
                  <div className={`font-black ${record.kind === 'REFUND' ? 'text-[#1a237e]' : 'text-[#1a237e]'}`}>
                    {record.kind === 'REFUND' ? '退款' : '销售'}
                  </div>
                  <div className="text-right font-black text-slate-700">{formatVT(Math.abs(record.total))}</div>
                  <div className="text-center text-slate-600">{record.itemCount}</div>
                  <div className="text-center text-slate-700 font-black">{statusLabelMap[record.status]}</div>
                  <div className="text-center text-xs font-black text-slate-700">
                    {record.nvrCaptureStatus ? nvrStatusLabelMap[record.nvrCaptureStatus] : '--'}
                  </div>
                  <div className="text-center text-xs font-black text-slate-600">{record.nvrCaptureSource || '--'}</div>
                  <div className="text-[11px] text-slate-500">
                    {record.items?.some((item) => item.batchNos?.length) ? (
                      <div className="flex flex-wrap gap-1">
                        {record.items.flatMap((item) =>
                          (item.batchNos || []).map((batch) => (
                            <span
                              key={`${record.receiptNo}-${item.id}-${batch}`}
                              className="inline-flex rounded-full bg-[#1a237e] px-2 py-0.5 font-black text-[#1a237e]"
                            >
                              {batch}
                            </span>
                          ))
                        )}
                      </div>
                    ) : (
                      '--'
                    )}
                  </div>
                  <div className="text-xs text-slate-500">{record.nvrCaptureAt ? new Date(record.nvrCaptureAt).toLocaleString() : '--'}</div>
                  <div className="flex items-center gap-2 min-w-0">
                    {record.nvrPhotoDataUrl ? (
                      <a href={record.nvrPhotoDataUrl} target="_blank" rel="noreferrer" className="shrink-0">
                        <img src={record.nvrPhotoDataUrl} alt={record.receiptNo} className="w-14 h-10 rounded object-cover border border-slate-200" />
                      </a>
                    ) : (
                      <div className="w-14 h-10 rounded border border-dashed border-slate-200 bg-slate-50" />
                    )}
                    <span className="text-[11px] text-slate-500 break-words">{record.nvrCaptureMessage || '--'}</span>
                  </div>
                  <div className="flex items-center justify-end gap-2">
                    <button
                      onClick={() => setPreviewReceiptNo(record.receiptNo)}
                      className={`ui-btn px-2.5 h-8 rounded-lg text-[11px] font-black ${
                        record.nvrPhotoDataUrl ? 'bg-[#1a237e] text-[#1a237e]' : 'bg-slate-100 text-slate-400 cursor-not-allowed'
                      }`}
                      disabled={!record.nvrPhotoDataUrl}
                    >
                      查看照片
                    </button>
                    <button
                      onClick={() => retryCapture(record)}
                      className={`ui-btn px-2.5 h-8 rounded-lg text-[11px] font-black inline-flex items-center gap-1 ${
                        canRetry ? 'bg-[#1a237e] text-[#1a237e]' : 'bg-slate-100 text-slate-400 cursor-not-allowed'
                      }`}
                      disabled={!canRetry || retrying}
                    >
                      <RefreshCw size={12} className={retrying ? 'animate-spin' : ''} />
                      {retrying ? '重试中' : '重试抓拍'}
                    </button>
                  </div>
                </div>
              );
            })}
            {filtered.length === 0 && <div className="py-10 text-center text-sm text-slate-500">暂无小票数据</div>}
          </div>
        </div>
      </div>

      {previewRecord?.nvrPhotoDataUrl && (
        <div className="fixed inset-0 z-[120] bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-6xl rounded-3xl bg-white shadow-2xl border border-slate-200 overflow-hidden">
            <div className="flex items-center justify-between px-4 py-3 sm:px-5 border-b border-slate-200">
              <div className="text-sm sm:text-base font-black text-slate-900">小票原图：{previewRecord.receiptNo}</div>
              <button
                onClick={() => setPreviewReceiptNo(null)}
                className="ui-btn px-3 h-9 rounded-lg text-xs font-black bg-slate-100 text-slate-700"
              >
                关闭
              </button>
            </div>
            <div className="p-3 sm:p-4 bg-slate-50">
              <img
                src={previewRecord.nvrPhotoDataUrl}
                alt={previewRecord.receiptNo}
                className="w-full max-h-[82vh] object-contain rounded-2xl border border-slate-200 bg-white"
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ReceiptManagementPage;

