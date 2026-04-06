import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Bell, Camera, Expand, Receipt, RefreshCw, Store, Wallet, X } from 'lucide-react';
import { syncReceiptRecords, ReceiptRecord } from '../lib/receiptStore';
import { getCachedSharedState, loadSharedState, syncDirtySharedState } from '../lib/sharedStateStore';
import { formatVT } from '../lib/utils';
import { getProcurementOrders } from '../lib/procurementStore';
import { syncEmployeeAccounts } from '../lib/employeeStore';
import { getAccountProgramSettings, patchAccountProgramSettings } from '../lib/accountScopedStore';

interface BossClientPageProps {
  currentUserId?: string;
}

type UserRole = 'PLATFORM' | 'WHOLESALER' | 'RETAILER';

type BossOrderRow = ReceiptRecord & {
  accountId: string;
  accountLabel: string;
  accountType: UserRole;
  rowKey: string;
};

type InventoryTransactionRow = {
  id: string;
  type: 'IN' | 'OUT' | 'ADJUST' | 'TRANSFER' | 'CLEARANCE' | 'SCRAP' | 'LOSS';
  quantity: number;
  timestamp: string;
  note?: string;
};

type DriverStatusRow = {
  id: string;
  retailerName: string;
  shippingCompanyName?: string;
  status: string;
  updatedAt?: string;
  driverName?: string;
  driverLastPingAt?: string;
  driverCurrentLocation?: {
    lat: number;
    lng: number;
    label?: string;
  };
  driverIssueActive?: boolean;
  timeline: Array<{ at: string; label: string; by: string }>;
};

const DRIVER_MAP_POINTS = {
  warehouse: { lat: -17.7406, lng: 168.3150 },
  shipping: { lat: -17.7512, lng: 168.3084 },
};
const DEFAULT_DRIVER_PHONE = '+6785550303';

const TRANSACTION_STATE_KEY = 'warehouse_transactions';

const ACCOUNT_META: Record<string, { label: string; type: UserRole }> = {
  'P-001': { label: '\u5e73\u53f0\u603b\u90e8', type: 'PLATFORM' },
  'W-001': { label: '\u6279\u53d1\u5546', type: 'WHOLESALER' },
  'R-001': { label: '\u96f6\u552e\u95e8\u5e97', type: 'RETAILER' },
};

const TEXT = {
  title: '\u8001\u677f\u5ba2\u6237\u7aef',
  subtitle: '\u53ea\u67e5\u770b\u5f53\u524d\u5546\u6237\u7684\u8ba2\u5355\u3001\u6293\u62cd\u56fe\u7247\u3001\u9000\u6b3e\u72b6\u6001\u4e0e\u8425\u4e1a\u60c5\u51b5\u3002',
  markRead: '\u6807\u8bb0\u5df2\u8bfb',
  refresh: '\u7acb\u5373\u5237\u65b0',
  updatedAt: '\u4e0a\u6b21\u66f4\u65b0\uff1a',
  todayOrders: '\u4eca\u65e5\u8ba2\u5355',
  todaySales: '\u4eca\u65e5\u8425\u4e1a\u989d',
  captureFailed: '\u6293\u62cd\u5931\u8d25',
  refundCount: '\u9000\u6b3e\u5355\u6570',
  batchSales: '\u6279\u6b21\u9500\u552e',
  nearExpirySales: '\u4e34\u671f\u4fc3\u9500',
  failedAlert: '\u6293\u62cd\u5931\u8d25\u81ea\u52a8\u9884\u8b66',
  failedAlertDesc: '\u5931\u8d25\u8ba2\u5355\u5df2\u81ea\u52a8\u7f6e\u9876\uff0c\u8bf7\u4f18\u5148\u5904\u7406\u3002',
  orderFeed: '\u8ba2\u5355\u76d1\u63a7\u6d41',
  refund: '\u9000\u6b3e',
  sale: '\u9500\u552e',
  piece: '\u4ef6',
  captured: '\u5df2\u6293\u62cd',
  pending: '\u6293\u62cd\u4e2d',
  notCaptured: '\u672a\u6293\u62cd',
  noOrders: '\u5f53\u524d\u6ca1\u6709\u8ba2\u5355\u8bb0\u5f55',
  orderDetail: '\u8ba2\u5355\u8be6\u60c5',
  receiptNo: '\u8ba2\u5355\u53f7',
  store: '\u95e8\u5e97',
  time: '\u65f6\u95f4',
  payment: '\u652f\u4ed8\u65b9\u5f0f',
  status: '\u72b6\u6001',
  total: '\u603b\u91d1\u989d',
  noPhoto: '\u6682\u65e0\u6293\u62cd\u56fe\u7247',
  captureResult: '\u6293\u62cd\u7ed3\u679c\uff1a',
  none: '\u6682\u65e0',
  goods: '\u5546\u54c1\u6e05\u5355',
  noGoods: '\u8fd9\u5f20\u8ba2\u5355\u6ca1\u6709\u5546\u54c1\u660e\u7ec6',
  chooseOrder: '\u8bf7\u9009\u62e9\u4e00\u5f20\u8ba2\u5355\u67e5\u770b\u8be6\u60c5',
  accountCode: '\u95e8\u5e97\u8d26\u53f7',
  onlyFailed: '\u53ea\u770b\u6293\u62cd\u5931\u8d25',
  onlyRefund: '\u53ea\u770b\u9000\u6b3e',
  nearExpiryReport: '\u4e34\u671f\u9500\u552e\u7edf\u8ba1',
};

const BOSS_READ_KEY = 'stretpos.bossClient.lastReadAt';
const compactCaptureMessage = (raw: string | undefined, max = 90) => {
  const src = String(raw || '')
    .replace(/<[^>]*>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  if (!src) return '暂无';
  if (src.includes('Target responded with 503')) return '隧道离线（503）';
  if (src.includes('Target responded with 408')) return '隧道超时（408）';
  if (src.includes('Failed to fetch')) return '网络请求失败';
  if (src.length <= max) return src;
  return `${src.slice(0, Math.max(0, max - 1))}…`;
};

const BossClientPage: React.FC<BossClientPageProps> = ({ currentUserId }) => {
  const [orders, setOrders] = useState<BossOrderRow[]>([]);
  const [selectedStatus, setSelectedStatus] = useState<'ALL' | 'FAILED' | 'REFUND'>('ALL');
  const [selectedOrderKey, setSelectedOrderKey] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [lastUpdatedAt, setLastUpdatedAt] = useState('');
  const [todaySalesAmount, setTodaySalesAmount] = useState(0);
  const [todaySalesCount, setTodaySalesCount] = useState(0);
  const [inventoryOps, setInventoryOps] = useState<InventoryTransactionRow[]>([]);
  const [driverStatuses, setDriverStatuses] = useState<DriverStatusRow[]>([]);
  const [driverStatusFilter, setDriverStatusFilter] = useState<'ALL' | 'ISSUE'>('ALL');
  const [driverTimeFilter, setDriverTimeFilter] = useState<'TODAY' | 'WEEK' | 'ALL'>('TODAY');
  const [driverPhone, setDriverPhone] = useState(DEFAULT_DRIVER_PHONE);
  const [bossNotifyEnabled, setBossNotifyEnabled] = useState(true);
  const [bossNotifySoundEnabled, setBossNotifySoundEnabled] = useState(true);
  const [newOrderNotice, setNewOrderNotice] = useState<{ receiptNo: string; amount: number; at: string } | null>(null);
  const [notifySaveHint, setNotifySaveHint] = useState('');
  const [isMobile, setIsMobile] = useState(() => window.innerWidth < 960);
  const [showFullscreenImage, setShowFullscreenImage] = useState(false);
  const [lastReadAt, setLastReadAt] = useState(() => {
    try {
      return localStorage.getItem(BOSS_READ_KEY) || '';
    } catch {
      return '';
    }
  });
  const prevTopOrderRef = useRef<string>('');

  const currentMeta = ACCOUNT_META[currentUserId || ''] || {
    label: currentUserId || '--',
    type: 'RETAILER' as UserRole,
  };
  const showDriverSection = currentMeta.type === 'WHOLESALER';
  const fallbackAccountIds = useMemo(() => {
    if (!currentUserId) return [] as string[];
    const ids = [currentUserId];
    // Retail historical data may still be stored under R-001 before merchant account split.
    if (currentMeta.type === 'RETAILER' && currentUserId !== 'R-001') {
      ids.push('R-001');
    }
    return ids;
  }, [currentUserId, currentMeta.type]);

  const playNewOrderTone = () => {
    try {
      const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      osc.type = 'triangle';
      osc.frequency.value = 1244;
      gain.gain.value = 0.001;
      osc.connect(gain);
      gain.connect(audioCtx.destination);
      const now = audioCtx.currentTime;
      gain.gain.exponentialRampToValueAtTime(0.12, now + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.28);
      osc.start(now);
      osc.stop(now + 0.3);
    } catch {}
  };

  const openDriverMap = (order: DriverStatusRow) => {
    const destination = order.driverCurrentLocation
      ? `${order.driverCurrentLocation.lat},${order.driverCurrentLocation.lng}`
      : `${DRIVER_MAP_POINTS.shipping.lat},${DRIVER_MAP_POINTS.shipping.lng}`;
    window.open(
      `https://www.google.com/maps/dir/?api=1&origin=${DRIVER_MAP_POINTS.warehouse.lat},${DRIVER_MAP_POINTS.warehouse.lng}&destination=${destination}&travelmode=driving`,
      '_blank'
    );
  };

  const openRouteMap = (order: DriverStatusRow) => {
    const waypoints = `${DRIVER_MAP_POINTS.shipping.lat},${DRIVER_MAP_POINTS.shipping.lng}`;
    const destination = order.driverCurrentLocation
      ? `${order.driverCurrentLocation.lat},${order.driverCurrentLocation.lng}`
      : `${DRIVER_MAP_POINTS.shipping.lat},${DRIVER_MAP_POINTS.shipping.lng}`;
    window.open(
      `https://www.google.com/maps/dir/?api=1&origin=${DRIVER_MAP_POINTS.warehouse.lat},${DRIVER_MAP_POINTS.warehouse.lng}&destination=${destination}&waypoints=${waypoints}&travelmode=driving`,
      '_blank'
    );
  };

  const markAsRead = () => {
    const ts = new Date().toISOString();
    setLastReadAt(ts);
    try {
      localStorage.setItem(BOSS_READ_KEY, ts);
    } catch {}
  };

  const saveBossNotifySettings = () => {
    if (!currentUserId) return;
    void patchAccountProgramSettings(currentUserId, {
      bossOrderNotifyEnabled: bossNotifyEnabled,
      bossOrderNotifySoundEnabled: bossNotifySoundEnabled,
    });
    setNotifySaveHint('老板通知设置已保存');
    window.setTimeout(() => setNotifySaveHint(''), 1800);
  };

  const loadBossData = async () => {
    if (!currentUserId) {
      setOrders([]);
      return;
    }
    setRefreshing(true);
    try {
      await syncDirtySharedState(currentUserId);
      const [receiptGroups, localTransactions, procurementOrders, employeeAccounts, settings] = await Promise.all([
        Promise.all(fallbackAccountIds.map((id) => syncReceiptRecords(id))),
        loadSharedState(
          currentUserId,
          TRANSACTION_STATE_KEY,
          getCachedSharedState(currentUserId, TRANSACTION_STATE_KEY, [] as InventoryTransactionRow[])
        ),
        showDriverSection ? getProcurementOrders() : Promise.resolve([]),
        showDriverSection ? syncEmployeeAccounts(currentUserId) : Promise.resolve([]),
        getAccountProgramSettings(currentUserId),
      ]);
      const notifyEnabled = settings.bossOrderNotifyEnabled !== false;
      const notifySoundEnabled = settings.bossOrderNotifySoundEnabled !== false;
      setBossNotifyEnabled(notifyEnabled);
      setBossNotifySoundEnabled(notifySoundEnabled);
      const rows = receiptGroups
        .flat()
        .sort(
          (a, b) =>
            new Date(b.nvrCaptureAt || b.printedAt).getTime() -
            new Date(a.nvrCaptureAt || a.printedAt).getTime()
        )
        .filter((item, index, list) => {
          const key = `${item.receiptNo}|${item.printedAt}|${item.total}|${item.itemCount}`;
          return (
            list.findIndex(
              (x) => `${x.receiptNo}|${x.printedAt}|${x.total}|${x.itemCount}` === key
            ) === index
          );
        });
      const merged = rows
        .map(
          (row): BossOrderRow => ({
            ...row,
            accountId: currentUserId,
            accountLabel: currentMeta.label,
            accountType: currentMeta.type,
            rowKey: `${currentUserId}-${row.receiptNo}`,
          })
        )
        .sort((a, b) => new Date(b.nvrCaptureAt || b.printedAt).getTime() - new Date(a.nvrCaptureAt || a.printedAt).getTime());
      setOrders(merged);

      const topOrderKey = merged[0]?.rowKey || '';
      if (prevTopOrderRef.current && topOrderKey && prevTopOrderRef.current !== topOrderKey && notifyEnabled) {
        const latest = merged[0];
        if (latest) {
          setNewOrderNotice({
            receiptNo: latest.receiptNo,
            amount: Math.abs(latest.total),
            at: latest.printedAt,
          });
        }
        if (notifySoundEnabled) {
          playNewOrderTone();
        }
      }
      prevTopOrderRef.current = topOrderKey;

      const today = new Date().toISOString().slice(0, 10);
      const todaySales = merged.filter((sale) => sale.kind === 'SALE' && sale.printedAt.slice(0, 10) === today);
      setTodaySalesCount(todaySales.length);
      setTodaySalesAmount(todaySales.reduce((sum, sale) => sum + Math.abs(sale.total), 0));
      setInventoryOps(Array.isArray(localTransactions) ? (localTransactions as InventoryTransactionRow[]) : []);
      if (showDriverSection) {
        setDriverStatuses(
          procurementOrders
            .filter(
              (order) =>
                (order.wholesalerAccountId === currentUserId || order.retailerAccountId === currentUserId) &&
                order.deliveryMode === 'SHIPMENT' &&
                ['DRIVER_ASSIGNED', 'IN_TRANSIT', 'AT_SHIPPING_COMPANY', 'RECEIVED', 'REJECTED'].includes(order.status)
            )
            .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
            .slice(0, 6)
            .map((order) => ({
              id: order.id,
              retailerName: order.retailerName,
              shippingCompanyName: order.shippingCompanyName,
              status: order.status,
              updatedAt: order.updatedAt,
              driverName: order.driverName,
              driverLastPingAt: order.driverLastPingAt,
              driverCurrentLocation: order.driverCurrentLocation,
              driverIssueActive: order.driverIssueActive,
              timeline: order.timeline || [],
            }))
        );
        const matchedDriver =
          employeeAccounts.find((item) => item.username?.toLowerCase() === 'driver') ||
          employeeAccounts.find((item) => item.name?.includes('司机')) ||
          employeeAccounts.find((item) => item.role?.includes('司机'));
        setDriverPhone((matchedDriver?.phone || DEFAULT_DRIVER_PHONE).replace(/\s+/g, ''));
      } else {
        setDriverStatuses([]);
        setDriverPhone(DEFAULT_DRIVER_PHONE);
      }
      setLastUpdatedAt(new Date().toLocaleString());
    } finally {
      setRefreshing(false);
    }
  };

  useEffect(() => {
    void loadBossData();
    const timer = window.setInterval(() => {
      void loadBossData();
    }, 20000);
    return () => window.clearInterval(timer);
  }, [currentUserId, showDriverSection, fallbackAccountIds, currentMeta.label, currentMeta.type]);

  useEffect(() => {
    const onResize = () => setIsMobile(window.innerWidth < 960);
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);
  useEffect(() => {
    if (!newOrderNotice) return;
    const timer = window.setTimeout(() => setNewOrderNotice(null), 8000);
    return () => window.clearTimeout(timer);
  }, [newOrderNotice]);

  const filteredOrders = useMemo(() => {
    return orders
      .filter((item) => {
        if (selectedStatus === 'FAILED' && item.nvrCaptureStatus !== 'FAILED') return false;
        if (selectedStatus === 'REFUND' && item.kind !== 'REFUND') return false;
        return true;
      })
      .sort((a, b) => {
        const aFailed = a.nvrCaptureStatus === 'FAILED' ? 1 : 0;
        const bFailed = b.nvrCaptureStatus === 'FAILED' ? 1 : 0;
        if (aFailed !== bFailed) return bFailed - aFailed;
        return new Date(b.nvrCaptureAt || b.printedAt).getTime() - new Date(a.nvrCaptureAt || a.printedAt).getTime();
      });
  }, [orders, selectedStatus]);

  const selectedOrder = useMemo(
    () => filteredOrders.find((item) => item.rowKey === selectedOrderKey) || filteredOrders[0] || null,
    [filteredOrders, selectedOrderKey]
  );

  const captureFailedCount = filteredOrders.filter((item) => item.nvrCaptureStatus === 'FAILED').length;
  const refundCount = filteredOrders.filter((item) => item.kind === 'REFUND').length;
  const batchLinkedSalesCount = filteredOrders.filter((item) =>
    (item.items || []).some((goods) => (goods.batchNos || []).length > 0)
  ).length;
  const nearExpiryDiscountedCount = filteredOrders.filter((item) =>
    (item.items || []).some((goods) => goods.nearExpiryAutoDiscounted)
  ).length;
  const clearanceCount = inventoryOps.filter((item) => item.type === 'CLEARANCE').length;
  const scrapCount = inventoryOps.filter((item) => item.type === 'SCRAP').length;
  const lossCount = inventoryOps.filter((item) => item.type === 'LOSS').length;
  const unreadCount = filteredOrders.filter((item) => {
    if (!lastReadAt) return true;
    return new Date(item.nvrCaptureAt || item.printedAt).getTime() > new Date(lastReadAt).getTime();
  }).length;
  const pinnedFailedOrders = filteredOrders.filter((item) => item.nvrCaptureStatus === 'FAILED').slice(0, 3);
  const filteredDriverStatuses = useMemo(
    () => {
      const now = Date.now();
      return driverStatuses.filter((item) => {
        if (driverStatusFilter === 'ISSUE' && !item.driverIssueActive) return false;
        if (driverTimeFilter === 'ALL') return true;
        const ts = new Date(item.driverLastPingAt || item.updatedAt || '').getTime();
        if (!ts || Number.isNaN(ts)) return driverTimeFilter === 'TODAY';
        const age = now - ts;
        if (driverTimeFilter === 'TODAY') return age <= 24 * 60 * 60 * 1000;
        return age <= 7 * 24 * 60 * 60 * 1000;
      });
    },
    [driverStatuses, driverStatusFilter, driverTimeFilter]
  );

  return (
    <div className="space-y-4 sm:space-y-6 pb-12">
      {newOrderNotice && bossNotifyEnabled && (
        <div className="fixed right-4 top-24 z-[120] w-[340px] rounded-2xl border border-[#dbe7ff] bg-white/95 backdrop-blur shadow-2xl p-4">
          <div className="text-xs font-black text-[#1a237e] uppercase tracking-widest">新订单通知</div>
          <div className="mt-2 text-sm font-black text-slate-900">{newOrderNotice.receiptNo}</div>
          <div className="mt-1 text-sm font-bold text-slate-600">金额：{formatVT(newOrderNotice.amount)}</div>
          <div className="mt-1 text-xs text-slate-500">{newOrderNotice.at}</div>
          {!bossNotifySoundEnabled && (
            <div className="mt-2 text-[11px] font-bold text-[#1a237e]">提示音已关闭</div>
          )}
          <button
            onClick={() => setNewOrderNotice(null)}
            className="mt-3 ui-btn h-8 px-3 rounded-lg bg-slate-100 text-slate-700 text-xs font-black"
          >
            关闭
          </button>
        </div>
      )}
      <div className="ui-card bg-white rounded-3xl border border-slate-200 p-5 sm:p-8 shadow-sm">
        <div className="flex flex-col xl:flex-row xl:items-center xl:justify-between gap-4">
          <div>
            <h2 className="text-xl sm:text-2xl font-black text-slate-900 flex items-center gap-3">
              <Store className="text-[#1a237e]" /> {TEXT.title}
            </h2>
            <p className="mt-2 text-slate-500 text-sm">{TEXT.subtitle}</p>
            <div className="mt-3 inline-flex items-center rounded-full bg-slate-100 px-3 py-1 text-xs font-black text-slate-700">
              {TEXT.store}: {currentMeta.label} 路 {TEXT.accountCode}: {currentUserId || '--'}
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <button onClick={markAsRead} className="ui-btn px-4 h-10 rounded-xl bg-slate-100 text-slate-700 text-sm font-black inline-flex items-center gap-2">
              <Bell size={14} /> {TEXT.markRead} {unreadCount > 0 ? `(${unreadCount})` : ''}
            </button>
            <button onClick={() => void loadBossData()} className="ui-btn px-4 h-10 rounded-xl bg-[#1a237e] text-[#1a237e] text-sm font-black inline-flex items-center gap-2">
              <RefreshCw size={14} className={refreshing ? 'animate-spin' : ''} /> {TEXT.refresh}
            </button>
            <div className="text-xs text-slate-500 font-bold">{TEXT.updatedAt}{lastUpdatedAt || '--'}</div>
          </div>
        </div>
      </div>
      <div className="ui-card bg-white rounded-3xl border border-slate-200 p-4 sm:p-5 shadow-sm">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3">
          <div>
            <div className="font-black text-slate-900">老板端通知设置</div>
            <div className="mt-1 text-xs font-bold text-slate-500">每笔新订单到达时，是否弹通知与播放提示音。</div>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <label className="inline-flex items-center gap-2 text-sm font-black text-slate-700">
              <input type="checkbox" checked={bossNotifyEnabled} onChange={(e) => setBossNotifyEnabled(e.target.checked)} />
              启用通知
            </label>
            <label className="inline-flex items-center gap-2 text-sm font-black text-slate-700">
              <input type="checkbox" checked={bossNotifySoundEnabled} onChange={(e) => setBossNotifySoundEnabled(e.target.checked)} disabled={!bossNotifyEnabled} />
              启用提示音
            </label>
            <button onClick={saveBossNotifySettings} className="ui-btn h-9 px-3 rounded-xl bg-[#1a237e] text-[#1a237e] text-xs font-black">
              保存
            </button>
            {notifySaveHint && <span className="text-xs font-black text-[#1a237e]">{notifySaveHint}</span>}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-3 2xl:grid-cols-6 gap-4">
        <div className="ui-card bg-white rounded-3xl border border-slate-200 p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-black text-slate-500 uppercase tracking-widest">{TEXT.todayOrders}</span>
            <Receipt size={16} className="text-[#1a237e]" />
          </div>
          <div className="mt-3 text-3xl font-black text-slate-900">{todaySalesCount}</div>
          <div className="mt-1 text-xs font-bold text-slate-500">今日新增销售订单数</div>
        </div>
        <div className="ui-card bg-white rounded-3xl border border-slate-200 p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-black text-slate-500 uppercase tracking-widest">{TEXT.todaySales}</span>
            <Wallet size={16} className="text-[#1a237e]" />
          </div>
          <div className="mt-3 text-3xl font-black text-slate-900">{formatVT(todaySalesAmount)}</div>
          <div className="mt-1 text-xs font-bold text-slate-500">今日累计营业金额</div>
        </div>
        <div className="ui-card bg-white rounded-3xl border border-slate-200 p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-black text-slate-500 uppercase tracking-widest">{TEXT.captureFailed}</span>
            <Camera size={16} className="text-[#1a237e]" />
          </div>
          <div className="mt-3 text-3xl font-black text-[#1a237e]">{captureFailedCount}</div>
          <div className="mt-1 text-xs font-bold text-slate-500">需要优先处理的抓拍异常</div>
        </div>
        <div className="ui-card bg-white rounded-3xl border border-slate-200 p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-black text-slate-500 uppercase tracking-widest">{TEXT.refundCount}</span>
            <Bell size={16} className="text-[#1a237e]" />
          </div>
          <div className="mt-3 text-3xl font-black text-[#1a237e]">{refundCount}</div>
          <div className="mt-1 text-xs font-bold text-slate-500">今日已发生退款单数</div>
        </div>
        <div className="ui-card bg-white rounded-3xl border border-slate-200 p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-black text-slate-500 uppercase tracking-widest">{TEXT.batchSales}</span>
            <Receipt size={16} className="text-violet-500" />
          </div>
          <div className="mt-3 text-3xl font-black text-violet-600">{batchLinkedSalesCount}</div>
          <div className="mt-1 text-xs font-bold text-slate-500">已写入批次扣减的销售单</div>
        </div>
        <div className="ui-card bg-white rounded-3xl border border-slate-200 p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-black text-slate-500 uppercase tracking-widest">{TEXT.nearExpirySales}</span>
            <Bell size={16} className="text-[#1a237e]" />
          </div>
          <div className="mt-3 text-3xl font-black text-[#1a237e]">{nearExpiryDiscountedCount}</div>
          <div className="mt-1 text-xs font-bold text-slate-500">触发临期自动促销的订单</div>
        </div>
      </div>

      <div className="ui-card bg-white rounded-3xl border border-slate-200 p-4 sm:p-5 shadow-sm">
        <div className="font-black text-slate-900">{TEXT.nearExpiryReport}</div>
        <div className="mt-3 grid grid-cols-1 md:grid-cols-2 xl:grid-cols-5 gap-3">
          <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
            <div className="text-xs font-black text-slate-500 uppercase tracking-widest">{TEXT.batchSales}</div>
            <div className="mt-2 text-sm font-black text-slate-900">{`\u4eca\u5929\u5171\u6709 ${batchLinkedSalesCount} \u5355\u5199\u5165\u4e86 FEFO \u6279\u6b21\u6263\u51cf\u3002`}</div>
          </div>
          <div className="rounded-2xl border border-[#dbe7ff] bg-[#1a237e] px-4 py-3">
            <div className="text-xs font-black text-[#1a237e] uppercase tracking-widest">{TEXT.nearExpirySales}</div>
            <div className="mt-2 text-sm font-black text-[#1a237e]">{`\u4eca\u5929\u5171\u6709 ${nearExpiryDiscountedCount} \u5355\u89e6\u53d1\u4e86\u4e34\u671f\u81ea\u52a8\u4fc3\u9500\u3002`}</div>
          </div>
          <div className="rounded-2xl border border-[#dbe7ff] bg-[#1a237e] px-4 py-3">
            <div className="text-xs font-black text-[#1a237e] uppercase tracking-widest">{`\u6e05\u4ed3\u5904\u7406`}</div>
            <div className="mt-2 text-sm font-black text-[#1a237e]">{`\u5df2\u767b\u8bb0 ${clearanceCount} \u7b14\u4e34\u671f\u6e05\u4ed3\u5904\u7406\u3002`}</div>
          </div>
          <div className="rounded-2xl border border-[#dbe7ff] bg-[#1a237e] px-4 py-3">
            <div className="text-xs font-black text-[#1a237e] uppercase tracking-widest">{`\u62a5\u5e9f\u5904\u7406`}</div>
            <div className="mt-2 text-sm font-black text-[#1a237e]">{`\u5df2\u767b\u8bb0 ${scrapCount} \u7b14\u62a5\u5e9f\u5904\u7406\u3002`}</div>
          </div>
          <div className="rounded-2xl border border-[#dbe7ff] bg-[#1a237e] px-4 py-3">
            <div className="text-xs font-black text-[#1a237e] uppercase tracking-widest">{`\u635f\u8017\u5904\u7406`}</div>
            <div className="mt-2 text-sm font-black text-[#1a237e]">{`\u5df2\u767b\u8bb0 ${lossCount} \u7b14\u635f\u8017\u5904\u7406\u3002`}</div>
          </div>
        </div>
      </div>

      {pinnedFailedOrders.length > 0 && (
        <div className="ui-card rounded-3xl border border-[#dbe7ff] bg-[#1a237e] p-4 sm:p-5 shadow-sm">
          <div className="flex items-center justify-between gap-3">
            <div>
              <div className="text-sm font-black text-[#1a237e]">{TEXT.failedAlert}</div>
              <div className="mt-1 text-xs font-bold text-[#1a237e]">{TEXT.failedAlertDesc}</div>
            </div>
            <div className="text-2xl font-black text-[#1a237e]">{captureFailedCount}</div>
          </div>
          <div className="mt-4 grid grid-cols-1 lg:grid-cols-3 gap-3">
            {pinnedFailedOrders.map((row) => (
              <button key={`failed-${row.rowKey}`} onClick={() => setSelectedOrderKey(row.rowKey)} className="rounded-2xl border border-[#dbe7ff] bg-white px-4 py-3 text-left hover:bg-[#1a237e] transition-all">
                <div className="text-sm font-black text-slate-900">{row.receiptNo}</div>
                <div className="mt-1 text-xs text-slate-500">{row.printedAt}</div>
                <div
                  className="mt-2 text-sm font-black text-[#1a237e] break-all max-h-10 overflow-hidden"
                  title={String(row.nvrCaptureMessage || TEXT.captureFailed)}
                >
                  {compactCaptureMessage(row.nvrCaptureMessage, 60)}
                </div>
              </button>
            ))}
          </div>
        </div>
      )}

      <div className="ui-card bg-white rounded-3xl border border-slate-200 p-4 sm:p-5 shadow-sm">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
          <div>
            <div className="font-black text-slate-900">{TEXT.orderFeed}</div>
            <div className="mt-1 text-xs font-bold text-slate-500">实时查看订单、小票抓拍和退款状态。</div>
          </div>
          <div className="flex flex-wrap gap-2">
            {[
              { id: 'ALL', label: TEXT.status },
              { id: 'FAILED', label: TEXT.onlyFailed },
              { id: 'REFUND', label: TEXT.onlyRefund },
            ].map((item) => (
              <button
                key={item.id}
                onClick={() => setSelectedStatus(item.id as 'ALL' | 'FAILED' | 'REFUND')}
                className={`ui-btn px-4 h-10 rounded-xl text-sm font-black ${
                  selectedStatus === item.id
                    ? 'bg-[#1a237e] text-[#1a237e]'
                    : 'bg-slate-100 text-slate-700'
                }`}
              >
                {item.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {showDriverSection && <div className="ui-card bg-white rounded-3xl border border-slate-200 p-5 sm:p-6 shadow-sm">
        <div className="flex items-center justify-between gap-3">
          <div>
            <div className="text-[10px] font-black uppercase tracking-[0.25em] text-slate-500">司机实时情况</div>
            <div className="mt-1 text-lg font-black text-slate-900">当前配送与异常状态</div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setDriverStatusFilter('ALL')}
              className={`ui-btn px-3 h-9 rounded-xl text-xs font-black ${driverStatusFilter === 'ALL' ? 'bg-white text-[#1a237e]' : 'bg-slate-100 text-slate-700'}`}
            >
              全部
            </button>
            <button
              onClick={() => setDriverStatusFilter('ISSUE')}
              className={`ui-btn px-3 h-9 rounded-xl text-xs font-black ${driverStatusFilter === 'ISSUE' ? 'bg-[#1a237e] text-[#1a237e]' : 'bg-slate-100 text-slate-700'}`}
            >
              异常仅看
            </button>
            <button
              onClick={() => setDriverTimeFilter('TODAY')}
              className={`ui-btn px-3 h-9 rounded-xl text-xs font-black ${driverTimeFilter === 'TODAY' ? 'bg-[#1a237e] text-[#1a237e]' : 'bg-slate-100 text-slate-700'}`}
            >
              今日
            </button>
            <button
              onClick={() => setDriverTimeFilter('WEEK')}
              className={`ui-btn px-3 h-9 rounded-xl text-xs font-black ${driverTimeFilter === 'WEEK' ? 'bg-[#1a237e] text-[#1a237e]' : 'bg-slate-100 text-slate-700'}`}
            >
              近7天
            </button>
            <button
              onClick={() => setDriverTimeFilter('ALL')}
              className={`ui-btn px-3 h-9 rounded-xl text-xs font-black ${driverTimeFilter === 'ALL' ? 'bg-[#1a237e] text-[#1a237e]' : 'bg-slate-100 text-slate-700'}`}
            >
              全部时间
            </button>
            <div className="text-xs font-bold text-slate-500">{filteredDriverStatuses.length} / {driverStatuses.length} 单</div>
          </div>
        </div>
        <div className="mt-4 grid grid-cols-1 xl:grid-cols-2 gap-3">
          {filteredDriverStatuses.length === 0 ? (
            <div className="rounded-2xl bg-slate-50 border border-slate-100 px-4 py-6 text-sm font-bold text-slate-500">
              当前没有司机配送中的单据。
            </div>
          ) : (
            filteredDriverStatuses.map((order) => (
              <div key={order.id} className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4 space-y-3">
                <div className="flex items-center justify-between gap-3">
                  <div className="text-sm font-black text-slate-900">{order.id}</div>
                  <div className={`rounded-full px-2.5 py-1 text-[10px] font-black ${order.driverIssueActive ? 'bg-[#1a237e] text-[#1a237e]' : 'bg-[#1a237e] text-[#1a237e]'}`}>
                    {order.driverIssueActive ? '司机异常处理中' : order.status}
                  </div>
                </div>
                <div className="text-sm font-bold text-slate-700">{order.driverName || '司机未分配'} · {order.retailerName}</div>
                <div className="text-xs font-bold text-slate-500">船运公司：{order.shippingCompanyName || '未填写'}</div>
                <div className="text-xs font-bold text-[#1a237e]">
                  实时定位：{order.driverCurrentLocation
                    ? ` ${order.driverCurrentLocation.lat.toFixed(6)}, ${order.driverCurrentLocation.lng.toFixed(6)}`
                    : ' 暂无'}
                </div>
                <div className="text-xs font-bold text-slate-500">最后回传：{order.driverLastPingAt || '暂无'}</div>
                <div className="rounded-2xl border border-[#dbe7ff] bg-white p-3 space-y-2">
                  <div className="relative h-28 rounded-2xl bg-gradient-to-br from-[#eef4ff] via-white to-[#f8f9fa] overflow-hidden">
                    <div className="absolute inset-x-0 top-1/2 h-px bg-[#1a237e]" />
                    <div className="absolute inset-y-0 left-1/2 w-px bg-[#1a237e]" />
                    <div className="absolute left-[14%] top-[20%] rounded-full bg-white px-2 py-1 text-[10px] font-black text-[#1a237e]">仓库</div>
                    <div className="absolute left-[42%] top-[44%] rounded-full bg-[#1a237e] px-2 py-1 text-[10px] font-black text-[#1a237e]">车辆</div>
                    <div className="absolute right-[12%] bottom-[18%] rounded-full bg-[#1a237e] px-2 py-1 text-[10px] font-black text-[#1a237e]">船运</div>
                    <div className="absolute inset-0">
                      <svg className="w-full h-full" viewBox="0 0 100 100" preserveAspectRatio="none">
                        <line x1="20" y1="25" x2="48" y2="50" stroke="#38bdf8" strokeWidth="2.5" strokeDasharray="5 5" />
                        <line x1="48" y1="50" x2="82" y2="76" stroke="#24308f" strokeWidth="2.5" strokeDasharray="5 5" />
                      </svg>
                    </div>
                  </div>
                  <div className="text-[11px] font-bold text-slate-500">轨迹：仓库 → 车辆实时点 → 船运公司 → 门店</div>
                  <div className="grid grid-cols-3 gap-2">
                    <button
                      onClick={() => openDriverMap(order)}
                      className="ui-btn h-10 rounded-xl bg-[#1a237e] text-[#1a237e] text-xs font-black"
                    >
                      打开定位地图
                    </button>
                    <button
                      onClick={() => openRouteMap(order)}
                      className="ui-btn h-10 rounded-xl bg-white text-[#1a237e] text-xs font-black"
                    >
                      查看司机轨迹
                    </button>
                    <a
                      href={`tel:${driverPhone}`}
                      className="ui-btn h-10 rounded-xl bg-[#1a237e] text-[#1a237e] text-xs font-black inline-flex items-center justify-center"
                    >
                      联系司机
                    </a>
                  </div>
                  <div className="rounded-2xl bg-white text-[#1a237e] px-4 py-3">
                    <div className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">任务轨迹</div>
                    <div className="mt-2 space-y-2">
                      {order.timeline.slice(-3).map((item, index) => (
                        <div key={`${order.id}-timeline-${index}`} className="flex items-start justify-between gap-3 text-xs font-bold">
                          <span className="text-slate-500">{item.label}</span>
                          <span className="text-slate-500 whitespace-nowrap">{item.at}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>}

      <div className={`grid gap-4 sm:gap-6 ${isMobile ? 'grid-cols-1' : 'grid-cols-[minmax(0,1.2fr)_minmax(380px,0.8fr)]'}`}>
        <div className="ui-card bg-white rounded-3xl border border-slate-200 p-4 sm:p-5 shadow-sm min-h-[640px]">
          <div className="mb-4 flex items-center justify-between gap-3">
            <div>
              <div className="text-sm font-black text-slate-900">订单列表</div>
              <div className="mt-1 text-xs font-bold text-slate-500">优先显示抓拍失败订单，新单会用红点提醒。</div>
            </div>
            <div className="rounded-full bg-slate-100 px-3 py-1 text-[10px] font-black text-slate-600">
              共 {filteredOrders.length} 单
            </div>
          </div>
          <div className="space-y-3 max-h-[720px] overflow-y-auto pr-1">
            {filteredOrders.map((row) => {
              const isUnread = !lastReadAt || new Date(row.nvrCaptureAt || row.printedAt).getTime() > new Date(lastReadAt).getTime();
              const isFailed = row.nvrCaptureStatus === 'FAILED';
              return (
                <button key={row.rowKey} onClick={() => setSelectedOrderKey(row.rowKey)} className={`w-full text-left rounded-2xl border p-4 transition-all ${selectedOrder?.rowKey === row.rowKey ? 'border-[#dbe7ff] bg-[#1a237e]' : isFailed ? 'border-[#dbe7ff] bg-[#1a237e] hover:bg-[#1a237e]' : 'border-slate-200 bg-white hover:border-[#dbe7ff] hover:bg-slate-50'}`}>
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="text-sm font-black text-slate-900 flex items-center gap-2">
                        {row.receiptNo}
                        {isUnread && <span className="w-2 h-2 rounded-full bg-[#1a237e]" />}
                      </div>
                      <div className="mt-1 text-xs text-slate-500">{row.printedAt}</div>
                    </div>
                    <div className="text-right">
                      <div className="text-base font-black text-slate-900">{formatVT(Math.abs(row.total))}</div>
                      <div className={`mt-1 text-[11px] font-black ${row.kind === 'REFUND' ? 'text-[#1a237e]' : 'text-[#1a237e]'}`}>{row.kind === 'REFUND' ? TEXT.refund : TEXT.sale}</div>
                    </div>
                  </div>
                  <div className="mt-3 flex flex-wrap items-center gap-2 text-[11px] font-bold">
                    <span className="px-2.5 py-1 rounded-full bg-slate-100 text-slate-600">{row.itemCount} {TEXT.piece}</span>
                    <span className={`px-2.5 py-1 rounded-full ${row.nvrCaptureStatus === 'SUCCESS' ? 'bg-[#1a237e] text-[#1a237e]' : row.nvrCaptureStatus === 'FAILED' ? 'bg-[#1a237e] text-[#1a237e]' : 'bg-[#1a237e] text-[#1a237e]'}`}>
                      {row.nvrCaptureStatus === 'SUCCESS' ? TEXT.captured : row.nvrCaptureStatus === 'FAILED' ? TEXT.captureFailed : row.nvrCaptureStatus === 'PENDING' ? TEXT.pending : TEXT.notCaptured}
                    </span>
                    <span className="px-2.5 py-1 rounded-full bg-slate-100 text-slate-600">{row.paymentMethod}</span>
                  </div>
                </button>
              );
            })}
            {filteredOrders.length === 0 && <div className="py-16 text-center text-sm text-slate-500">{TEXT.noOrders}</div>}
          </div>
        </div>

        <div className="ui-card bg-white rounded-3xl border border-slate-200 p-4 sm:p-5 shadow-sm min-h-[640px] lg:sticky lg:top-24 self-start">
          <div className="mb-4">
            <div className="font-black text-slate-900">{TEXT.orderDetail}</div>
            <div className="mt-1 text-xs font-bold text-slate-500">查看订单金额、抓拍原图、批次扣减和临期促销标签。</div>
          </div>
          {selectedOrder ? (
            <div className="space-y-4">
              <div className="rounded-2xl bg-slate-50 border border-slate-200 p-4 space-y-2">
                <div className="flex justify-between text-sm"><span className="text-slate-500">{TEXT.receiptNo}</span><span className="font-black text-slate-900">{selectedOrder.receiptNo}</span></div>
                <div className="flex justify-between text-sm"><span className="text-slate-500">{TEXT.store}</span><span className="font-black text-slate-900">{selectedOrder.accountLabel}</span></div>
                <div className="flex justify-between text-sm"><span className="text-slate-500">{TEXT.time}</span><span className="font-black text-slate-900">{selectedOrder.printedAt}</span></div>
                <div className="flex justify-between text-sm"><span className="text-slate-500">{TEXT.payment}</span><span className="font-black text-slate-900">{selectedOrder.paymentMethod}</span></div>
                <div className="flex justify-between text-sm"><span className="text-slate-500">{TEXT.status}</span><span className="font-black text-slate-900">{selectedOrder.kind === 'REFUND' ? TEXT.refund : TEXT.sale}</span></div>
                <div className="flex justify-between text-sm"><span className="text-slate-500">{TEXT.total}</span><span className="font-black text-slate-900">{formatVT(Math.abs(selectedOrder.total))}</span></div>
              </div>

              <div className={`rounded-2xl border p-3 ${selectedOrder.nvrCaptureStatus === 'FAILED' ? 'border-[#dbe7ff] bg-[#1a237e]' : 'border-slate-200 bg-slate-50'}`}>
                <div className="relative">
                  {selectedOrder.nvrPhotoDataUrl ? (
                    <>
                      <button type="button" onClick={() => setShowFullscreenImage(true)} className="block w-full">
                        <img src={selectedOrder.nvrPhotoDataUrl} alt={selectedOrder.receiptNo} className="w-full h-64 object-cover rounded-xl border border-slate-200 bg-white cursor-zoom-in" />
                      </button>
                      <button onClick={() => setShowFullscreenImage(true)} className="absolute top-3 right-3 w-10 h-10 rounded-full bg-white/85 text-[#1a237e] flex items-center justify-center hover:bg-white">
                        <Expand size={16} />
                      </button>
                    </>
                  ) : (
                    <div className="w-full h-64 rounded-xl border border-dashed border-slate-300 bg-white flex items-center justify-center text-sm font-bold text-slate-500">{TEXT.noPhoto}</div>
                  )}
                </div>
                <div
                  className={`mt-3 text-xs font-bold break-all ${selectedOrder.nvrCaptureStatus === 'FAILED' ? 'text-[#1a237e]' : 'text-slate-500'}`}
                  title={String(selectedOrder.nvrCaptureMessage || TEXT.none)}
                >
                  {TEXT.captureResult}{compactCaptureMessage(selectedOrder.nvrCaptureMessage, 120)}
                </div>
              </div>

              <div className="rounded-2xl border border-slate-200 overflow-hidden">
                <div className="px-4 py-3 bg-slate-50 border-b border-slate-200 text-sm font-black text-slate-900">{TEXT.goods}</div>
                <div className="divide-y divide-slate-100">
                  {(selectedOrder.items || []).map((item, index) => (
                    <div key={`${item.id}-${index}`} className="px-4 py-3 flex items-center justify-between gap-3 text-sm">
                      <div>
                        <div className="font-black text-slate-900">{item.title}</div>
                        <div className="text-xs text-slate-500">{item.barcode || item.id}</div>
                        {(item.batchNos || []).length > 0 && (
                          <div className="mt-1 flex flex-wrap gap-1">
                            {(item.batchNos || []).map((batch) => (
                              <span
                                key={`${item.id}-${batch}`}
                                className="px-2 py-0.5 rounded-full bg-violet-100 text-[10px] font-black text-violet-700"
                              >
                                {batch}
                              </span>
                            ))}
                          </div>
                        )}
                        {item.nearExpiryAutoDiscounted && (
                          <div className="mt-1">
                            <span className="px-2 py-0.5 rounded-full bg-[#1a237e] text-[10px] font-black text-[#1a237e]">
                              涓存湡鑷姩淇冮攢
                            </span>
                          </div>
                        )}
                      </div>
                      <div className="text-sm font-black text-slate-700">x{item.quantity}</div>
                    </div>
                  ))}
                  {(!selectedOrder.items || selectedOrder.items.length === 0) && <div className="px-4 py-8 text-center text-sm text-slate-500">{TEXT.noGoods}</div>}
                </div>
              </div>
            </div>
          ) : (
            <div className="h-[560px] flex items-center justify-center text-sm text-slate-500">{TEXT.chooseOrder}</div>
          )}
        </div>
      </div>

      {showFullscreenImage && selectedOrder?.nvrPhotoDataUrl && (
        <div className="fixed inset-0 z-[120] bg-slate-950/90 backdrop-blur-sm flex items-center justify-center p-4">
          <button onClick={() => setShowFullscreenImage(false)} className="absolute top-4 right-4 w-11 h-11 rounded-full bg-white/10 text-[#1a237e] flex items-center justify-center hover:bg-white/20">
            <X size={18} />
          </button>
          <img src={selectedOrder.nvrPhotoDataUrl} alt={selectedOrder.receiptNo} className="max-w-[96vw] max-h-[90vh] object-contain rounded-2xl border border-white/10 bg-black" />
        </div>
      )}
    </div>
  );
};

export default BossClientPage;




