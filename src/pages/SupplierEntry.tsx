import React, { useEffect, useMemo, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { CheckCircle2, Clock3, Package, Plus, Save, Scan, Trash2, X } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { CASE_TO_BOTTLE_RATIO, VAT_RATE } from '../lib/constants';
import { AccountProgramSettings, getAccountProgramSettings } from '../lib/accountScopedStore';
import SignaturePad from '../components/SignaturePad';
import {
  advanceProcurementOrder,
  createProcurementOrder,
  getDefaultWholesalePartner,
  getDeliveryModeLabel,
  getProcurementOrders,
  getProcurementStatusLabel,
  ProcurementDeliveryMode,
  ProcurementOrder,
} from '../lib/procurementStore';
import { printProcurementDocument } from '../lib/procurementDocs';
import { formatVT } from '../lib/utils';

interface StockItem {
  id: string;
  sku: string;
  name: string;
  cases: number;
  unitPriceWithVat: number;
}

interface SupplierEntryProps {
  userAccount?: { id: string; name: string };
}

type ReceiptDraftMeta = Record<
  string,
  { quantity: number; batchNo: string; expiryDate: string; qualityFlags: string[] }
>;

type ShippingCompanyOption = {
  id: string;
  name: string;
  enabled: boolean;
  isDefault?: boolean;
  sortOrder?: number;
};

const DEFAULT_SHIPPING_COMPANY = '瓦努阿图船运公司';

const normalizeShippingCompanies = (settings: AccountProgramSettings): ShippingCompanyOption[] => {
  const raw = settings.commonShippingCompanies;
  if (!Array.isArray(raw) || raw.length === 0) {
    return [{ id: 'shipping-default', name: DEFAULT_SHIPPING_COMPANY, enabled: true, isDefault: true, sortOrder: 1 }];
  }
  if (typeof raw[0] === 'string') {
    return (raw as unknown as string[]).map((name, index) => ({
      id: `shipping-${index + 1}`,
      name,
      enabled: true,
      isDefault: index === 0,
      sortOrder: index + 1,
    }));
  }
  return [...(raw as ShippingCompanyOption[])]
    .filter((item) => item.enabled !== false)
    .sort((a, b) => Number(a.sortOrder || 0) - Number(b.sortOrder || 0));
};

const SupplierEntryPage: React.FC<SupplierEntryProps> = ({ userAccount }) => {
  const { t } = useTranslation();
  const currentAccountId = userAccount?.id || 'R-ESS';
  const currentRetailerName = userAccount?.name || 'ESS 零售店';
  const wholesalePartner = getDefaultWholesalePartner(currentAccountId);

  const [items, setItems] = useState<StockItem[]>([]);
  const [newItem, setNewItem] = useState({ sku: '', name: '', cases: 0, unitPriceWithVat: 0 });
  const [retailOrders, setRetailOrders] = useState<ProcurementOrder[]>([]);
  const [deliveryMode, setDeliveryMode] = useState<ProcurementDeliveryMode>('SHIPMENT');
  const [shippingCompanyName, setShippingCompanyName] = useState(DEFAULT_SHIPPING_COMPANY);
  const [isSaving, setIsSaving] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [isScanning, setIsScanning] = useState(false);
  const [expandedOrderId, setExpandedOrderId] = useState<string | null>(null);
  const [detailOrder, setDetailOrder] = useState<ProcurementOrder | null>(null);
  const [receiptOrder, setReceiptOrder] = useState<ProcurementOrder | null>(null);
  const [receiptDraft, setReceiptDraft] = useState<ReceiptDraftMeta>({});
  const [receiptPhotoDataUrl, setReceiptPhotoDataUrl] = useState('');
  const [pickupSignatureName, setPickupSignatureName] = useState('');
  const [pickupSignatureDataUrl, setPickupSignatureDataUrl] = useState('');
  const [shippingCompanies, setShippingCompanies] = useState<ShippingCompanyOption[]>([
    { id: 'shipping-default', name: DEFAULT_SHIPPING_COMPANY, enabled: true, isDefault: true, sortOrder: 1 },
  ]);

  const refreshOrders = async () => {
    const orders = await getProcurementOrders();
    setRetailOrders(orders.filter((order) => order.retailerAccountId === currentAccountId));
  };

  useEffect(() => {
    void refreshOrders();
  }, [currentAccountId]);

  useEffect(() => {
    let mounted = true;
    (async () => {
      const settings = await getAccountProgramSettings(currentAccountId);
      if (!mounted) return;
      const companies = normalizeShippingCompanies(settings);
      setShippingCompanies(companies);
      const defaultCompany = companies.find((item) => item.isDefault)?.name || companies[0]?.name || DEFAULT_SHIPPING_COMPANY;
      if (!companies.some((item) => item.name === shippingCompanyName)) {
        setShippingCompanyName(defaultCompany);
      }
    })();
    return () => {
      mounted = false;
    };
  }, [currentAccountId]);

  const totals = useMemo(() => {
    const totalCases = items.reduce((sum, item) => sum + item.cases, 0);
    const totalBottles = totalCases * CASE_TO_BOTTLE_RATIO;
    const totalGross = items.reduce((sum, item) => sum + item.cases * item.unitPriceWithVat, 0);
    const vatAmount = totalGross - totalGross / (1 + VAT_RATE);
    const subtotal = totalGross - vatAmount;
    return { totalCases, totalBottles, totalGross, vatAmount, subtotal };
  }, [items]);

  const pendingReceiptCount = retailOrders.filter(
    (order) => order.status === 'READY_FOR_PICKUP' || order.status === 'AT_SHIPPING_COMPANY'
  ).length;
  const rejectedCount = retailOrders.filter((order) => order.status === 'REJECTED').length;

  const addItem = () => {
    if (!newItem.sku || !newItem.name || newItem.cases <= 0) return;
    setItems((prev) => [...prev, { ...newItem, id: Date.now().toString() }]);
    setNewItem({ sku: '', name: '', cases: 0, unitPriceWithVat: 0 });
    setIsScanning(false);
  };

  const removeItem = (id: string) => {
    setItems((prev) => prev.filter((item) => item.id !== id));
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      await createProcurementOrder({
        retailerAccountId: currentAccountId,
        retailerName: currentRetailerName,
        wholesalerAccountId: wholesalePartner.accountId,
        wholesalerName: wholesalePartner.name,
        deliveryMode,
        shippingCompanyName: deliveryMode === 'SHIPMENT' ? shippingCompanyName || DEFAULT_SHIPPING_COMPANY : undefined,
        items: items.map((item) => ({
          productId: item.sku,
          title: item.name,
          barcode: item.sku,
          quantity: item.cases,
        })),
        note: `共 ${totals.totalCases} 箱 / ${totals.totalBottles} 瓶`,
      });
      setItems([]);
      setDeliveryMode('SHIPMENT');
      setShippingCompanyName(DEFAULT_SHIPPING_COMPANY);
      setIsScanning(false);
      setShowSuccess(true);
      await refreshOrders();
      setTimeout(() => setShowSuccess(false), 2500);
    } finally {
      setIsSaving(false);
    }
  };

  const openReceiptModal = (order: ProcurementOrder) => {
    setReceiptOrder(order);
    setReceiptDraft(
      Object.fromEntries(
        order.items.map((item) => [
          item.productId,
          {
            quantity: item.quantity,
            batchNo: item.batchNo || '',
            expiryDate: item.expiryDate || '',
            qualityFlags: item.qualityFlags || [],
          },
        ])
      )
    );
    setReceiptPhotoDataUrl(order.receiptPhotoDataUrl || '');
    setPickupSignatureName(order.pickupSignatureName || currentRetailerName);
    setPickupSignatureDataUrl(order.pickupSignatureDataUrl || '');
  };

  const confirmReceipt = async () => {
    if (!receiptOrder) return;
    if (receiptOrder.deliveryMode === 'SELF_PICKUP' && (!pickupSignatureName.trim() || !pickupSignatureDataUrl)) return;
    await advanceProcurementOrder(receiptOrder.id, 'CONFIRM_RECEIPT', {
      accountId: currentAccountId,
      name: currentRetailerName,
      receiptQuantities: receiptOrder.items.map((item) => ({
        productId: item.productId,
        quantity: Math.max(0, Number(receiptDraft[item.productId]?.quantity ?? item.quantity)),
      })),
      receiptMeta: receiptOrder.items.map((item) => ({
        productId: item.productId,
        batchNo: receiptDraft[item.productId]?.batchNo || '',
        expiryDate: receiptDraft[item.productId]?.expiryDate || '',
      })),
      qualityFlags: receiptOrder.items.map((item) => ({
        productId: item.productId,
        flags: receiptDraft[item.productId]?.qualityFlags || [],
      })),
      receiptPhotoDataUrl: receiptPhotoDataUrl || undefined,
      pickupSignatureName: pickupSignatureName.trim() || undefined,
      pickupSignatureDataUrl: pickupSignatureDataUrl || undefined,
    });
    setReceiptOrder(null);
    setReceiptDraft({});
    setReceiptPhotoDataUrl('');
    setPickupSignatureName('');
    setPickupSignatureDataUrl('');
    await refreshOrders();
  };

  const rejectReceipt = async (orderId: string) => {
    await advanceProcurementOrder(orderId, 'REJECT_RECEIPT', {
      accountId: currentAccountId,
      name: currentRetailerName,
    });
    setReceiptOrder(null);
    setReceiptDraft({});
    setReceiptPhotoDataUrl('');
    setPickupSignatureName('');
    setPickupSignatureDataUrl('');
    await refreshOrders();
  };

  const cancelOrder = async (orderId: string) => {
    await advanceProcurementOrder(orderId, 'CANCEL', {
      accountId: currentAccountId,
      name: currentRetailerName,
    });
    await refreshOrders();
  };

  const handleReceiptPhotoChange = (file?: File | null) => {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') setReceiptPhotoDataUrl(reader.result);
    };
    reader.readAsDataURL(file);
  };

  return (
    <div className="max-w-6xl mx-auto pb-12 space-y-8">
      <div className="ui-card bg-white rounded-3xl p-6 sm:p-8 border border-slate-200 shadow-sm">
        <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-6">
          <div>
            <h2 className="text-xl font-black text-slate-900 mb-2">零售商进货协同</h2>
            <p className="text-sm text-slate-500">
              当前门店向 {wholesalePartner.name} 提交进货单。支持“零售商自提完成订单”和“司机送到船运公司后由零售商确认收货完成订单”两条流程。
            </p>
          </div>
          <div className="grid grid-cols-2 gap-3 min-w-[280px]">
            <div className="rounded-2xl bg-slate-50 border border-slate-100 px-4 py-3">
              <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest">当前门店</div>
              <div className="mt-1 text-sm font-black text-slate-900">{currentRetailerName}</div>
            </div>
            <div className="rounded-2xl bg-slate-50 border border-slate-100 px-4 py-3">
              <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest">对接批发商</div>
              <div className="mt-1 text-sm font-black text-slate-900">{wholesalePartner.name}</div>
            </div>
            <div className="rounded-2xl bg-[#1a237e] border border-[#dbe7ff] px-4 py-3">
              <div className="text-[10px] font-black text-[#1a237e] uppercase tracking-widest">待确认收货</div>
              <div className="mt-1 text-sm font-black text-[#1a237e]">{pendingReceiptCount} 单</div>
            </div>
            <div className="rounded-2xl bg-[#1a237e] border border-[#dbe7ff] px-4 py-3">
              <div className="text-[10px] font-black text-[#1a237e] uppercase tracking-widest">异常提醒</div>
              <div className="mt-1 text-sm font-black text-[#1a237e]">{rejectedCount} 单</div>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-6">
          <div className="ui-card bg-white rounded-3xl p-6 sm:p-8 border border-slate-200 shadow-sm">
            <h2 className="text-xl font-black text-slate-900 mb-6">{t('quickIntake')}</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mb-6">
              <div className="md:col-span-2 space-y-2">
                <label className="text-xs font-black text-slate-400 uppercase tracking-widest">配送方式</label>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <button type="button" onClick={() => setDeliveryMode('SELF_PICKUP')} className={`rounded-2xl border-2 px-5 py-4 text-left ${deliveryMode === 'SELF_PICKUP' ? 'border-[#dbe7ff] bg-[#1a237e]' : 'border-slate-100 bg-slate-50'}`}>
                    <div className="text-sm font-black text-slate-900">零售商自己提货</div>
                    <div className="mt-1 text-xs font-bold text-slate-500">仓库出库后，门店自己到仓提货并完成订单。</div>
                  </button>
                  <button type="button" onClick={() => setDeliveryMode('SHIPMENT')} className={`rounded-2xl border-2 px-5 py-4 text-left ${deliveryMode === 'SHIPMENT' ? 'border-[#dbe7ff] bg-[#1a237e]' : 'border-slate-100 bg-slate-50'}`}>
                    <div className="text-sm font-black text-slate-900">司机送到船运公司</div>
                    <div className="mt-1 text-xs font-bold text-slate-500">仓库出库后交司机送至船运公司，再由零售商确认接收完成订单。</div>
                  </button>
                </div>
              </div>
              {deliveryMode === 'SHIPMENT' && (
                <div className="md:col-span-2 space-y-2">
                  <label className="text-xs font-black text-slate-400 uppercase tracking-widest">船运公司名称</label>
                  <div className="grid grid-cols-1 md:grid-cols-[220px_minmax(0,1fr)] gap-3">
                    <select
                      className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl px-5 py-4 focus:bg-white focus:border-[#dbe7ff] transition-all outline-none font-bold text-sm"
                      value={shippingCompanies.some((item) => item.name === shippingCompanyName) ? shippingCompanyName : '__custom__'}
                      onChange={(e) => {
                        if (e.target.value !== '__custom__') setShippingCompanyName(e.target.value);
                      }}
                    >
                      {shippingCompanies.map((company) => (
                        <option key={company.id} value={company.name}>
                          {company.name}
                        </option>
                      ))}
                      <option value="__custom__">自定义输入</option>
                    </select>
                    <input className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl px-5 py-4 focus:bg-white focus:border-[#dbe7ff] transition-all outline-none" value={shippingCompanyName} onChange={(e) => setShippingCompanyName(e.target.value)} placeholder="输入船运公司名称" />
                  </div>
                </div>
              )}
              <div className="space-y-2">
                <label className="text-xs font-black text-slate-400 uppercase tracking-widest">{t('skuBarcode')}</label>
                <div className="relative group">
                  <input type="text" placeholder={t('scanOrTypeSku')} className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl px-5 py-4 focus:bg-white focus:border-[#dbe7ff] transition-all outline-none" value={newItem.sku} onChange={(e) => setNewItem({ ...newItem, sku: e.target.value })} />
                  <button onClick={() => setIsScanning(true)} className="absolute right-3 top-1/2 -translate-y-1/2 p-2 bg-slate-200 text-slate-600 rounded-xl hover:bg-[#1a237e] hover:text-white transition-all"><Scan size={20} /></button>
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-xs font-black text-slate-400 uppercase tracking-widest">{t('productName')}</label>
                <input type="text" placeholder={t('productNamePlaceholder')} className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl px-5 py-4 focus:bg-white focus:border-[#dbe7ff] transition-all outline-none" value={newItem.name} onChange={(e) => setNewItem({ ...newItem, name: e.target.value })} />
              </div>
              <div className="space-y-2">
                <label className="text-xs font-black text-slate-400 uppercase tracking-widest">{t('quantityCases')}</label>
                <input type="number" placeholder="0" className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl px-5 py-4 focus:bg-white focus:border-[#dbe7ff] transition-all outline-none font-bold text-lg" value={newItem.cases || ''} onChange={(e) => setNewItem({ ...newItem, cases: Number(e.target.value) })} />
              </div>
              <div className="space-y-2">
                <label className="text-xs font-black text-slate-400 uppercase tracking-widest">含税单价（VT）</label>
                <input type="number" placeholder="0" className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl px-5 py-4 focus:bg-white focus:border-[#dbe7ff] transition-all outline-none font-bold text-lg" value={newItem.unitPriceWithVat || ''} onChange={(e) => setNewItem({ ...newItem, unitPriceWithVat: Number(e.target.value) })} />
              </div>
            </div>
            <button onClick={addItem} className="ui-btn ui-btn-primary w-full py-4 rounded-2xl text-lg flex items-center justify-center gap-3 shadow-xl shadow-slate-200">
              <Plus /> 加入进货清单
            </button>
          </div>

          <div className="ui-card bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="p-6 border-b border-slate-100 flex items-center justify-between">
              <h3 className="font-black text-slate-800 uppercase tracking-widest text-sm">{t('inventoryLog')}</h3>
              <span className="bg-slate-100 text-slate-600 px-3 py-1 rounded-full text-xs font-black">{items.length} {t('items')}</span>
            </div>
            {items.length === 0 ? (
              <div className="p-16 text-center text-slate-400 font-bold">还没有加入商品。</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-100">
                      <th className="px-6 py-4 text-xs font-black text-slate-400 uppercase">商品</th>
                      <th className="px-6 py-4 text-xs font-black text-slate-400 uppercase text-center">箱数</th>
                      <th className="px-6 py-4 text-xs font-black text-slate-400 uppercase text-center">瓶数</th>
                      <th className="px-6 py-4 text-xs font-black text-slate-400 uppercase text-right">合计</th>
                      <th className="px-6 py-4 text-xs font-black text-slate-400 uppercase text-right">操作</th>
                    </tr>
                  </thead>
                  <tbody>
                    {items.map((item) => (
                      <tr key={item.id} className="border-b border-slate-50">
                        <td className="px-6 py-4"><div className="font-black text-slate-800">{item.name}</div><div className="text-xs text-slate-400">{item.sku}</div></td>
                        <td className="px-6 py-4 text-center font-bold">{item.cases}</td>
                        <td className="px-6 py-4 text-center font-bold text-[#1a237e]">{item.cases * CASE_TO_BOTTLE_RATIO}</td>
                        <td className="px-6 py-4 text-right font-black text-[#1a237e]">{formatVT(item.cases * item.unitPriceWithVat)}</td>
                        <td className="px-6 py-4 text-right"><button onClick={() => removeItem(item.id)} className="p-2 text-[#1a237e] hover:bg-[#1a237e] rounded-xl"><Trash2 size={18} /></button></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>

        <div className="space-y-6">
          <div className="ui-panel bg-slate-900 rounded-[24px] sm:rounded-[32px] p-5 sm:p-8 text-white shadow-2xl shadow-slate-200">
            <h3 className="text-xs font-black text-slate-400 uppercase tracking-[0.2em] mb-8">汇总（含税）</h3>
            <div className="space-y-4">
              <div className="flex justify-between"><span className="text-slate-400">总数量</span><span className="font-black">{totals.totalCases} 箱 / {totals.totalBottles} 瓶</span></div>
              <div className="flex justify-between"><span className="text-slate-400">未税小计</span><span className="font-black">{formatVT(totals.subtotal)}</span></div>
              <div className="flex justify-between"><span className="text-slate-400">增值税（15%）</span><span className="font-black text-[#1a237e]">{formatVT(totals.vatAmount)}</span></div>
              <div className="flex justify-between text-xl"><span className="text-[#1a237e] font-black">合计 VT</span><span className="font-black text-[#1a237e]">{formatVT(totals.totalGross)}</span></div>
              <div className="text-xs font-bold text-slate-400">当前配送方式：{getDeliveryModeLabel(deliveryMode)}</div>
            </div>
            <button onClick={() => void handleSave()} disabled={items.length === 0 || isSaving} className={`ui-btn mt-6 w-full py-5 rounded-2xl text-lg flex items-center justify-center gap-3 ${items.length > 0 ? 'bg-[#1a237e] text-white' : 'bg-slate-800 text-slate-500 cursor-not-allowed'}`}>
              {isSaving ? <><Save /> 正在发送给批发商</> : <><Save /> 发送进货单给批发商</>}
            </button>
          </div>
          <div className="ui-panel bg-[#1a237e] border-2 border-dashed border-[#dbe7ff] rounded-3xl p-6">
            <h4 className="flex items-center gap-2 text-[#1a237e] font-black text-sm uppercase tracking-widest mb-3"><CheckCircle2 size={16} /> 瓦努阿图合规规则</h4>
            <ul className="text-xs space-y-2 text-[#1a237e] font-medium">
              <li>- 自动按 15% 增值税口径留档</li>
              <li>- 统一按 1 箱 = 24 瓶换算</li>
              <li>- 自提和船运公司交接两条流程都共用同一张进货单</li>
            </ul>
          </div>
        </div>
      </div>

      <div className="ui-card bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-6 border-b border-slate-100 flex items-center justify-between">
          <h3 className="font-black text-slate-800 uppercase tracking-widest text-sm">我的进货单状态</h3>
          <span className="bg-slate-100 text-slate-600 px-3 py-1 rounded-full text-xs font-black">{retailOrders.length} 单</span>
        </div>
        <div className="divide-y divide-slate-100">
          {retailOrders.length === 0 ? (
            <div className="p-10 text-sm text-slate-400 font-bold">还没有提交进货单。</div>
          ) : (
            retailOrders.slice(0, 8).map((order) => (
              <div key={order.id} className="p-5 sm:p-6 flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4">
                <div className="flex-1">
                  <div className="text-sm font-black text-slate-900">{order.id}</div>
                  <div className="mt-1 text-xs font-bold text-slate-500">发往 {order.wholesalerName} · 共 {order.totalQuantity} 箱 · {order.updatedAt}</div>
                  <div className="mt-2 flex flex-wrap gap-2">
                    <span className="px-2.5 py-1 rounded-full bg-[#1a237e] text-[11px] font-black text-[#1a237e]">{getDeliveryModeLabel(order.deliveryMode)}</span>
                    {order.shippingCompanyName && <span className="px-2.5 py-1 rounded-full bg-[#1a237e] text-[11px] font-black text-[#1a237e]">{order.shippingCompanyName}</span>}
                    {order.items.slice(0, 3).map((item) => <span key={`${order.id}-${item.productId}`} className="px-2.5 py-1 rounded-full bg-slate-100 text-[11px] font-black text-slate-600">{item.title} x {item.quantity}</span>)}
                  </div>
                  <div className="mt-3 flex items-center gap-4">
                    <button onClick={() => setExpandedOrderId(expandedOrderId === order.id ? null : order.id)} className="text-xs font-black text-[#1a237e] inline-flex items-center gap-2"><Clock3 size={14} />{expandedOrderId === order.id ? '收起时间轴' : '查看时间轴'}</button>
                    <button onClick={() => setDetailOrder(order)} className="text-xs font-black text-violet-600">查看详情</button>
                  </div>
                  {expandedOrderId === order.id && (
                    <div className="mt-4 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 space-y-3">
                      {order.timeline.map((step, index) => (
                        <div key={`${order.id}-${index}`} className="flex gap-3">
                          <div className="mt-1 w-2 h-2 rounded-full bg-[#1a237e] shrink-0" />
                          <div>
                            <div className="text-sm font-black text-slate-800">{step.label}</div>
                            <div className="text-xs font-bold text-slate-500">{step.by} · {step.at}</div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
                <div className="lg:text-right">
                  <div className="inline-flex px-3 py-1 rounded-full bg-[#1a237e] text-[#1a237e] text-xs font-black">{getProcurementStatusLabel(order.status)}</div>
                  <div className="mt-2 text-xs text-slate-500 font-bold">最新进度：{order.timeline[order.timeline.length - 1]?.label}</div>
                  {(order.status === 'READY_FOR_PICKUP' || order.status === 'AT_SHIPPING_COMPANY') && (
                    <button onClick={() => openReceiptModal(order)} className="ui-btn mt-3 px-4 py-2 rounded-xl bg-[#1a237e] text-white text-xs font-black">{order.status === 'READY_FOR_PICKUP' ? '确认提货并入库' : '确认接收并入库'}</button>
                  )}
                  {order.status === 'SUBMITTED' && (
                    <button onClick={() => void cancelOrder(order.id)} className="ui-btn mt-3 ml-2 px-4 py-2 rounded-xl bg-[#1a237e] text-white text-xs font-black">取消进货单</button>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      <AnimatePresence>
        {detailOrder && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-50 bg-white/85 backdrop-blur-sm flex items-center justify-center p-4">
            <motion.div initial={{ scale: 0.96, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.96, opacity: 0 }} className="w-full max-w-3xl bg-white rounded-3xl p-6 sm:p-8 space-y-5">
              <div className="flex items-center justify-between"><div><div className="text-lg font-black text-slate-900">进货单详情</div><div className="text-sm text-slate-500 mt-1">{detailOrder.id} · {getProcurementStatusLabel(detailOrder.status)}</div></div><button onClick={() => setDetailOrder(null)} className="w-9 h-9 rounded-full bg-slate-100 text-slate-600 flex items-center justify-center"><X size={16} /></button></div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="rounded-2xl border border-slate-200 px-4 py-3"><div className="text-[10px] font-black text-slate-400 uppercase tracking-widest">配送方式</div><div className="mt-1 text-sm font-black text-slate-900">{getDeliveryModeLabel(detailOrder.deliveryMode)}</div></div>
                <div className="rounded-2xl border border-slate-200 px-4 py-3"><div className="text-[10px] font-black text-slate-400 uppercase tracking-widest">交接点</div><div className="mt-1 text-sm font-black text-slate-900">{detailOrder.deliveryMode === 'SELF_PICKUP' ? '批发仓库自提' : detailOrder.shippingCompanyName || DEFAULT_SHIPPING_COMPANY}</div></div>
                {detailOrder.pickupSignatureName && (
                  <div className="rounded-2xl border border-slate-200 px-4 py-3"><div className="text-[10px] font-black text-slate-400 uppercase tracking-widest">自提签字</div><div className="mt-1 text-sm font-black text-slate-900">{detailOrder.pickupSignatureName}</div><div className="mt-1 text-xs font-bold text-slate-500">{detailOrder.pickupSignedAt}</div>{detailOrder.pickupSignatureDataUrl && <img src={detailOrder.pickupSignatureDataUrl} alt="自提签字" className="mt-3 h-24 rounded-xl border border-slate-200 bg-white p-2 object-contain" />}</div>
                )}
                    {detailOrder.shippingHandoffSignatureName && (
                      <div className="rounded-2xl border border-slate-200 px-4 py-3"><div className="text-[10px] font-black text-slate-400 uppercase tracking-widest">船运交接签字</div><div className="mt-1 text-sm font-black text-slate-900">{detailOrder.shippingHandoffSignatureName}</div><div className="mt-1 text-xs font-bold text-slate-500">{detailOrder.shippingHandoffCompanyName || detailOrder.shippingCompanyName || DEFAULT_SHIPPING_COMPANY} · {detailOrder.shippingHandoffSignedAt}</div>{detailOrder.shippingHandoffSignatureDataUrl && <img src={detailOrder.shippingHandoffSignatureDataUrl} alt="船运交接签字" className="mt-3 h-24 rounded-xl border border-slate-200 bg-white p-2 object-contain" />}{detailOrder.shippingHandoffPhotoDataUrl && <img src={detailOrder.shippingHandoffPhotoDataUrl} alt="船运交接到达照片" className="mt-3 h-32 w-full rounded-xl border border-slate-200 object-cover" />}</div>
                    )}
              </div>
              <div className="space-y-3">{detailOrder.items.map((item) => <div key={item.productId} className="rounded-2xl border border-slate-200 px-4 py-3 flex items-center justify-between gap-4"><div><div className="text-sm font-black text-slate-900">{item.title}</div><div className="text-xs font-bold text-slate-500">{item.barcode}</div></div><div className="text-sm font-black text-slate-700">应到 {item.quantity} 箱{typeof item.receivedQuantity === 'number' ? ` / 实收 ${item.receivedQuantity} 箱` : ''}</div></div>)}</div>
              {detailOrder.note && <div className="rounded-2xl bg-[#1a237e] border border-[#dbe7ff] px-4 py-3 text-sm font-bold text-[#1a237e]">{detailOrder.note}</div>}
              <button onClick={() => printProcurementDocument(detailOrder, '零售进货单', '门店留档 / 可直接打印为 PDF')} className="ui-btn w-full h-11 rounded-xl bg-[#1a237e] text-white text-sm font-black">导出进货单 PDF</button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {receiptOrder && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-50 bg-white/85 backdrop-blur-sm flex items-center justify-center p-4">
            <motion.div initial={{ scale: 0.96, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.96, opacity: 0 }} className="w-full max-w-2xl bg-white rounded-3xl p-6 sm:p-8 space-y-5">
              <div className="flex items-center justify-between"><div><div className="text-lg font-black text-slate-900">{receiptOrder.deliveryMode === 'SELF_PICKUP' ? '零售提货入库' : '零售签收入库'}</div><div className="text-sm text-slate-500 mt-1">{receiptOrder.id} · {receiptOrder.deliveryMode === 'SELF_PICKUP' ? '支持部分提货与缺货回填' : '支持部分到货与缺货回填'}</div></div><button onClick={() => setReceiptOrder(null)} className="w-9 h-9 rounded-full bg-slate-100 text-slate-600 flex items-center justify-center"><X size={16} /></button></div>
              <div className="space-y-3">
                {receiptOrder.items.map((item) => (
                  <div key={item.productId} className="grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_110px_120px_140px_160px] gap-3 items-center rounded-2xl border border-slate-200 px-4 py-3">
                    <div><div className="text-sm font-black text-slate-900">{item.title}</div><div className="text-xs font-bold text-slate-500">{item.barcode}</div></div>
                    <div className="text-sm font-black text-slate-700">应到 {item.quantity} 箱</div>
                    <input type="number" min={0} max={item.quantity} value={receiptDraft[item.productId]?.quantity ?? item.quantity} onChange={(e) => setReceiptDraft((prev) => ({ ...prev, [item.productId]: { quantity: Math.max(0, Math.min(item.quantity, Number(e.target.value || 0))), batchNo: prev[item.productId]?.batchNo || '', expiryDate: prev[item.productId]?.expiryDate || '', qualityFlags: prev[item.productId]?.qualityFlags || [] } }))} className="h-11 rounded-xl border border-slate-200 px-3 text-sm font-black" />
                    <input type="text" placeholder="批次号" value={receiptDraft[item.productId]?.batchNo || ''} onChange={(e) => setReceiptDraft((prev) => ({ ...prev, [item.productId]: { quantity: prev[item.productId]?.quantity ?? item.quantity, batchNo: e.target.value, expiryDate: prev[item.productId]?.expiryDate || '', qualityFlags: prev[item.productId]?.qualityFlags || [] } }))} className="h-11 rounded-xl border border-slate-200 px-3 text-sm font-black" />
                    <input type="date" value={receiptDraft[item.productId]?.expiryDate || ''} onChange={(e) => setReceiptDraft((prev) => ({ ...prev, [item.productId]: { quantity: prev[item.productId]?.quantity ?? item.quantity, batchNo: prev[item.productId]?.batchNo || '', expiryDate: e.target.value, qualityFlags: prev[item.productId]?.qualityFlags || [] } }))} className="h-11 rounded-xl border border-slate-200 px-3 text-sm font-black" />
                  </div>
                ))}
              </div>
              <div className="rounded-2xl border border-slate-200 p-4 space-y-3">
                {receiptOrder.deliveryMode === 'SELF_PICKUP' && (
                  <div className="space-y-2">
                    <div className="text-sm font-black text-slate-900">自提签字</div>
                    <input
                      type="text"
                      value={pickupSignatureName}
                      onChange={(e) => setPickupSignatureName(e.target.value)}
                      placeholder="输入提货签字人姓名"
                      className="w-full h-11 rounded-xl border border-slate-200 px-3 text-sm font-black"
                    />
                    <SignaturePad value={pickupSignatureDataUrl} onChange={setPickupSignatureDataUrl} />
                  </div>
                )}
                <div className="text-sm font-black text-slate-900">到货照片留档</div>
                <input type="file" accept="image/*" onChange={(e) => handleReceiptPhotoChange(e.target.files?.[0])} className="block w-full text-sm font-bold text-slate-600 file:mr-4 file:px-4 file:py-2 file:border-0 file:rounded-xl file:bg-slate-100 file:text-slate-700" />
                {receiptPhotoDataUrl && <img src={receiptPhotoDataUrl} alt="到货照片预览" className="w-full max-h-64 object-cover rounded-2xl border border-slate-200" />}
              </div>
              <button onClick={() => void confirmReceipt()} className="ui-btn w-full h-11 rounded-xl bg-[#1a237e] text-white text-sm font-black">{receiptOrder.deliveryMode === 'SELF_PICKUP' ? '确认提货签字并入库' : '确认接收并入库'}</button>
              <button onClick={() => void rejectReceipt(receiptOrder.id)} className="ui-btn w-full h-11 rounded-xl bg-[#1a237e] text-white text-sm font-black">{receiptOrder.deliveryMode === 'SELF_PICKUP' ? '整单拒绝提货' : '整单拒收'}</button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showSuccess && <motion.div initial={{ opacity: 0, scale: 0.9, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.9, y: 20 }} className="fixed bottom-10 left-1/2 -translate-x-1/2 bg-[#1a237e] text-white px-8 py-4 rounded-2xl font-black shadow-2xl z-50 flex items-center gap-3"><CheckCircle2 /> {isScanning ? '已记录' : '进货单已发送给批发商'}</motion.div>}
      </AnimatePresence>
    </div>
  );
};

export default SupplierEntryPage;

