import React, { useEffect, useMemo, useState } from 'react';
import {
  Camera,
  CheckCircle2,
  Clock,
  MapPin,
  Navigation,
  Package,
  PhoneCall,
  Printer,
  Route,
  ShieldAlert,
  Truck,
  X,
} from 'lucide-react';
import { motion } from 'framer-motion';
import SignaturePad from '../components/SignaturePad';
import {
  advanceProcurementOrder,
  createProcurementOrder,
  getProcurementOrders,
  ProcurementOrder,
  updateDriverTracking,
} from '../lib/procurementStore';
import { EmployeeAccount } from '../lib/employeeStore';

const DEFAULT_DRIVER_NAME = 'TIANYI 司机';
const DEFAULT_SHIPPING_COMPANY = '瓦努阿图船运公司';
const RETAILER_PHONE = 'tel:+6785550101';
const WHOLESALER_PHONE = 'tel:+6785550202';

type TaskFilter = 'PENDING' | 'ISSUES' | 'DONE';
const COORDINATES = {
  warehouse: { lat: -17.7406, lng: 168.3150, name: 'TIANYI 批发仓库' },
  shipping: { lat: -17.7512, lng: 168.3084, name: DEFAULT_SHIPPING_COMPANY },
  truck: { lat: -17.7464, lng: 168.3121, name: '当前配送车辆' },
  retailer: { lat: -17.7333, lng: 168.3273, name: 'ESS 零售店' },
};

interface DriverAppPageProps {
  userAccount?: EmployeeAccount | null;
  onLogout?: () => void;
}

const getDistanceKm = (from: { lat: number; lng: number }, to: { lat: number; lng: number }) => {
  const dx = (from.lat - to.lat) * 111;
  const dy = (from.lng - to.lng) * 111;
  return Math.sqrt(dx * dx + dy * dy);
};

const getStatusTone = (status: ProcurementOrder['status']) => {
  switch (status) {
    case 'DRIVER_ASSIGNED':
      return 'bg-[#1a237e] text-[#1a237e]';
    case 'IN_TRANSIT':
      return 'bg-[#1a237e] text-[#1a237e]';
    case 'AT_SHIPPING_COMPANY':
      return 'bg-[#1a237e] text-[#1a237e]';
    default:
      return 'bg-slate-100 text-slate-600';
  }
};

const getStatusLabel = (status: ProcurementOrder['status']) => {
  switch (status) {
    case 'DRIVER_ASSIGNED':
      return '待司机提货';
    case 'IN_TRANSIT':
      return '配送中';
    case 'AT_SHIPPING_COMPANY':
      return '已到船运公司';
    default:
      return status;
  }
};

const DriverAppPage: React.FC<DriverAppPageProps> = ({ userAccount, onLogout }) => {
  const [orders, setOrders] = useState<ProcurementOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState('');
  const [taskFilter, setTaskFilter] = useState<TaskFilter>('PENDING');
  const [handoffOrder, setHandoffOrder] = useState<ProcurementOrder | null>(null);
  const [shippingHandoffSignatureName, setShippingHandoffSignatureName] = useState('');
  const [shippingHandoffSignatureDataUrl, setShippingHandoffSignatureDataUrl] = useState('');
  const [shippingHandoffPhotoDataUrl, setShippingHandoffPhotoDataUrl] = useState('');
  const [issueOrder, setIssueOrder] = useState<ProcurementOrder | null>(null);
  const [issueType, setIssueType] = useState('车辆故障');
  const [issueNote, setIssueNote] = useState('');
  const [issuePhotoDataUrl, setIssuePhotoDataUrl] = useState('');
  const [detailOrder, setDetailOrder] = useState<ProcurementOrder | null>(null);
  const [liveLocation, setLiveLocation] = useState(COORDINATES.truck);
  const [doneDateFilter, setDoneDateFilter] = useState<'ALL' | 'TODAY' | '7D'>('ALL');

  const loadOrders = async () => {
    const allOrders = await getProcurementOrders();
    setOrders(
      allOrders.filter(
        (order) =>
          order.deliveryMode === 'SHIPMENT' &&
          ['DRIVER_ASSIGNED', 'IN_TRANSIT', 'AT_SHIPPING_COMPANY', 'RECEIVED', 'REJECTED'].includes(order.status)
      )
    );
    setLoading(false);
  };

  useEffect(() => {
    void loadOrders();
    const timer = window.setInterval(() => void loadOrders(), 10000);
    return () => window.clearInterval(timer);
  }, []);

  const pendingOrders = useMemo(
    () => orders.filter((order) => ['DRIVER_ASSIGNED', 'IN_TRANSIT', 'AT_SHIPPING_COMPANY'].includes(order.status)),
    [orders]
  );

  const issueOrders = useMemo(
    () => orders.filter((order) => order.driverIssueActive || (order.driverIssueLogs || []).length > 0),
    [orders]
  );

  const doneOrders = useMemo(() => {
    const now = Date.now();
    return orders.filter((order) => {
      if (order.status !== 'RECEIVED') return false;
      const time = new Date(order.updatedAt).getTime();
      if (doneDateFilter === 'TODAY') return new Date(order.updatedAt).toDateString() === new Date().toDateString();
      if (doneDateFilter === '7D') return now - time <= 7 * 24 * 60 * 60 * 1000;
      return true;
    });
  }, [orders, doneDateFilter]);

  const displayedOrders = useMemo(() => {
    if (taskFilter === 'ISSUES') return issueOrders;
    if (taskFilter === 'DONE') return doneOrders;
    return pendingOrders;
  }, [taskFilter, pendingOrders, issueOrders, doneOrders]);

  useEffect(() => {
    if (!pendingOrders.length) return;
    const targetOrderIds = pendingOrders.map((order) => order.id);
    let cancelled = false;

    const persistLocation = async (lat: number, lng: number, label: string) => {
      if (cancelled) return;
      setLiveLocation({ lat, lng, name: label });
      await updateDriverTracking(targetOrderIds, {
        driverAccountId: 'W-TIANYI-DRIVER',
        lat,
        lng,
        label,
      });
      await loadOrders();
    };

    const fallbackTimer = window.setInterval(() => {
      const nextLat = Number((COORDINATES.truck.lat + (Math.random() - 0.5) * 0.01).toFixed(6));
      const nextLng = Number((COORDINATES.truck.lng + (Math.random() - 0.5) * 0.01).toFixed(6));
      void persistLocation(nextLat, nextLng, '司机设备定位');
    }, 15000);

    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          void persistLocation(position.coords.latitude, position.coords.longitude, '司机实时定位');
        },
        () => {
          void persistLocation(COORDINATES.truck.lat, COORDINATES.truck.lng, '默认车辆点位');
        },
        { enableHighAccuracy: true, timeout: 10000, maximumAge: 10000 }
      );
    } else {
      void persistLocation(COORDINATES.truck.lat, COORDINATES.truck.lng, '默认车辆点位');
    }

    return () => {
      cancelled = true;
      window.clearInterval(fallbackTimer);
    };
  }, [pendingOrders]);

  const activeOrder = useMemo(
    () => pendingOrders.find((order) => order.status === 'IN_TRANSIT') || pendingOrders[0] || null,
    [pendingOrders]
  );

  const multiOrderSummary = useMemo(() => {
    const grouped = pendingOrders.reduce(
      (acc, order) => {
        if (order.status === 'DRIVER_ASSIGNED') acc.waiting += 1;
        else if (order.status === 'IN_TRANSIT') acc.transit += 1;
        else if (order.status === 'AT_SHIPPING_COMPANY') acc.handoff += 1;
        return acc;
      },
      { waiting: 0, transit: 0, handoff: 0 }
    );
    return grouped;
  }, [pendingOrders]);

  const dashboardStats = useMemo(() => {
    const pending = pendingOrders.filter((order) => order.status === 'DRIVER_ASSIGNED').length;
    const transit = pendingOrders.filter((order) => order.status === 'IN_TRANSIT').length;
    const deliveredToShipping = pendingOrders.filter((order) => order.status === 'AT_SHIPPING_COMPANY').length;
    return [
      { label: '待提货', value: pending, tone: 'bg-[#1a237e]' },
      { label: '配送中', value: transit, tone: 'bg-[#1a237e]' },
      { label: '待门店接收', value: deliveredToShipping, tone: 'bg-[#1a237e]' },
    ];
  }, [pendingOrders]);

  const driverTimeline = useMemo(
    () =>
      orders
        .flatMap((order) => order.timeline.map((item) => ({ ...item, orderId: order.id })))
        .slice()
        .sort((a, b) => String(b.at).localeCompare(String(a.at)))
        .slice(0, 8),
    [orders]
  );

  const activeMapPoints = useMemo(() => {
    const shippingName = activeOrder?.shippingCompanyName || DEFAULT_SHIPPING_COMPANY;
    const shipping = COORDINATES.shipping;
    const warehouseToShippingKm = getDistanceKm(COORDINATES.warehouse, shipping);
    const truckToShippingKm = getDistanceKm(COORDINATES.truck, shipping);
    const shippingToRetailerKm = getDistanceKm(shipping, COORDINATES.retailer);
    return {
      warehouse: COORDINATES.warehouse,
      truck: activeOrder?.driverCurrentLocation
        ? {
            lat: activeOrder.driverCurrentLocation.lat,
            lng: activeOrder.driverCurrentLocation.lng,
            name: activeOrder.driverCurrentLocation.label || '司机实时定位',
          }
        : liveLocation,
      shipping,
      retailer: COORDINATES.retailer,
      retailerName: activeOrder?.retailerName || COORDINATES.retailer.name,
      warehouseName: COORDINATES.warehouse.name,
      shippingName,
      warehouseToShippingKm,
      truckToShippingKm,
      shippingToRetailerKm,
      estimatedMinutes: Math.max(12, Math.round(truckToShippingKm * 6)),
    };
  }, [activeOrder]);

  const openNavigation = (destination: { lat: number; lng: number }) => {
    window.open(
      `https://www.google.com/maps/dir/?api=1&destination=${destination.lat},${destination.lng}&travelmode=driving`,
      '_blank'
    );
  };

  const doAction = async (
    orderId: string,
    action: 'START_TRANSIT' | 'MARK_AT_SHIPPING_COMPANY' | 'REPORT_ISSUE',
    options?: {
      shippingHandoffSignatureName?: string;
      shippingHandoffSignatureDataUrl?: string;
      shippingHandoffPhotoDataUrl?: string;
      issueType?: string;
      issueNote?: string;
      issuePhotoDataUrl?: string;
    }
  ) => {
    await advanceProcurementOrder(orderId, action, {
      name: DEFAULT_DRIVER_NAME,
      accountId: 'W-TIANYI-DRIVER',
      driverName: DEFAULT_DRIVER_NAME,
      shippingCompanyName: activeOrder?.shippingCompanyName || DEFAULT_SHIPPING_COMPANY,
      shippingHandoffSignatureName: options?.shippingHandoffSignatureName,
      shippingHandoffSignatureDataUrl: options?.shippingHandoffSignatureDataUrl,
      shippingHandoffPhotoDataUrl: options?.shippingHandoffPhotoDataUrl,
      issueType: options?.issueType,
      issueNote: options?.issueNote,
      issuePhotoDataUrl: options?.issuePhotoDataUrl,
    });
    setMessage(
      action === 'START_TRANSIT'
        ? '司机已开始配送到船运公司'
        : action === 'MARK_AT_SHIPPING_COMPANY'
          ? '已完成船运公司交接'
          : '已提交司机异常上报'
    );
    await loadOrders();
  };

  const handleIssueAction = async (order: ProcurementOrder, action: 'RESOLVE_ISSUE' | 'REDISPATCH') => {
    await advanceProcurementOrder(order.id, action, {
      name: DEFAULT_DRIVER_NAME,
      accountId: 'W-TIANYI-DRIVER',
      driverName: DEFAULT_DRIVER_NAME,
      shippingCompanyName: order.shippingCompanyName || DEFAULT_SHIPPING_COMPANY,
    });
    setMessage(action === 'RESOLVE_ISSUE' ? '异常任务已标记处理完成' : '异常任务已重新派送');
    await loadOrders();
  };

  const handleImageFile = (file: File | null | undefined, setter: (value: string) => void) => {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') setter(reader.result);
    };
    reader.readAsDataURL(file);
  };

  const printDeliveryNote = (order: ProcurementOrder) => {
    const printWindow = window.open('', '_blank', 'width=900,height=1200');
    if (!printWindow) return;
    printWindow.document.write(`
      <html>
        <head>
          <title>船运交接单-${order.id}</title>
          <style>
            body { font-family: Arial, sans-serif; padding: 24px; color: #0f172a; }
            h1 { margin-bottom: 8px; }
            .meta { margin-bottom: 8px; font-size: 14px; }
            .item { padding: 8px 0; border-bottom: 1px solid #e2e8f0; }
          </style>
        </head>
        <body>
          <h1>船运交接单</h1>
          <div class="meta">单号：${order.id}</div>
          <div class="meta">零售门店：${order.retailerName}</div>
          <div class="meta">船运公司：${order.shippingCompanyName || DEFAULT_SHIPPING_COMPANY}</div>
          <div class="meta">司机：${order.driverName || DEFAULT_DRIVER_NAME}</div>
          <div class="meta">状态：${getStatusLabel(order.status)}</div>
          ${order.items
            .map(
              (item) =>
                `<div class="item">${item.title} / 条码 ${item.barcode} / 数量 ${item.quantity}</div>`
            )
            .join('')}
        </body>
      </html>
    `);
    printWindow.document.close();
    printWindow.focus();
    printWindow.print();
  };

  const openHandoffModal = (order: ProcurementOrder) => {
    setHandoffOrder(order);
    setShippingHandoffSignatureName(order.shippingHandoffSignatureName || '');
    setShippingHandoffSignatureDataUrl(order.shippingHandoffSignatureDataUrl || '');
    setShippingHandoffPhotoDataUrl(order.shippingHandoffPhotoDataUrl || '');
  };


  const openIssueModal = (order: ProcurementOrder) => {
    setIssueOrder(order);
    setIssueType('车辆故障');
    setIssueNote('');
    setIssuePhotoDataUrl(order.driverIssuePhotoDataUrl || '');
  };

  const seedTestDriverOrder = async () => {
    setLoading(true);
    const order = await createProcurementOrder({
      retailerAccountId: 'R-ESS',
      retailerName: 'ESS 零售店',
      wholesalerAccountId: 'W-TIANYI',
      wholesalerName: 'TIANYI 批发店',
      deliveryMode: 'SHIPMENT',
      shippingCompanyName: DEFAULT_SHIPPING_COMPANY,
      note: '司机端测试配送单',
      items: [
        { productId: 'P-001', title: 'Vanuatu Spring Water 500ml', barcode: 'P-001', quantity: 12 },
        { productId: 'P-007', title: 'Switi Cola 500ml', barcode: 'P-007', quantity: 8 },
      ],
    });
    await advanceProcurementOrder(order.id, 'ALLOCATE', {
      name: 'TIANYI 配货员',
      accountId: 'W-TIANYI',
    });
    await advanceProcurementOrder(order.id, 'WAREHOUSE_OUT', {
      name: 'TIANYI 仓库',
      accountId: 'W-TIANYI',
    });
    await advanceProcurementOrder(order.id, 'ASSIGN_DRIVER', {
      name: DEFAULT_DRIVER_NAME,
      accountId: 'W-TIANYI-DRIVER',
      driverName: DEFAULT_DRIVER_NAME,
      shippingCompanyName: DEFAULT_SHIPPING_COMPANY,
    });
    setTaskFilter('PENDING');
    setMessage('已生成 1 张司机测试配送单');
    await loadOrders();
  };

  return (
    <div className="flex flex-col gap-4 sm:gap-6 max-w-7xl mx-auto pb-16">
      <div className="ui-card bg-white rounded-[28px] p-6 sm:p-8 text-[#1a237e] shadow-2xl overflow-hidden relative">
        <div className="absolute -top-10 -right-10 w-48 h-48 rounded-full bg-[#1a237e] blur-3xl" />
        <div className="relative flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-[#1a237e] flex items-center justify-center shadow-lg shadow-slate-200">
              <Truck size={28} />
            </div>
            <div>
              <div className="text-[10px] font-black uppercase tracking-[0.3em] text-[#1a237e]">司机配送工作台</div>
              <div className="mt-1 text-2xl font-black">TIANYI Driver Console</div>
              <div className="mt-1 text-sm font-bold text-slate-400">批发仓库 → 船运公司 → 零售门店 交接闭环</div>
            </div>
          </div>
          <div className="flex flex-wrap gap-3">
            <div className="rounded-2xl bg-white/10 px-4 py-3 text-left">
              <div className="text-[10px] font-black uppercase tracking-[0.25em] text-slate-400">司机资料</div>
              <div className="mt-1 text-sm font-black text-[#1a237e]">{userAccount?.displayName || DEFAULT_DRIVER_NAME}</div>
              <div className="text-xs font-bold text-slate-400">
                {userAccount?.username || 'driver'} · {userAccount?.role || '司机'}
              </div>
            </div>
            <button
              onClick={() => void loadOrders()}
              className="ui-btn px-4 py-3 rounded-2xl bg-white/10 text-[#1a237e] text-sm font-black"
            >
              刷新任务
            </button>
            <button
              onClick={() => void seedTestDriverOrder()}
              className="ui-btn px-4 py-3 rounded-2xl bg-[#1a237e] text-[#1a237e] text-sm font-black"
            >
              生成测试配送单
            </button>
            <button
              onClick={() => onLogout?.()}
              className="ui-btn px-4 py-3 rounded-2xl bg-[#1a237e] text-[#1a237e] text-sm font-black"
            >
              退出登录
            </button>
          </div>
        </div>
        {message && <div className="relative mt-4 rounded-2xl bg-white/10 px-4 py-3 text-sm font-black">{message}</div>}
        <div className="relative mt-4 grid grid-cols-1 md:grid-cols-3 gap-3">
          <div className="rounded-2xl bg-white/10 px-4 py-3 text-sm font-black">同时待提货：{multiOrderSummary.waiting} 单</div>
          <div className="rounded-2xl bg-white/10 px-4 py-3 text-sm font-black">同时配送中：{multiOrderSummary.transit} 单</div>
          <div className="rounded-2xl bg-white/10 px-4 py-3 text-sm font-black">待门店接收：{multiOrderSummary.handoff} 单</div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {dashboardStats.map((item) => (
          <div key={item.label} className="ui-card bg-white rounded-[24px] p-5 border border-slate-200 shadow-sm">
            <div className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500">{item.label}</div>
            <div className="mt-2 flex items-center gap-2 text-3xl font-black text-slate-900">
              <span className={`w-3 h-3 rounded-full ${item.value > 0 ? item.tone : 'bg-slate-200'}`} />
              {item.value} 单
            </div>
          </div>
        ))}
      </div>

      {activeOrder && (
        <div className="ui-card bg-white rounded-[24px] p-6 border border-[#dbe7ff] shadow-sm">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
            <div>
              <div className="text-[10px] font-black uppercase tracking-[0.25em] text-[#1a237e]">当前配送中</div>
              <div className="mt-1 text-2xl font-black text-slate-900">{activeOrder.id}</div>
              <div className="mt-1 text-sm font-bold text-slate-500">
                {activeOrder.wholesalerName} → {activeOrder.shippingCompanyName || DEFAULT_SHIPPING_COMPANY}
              </div>
            </div>
            {(activeOrder.status === 'IN_TRANSIT' || activeOrder.status === 'AT_SHIPPING_COMPANY') && (
              <button
                onClick={() => openHandoffModal(activeOrder)}
                className="ui-btn px-5 py-3 rounded-2xl bg-[#1a237e] text-[#1a237e] text-sm font-black"
              >
                录入船运交接签字
              </button>
            )}
            <button
              onClick={() => openIssueModal(activeOrder)}
              className="ui-btn px-5 py-3 rounded-2xl bg-[#1a237e] text-[#1a237e] text-sm font-black"
            >
              异常上报
            </button>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 xl:grid-cols-[1.25fr_0.95fr] gap-4 sm:gap-6">
        <div className="ui-card bg-white rounded-[24px] p-5 sm:p-6 border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-[10px] font-black uppercase tracking-[0.25em] text-slate-500">配送地图</div>
              <div className="mt-1 text-lg font-black text-slate-900">真实点位示意</div>
            </div>
            <div className="text-[11px] font-bold text-[#1a237e]">
              {activeOrder ? activeOrder.shippingCompanyName || DEFAULT_SHIPPING_COMPANY : '等待新任务'}
            </div>
          </div>
          <div className="mt-4 h-72 rounded-[24px] border border-dashed border-[#dbe7ff] bg-gradient-to-br from-[#eef4ff] via-white to-[#f8f9fa] relative overflow-hidden">
            <svg className="absolute inset-0 w-full h-full" viewBox="0 0 100 100" preserveAspectRatio="none">
              <line x1="18" y1="20" x2="72" y2="48" stroke="#38bdf8" strokeWidth="2.5" strokeDasharray="6 4" />
              <line x1="72" y1="48" x2="84" y2="78" stroke="#24308f" strokeWidth="2.5" strokeDasharray="6 4" />
              <line x1="84" y1="78" x2="90" y2="92" stroke="#8b5cf6" strokeWidth="2" strokeDasharray="5 5" />
              <circle cx="18" cy="20" r="2.8" fill="#0f172a" />
              <circle cx="72" cy="48" r="2.8" fill="#24308f" />
              <circle cx="84" cy="78" r="2.8" fill="#0ea5e9" />
              <circle cx="90" cy="92" r="2.6" fill="#8b5cf6" />
            </svg>
            <div className="absolute inset-0 opacity-30">
              <div className="absolute inset-y-0 left-1/3 w-px bg-[#1a237e]" />
              <div className="absolute inset-y-0 left-2/3 w-px bg-[#1a237e]" />
              <div className="absolute inset-x-0 top-1/3 h-px bg-[#1a237e]" />
              <div className="absolute inset-x-0 top-2/3 h-px bg-[#1a237e]" />
            </div>
            <div className="absolute left-8 top-12 flex items-center gap-2 rounded-full bg-white px-3 py-2 text-[#1a237e] text-xs font-black shadow-lg">
              <MapPin size={14} /> 仓库 {activeMapPoints.warehouse.lat}, {activeMapPoints.warehouse.lng}
            </div>
            <div className="absolute right-8 bottom-12 flex items-center gap-2 rounded-full bg-[#1a237e] px-3 py-2 text-[#1a237e] text-xs font-black shadow-lg">
              <Navigation size={14} /> 船运 {activeMapPoints.shipping.lat}, {activeMapPoints.shipping.lng}
            </div>
            <div className="absolute left-[28%] top-[46%] flex items-center gap-2 rounded-full bg-[#1a237e] px-3 py-2 text-[#1a237e] text-xs font-black shadow-lg">
              <Truck size={14} /> 车辆 {activeMapPoints.truck.lat}, {activeMapPoints.truck.lng}
            </div>
            <div className="absolute right-4 bottom-3 flex items-center gap-2 rounded-full bg-violet-500 px-3 py-2 text-[#1a237e] text-xs font-black shadow-lg">
              <Package size={14} /> 门店 {activeMapPoints.retailer.lat}, {activeMapPoints.retailer.lng}
            </div>
            <div className="absolute left-12 bottom-8 rounded-2xl bg-white/90 backdrop-blur px-4 py-3 shadow text-xs font-bold text-slate-600">
              <div>起点：{activeMapPoints.warehouseName}</div>
              <div className="mt-1">中转：{activeMapPoints.shippingName}</div>
              <div className="mt-1 text-[#1a237e]">最终门店：{activeMapPoints.retailerName}</div>
              <div className="mt-2 text-[#1a237e]">预计里程：{activeMapPoints.warehouseToShippingKm.toFixed(1)} km</div>
              <div className="mt-1 text-[#1a237e]">车辆 → 船运：{activeMapPoints.truckToShippingKm.toFixed(1)} km</div>
              <div className="mt-1 text-violet-600">船运 → 门店：{activeMapPoints.shippingToRetailerKm.toFixed(1)} km</div>
              <div className="mt-2 text-slate-700">预计送达：约 {activeMapPoints.estimatedMinutes} 分钟</div>
              {activeOrder?.driverLastPingAt && <div className="mt-1 text-[#1a237e]">最后定位：{activeOrder.driverLastPingAt}</div>}
            </div>
          </div>
          <div className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-3">
            <button onClick={() => openNavigation(activeMapPoints.warehouse)} className="ui-btn h-11 rounded-2xl bg-slate-100 text-slate-700 text-sm font-black">
              导航到仓库
            </button>
            <button onClick={() => openNavigation(activeMapPoints.shipping)} className="ui-btn h-11 rounded-2xl bg-[#1a237e] text-[#1a237e] text-sm font-black">
              导航到船运公司
            </button>
            <button onClick={() => openNavigation(activeMapPoints.retailer)} className="ui-btn h-11 rounded-2xl bg-violet-500 text-[#1a237e] text-sm font-black">
              查看最终门店
            </button>
          </div>
        </div>

        <div className="ui-card bg-white rounded-[24px] p-5 sm:p-6 border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-[10px] font-black uppercase tracking-[0.25em] text-slate-500">配送时间轴</div>
              <div className="mt-1 text-lg font-black text-slate-900">最近任务进度</div>
            </div>
            <Clock className="text-[#1a237e]" size={18} />
          </div>
          <div className="mt-4 space-y-4">
            {driverTimeline.length === 0 ? (
              <div className="rounded-2xl bg-slate-50 border border-slate-100 px-4 py-6 text-sm font-bold text-slate-500">
                还没有配送时间轴记录。
              </div>
            ) : (
              driverTimeline.map((item, index) => (
                <div key={`${item.orderId}-${item.at}-${index}`} className="flex gap-3">
                  <div className="flex flex-col items-center">
                    <div className="w-3 h-3 rounded-full bg-[#1a237e] mt-1" />
                    {index !== driverTimeline.length - 1 && <div className="w-px flex-1 bg-slate-200 mt-2" />}
                  </div>
                  <div className="flex-1 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
                    <div className="flex items-center justify-between gap-3">
                      <div className="text-sm font-black text-slate-900">{item.label}</div>
                      <div className="text-[10px] font-black text-slate-500">{item.orderId}</div>
                    </div>
                    <div className="mt-1 text-[11px] font-bold text-slate-500">{item.at}</div>
                    <div className="mt-1 text-[11px] font-bold text-[#1a237e]">操作人：{item.by}</div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      <div className="flex flex-wrap gap-3">
        {[
          { id: 'PENDING' as const, label: '待提货', count: pendingOrders.length },
          { id: 'ISSUES' as const, label: '异常', count: issueOrders.length },
          { id: 'DONE' as const, label: '已完成', count: doneOrders.length },
        ].map((tab) => {
          const active = taskFilter === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setTaskFilter(tab.id)}
              className={`ui-btn px-4 py-3 rounded-2xl text-sm font-black ${
                active ? 'bg-white text-[#1a237e]' : 'bg-white border border-slate-200 text-slate-600'
              }`}
            >
              {tab.label} · {tab.count}
            </button>
          );
        })}
      </div>

      <div className="space-y-4 sm:space-y-6">
        <div className="flex items-center justify-between px-2">
          <h3 className="text-sm font-black uppercase text-slate-500 tracking-[0.2em] flex items-center gap-2">
            <Package size={16} /> {taskFilter === 'PENDING' ? '待处理配送任务' : taskFilter === 'ISSUES' ? '异常任务记录' : '已完成任务'}
          </h3>
          {taskFilter === 'DONE' && (
            <div className="flex items-center gap-2">
              {[
                { id: 'ALL' as const, label: '全部' },
                { id: 'TODAY' as const, label: '今天' },
                { id: '7D' as const, label: '近7天' },
              ].map((item) => (
                <button
                  key={item.id}
                  onClick={() => setDoneDateFilter(item.id)}
                  className={`ui-btn px-3 h-9 rounded-xl text-xs font-black ${
                    doneDateFilter === item.id ? 'bg-white text-[#1a237e]' : 'bg-white border border-slate-200 text-slate-600'
                  }`}
                >
                  {item.label}
                </button>
              ))}
            </div>
          )}
        </div>
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-3 sm:gap-4">
          {!loading && displayedOrders.length === 0 ? (
            <div className="ui-card bg-white rounded-[24px] p-8 border border-slate-200 shadow-sm text-sm text-slate-500 font-bold xl:col-span-2">
              {taskFilter === 'PENDING' ? '暂时还没有司机任务，可以先点上方“生成测试配送单”。' : taskFilter === 'ISSUES' ? '当前没有司机异常记录。' : '当前还没有已完成配送单。'}
            </div>
          ) : (
            displayedOrders.map((order) => (
              <motion.div
                key={order.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="ui-card bg-white rounded-[24px] sm:rounded-[32px] p-4 sm:p-6 lg:p-8 border border-slate-200 shadow-sm"
              >
                <div className="flex flex-col md:flex-row gap-4 sm:gap-6 lg:gap-8">
                  <div className="flex-1 space-y-5">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <div className="flex items-center gap-3">
                        <span className="bg-slate-100 px-3 py-1 rounded text-[10px] font-black uppercase tracking-widest text-slate-500">
                          {order.id}
                        </span>
                        <span className={`text-[10px] font-black px-2 py-0.5 rounded uppercase ${getStatusTone(order.status)}`}>
                          {getStatusLabel(order.status)}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 text-slate-500 text-xs font-bold">
                        <Clock size={14} /> 更新：{order.updatedAt}
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-8">
                      <div className="flex items-center gap-4">
                        <div className="w-10 h-10 bg-slate-50 rounded-xl flex items-center justify-center text-slate-500">
                          <MapPin size={18} />
                        </div>
                        <div className="min-w-0">
                          <div className="text-[10px] font-black uppercase text-slate-500 tracking-widest">提货点</div>
                          <div className="text-sm font-black text-slate-800 truncate">{order.wholesalerName} 仓库</div>
                          <div className="text-[10px] text-slate-500 font-bold uppercase truncate">批发商已完成出库</div>
                        </div>
                      </div>

                      <div className="flex items-center gap-4">
                        <div className="w-10 h-10 bg-[#1a237e] rounded-xl flex items-center justify-center text-[#1a237e]">
                          <Navigation size={18} />
                        </div>
                        <div className="min-w-0">
                          <div className="text-[10px] font-black uppercase text-slate-500 tracking-widest">送达点</div>
                          <div className="text-sm font-black text-slate-800 truncate">
                            {order.shippingCompanyName || DEFAULT_SHIPPING_COMPANY}
                          </div>
                          <div className="text-[10px] text-slate-500 font-bold uppercase truncate">
                            最终门店：{order.retailerName}
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="flex flex-wrap gap-2">
                      {order.items.map((item) => (
                        <span
                          key={`${order.id}-${item.productId}`}
                          className="px-2.5 py-1 rounded-full bg-slate-100 text-[11px] font-black text-slate-600"
                        >
                          {item.title} x {item.quantity}
                        </span>
                      ))}
                    </div>
                    <div className="text-xs font-bold text-slate-500">
                      同车批量配送：当前司机可同时处理多张单据，这张单保持独立时间轴和异常记录。
                    </div>
                    {order.driverLastPingAt && (
                      <div className="rounded-2xl bg-[#1a237e] border border-[#dbe7ff] px-4 py-3 text-xs font-bold text-[#1a237e]">
                        司机实时定位：{order.driverCurrentLocation?.lat?.toFixed(6)}, {order.driverCurrentLocation?.lng?.toFixed(6)}
                        <div className="mt-1 text-[11px] text-[#1a237e]">最后回传：{order.driverLastPingAt}</div>
                      </div>
                    )}
                    {(order.driverIssueLogs || []).length > 0 && (
                      <div className="rounded-2xl border border-[#dbe7ff] bg-[#1a237e] px-4 py-3 space-y-2">
                        <div className="text-[10px] font-black uppercase tracking-[0.2em] text-[#1a237e]">最近异常</div>
                        {order.driverIssueLogs?.slice(-1).map((issue, index) => (
                          <div key={`${order.id}-issue-${index}`} className="text-sm font-bold text-[#1a237e]">
                            {issue.type} · {issue.note} · {issue.at}
                          </div>
                        ))}
                        {order.driverIssuePhotoDataUrl && (
                          <img
                            src={order.driverIssuePhotoDataUrl}
                            alt="异常照片"
                            className="w-full h-36 object-cover rounded-2xl border border-[#dbe7ff]"
                          />
                        )}
                        <div className="grid grid-cols-2 gap-2 pt-1">
                          <button
                            onClick={() => void handleIssueAction(order, 'RESOLVE_ISSUE')}
                            className="ui-btn h-10 rounded-2xl bg-[#1a237e] text-[#1a237e] text-[10px] font-black uppercase"
                          >
                            标记已处理
                          </button>
                          <button
                            onClick={() => void handleIssueAction(order, 'REDISPATCH')}
                            className="ui-btn h-10 rounded-2xl bg-[#1a237e] text-[#1a237e] text-[10px] font-black uppercase"
                          >
                            重新派送
                          </button>
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="flex flex-col gap-3 justify-center md:w-56">
                    <button
                      onClick={() => printDeliveryNote(order)}
                      className="ui-btn w-full py-3 rounded-[18px] bg-slate-200 text-slate-700 text-[10px] uppercase tracking-widest flex items-center justify-center gap-2"
                    >
                      <Printer size={14} /> 打印船运交接单
                    </button>
                    {order.status === 'DRIVER_ASSIGNED' && (
                      <button
                        onClick={() => void doAction(order.id, 'START_TRANSIT')}
                        className="ui-btn ui-btn-primary w-full py-4 rounded-[20px] text-[10px] uppercase tracking-widest flex items-center justify-center gap-2"
                      >
                        <Route size={14} /> 开始配送到船运公司
                      </button>
                    )}
                    {order.status === 'IN_TRANSIT' && (
                      <button
                        onClick={() => openHandoffModal(order)}
                        className="ui-btn w-full py-4 rounded-[20px] bg-[#1a237e] text-[#1a237e] text-[10px] uppercase tracking-widest flex items-center justify-center gap-2"
                      >
                        <CheckCircle2 size={14} /> 录入船运交接签字
                      </button>
                    )}
                    {order.status === 'AT_SHIPPING_COMPANY' && (
                      <div className="space-y-2">
                        <div className="rounded-2xl bg-[#1a237e] text-[#1a237e] px-4 py-3 text-xs font-black flex items-center justify-center gap-2">
                          <CheckCircle2 size={16} /> 等待零售商从船运公司接收
                        </div>
                        {order.shippingHandoffPhotoDataUrl && (
                          <img
                            src={order.shippingHandoffPhotoDataUrl}
                            alt="船运交接到达照片"
                            className="w-full h-28 object-cover rounded-2xl border border-slate-200"
                          />
                        )}
                      </div>
                    )}
                    <div className="grid grid-cols-2 gap-2">
                      <a href={RETAILER_PHONE} className="ui-btn flex items-center justify-center gap-2 px-3 py-3 rounded-2xl bg-slate-100 text-[10px] font-black text-slate-600 uppercase">
                        <PhoneCall size={14} /> 门店
                      </a>
                      <a href={WHOLESALER_PHONE} className="ui-btn flex items-center justify-center gap-2 px-3 py-3 rounded-2xl bg-slate-100 text-[10px] font-black text-slate-600 uppercase">
                        <PhoneCall size={14} /> 批发商
                      </a>
                    </div>
                    <button
                      onClick={() => openIssueModal(order)}
                      className="ui-btn flex items-center justify-center gap-2 px-3 py-3 rounded-2xl bg-[#1a237e] text-[10px] font-black text-[#1a237e] uppercase"
                    >
                      <ShieldAlert size={14} /> 异常上报
                    </button>
                    <button
                      onClick={() => setDetailOrder(order)}
                      className="ui-btn flex items-center justify-center gap-2 px-3 py-3 rounded-2xl bg-white text-[10px] font-black text-[#1a237e] uppercase"
                    >
                      查看详情
                    </button>
                  </div>
                </div>
              </motion.div>
            ))
          )}
        </div>
      </div>


      {detailOrder && (
        <div className="fixed inset-0 z-50 bg-white/85 backdrop-blur-sm flex items-center justify-center p-4">
          <motion.div
            initial={{ scale: 0.96, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="w-full max-w-3xl rounded-3xl bg-white p-6 space-y-5 shadow-2xl max-h-[90vh] overflow-y-auto"
          >
            <div className="flex items-center justify-between gap-3">
              <div>
                <div className="text-lg font-black text-slate-900">已完成任务详情</div>
                <div className="mt-1 text-sm text-slate-500">{detailOrder.id} · {detailOrder.retailerName}</div>
              </div>
              <button
                onClick={() => setDetailOrder(null)}
                className="w-9 h-9 rounded-full bg-slate-100 text-slate-600 flex items-center justify-center"
              >
                <X size={16} />
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                <div className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500">配送信息</div>
                <div className="mt-2 space-y-2 text-sm font-bold text-slate-700">
                  <div>状态：{getStatusLabel(detailOrder.status)}</div>
                  <div>批发商：{detailOrder.wholesalerName}</div>
                  <div>船运公司：{detailOrder.shippingCompanyName || DEFAULT_SHIPPING_COMPANY}</div>
                  <div>司机：{detailOrder.driverName || DEFAULT_DRIVER_NAME}</div>
                  <div>更新时间：{detailOrder.updatedAt}</div>
                </div>
              </div>
              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                <div className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500">定位与交接</div>
                <div className="mt-2 space-y-2 text-sm font-bold text-slate-700">
                  <div>
                    当前定位：
                    {detailOrder.driverCurrentLocation
                      ? ` ${detailOrder.driverCurrentLocation.lat.toFixed(6)}, ${detailOrder.driverCurrentLocation.lng.toFixed(6)}`
                      : ' 暂无'}
                  </div>
                  <div>最后定位回传：{detailOrder.driverLastPingAt || '暂无'}</div>
                  <div>交接签字人：{detailOrder.shippingHandoffSignatureName || '暂无'}</div>
                  <div>交接时间：{detailOrder.shippingHandoffSignedAt || '暂无'}</div>
                </div>
              </div>
            </div>

            <div className="rounded-2xl border border-slate-200 p-4">
              <div className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500">商品明细</div>
              <div className="mt-3 space-y-2">
                {detailOrder.items.map((item) => (
                  <div key={`${detailOrder.id}-${item.productId}`} className="rounded-2xl bg-slate-50 px-4 py-3 text-sm font-bold text-slate-700 flex items-center justify-between gap-3">
                    <div>{item.title}</div>
                    <div className="text-slate-500">条码 {item.barcode} · 数量 {item.quantity}</div>
                  </div>
                ))}
              </div>
            </div>

            {(detailOrder.driverIssueLogs || []).length > 0 && (
              <div className="rounded-2xl border border-[#dbe7ff] bg-[#1a237e] p-4">
                <div className="text-[10px] font-black uppercase tracking-[0.2em] text-[#1a237e]">异常记录</div>
                <div className="mt-3 space-y-2">
                  {detailOrder.driverIssueLogs?.map((issue, index) => (
                    <div key={`${detailOrder.id}-issue-log-${index}`} className="rounded-2xl bg-white px-4 py-3 text-sm font-bold text-[#1a237e]">
                      {issue.type} · {issue.note} · {issue.at}
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {detailOrder.shippingHandoffPhotoDataUrl && (
                <img
                  src={detailOrder.shippingHandoffPhotoDataUrl}
                  alt="船运交接照片"
                  className="w-full h-56 object-cover rounded-2xl border border-slate-200"
                />
              )}
              {detailOrder.driverIssuePhotoDataUrl && (
                <img
                  src={detailOrder.driverIssuePhotoDataUrl}
                  alt="异常照片"
                  className="w-full h-56 object-cover rounded-2xl border border-slate-200"
                />
              )}
            </div>
          </motion.div>
        </div>
      )}

      {issueOrder && (
        <div className="fixed inset-0 z-50 bg-white/85 backdrop-blur-sm flex items-center justify-center p-4">
          <motion.div
            initial={{ scale: 0.96, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.96, opacity: 0 }}
            className="w-full max-w-lg rounded-3xl bg-white p-6 space-y-4 shadow-2xl"
          >
            <div className="flex items-center justify-between gap-3">
              <div>
                <div className="text-lg font-black text-slate-900">司机异常上报</div>
                <div className="mt-1 text-sm text-slate-500">{issueOrder.id} · {issueOrder.retailerName}</div>
              </div>
              <button
                onClick={() => setIssueOrder(null)}
                className="w-9 h-9 rounded-full bg-slate-100 text-slate-600 flex items-center justify-center"
              >
                <X size={16} />
              </button>
            </div>
            <div className="space-y-2">
              <label className="text-xs font-black text-slate-500 uppercase tracking-widest">异常类型</label>
              <select
                value={issueType}
                onChange={(e) => setIssueType(e.target.value)}
                className="w-full h-11 rounded-xl border border-slate-200 px-3 text-sm font-black bg-white"
              >
                <option value="车辆故障">车辆故障</option>
                <option value="交通延误">交通延误</option>
                <option value="货损异常">货损异常</option>
                <option value="联系不上收货方">联系不上收货方</option>
              </select>
            </div>
            <div className="space-y-2">
              <label className="text-xs font-black text-slate-500 uppercase tracking-widest">异常说明</label>
              <textarea
                value={issueNote}
                onChange={(e) => setIssueNote(e.target.value)}
                rows={4}
                placeholder="请输入本次配送异常说明"
                className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm font-bold text-slate-700 resize-none"
              />
            </div>
            <div className="space-y-2">
              <div className="text-xs font-black text-slate-500 uppercase tracking-widest">异常照片上传</div>
              <label className="flex items-center gap-2 rounded-2xl border border-dashed border-slate-300 px-4 py-3 text-sm font-black text-slate-600 cursor-pointer">
                <Camera size={16} /> 选择异常照片
                <input
                  type="file"
                  accept="image/*"
                  capture="environment"
                  onChange={(e) => handleImageFile(e.target.files?.[0], setIssuePhotoDataUrl)}
                  className="hidden"
                />
              </label>
              {issuePhotoDataUrl && (
                <img
                  src={issuePhotoDataUrl}
                  alt="异常照片预览"
                  className="w-full max-h-56 object-cover rounded-2xl border border-slate-200"
                />
              )}
            </div>
            <button
              onClick={async () => {
                if (!issueNote.trim()) return;
                await doAction(issueOrder.id, 'REPORT_ISSUE', {
                  issueType,
                  issueNote: issueNote.trim(),
                  issuePhotoDataUrl,
                });
                setIssueOrder(null);
                setIssueType('车辆故障');
                setIssueNote('');
                setIssuePhotoDataUrl('');
              }}
              className="ui-btn w-full h-11 rounded-xl bg-[#1a237e] text-[#1a237e] text-sm font-black"
            >
              提交异常上报
            </button>
          </motion.div>
        </div>
      )}

      {handoffOrder && (
        <div className="fixed inset-0 z-50 bg-white/85 backdrop-blur-sm flex items-center justify-center p-4">
          <motion.div
            initial={{ scale: 0.96, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.96, opacity: 0 }}
            className="w-full max-w-lg rounded-3xl bg-white p-6 space-y-4 shadow-2xl"
          >
            <div className="flex items-center justify-between gap-3">
              <div>
                <div className="text-lg font-black text-slate-900">船运交接签字</div>
                <div className="mt-1 text-sm text-slate-500">
                  {handoffOrder.id} · {handoffOrder.shippingCompanyName || DEFAULT_SHIPPING_COMPANY}
                </div>
              </div>
              <button
                onClick={() => setHandoffOrder(null)}
                className="w-9 h-9 rounded-full bg-slate-100 text-slate-600 flex items-center justify-center"
              >
                <X size={16} />
              </button>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-black text-slate-500 uppercase tracking-widest">船运公司签字人</label>
              <input
                type="text"
                value={shippingHandoffSignatureName}
                onChange={(e) => setShippingHandoffSignatureName(e.target.value)}
                placeholder="输入船运公司交接签字人姓名"
                className="w-full h-11 rounded-xl border border-slate-200 px-3 text-sm font-black"
              />
            </div>

            <SignaturePad value={shippingHandoffSignatureDataUrl} onChange={setShippingHandoffSignatureDataUrl} />

            <div className="space-y-2">
              <div className="text-xs font-black text-slate-500 uppercase tracking-widest">到达照片留档</div>
              <label className="flex items-center gap-2 rounded-2xl border border-dashed border-slate-300 px-4 py-3 text-sm font-black text-slate-600 cursor-pointer">
                <Camera size={16} /> 选择到达照片
                <input
                  type="file"
                  accept="image/*"
                  capture="environment"
                  onChange={(e) => handleImageFile(e.target.files?.[0], setShippingHandoffPhotoDataUrl)}
                  className="hidden"
                />
              </label>
              {shippingHandoffPhotoDataUrl && (
                <img
                  src={shippingHandoffPhotoDataUrl}
                  alt="到达照片预览"
                  className="w-full max-h-56 object-cover rounded-2xl border border-slate-200"
                />
              )}
            </div>

            <button
              onClick={async () => {
                if (!shippingHandoffSignatureName.trim() || !shippingHandoffSignatureDataUrl) return;
                await doAction(handoffOrder.id, 'MARK_AT_SHIPPING_COMPANY', {
                  shippingHandoffSignatureName: shippingHandoffSignatureName.trim(),
                  shippingHandoffSignatureDataUrl,
                  shippingHandoffPhotoDataUrl,
                });
                setHandoffOrder(null);
                setShippingHandoffSignatureName('');
                setShippingHandoffSignatureDataUrl('');
                setShippingHandoffPhotoDataUrl('');
              }}
              className="ui-btn w-full h-11 rounded-xl bg-[#1a237e] text-[#1a237e] text-sm font-black"
            >
              确认交接签字并送达
            </button>
          </motion.div>
        </div>
      )}
    </div>
  );
};

export default DriverAppPage;


