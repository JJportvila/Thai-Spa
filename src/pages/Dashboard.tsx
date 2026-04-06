import React, { useEffect, useMemo, useState } from 'react';
import {
  ArrowDownRight,
  ArrowRight,
  ArrowUpRight,
  BarChart3,
  Building2,
  ChevronRight,
  Package,
  Printer,
  ShoppingBag,
  ShoppingCart,
  Store,
  Tag,
  TrendingUp,
  Truck,
  Users,
} from 'lucide-react';
import { StretAccount } from '../lib/accountService';
import { getCashierCandidates, syncEmployeeAccounts } from '../lib/employeeStore';
import {
  closePosDay,
  closePosMonth,
  getPosOpsState,
  handoverPosShift,
  startPosShift,
  syncPosOpsState,
} from '../lib/posOpsStore';
import { formatVT } from '../lib/utils';
import { getRetailInventoryMap } from '../lib/accountScopedStore';
import { extendedVanuatuProducts, mockCustomers, mockSuppliers } from '../lib/mockDataFull';

type NavigateFn = (view: string) => void;

const DashboardPage: React.FC<{ userAccount?: StretAccount; onNavigate?: NavigateFn }> = ({ userAccount, onNavigate }) => {
  const [ops, setOps] = useState(() => (userAccount?.id ? getPosOpsState(userAccount.id) : getPosOpsState('')));
  const [inventoryMap, setInventoryMap] = useState<Record<string, number>>({});
  const [startCashier, setStartCashier] = useState('');
  const [handoverTo, setHandoverTo] = useState('');

  useEffect(() => {
    if (!userAccount?.id) return;
    void (async () => {
      const [syncedOps, syncedInventory] = await Promise.all([
        syncPosOpsState(userAccount.id),
        getRetailInventoryMap(userAccount.id),
        syncEmployeeAccounts(userAccount.id),
      ]);
      setOps(syncedOps);
      setInventoryMap(syncedInventory);
      const cashiers = getCashierCandidates(userAccount.id);
      setStartCashier(cashiers[0]?.name || userAccount.name);
    })();
  }, [userAccount?.id, userAccount?.name]);

  const navigateTo = (view: string) => {
    if (onNavigate) onNavigate(view);
    else window.location.hash = `#${view}`;
  };

  const cashiers = useMemo(() => getCashierCandidates(userAccount?.id || ''), [userAccount?.id, ops.activeShift?.cashierName]);
  const canHandover = !!ops.activeShift && !!handoverTo.trim() && handoverTo.trim() !== ops.activeShift?.cashierName;
  const latestMonth = ops.monthClosures[0];

  const products = useMemo(
    () =>
      extendedVanuatuProducts.map((product) => ({
        ...product,
        stock: inventoryMap[product.id] ?? product.stock,
      })),
    [inventoryMap],
  );

  const lowStockProducts = useMemo(
    () => [...products].filter((product) => product.stock <= 40).sort((a, b) => a.stock - b.stock).slice(0, 4),
    [products],
  );

  const featuredProducts = useMemo(() => [...products].sort((a, b) => b.stock - a.stock).slice(0, 5), [products]);
  const heroProduct = lowStockProducts[0] || featuredProducts[0] || products[0];

  const stats = [
    { label: '今日营业额', value: ops.activeShift?.salesAmount || 0, trend: '实收金额', isUp: true, icon: TrendingUp, isCurrency: true },
    { label: '待配送订单', value: 5, trend: '同步批发/零售', isUp: false, icon: Truck, isCurrency: false },
    { label: '在线员工', value: cashiers.length, trend: '可上岗收银', isUp: true, icon: Users, isCurrency: false },
    { label: '低库存 SKU', value: lowStockProducts.length || 0, trend: '待补货', isUp: false, icon: Package, isCurrency: false },
  ];

  const homeActions = [
    { title: '零售收银', desc: '门店收银、扫码、找零与结算。', view: 'retail-pos', icon: ShoppingCart },
    { title: '批发中心', desc: '报价、订单和批发客户统一管理。', view: 'wholesale-pos', icon: Store },
    { title: '库存管理', desc: '库存、批次、调拨与临期预警。', view: 'inventory-mgmt', icon: Package },
    { title: '标签打印', desc: '价签、货架签和条码标签工作台。', view: 'label-print', icon: Printer },
    { title: '增值税申报', desc: 'VAT 计算、来源台账和申报记录。', view: 'vat-returns', icon: BarChart3 },
    { title: '零售功能中心', desc: '报表、价格分级、离线与捆绑。', view: 'retail-tools', icon: Tag },
  ];

  const menuCards = [
    { title: '进入零售', subtitle: '主收银入口', view: 'retail-pos', icon: ShoppingCart },
    { title: '进入批发', subtitle: '批发报价与订单', view: 'wholesale-pos', icon: Store },
    { title: '库存管理', subtitle: '商品和批次', view: 'inventory-mgmt', icon: Package },
    { title: '标签打印', subtitle: '价签与条码', view: 'label-print', icon: Printer },
  ];

  return (
    <div className="space-y-5 pb-12">
      <div className="ui-card rounded-[28px] border border-slate-200 bg-white p-4 shadow-sm sm:p-6">
        <div className="grid gap-4 xl:grid-cols-[1.15fr_0.85fr] xl:items-stretch">
          <div className="space-y-4 rounded-[28px] border border-slate-200 bg-[#f8f9fa] p-5 sm:p-6">
            <div className="inline-flex items-center gap-2 rounded-full border border-[#dbe7ff] bg-[#eef4ff] px-3 py-1 text-[10px] font-black tracking-[0.24em] text-[#1a237e]">
              <Building2 size={12} /> 门店经营主页
            </div>
            <div>
              <h2 className="text-3xl font-black tracking-tight text-slate-900 sm:text-4xl">The Curated Horizon</h2>
              <p className="mt-2 max-w-2xl text-sm font-semibold leading-7 text-slate-500 sm:text-base">
                把零售、批发、库存、标签和税务放在同一页，像一个真正能经营的门店主页：先看状态，再点入口。
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <button onClick={() => navigateTo('retail-pos')} className="ui-btn rounded-xl bg-[#1a237e] px-4 py-2.5 text-sm font-black text-white">
                进入零售收银
              </button>
              <button onClick={() => navigateTo('wholesale-pos')} className="ui-btn ui-btn-secondary rounded-xl px-4 py-2.5 text-sm font-black">
                进入批发中心
              </button>
              <button onClick={() => navigateTo('inventory-mgmt')} className="ui-btn ui-btn-secondary rounded-xl px-4 py-2.5 text-sm font-black">
                打开库存管理
              </button>
            </div>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              <div className="rounded-2xl border border-slate-200 bg-white p-3">
                <div className="text-[10px] font-black tracking-[0.22em] text-slate-400 uppercase">当班单数</div>
                <div className="mt-1 text-xl font-black text-slate-900">{ops.activeShift?.salesCount || 0}</div>
                <div className="mt-1 text-xs font-semibold text-slate-500">当前收银班次</div>
              </div>
              <div className="rounded-2xl border border-slate-200 bg-white p-3">
                <div className="text-[10px] font-black tracking-[0.22em] text-slate-400 uppercase">当班金额</div>
                <div className="mt-1 text-xl font-black text-slate-900">{formatVT(ops.activeShift?.salesAmount || 0)}</div>
                <div className="mt-1 text-xs font-semibold text-slate-500">实收金额</div>
              </div>
              <div className="rounded-2xl border border-slate-200 bg-white p-3">
                <div className="text-[10px] font-black tracking-[0.22em] text-slate-400 uppercase">商品总数</div>
                <div className="mt-1 text-xl font-black text-slate-900">{products.length}</div>
                <div className="mt-1 text-xs font-semibold text-slate-500">后台商品目录</div>
              </div>
              <div className="rounded-2xl border border-slate-200 bg-white p-3">
                <div className="text-[10px] font-black tracking-[0.22em] text-slate-400 uppercase">低库存</div>
                <div className="mt-1 text-xl font-black text-slate-900">{lowStockProducts.length}</div>
                <div className="mt-1 text-xs font-semibold text-slate-500">待补货商品</div>
              </div>
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-1 xl:grid-rows-[1.2fr_0.8fr]">
            <div className="relative overflow-hidden rounded-[28px] border border-slate-200 bg-white p-4 shadow-sm">
              <div className="absolute inset-0 bg-gradient-to-br from-[#eef4ff] via-white to-[#f8f9fa] opacity-95" />
              <div className="relative flex h-full flex-col justify-between gap-4">
                <div className="flex items-center justify-between gap-2">
                  <div className="inline-flex items-center gap-2 rounded-full border border-[#dbe7ff] bg-white/90 px-3 py-1 text-[10px] font-black text-[#1a237e] shadow-sm">
                    <Store size={12} /> 经营精选
                  </div>
                  <div className="rounded-full border border-[#dbe7ff] bg-[#eef4ff] px-3 py-1 text-[10px] font-black text-[#1a237e]">
                    {ops.activeShift ? `班次：${ops.activeShift.cashierName}` : '未开班'}
                  </div>
                </div>
                <div className="space-y-2">
                  <div className="text-[10px] font-black tracking-[0.24em] text-slate-400 uppercase">重点关注商品</div>
                  <div className="text-2xl font-black text-slate-900">{heroProduct?.title || '门店经营主页'}</div>
                  <p className="text-sm font-semibold leading-6 text-slate-500">
                    {heroProduct ? `货架位 ${heroProduct.shelfId} · 库存 ${heroProduct.stock} · 分类 ${heroProduct.category || '商品'}` : '同步后台数据后，这里会显示门店最重要的商品与库存提醒。'}
                  </p>
                </div>
                {heroProduct && (
                  <div className="overflow-hidden rounded-[22px] border border-slate-200 bg-white shadow-sm">
                    <div className="relative aspect-[1.7/1] overflow-hidden">
                      <img src={heroProduct.imageUrl} alt={heroProduct.title} className="h-full w-full object-cover" />
                      <div className="absolute left-3 top-3 rounded-full bg-white/90 px-3 py-1 text-[10px] font-black text-[#1a237e] shadow-sm">
                        库存 {heroProduct.stock}
                      </div>
                      <div className="absolute right-3 bottom-3 rounded-full bg-[#1a237e] px-3 py-1 text-[10px] font-black text-white shadow-sm">
                        {heroProduct.shelfId}
                      </div>
                    </div>
                    <div className="p-4">
                      <div className="text-base font-black text-slate-900">{heroProduct.title}</div>
                      <div className="mt-1 text-xs font-semibold text-slate-500">{heroProduct.category || '商品'} · {heroProduct.barcode}</div>
                    </div>
                  </div>
                )}
              </div>
            </div>

            <div className="rounded-[28px] border border-slate-200 bg-[#f8f9fa] p-4 shadow-sm">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <div className="text-[10px] font-black tracking-[0.24em] text-slate-400 uppercase">首页快捷入口</div>
                  <div className="mt-1 text-lg font-black text-slate-900">所有模板统一入口</div>
                </div>
                <div className="rounded-full border border-[#dbe7ff] bg-white px-3 py-1 text-[10px] font-black text-[#1a237e]">实时连接后台</div>
              </div>
              <div className="mt-4 grid grid-cols-1 gap-2 sm:grid-cols-2 xl:grid-cols-1">
                {menuCards.map((action) => (
                  <button
                    key={action.view}
                    type="button"
                    onClick={() => navigateTo(action.view)}
                    className="flex items-center justify-between gap-3 rounded-[20px] border border-slate-200 bg-white p-3 text-left transition-all hover:border-[#1a237e]/30 hover:shadow-sm"
                  >
                    <div className="flex items-center gap-3">
                      <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[#eef4ff] text-[#1a237e]">
                        <action.icon size={18} />
                      </div>
                      <div>
                        <div className="text-sm font-black text-slate-900">{action.title}</div>
                        <div className="mt-1 text-xs font-semibold leading-5 text-slate-500">{action.subtitle}</div>
                      </div>
                    </div>
                    <ChevronRight size={18} className="text-slate-300" />
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-[1.1fr_0.9fr]">
        <div className="rounded-[28px] border border-slate-200 bg-white p-4 shadow-sm sm:p-6">
          <div className="flex items-center justify-between gap-3">
            <div>
              <div className="text-[10px] font-black tracking-[0.24em] text-slate-400 uppercase">Signature Rituals</div>
              <h3 className="mt-1 text-xl font-black text-slate-900">今日重点经营</h3>
            </div>
            <button onClick={() => navigateTo('retail-pos')} className="inline-flex items-center gap-1 rounded-full border border-[#dbe7ff] bg-[#eef4ff] px-3 py-1.5 text-[10px] font-black text-[#1a237e]">
              进入收银 <ArrowRight size={12} />
            </button>
          </div>
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <div className="rounded-[22px] border border-slate-200 bg-[#f8f9fa] p-4">
              <div className="flex items-center justify-between gap-2">
                <div className="inline-flex items-center gap-2 rounded-full border border-[#dbe7ff] bg-white px-3 py-1 text-[10px] font-black text-[#1a237e]">当前班次</div>
                <div className={`flex items-center gap-1 rounded-full px-2 py-1 text-[10px] font-black ${ops.activeShift ? 'bg-[#eef4ff] text-[#1a237e]' : 'bg-white text-slate-500'}`}>
                  {ops.activeShift ? <ArrowUpRight size={10} /> : <ArrowDownRight size={10} />}
                  {ops.activeShift ? '营业中' : '未开班'}
                </div>
              </div>
              <div className="mt-3 text-lg font-black text-slate-900">{ops.activeShift ? ops.activeShift.cashierName : '等待开班'}</div>
              <p className="mt-2 text-sm leading-6 text-slate-500">
                {ops.activeShift
                  ? `本班次已完成 ${ops.activeShift.salesCount} 单，累计 ${formatVT(ops.activeShift.salesAmount)}。`
                  : '点击开始收银后，会同步记录班次、结算和交班信息。'}
              </p>
              {!ops.activeShift ? (
                <div className="mt-4 grid gap-2 sm:grid-cols-[1fr_auto]">
                  <select value={startCashier} onChange={(event) => setStartCashier(event.target.value)} className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none">
                    {cashiers.map((cashier) => (
                      <option key={cashier.id} value={cashier.name}>
                        {cashier.name}
                      </option>
                    ))}
                  </select>
                  <button onClick={() => userAccount?.id && setOps(startPosShift(userAccount.id, startCashier || userAccount.name))} className="ui-btn ui-btn-primary rounded-xl px-4 py-2 text-sm font-black">
                    开始收银
                  </button>
                </div>
              ) : (
                <div className="mt-4 grid gap-2 sm:grid-cols-[1fr_auto]">
                  <select value={handoverTo} onChange={(event) => setHandoverTo(event.target.value)} className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none">
                    <option value="">选择接班员工</option>
                    {cashiers
                      .filter((cashier) => cashier.name !== ops.activeShift?.cashierName)
                      .map((cashier) => (
                        <option key={cashier.id} value={cashier.name}>
                          {cashier.name}
                        </option>
                      ))}
                  </select>
                  <button onClick={() => userAccount?.id && canHandover && setOps(handoverPosShift(userAccount.id, handoverTo.trim()))} className="ui-btn ui-btn-secondary rounded-xl px-4 py-2 text-sm font-black" disabled={!canHandover}>
                    交班
                  </button>
                </div>
              )}
            </div>

            <div className="rounded-[22px] border border-slate-200 bg-[#f8f9fa] p-4">
              <div className="inline-flex items-center gap-2 rounded-full border border-[#dbe7ff] bg-white px-3 py-1 text-[10px] font-black text-[#1a237e]">低库存提醒</div>
              <div className="mt-3 text-lg font-black text-slate-900">{lowStockProducts.length} 个商品待补货</div>
              <div className="mt-2 space-y-2">
                {lowStockProducts.length ? (
                  lowStockProducts.map((product) => (
                    <div key={product.id} className="flex items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-white px-3 py-2">
                      <div className="min-w-0">
                        <div className="truncate text-sm font-black text-slate-900">{product.title}</div>
                        <div className="mt-1 text-[10px] font-semibold text-slate-500">{product.shelfId} · 库存 {product.stock}</div>
                      </div>
                      <span className="rounded-full bg-[#eef4ff] px-2 py-1 text-[10px] font-black text-[#1a237e]">补货</span>
                    </div>
                  ))
                ) : (
                  <div className="rounded-2xl border border-dashed border-slate-200 bg-white px-3 py-6 text-center text-sm font-semibold text-slate-500">
                    当前库存健康，暂无紧急补货项。
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        <div className="rounded-[28px] border border-slate-200 bg-white p-4 shadow-sm sm:p-6">
          <div className="flex items-center justify-between gap-3">
            <div>
              <div className="text-[10px] font-black tracking-[0.24em] text-slate-400 uppercase">Today’s Favorites</div>
              <h3 className="mt-1 text-xl font-black text-slate-900">今日推荐商品</h3>
            </div>
            <button onClick={() => navigateTo('inventory-mgmt')} className="inline-flex items-center gap-1 rounded-full border border-[#dbe7ff] bg-[#eef4ff] px-3 py-1.5 text-[10px] font-black text-[#1a237e]">
              查看全部 <ArrowRight size={12} />
            </button>
          </div>
          <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-1">
            {featuredProducts.slice(0, 4).map((product) => (
              <div key={product.id} className="overflow-hidden rounded-[24px] border border-slate-200 bg-[#f8f9fa] shadow-sm">
                <div className="grid grid-cols-[1fr_0.9fr] gap-0">
                  <div className="relative min-h-[150px]">
                    <img src={product.imageUrl} alt={product.title} className="h-full w-full object-cover" />
                    <div className="absolute left-3 top-3 rounded-full bg-white/90 px-3 py-1 text-[10px] font-black text-[#1a237e] shadow-sm">
                      {product.category || '商品'}
                    </div>
                  </div>
                  <div className="flex flex-col justify-between gap-3 bg-white p-4">
                    <div>
                      <div className="text-lg font-black text-slate-900 leading-tight">{product.title}</div>
                      <div className="mt-2 text-xs font-semibold text-slate-500">条码 {product.barcode}</div>
                      <div className="mt-2 text-xs font-semibold text-slate-500">货架位 {product.shelfId}</div>
                    </div>
                    <div className="flex items-center justify-between gap-2">
                      <div className="rounded-full border border-[#dbe7ff] bg-[#eef4ff] px-3 py-1 text-[10px] font-black text-[#1a237e]">
                        库存 {product.stock}
                      </div>
                      <button onClick={() => navigateTo('retail-pos')} className="rounded-full border border-slate-200 bg-white px-3 py-1 text-[10px] font-black text-slate-700">
                        去收银
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {stats.map((stat, index) => (
          <div key={index} className="ui-card min-h-[168px] rounded-3xl border border-slate-200 bg-white p-4 shadow-sm transition-all hover:shadow-md sm:p-6">
            <div className="mb-4 flex items-center justify-between">
              <div className="rounded-2xl bg-[#f8f9fa] p-3 text-slate-500">
                <stat.icon size={22} />
              </div>
              <div className={`flex items-center gap-1 rounded-lg px-2 py-1 text-[10px] font-black uppercase ${stat.isUp ? 'bg-[#eef4ff] text-[#1a237e]' : 'bg-slate-100 text-slate-500'}`}>
                {stat.isUp ? <ArrowUpRight size={10} /> : <ArrowDownRight size={10} />}
                {stat.trend}
              </div>
            </div>
            <div className="space-y-1">
              <span className="text-xs font-black uppercase tracking-widest text-slate-500">{stat.label}</span>
              <div className="text-2xl font-black text-slate-900">{stat.isCurrency ? formatVT(stat.value as number) : stat.value}</div>
            </div>
          </div>
        ))}
      </div>

      <div className="ui-card rounded-[28px] border border-slate-200 bg-white p-5 shadow-sm sm:p-8">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div className="space-y-1">
            <div className="text-[10px] font-black tracking-[0.24em] text-slate-400 uppercase">班次中心</div>
            <h3 className="text-xl font-black text-slate-900">收银、交班、日结和月结</h3>
            <p className="max-w-3xl text-sm leading-7 text-slate-500">零售收银在 POS 完成，交班、日结与月结都在这里统一执行，方便店长和老板快速查看班次情况。</p>
          </div>
          <div className="rounded-full border border-[#dbe7ff] bg-[#eef4ff] px-3 py-1 text-[10px] font-black text-[#1a237e]">
            {ops.activeShift ? `当前班次：${ops.activeShift.cashierName}` : '未开始收银班次'}
          </div>
        </div>

        <div className="mt-4 grid grid-cols-1 gap-4 xl:grid-cols-[1.1fr_0.9fr]">
          <div className="rounded-2xl border border-slate-200 bg-[#f8f9fa] p-4">
            <div className="text-sm font-black text-slate-900">{ops.activeShift ? '交班操作' : '开班操作'}</div>
            {!ops.activeShift ? (
              <div className="mt-3 grid gap-3 sm:grid-cols-[minmax(0,1fr)_140px]">
                <select value={startCashier} onChange={(event) => setStartCashier(event.target.value)} className="rounded-xl border border-slate-200 bg-white px-3 py-3 text-sm outline-none">
                  {cashiers.map((cashier) => (
                    <option key={cashier.id} value={cashier.name}>
                      {cashier.name}
                    </option>
                  ))}
                </select>
                <button onClick={() => userAccount?.id && setOps(startPosShift(userAccount.id, startCashier || userAccount.name))} className="ui-btn ui-btn-primary rounded-xl px-4 py-3 text-sm font-black">
                  开始收银
                </button>
              </div>
            ) : (
              <div className="mt-3 grid gap-3 sm:grid-cols-[minmax(0,1fr)_120px]">
                <select value={handoverTo} onChange={(event) => setHandoverTo(event.target.value)} className="rounded-xl border border-slate-200 bg-white px-3 py-3 text-sm outline-none">
                  <option value="">选择接班员工</option>
                  {cashiers
                    .filter((cashier) => cashier.name !== ops.activeShift?.cashierName)
                    .map((cashier) => (
                      <option key={cashier.id} value={cashier.name}>
                        {cashier.name}
                      </option>
                    ))}
                </select>
                <button onClick={() => userAccount?.id && canHandover && setOps(handoverPosShift(userAccount.id, handoverTo.trim()))} className="ui-btn ui-btn-secondary rounded-xl px-4 py-3 text-sm font-black" disabled={!canHandover}>
                  交班
                </button>
              </div>
            )}
            <div className="mt-4 grid grid-cols-2 gap-3">
              <button onClick={() => userAccount?.id && setOps(closePosDay(userAccount.id, ops.activeShift?.cashierName || userAccount.name))} className="ui-btn rounded-xl bg-[#1a237e] px-4 py-3 text-sm font-black text-white" disabled={!ops.activeShift}>
                日结
              </button>
              <button onClick={() => userAccount?.id && setOps(closePosMonth(userAccount.id, ops.activeShift?.cashierName || userAccount.name))} className="ui-btn ui-btn-secondary rounded-xl px-4 py-3 text-sm font-black">
                月结
              </button>
            </div>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-[#f8f9fa] p-4">
            <div className="text-sm font-black text-slate-900">最近操作记录</div>
            <div className="mt-3 space-y-3 text-sm text-slate-600">
              <div className="rounded-2xl border border-slate-200 bg-white px-3 py-3">
                <div className="font-black text-slate-900">班次状态</div>
                <div className="mt-1">{ops.activeShift ? `当前收银员：${ops.activeShift.cashierName}` : '当前未开始班次'}</div>
              </div>
              <div className="rounded-2xl border border-slate-200 bg-white px-3 py-3">
                <div className="font-black text-slate-900">最近日结</div>
                <div className="mt-1">{ops.dayClosures[0]?.businessDate || '暂无记录'}</div>
              </div>
              <div className="rounded-2xl border border-slate-200 bg-white px-3 py-3">
                <div className="font-black text-slate-900">最近月结</div>
                <div className="mt-1">{latestMonth?.businessMonth || '暂无记录'}</div>
              </div>
              <div className="rounded-2xl border border-slate-200 bg-white px-3 py-3">
                <div className="font-black text-slate-900">基础经营数据</div>
                <div className="mt-1">客户 {mockCustomers.length} · 供应商 {mockSuppliers.length} · 低库存 {lowStockProducts.length}</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DashboardPage;
