import React, { useEffect, useMemo, useState } from 'react';
import { Camera, Receipt, RefreshCw, Store, Wallet } from 'lucide-react';
import { syncReceiptRecords, ReceiptRecord } from '../lib/receiptStore';
import { syncPosOpsState } from '../lib/posOpsStore';
import { syncDirtySharedState } from '../lib/sharedStateStore';
import { formatVT } from '../lib/utils';

interface PlatformOverviewPageProps {
  currentUserId?: string;
}

type UserRole = 'PLATFORM' | 'WHOLESALER' | 'RETAILER';

type AccountMeta = {
  id: string;
  label: string;
  type: UserRole;
};

type OverviewOrderRow = ReceiptRecord & {
  accountId: string;
  accountLabel: string;
  rowKey: string;
};

const ACCOUNTS: AccountMeta[] = [
  { id: 'W-001', label: '批发商', type: 'WHOLESALER' },
  { id: 'R-001', label: '零售商', type: 'RETAILER' },
];

const PlatformOverviewPage: React.FC<PlatformOverviewPageProps> = ({ currentUserId }) => {
  const [orders, setOrders] = useState<OverviewOrderRow[]>([]);
  const [todaySalesAmount, setTodaySalesAmount] = useState(0);
  const [todaySalesCount, setTodaySalesCount] = useState(0);
  const [refreshing, setRefreshing] = useState(false);
  const [lastUpdatedAt, setLastUpdatedAt] = useState('');

  const loadData = async () => {
    setRefreshing(true);
    try {
      const accounts = ACCOUNTS.filter((item) => item.id !== currentUserId);
      await Promise.all(accounts.map((account) => syncDirtySharedState(account.id)));
      const [receiptGroups, opsGroups] = await Promise.all([
        Promise.all(
          accounts.map(async (account) => {
            const rows = await syncReceiptRecords(account.id);
            return rows.map(
              (row): OverviewOrderRow => ({
                ...row,
                accountId: account.id,
                accountLabel: account.label,
                rowKey: `${account.id}-${row.receiptNo}`,
              })
            );
          })
        ),
        Promise.all(accounts.map((account) => syncPosOpsState(account.id))),
      ]);

      const merged = receiptGroups
        .flat()
        .sort((a, b) => new Date(b.nvrCaptureAt || b.printedAt).getTime() - new Date(a.nvrCaptureAt || a.printedAt).getTime());
      setOrders(merged);

      const today = new Date().toISOString().slice(0, 10);
      const sales = opsGroups.flatMap((group) => group.sales).filter((sale) => sale.createdAt.slice(0, 10) === today);
      setTodaySalesCount(sales.length);
      setTodaySalesAmount(sales.reduce((sum, sale) => sum + sale.amount, 0));
      setLastUpdatedAt(new Date().toLocaleString());
    } finally {
      setRefreshing(false);
    }
  };

  useEffect(() => {
    void loadData();
    const timer = window.setInterval(() => {
      void loadData();
    }, 20000);
    return () => window.clearInterval(timer);
  }, [currentUserId]);

  const failedCount = useMemo(() => orders.filter((item) => item.nvrCaptureStatus === 'FAILED').length, [orders]);

  return (
    <div className="space-y-4 sm:space-y-6 pb-12">
      <div className="ui-card bg-white rounded-3xl border border-slate-200 p-5 sm:p-8 shadow-sm">
        <div className="flex flex-col xl:flex-row xl:items-center xl:justify-between gap-4">
          <div>
            <h2 className="text-xl sm:text-2xl font-black text-slate-900 flex items-center gap-3">
              <Store className="text-[#1a237e]" /> 平台总览
            </h2>
            <p className="mt-2 text-slate-500 text-sm">统一查看商户订单、营业额和抓拍异常，便于平台管理后台总览。</p>
          </div>
          <button onClick={() => void loadData()} className="ui-btn px-4 h-10 rounded-xl bg-[#1a237e] text-white text-sm font-black inline-flex items-center gap-2">
            <RefreshCw size={14} className={refreshing ? 'animate-spin' : ''} /> 立即刷新
          </button>
        </div>
        <div className="mt-3 text-xs text-slate-500 font-bold">最后更新：{lastUpdatedAt || '--'}</div>
      </div>

      <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
        <div className="ui-card bg-white rounded-3xl border border-slate-200 p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-black text-slate-400 uppercase tracking-widest">今日订单</span>
            <Receipt size={16} className="text-[#1a237e]" />
          </div>
          <div className="mt-3 text-3xl font-black text-slate-900">{todaySalesCount}</div>
        </div>
        <div className="ui-card bg-white rounded-3xl border border-slate-200 p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-black text-slate-400 uppercase tracking-widest">今日销售额</span>
            <Wallet size={16} className="text-[#1a237e]" />
          </div>
          <div className="mt-3 text-3xl font-black text-slate-900">{formatVT(todaySalesAmount)}</div>
        </div>
        <div className="ui-card bg-white rounded-3xl border border-slate-200 p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-black text-slate-400 uppercase tracking-widest">抓拍失败</span>
            <Camera size={16} className="text-[#1a237e]" />
          </div>
          <div className="mt-3 text-3xl font-black text-[#1a237e]">{failedCount}</div>
        </div>
        <div className="ui-card bg-white rounded-3xl border border-slate-200 p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-black text-slate-400 uppercase tracking-widest">商户数量</span>
            <Store size={16} className="text-violet-500" />
          </div>
          <div className="mt-3 text-3xl font-black text-slate-900">{ACCOUNTS.length}</div>
        </div>
      </div>

      <div className="ui-card bg-white rounded-3xl border border-slate-200 p-4 sm:p-5 shadow-sm overflow-x-auto">
        <div className="min-w-[920px]">
          <div className="grid grid-cols-[120px_140px_150px_90px_120px_120px_1fr] gap-2 text-[11px] font-black text-slate-500 uppercase tracking-widest pb-2 border-b border-slate-200">
            <div>商户</div>
            <div>单号</div>
            <div>时间</div>
            <div>类型</div>
            <div className="text-right">金额</div>
            <div className="text-center">抓拍</div>
            <div>备注</div>
          </div>
          <div className="divide-y divide-slate-100">
            {orders.map((record) => (
              <div key={record.rowKey} className="grid grid-cols-[120px_140px_150px_90px_120px_120px_1fr] gap-2 py-3 items-center text-sm">
                <div className="font-black text-slate-800">{record.accountLabel}</div>
                <div className="font-black text-slate-700">{record.receiptNo}</div>
                <div className="text-slate-600">{record.printedAt}</div>
                <div className={`font-black ${record.kind === 'REFUND' ? 'text-[#1a237e]' : 'text-[#1a237e]'}`}>{record.kind === 'REFUND' ? '退款' : '销售'}</div>
                <div className="text-right font-black text-slate-700">{formatVT(Math.abs(record.total))}</div>
                <div className="text-center text-xs font-black text-slate-700">{record.nvrCaptureStatus || '--'}</div>
                <div className="text-xs text-slate-500 break-words">{record.nvrCaptureMessage || '--'}</div>
              </div>
            ))}
            {orders.length === 0 && <div className="py-10 text-center text-sm text-slate-500">暂无可展示的平台订单数据</div>}
          </div>
        </div>
      </div>
    </div>
  );
};

export default PlatformOverviewPage;

