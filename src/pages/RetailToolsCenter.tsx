import React, { useEffect, useMemo, useState } from 'react';
import {
  BarChart3,
  Boxes,
  BadgePercent,
  ChevronLeft,
  Clock3,
  Package,
  Printer,
  ReceiptText,
  ScanLine,
  Search,
  ShoppingCart,
  Store,
  Tags,
  TrendingUp,
  Wallet,
  WifiOff,
  X,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { formatVT } from '../lib/utils';
import { getAccountProgramSettings, patchAccountProgramSettings } from '../lib/accountScopedStore';
import { getPosOpsState, PosPaymentMethod } from '../lib/posOpsStore';
import { extendedVanuatuProducts } from '../lib/mockDataFull';

interface RetailToolsCenterPageProps {
  accountId?: string;
}

type LabelTemplate = 'PRICE' | 'SHELF' | 'BARCODE';
type LabelSizeKey = '40x30' | '50x30' | '60x40' | '70x50';
type LabelOrientation = 'portrait' | 'landscape';
type LabelMarginKey = 'narrow' | 'normal' | 'wide';
type LabelQueueItem = { productId: string; copies: number };
type LabelTemplatePreset = {
  id: string;
  name: string;
  template: LabelTemplate;
  size: LabelSizeKey;
  orientation: LabelOrientation;
  margin: LabelMarginKey;
};

const paymentLabelMap: Record<PosPaymentMethod, string> = {
  CASH: '现金',
  CARD: '刷卡',
  STRET_PAY: '电子支付',
  CHECK: '支票',
};

const templateMeta: Record<LabelTemplate, { title: string; subtitle: string; badge: string; defaultSize: LabelSizeKey }> = {
  PRICE: { title: '零售价签', subtitle: '适合货架陈列与商品价签打印', badge: '推荐', defaultSize: '60x40' },
  SHELF: { title: '货架标签', subtitle: '适合门店货架、分类位和陈列管理', badge: '标准', defaultSize: '70x50' },
  BARCODE: { title: '条码标签', subtitle: '适合扫描入库、贴码和批量打印', badge: '高效', defaultSize: '50x30' },
};

const labelSizeMeta: Record<LabelSizeKey, { title: string; subtitle: string; width: string; height: string }> = {
  '40x30': { title: '40 × 30 mm', subtitle: '迷你价签', width: '40mm', height: '30mm' },
  '50x30': { title: '50 × 30 mm', subtitle: '条码贴纸', width: '50mm', height: '30mm' },
  '60x40': { title: '60 × 40 mm', subtitle: '商超价签', width: '60mm', height: '40mm' },
  '70x50': { title: '70 × 50 mm', subtitle: '货架标签', width: '70mm', height: '50mm' },
};

const labelMarginMeta: Record<LabelMarginKey, { title: string; subtitle: string }> = {
  narrow: { title: '紧凑边距', subtitle: '更省纸，适合批量打印' },
  normal: { title: '标准边距', subtitle: '门店常用默认' },
  wide: { title: '宽松边距', subtitle: '更适合贴边留白' },
};

const makePresetId = () => `preset_${Math.random().toString(36).slice(2, 10)}`;

const RetailToolsCenterPage: React.FC<RetailToolsCenterPageProps> = ({ accountId }) => {
  const [reportEnabled, setReportEnabled] = useState(false);
  const [bundleEnabled, setBundleEnabled] = useState(false);
  const [priceTier, setPriceTier] = useState<'A' | 'B' | 'C'>('A');
  const [offlineEnabled, setOfflineEnabled] = useState(false);
  const [showReportModal, setShowReportModal] = useState(false);
  const [showLabelModal, setShowLabelModal] = useState(false);
  const [labelSearch, setLabelSearch] = useState('');
  const [selectedProductId, setSelectedProductId] = useState(extendedVanuatuProducts[0]?.id || '');
  const [queuedLabelItems, setQueuedLabelItems] = useState<LabelQueueItem[]>([{ productId: extendedVanuatuProducts[0]?.id || '', copies: 1 }]);
  const [labelTemplate, setLabelTemplate] = useState<LabelTemplate>('PRICE');
  const [labelSize, setLabelSize] = useState<LabelSizeKey>('60x40');
  const [labelOrientation, setLabelOrientation] = useState<LabelOrientation>('portrait');
  const [labelMargin, setLabelMargin] = useState<LabelMarginKey>('normal');
  const [labelCopies, setLabelCopies] = useState(1);
  const [labelPresetName, setLabelPresetName] = useState('商超常用');
  const [labelPresets, setLabelPresets] = useState<LabelTemplatePreset[]>([]);
  const [activeLabelPresetId, setActiveLabelPresetId] = useState('');
  const [labelForm, setLabelForm] = useState({
    title: extendedVanuatuProducts[0]?.title || '商品名称',
    barcode: extendedVanuatuProducts[0]?.barcode || '000000000000',
    price: '150',
    unit: '件',
    shelf: 'A-01',
    note: '瓦努阿图 POS 标签',
  });

  useEffect(() => {
    if (!accountId) return;
    let mounted = true;
    (async () => {
      const settings = await getAccountProgramSettings(accountId);
      if (!mounted) return;
      if (typeof settings.retailRealtimeReportEnabled === 'boolean') setReportEnabled(settings.retailRealtimeReportEnabled);
      if (typeof settings.retailBundleSaleEnabled === 'boolean') setBundleEnabled(settings.retailBundleSaleEnabled);
      if (settings.retailPriceTier === 'A' || settings.retailPriceTier === 'B' || settings.retailPriceTier === 'C') setPriceTier(settings.retailPriceTier);
      if (typeof settings.retailOfflineModeEnabled === 'boolean') setOfflineEnabled(settings.retailOfflineModeEnabled);
      if (settings.retailLabelDefaultTemplate === 'PRICE' || settings.retailLabelDefaultTemplate === 'SHELF' || settings.retailLabelDefaultTemplate === 'BARCODE') {
        setLabelTemplate(settings.retailLabelDefaultTemplate);
      }
      if (settings.retailLabelDefaultSize === '40x30' || settings.retailLabelDefaultSize === '50x30' || settings.retailLabelDefaultSize === '60x40' || settings.retailLabelDefaultSize === '70x50') {
        setLabelSize(settings.retailLabelDefaultSize);
      }
      if (settings.retailLabelDefaultOrientation === 'portrait' || settings.retailLabelDefaultOrientation === 'landscape') {
        setLabelOrientation(settings.retailLabelDefaultOrientation);
      }
      if (settings.retailLabelDefaultMargin === 'narrow' || settings.retailLabelDefaultMargin === 'normal' || settings.retailLabelDefaultMargin === 'wide') {
        setLabelMargin(settings.retailLabelDefaultMargin);
      }
      if (Array.isArray(settings.retailLabelPresets)) {
        const presets = settings.retailLabelPresets
          .map((preset) => {
            if (!preset || typeof preset !== 'object') return null;
            const template = preset.template;
            const size = preset.size;
            const orientation = preset.orientation;
            const margin = preset.margin;
            if ((template !== 'PRICE' && template !== 'SHELF' && template !== 'BARCODE') || (size !== '40x30' && size !== '50x30' && size !== '60x40' && size !== '70x50') || (orientation !== 'portrait' && orientation !== 'landscape') || (margin !== 'narrow' && margin !== 'normal' && margin !== 'wide')) {
              return null;
            }
            return {
              id: preset.id || makePresetId(),
              name: preset.name || '未命名模板',
              template,
              size,
              orientation,
              margin,
            };
          })
          .filter(Boolean) as LabelTemplatePreset[];
        if (presets.length) {
          setLabelPresets(presets);
          const activeId = typeof settings.retailLabelActivePresetId === 'string' ? settings.retailLabelActivePresetId : '';
          setActiveLabelPresetId(activeId || presets[0].id);
        }
      }
    })();
    return () => {
      mounted = false;
    };
  }, [accountId]);

  const persist = async (patch: Record<string, unknown>) => {
    if (!accountId) return;
    await patchAccountProgramSettings(accountId, patch as any);
  };

  const toggleReport = async () => {
    const next = !reportEnabled;
    setReportEnabled(next);
    await persist({ retailRealtimeReportEnabled: next });
    setShowReportModal(next);
  };

  const toggleBundle = async () => {
    const next = !bundleEnabled;
    setBundleEnabled(next);
    await persist({ retailBundleSaleEnabled: next });
  };

  const cycleTier = async () => {
    const next = priceTier === 'A' ? 'B' : priceTier === 'B' ? 'C' : 'A';
    setPriceTier(next);
    await persist({ retailPriceTier: next });
  };

  const saveLabelDefaults = async () => {
    await persist({
      retailLabelDefaultTemplate: labelTemplate,
      retailLabelDefaultSize: labelSize,
      retailLabelDefaultOrientation: labelOrientation,
      retailLabelDefaultMargin: labelMargin,
    });
  };

  const saveLabelPreset = async () => {
    const nextPreset: LabelTemplatePreset = {
      id: activeLabelPresetId || makePresetId(),
      name: labelPresetName.trim() || `${templateMeta[labelTemplate].title} · ${labelSizeMeta[labelSize].title}`,
      template: labelTemplate,
      size: labelSize,
      orientation: labelOrientation,
      margin: labelMargin,
    };
    const nextPresets = (() => {
      const filtered = labelPresets.filter((preset) => preset.id !== nextPreset.id);
      return [nextPreset, ...filtered].slice(0, 12);
    })();
    setLabelPresets(nextPresets);
    setActiveLabelPresetId(nextPreset.id);
    await persist({
      retailLabelPresets: nextPresets,
      retailLabelActivePresetId: nextPreset.id,
      retailLabelDefaultTemplate: nextPreset.template,
      retailLabelDefaultSize: nextPreset.size,
      retailLabelDefaultOrientation: nextPreset.orientation,
      retailLabelDefaultMargin: nextPreset.margin,
    });
  };

  const applyLabelPreset = async (preset: LabelTemplatePreset) => {
    setActiveLabelPresetId(preset.id);
    setLabelPresetName(preset.name);
    setLabelTemplate(preset.template);
    setLabelSize(preset.size);
    setLabelOrientation(preset.orientation);
    setLabelMargin(preset.margin);
    await persist({
      retailLabelActivePresetId: preset.id,
      retailLabelDefaultTemplate: preset.template,
      retailLabelDefaultSize: preset.size,
      retailLabelDefaultOrientation: preset.orientation,
      retailLabelDefaultMargin: preset.margin,
    });
  };

  const removeLabelPreset = async (presetId: string) => {
    const nextPresets = labelPresets.filter((preset) => preset.id !== presetId);
    setLabelPresets(nextPresets);
    const nextActive = activeLabelPresetId === presetId ? nextPresets[0]?.id || '' : activeLabelPresetId;
    setActiveLabelPresetId(nextActive);
    await persist({
      retailLabelPresets: nextPresets,
      retailLabelActivePresetId: nextActive || undefined,
    });
  };

  const addQueueProduct = (productId: string) => {
    setQueuedLabelItems((current) => {
      const existing = current.find((item) => item.productId === productId);
      if (existing) {
        return current.map((item) => (item.productId === productId ? { ...item, copies: Math.min(20, item.copies + 1) } : item));
      }
      return [...current, { productId, copies: 1 }];
    });
  };

  const addQueueProducts = (productIds: string[]) => {
    setQueuedLabelItems((current) => {
      const next = [...current];
      for (const productId of productIds) {
        const existing = next.find((item) => item.productId === productId);
        if (existing) {
          existing.copies = Math.min(20, existing.copies + 1);
        } else {
          next.push({ productId, copies: 1 });
        }
      }
      return next;
    });
  };

  const removeQueueProduct = (productId: string) => {
    setQueuedLabelItems((current) => current.filter((item) => item.productId !== productId));
  };

  const setQueueCopies = (productId: string, copies: number) => {
    setQueuedLabelItems((current) =>
      current.map((item) => (item.productId === productId ? { ...item, copies: Math.max(1, Math.min(20, copies)) } : item))
    );
  };

  const clearLabelQueue = () => setQueuedLabelItems([]);
  const addFilteredProductsToQueue = () => addQueueProducts(productCatalog.map((product) => product.id));
  const addVisibleProductsToQueue = () => addQueueProducts(productCatalog.slice(0, 18).map((product) => product.id));

  const toggleOffline = async () => {
    const next = !offlineEnabled;
    setOfflineEnabled(next);
    await persist({ retailOfflineModeEnabled: next });
  };

  const posState = accountId ? getPosOpsState(accountId) : null;
  const todayKey = new Date().toISOString().slice(0, 10);

  const report = useMemo(() => {
    const sales = (posState?.sales || []).filter((item) => item.createdAt.slice(0, 10) === todayKey);
    const paymentBreakdown: Record<PosPaymentMethod, number> = { CASH: 0, CARD: 0, STRET_PAY: 0, CHECK: 0 };
    for (const sale of sales) paymentBreakdown[sale.paymentMethod] += sale.amount;
    return {
      salesCount: sales.length,
      totalAmount: sales.reduce((sum, sale) => sum + sale.amount, 0),
      itemCount: sales.reduce((sum, sale) => sum + sale.itemCount, 0),
      paymentBreakdown,
      latestSales: sales.slice(0, 6),
      activeShift: posState?.activeShift || null,
      totalShifts: posState?.shifts.length || 0,
      dayClosures: posState?.dayClosures.length || 0,
      monthClosures: posState?.monthClosures.length || 0,
    };
  }, [posState, todayKey]);

  const productCatalog = useMemo(() => {
    const keyword = labelSearch.trim().toLowerCase();
    return extendedVanuatuProducts.filter((product) => {
      if (!keyword) return true;
      return product.title.toLowerCase().includes(keyword) || product.barcode.toLowerCase().includes(keyword) || product.category?.toLowerCase().includes(keyword);
    });
  }, [labelSearch]);

  const productMap = useMemo(() => new Map(extendedVanuatuProducts.map((product) => [product.id, product])), []);

  const selectedProduct = useMemo(
    () => extendedVanuatuProducts.find((product) => product.id === selectedProductId) || productCatalog[0] || extendedVanuatuProducts[0],
    [selectedProductId, productCatalog]
  );

  const queuedProducts = useMemo(
    () =>
      queuedLabelItems
        .map((queueItem) => {
          const product = productMap.get(queueItem.productId);
          if (!product) return null;
          return { product, copies: queueItem.copies };
        })
        .filter(Boolean)
        .map((entry) => entry!),
    [queuedLabelItems, productMap]
  );

  useEffect(() => {
    if (!selectedProduct) return;
    setLabelForm((prev) => ({ ...prev, title: selectedProduct.title, barcode: selectedProduct.barcode, shelf: selectedProduct.shelfId || prev.shelf }));
  }, [selectedProduct?.id]);

  const labelCount = Math.max(1, Math.min(20, Number.parseInt(String(labelCopies || 1), 10) || 1));
  const labelItems = Array.from({ length: labelCount }, (_, index) => ({
    key: index,
    title: labelForm.title || '商品名称',
    barcode: labelForm.barcode || '--',
    price: labelForm.price || '0',
    unit: labelForm.unit || '件',
    shelf: labelForm.shelf || '--',
    note: labelForm.note || '瓦努阿图 POS 标签',
    size: labelSize,
  }));

  const printQueue = queuedProducts.length
    ? queuedProducts.flatMap(({ product, copies }) =>
        Array.from({ length: copies }, (_, index) => ({
          key: `${product.id}-${index}`,
          title: product.title,
          barcode: product.barcode,
          price: labelForm.price || '0',
          unit: labelForm.unit || '件',
          shelf: product.shelfId || labelForm.shelf || '--',
          note: product.category || labelForm.note || '瓦努阿图 POS 标签',
          size: labelSize,
        }))
      )
    : labelItems;

  const selectedSizeMeta = labelSizeMeta[labelSize];
  const selectedMarginMeta = labelMarginMeta[labelMargin];

  const escapeHtml = (value: string) =>
    value
      .replaceAll('&', '&amp;')
      .replaceAll('<', '&lt;')
      .replaceAll('>', '&gt;')
      .replaceAll('"', '&quot;')
      .replaceAll("'", '&#39;');

  const renderLabelPreview = (item: typeof labelItems[number]) => {
    const priceText = formatVT(Number(item.price) || 0);
    const sizeLabel = labelSizeMeta[item.size];
    if (labelTemplate === 'SHELF') {
      return (
        <div className="rounded-[28px] border border-slate-200 bg-white p-4 shadow-sm">
          <div className="flex items-center justify-between gap-3">
            <div className="inline-flex items-center gap-2 rounded-full border border-[#dbe7ff] bg-[#eef4ff] px-3 py-1 text-[10px] font-black text-[#1a237e]">
              <Store size={12} />
              瓦努阿图 POS
            </div>
            <div className="flex items-center gap-2">
              <div className="rounded-full border border-[#dbe7ff] bg-white px-3 py-1 text-[10px] font-black text-[#1a237e]">
              货架标签
              </div>
              <div className="rounded-full border border-[#dbe7ff] bg-[#eef4ff] px-3 py-1 text-[10px] font-black text-[#1a237e]">
                {sizeLabel.title}
              </div>
            </div>
          </div>

          <div className="mt-4 grid grid-cols-[0.92fr_1.08fr] gap-4 items-stretch">
            <div className="rounded-[22px] border border-slate-200 bg-[#f8f9fa] p-4 flex flex-col justify-between">
              <div>
                <div className="text-[10px] font-black tracking-[0.2em] text-slate-500">货架位</div>
                <div className="mt-2 text-3xl font-black text-[#1a237e] leading-tight">{item.shelf || '--'}</div>
              </div>
              <div className="mt-3 text-[10px] font-semibold text-slate-500">适合门店货架、分类位和陈列管理 · {sizeLabel.subtitle}</div>
            </div>

            <div className="rounded-[22px] border border-slate-200 bg-white p-4">
              <div className="text-[10px] font-black tracking-[0.2em] text-slate-500 uppercase">商品名称</div>
              <div className="mt-2 text-xl font-black text-slate-900 leading-tight line-clamp-2">{item.title}</div>
              <div className="mt-3 flex flex-wrap gap-2 text-[10px] font-black text-[#1a237e]">
                <span className="rounded-full border border-[#dbe7ff] bg-[#eef4ff] px-2.5 py-1">条码：{item.barcode || '--'}</span>
                <span className="rounded-full border border-[#dbe7ff] bg-white px-2.5 py-1">单位：{item.unit || '件'}</span>
              </div>

              <div className="mt-4 flex items-end justify-between gap-3">
                <div>
                  <div className="text-[10px] font-black tracking-[0.2em] text-slate-500">零售价</div>
                  <div className="mt-1 text-3xl font-black text-[#1a237e]">{priceText}</div>
                </div>
                <div className="rounded-[18px] border border-slate-200 bg-[#f8f9fa] px-3 py-2 text-right">
                  <div className="text-[10px] font-black tracking-[0.18em] text-slate-500">分类 / 备注</div>
                  <div className="mt-1 text-sm font-black text-slate-900">{item.note}</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      );
    }

    if (labelTemplate === 'BARCODE') {
      return (
        <div className="rounded-[28px] border border-slate-200 bg-white p-4 shadow-sm">
          <div className="flex items-center justify-between gap-3">
            <div className="inline-flex items-center gap-2 rounded-full border border-[#dbe7ff] bg-[#eef4ff] px-3 py-1 text-[10px] font-black text-[#1a237e]">
              <Store size={12} />
              瓦努阿图 POS
            </div>
            <div className="flex items-center gap-2">
              <div className="rounded-full border border-[#dbe7ff] bg-white px-3 py-1 text-[10px] font-black text-[#1a237e]">
              条码标签
              </div>
              <div className="rounded-full border border-[#dbe7ff] bg-[#eef4ff] px-3 py-1 text-[10px] font-black text-[#1a237e]">
                {sizeLabel.title}
              </div>
            </div>
          </div>

          <div className="mt-4 rounded-[22px] border border-slate-200 bg-[#f8f9fa] p-4 space-y-4">
            <div>
              <div className="text-[10px] font-black tracking-[0.2em] text-slate-500">条码</div>
              <div className="mt-2 flex items-center justify-center rounded-[18px] bg-white p-4">
                <div className="h-14 w-full rounded-xl bg-[repeating-linear-gradient(90deg,#111827_0,#111827_2px,#fff_2px,#fff_5px,#111827_5px,#111827_6px,#fff_6px,#fff_9px)] opacity-95" />
              </div>
              <div className="mt-2 text-center text-lg font-black tracking-[0.2em] text-slate-900">{item.barcode || '--'}</div>
            </div>

            <div className="grid grid-cols-[1.1fr_0.9fr] gap-3">
              <div>
                <div className="text-[10px] font-black tracking-[0.2em] text-slate-500 uppercase">商品名称</div>
                <div className="mt-2 text-xl font-black text-slate-900 leading-tight line-clamp-2">{item.title}</div>
                <div className="mt-3 text-[10px] font-semibold text-slate-500">适合扫描入库、贴码和批量打印 · {sizeLabel.subtitle}</div>
              </div>
              <div className="rounded-[20px] bg-[#1a237e] px-4 py-4 text-white text-right flex flex-col justify-between">
                <div className="text-[10px] font-black uppercase tracking-[0.28em] text-white/70">零售价</div>
                <div className="text-3xl font-black leading-none">{priceText}</div>
                <div className="mt-3 text-[10px] font-semibold text-white/75">单位：{item.unit || '件'}</div>
              </div>
            </div>
          </div>
        </div>
      );
    }

    return (
      <div className="rounded-[28px] border border-slate-200 bg-white p-4 shadow-sm">
        <div className="flex items-center justify-between gap-2">
          <div className="inline-flex items-center gap-2 rounded-full border border-[#dbe7ff] bg-[#eef4ff] px-3 py-1 text-[10px] font-black text-[#1a237e]">
            <Store size={12} />
            瓦努阿图 POS
          </div>
          <div className="flex items-center gap-2">
            <div className="text-[10px] font-black tracking-[0.24em] text-slate-400 uppercase">商用标签预览</div>
            <div className="rounded-full border border-[#dbe7ff] bg-white px-3 py-1 text-[10px] font-black text-[#1a237e]">{sizeLabel.title}</div>
          </div>
        </div>
        <div className="mt-4 grid grid-cols-[1.2fr_0.8fr] gap-4 items-start">
          <div>
            <div className="text-xs font-black tracking-[0.2em] text-slate-500 uppercase">商品名称</div>
            <div className="mt-2 text-2xl font-black text-slate-900 leading-tight line-clamp-2">{item.title}</div>
            <div className="mt-3 flex flex-wrap gap-2 text-[10px] font-black text-[#1a237e]">
              <span className="rounded-full border border-[#dbe7ff] bg-white px-2.5 py-1">条码：{item.barcode || '--'}</span>
              <span className="rounded-full border border-[#dbe7ff] bg-white px-2.5 py-1">货架位：{item.shelf || '--'}</span>
              <span className="rounded-full border border-[#dbe7ff] bg-white px-2.5 py-1">单位：{item.unit || '件'}</span>
            </div>
            <div className="mt-3 text-[10px] font-semibold text-slate-500">模板：{templateMeta[labelTemplate].title} · 尺寸：{sizeLabel.title} · 方向：{labelOrientation === 'portrait' ? '纵向' : '横向'}</div>
          </div>
          <div className="text-right">
            <div className="inline-flex items-center justify-center rounded-[22px] bg-[#1a237e] px-4 py-3 text-white">
              <div>
                <div className="text-[10px] font-black uppercase tracking-[0.28em] text-white/70">零售价</div>
                <div className="mt-1 text-3xl font-black">{priceText}</div>
              </div>
            </div>
            <div className="mt-3 text-[10px] font-semibold text-slate-500">{item.note}</div>
          </div>
        </div>
      </div>
    );
  };

  const handlePrint = () => {
    const title = `LABEL-${labelForm.barcode || 'PRINT'}`;
    const rows = printQueue
      .map((item) => {
        const priceText = formatVT(Number(item.price) || 0);
        if (labelTemplate === 'SHELF') {
          return `
            <section class="label label-shelf">
              <div class="brand-row">
                <div class="brand">瓦努阿图 POS</div>
                <div class="mode">货架标签</div>
              </div>
              <div class="content content-shelf">
                <div class="shelf-box">
                  <div class="small-title">货架位</div>
                  <div class="shelf">${escapeHtml(item.shelf || '--')}</div>
                  <div class="shelf-caption">适合门店货架、分类位和陈列管理</div>
                </div>
                <div class="detail-box">
                  <div class="small-title">商品名称</div>
                  <div class="product">${escapeHtml(item.title)}</div>
                  <div class="chips">
                    <span>条码：${escapeHtml(item.barcode || '--')}</span>
                    <span>单位：${escapeHtml(item.unit || '件')}</span>
                  </div>
                  <div class="price-line">
                    <div>
                      <div class="small-title">零售价</div>
                      <div class="price price-plain">${escapeHtml(priceText)}</div>
                    </div>
                    <div class="remark">${escapeHtml(item.note)}</div>
                  </div>
                </div>
              </div>
            </section>`;
        }
        if (labelTemplate === 'BARCODE') {
          return `
            <section class="label label-barcode">
              <div class="brand-row">
                <div class="brand">瓦努阿图 POS</div>
                <div class="mode">条码标签</div>
              </div>
              <div class="barcode-strip">
                <div class="barcode-bars"></div>
                <div class="barcode-text">${escapeHtml(item.barcode || '--')}</div>
              </div>
              <div class="content content-barcode">
                <div class="detail-box">
                  <div class="small-title">商品名称</div>
                  <div class="product">${escapeHtml(item.title)}</div>
                  <div class="caption">适合扫描入库、贴码和批量打印</div>
                </div>
                <div class="price-box price-box-small">
                  <div class="price-head">零售价</div>
                  <div class="price">${escapeHtml(priceText)}</div>
                  <div class="unit">单位：${escapeHtml(item.unit || '件')}</div>
                </div>
              </div>
            </section>`;
        }
        return `
        <section class="label label-price">
          <div class="top">
            <div class="brand">瓦努阿图 POS</div>
            <div class="note">推荐 · 零售价签</div>
          </div>
          <div class="body">
            <div class="left">
              <div class="field-title">商品名称</div>
              <div class="product">${escapeHtml(item.title)}</div>
              <div class="chips">
                <span>条码：${escapeHtml(item.barcode || '--')}</span>
                <span>货架位：${escapeHtml(item.shelf || '--')}</span>
                <span>单位：${escapeHtml(item.unit || '件')}</span>
              </div>
            </div>
            <div class="right">
              <div class="price-box">
                <div class="price-head">零售价</div>
                <div class="price">${escapeHtml(priceText)}</div>
              </div>
            </div>
          </div>
          <div class="footer">${escapeHtml(item.note)}</div>
        </section>`;
      })
      .join('');
    const win = window.open('', '_blank', 'width=1200,height=900');
    if (!win) return;
    win.document.open();
    win.document.write(`<!doctype html>
      <html>
        <head>
          <meta charset="utf-8" />
          <meta name="viewport" content="width=device-width, initial-scale=1" />
          <title>${title}</title>
          <style>
            * { box-sizing: border-box; }
            html, body { margin: 0; padding: 0; background: #fff; color: #0f172a; font-family: Arial, "Noto Sans SC", sans-serif; }
            body { padding: var(--page-padding); }
            .grid { display: flex; flex-wrap: wrap; gap: var(--page-gap); align-items: flex-start; }
            .label { border: 1px solid #cbd5e1; border-radius: 18px; padding: 4mm; background: #fff; break-inside: avoid; page-break-inside: avoid; width: var(--label-width); min-height: var(--label-height); overflow: hidden; }
            .label-price { padding: 14px; }
            .label-shelf { padding: 14px; }
            .label-barcode { padding: 14px; }
            .top { display:flex; justify-content: space-between; align-items:flex-start; gap:12px; }
            .brand { display:inline-flex; align-items:center; padding:6px 10px; border-radius:999px; background:#eef4ff; color:#1a237e; border:1px solid #dbe7ff; font-size:10px; font-weight:700; letter-spacing:.18em; }
            .note { font-size:10px; color:#94a3b8; font-weight:700; letter-spacing:.16em; text-transform:uppercase; }
            .body { margin-top:14px; display:grid; grid-template-columns: 1.2fr .8fr; gap: 14px; align-items:start; }
            .label-price .body { min-height: calc(var(--label-height) - 40px); }
            .label-shelf .content-shelf { min-height: calc(var(--label-height) - 40px); }
            .label-barcode .content-barcode { min-height: calc(var(--label-height) - 80px); }
            .field-title { font-size: 10px; font-weight: 700; letter-spacing: .18em; text-transform: uppercase; color: #64748b; }
            .product { margin-top: 8px; font-size: 24px; line-height: 1.12; font-weight: 900; color: #0f172a; }
            .chips { margin-top: 12px; display:flex; flex-wrap:wrap; gap:8px; }
            .chips span { padding: 5px 9px; border: 1px solid #dbe7ff; background: #fff; color:#1a237e; border-radius:999px; font-size:10px; font-weight:700; }
            .right { display:flex; justify-content:flex-end; }
            .price-box { min-width: 120px; border-radius: 18px; background:#1a237e; color:#fff; padding: 14px 16px; text-align:right; }
            .price-head { font-size: 10px; font-weight: 700; letter-spacing: .28em; text-transform: uppercase; color: rgba(255,255,255,.7); }
            .price { margin-top: 6px; font-size: 34px; line-height: 1; font-weight: 900; }
            .footer { margin-top: 12px; font-size: 10px; color: #94a3b8; font-weight: 700; text-align:right; letter-spacing:.14em; }
            .brand-row { display:flex; justify-content:space-between; align-items:center; gap:12px; }
            .mode { font-size:10px; font-weight:800; color:#1a237e; background:#eef4ff; border:1px solid #dbe7ff; border-radius:999px; padding:6px 10px; }
            .content { margin-top:14px; }
            .content-shelf { display:grid; grid-template-columns: .85fr 1.15fr; gap: 14px; }
            .shelf-box { border-radius: 18px; border:1px solid #dbe7ff; background:#f8f9fa; padding: 14px; display:flex; flex-direction:column; justify-content:space-between; }
            .small-title { font-size:10px; font-weight:800; letter-spacing:.18em; text-transform:uppercase; color:#64748b; }
            .shelf { margin-top: 8px; font-size: 34px; font-weight: 900; line-height: 1; color:#1a237e; }
            .shelf-caption { margin-top: 12px; font-size: 11px; color:#64748b; font-weight:700; line-height:1.4; }
            .detail-box { border-radius: 18px; border:1px solid #dbe7ff; background:#fff; padding: 14px; }
            .price-line { margin-top: 16px; display:flex; align-items:flex-end; justify-content:space-between; gap:12px; }
            .price-plain { margin-top: 4px; font-size: 28px; color:#1a237e; }
            .remark { font-size: 11px; font-weight:700; color:#64748b; text-align:right; max-width: 140px; line-height:1.4; }
            .barcode-strip { margin-top: 14px; border-radius: 20px; border:1px solid #dbe7ff; background:#f8f9fa; padding: 14px; }
            .barcode-bars { height: 64px; width: 100%; border-radius: 14px; background: repeating-linear-gradient(90deg, #0f172a 0, #0f172a 2px, #ffffff 2px, #ffffff 5px, #0f172a 5px, #0f172a 6px, #ffffff 6px, #ffffff 10px); }
            .barcode-text { margin-top: 8px; text-align:center; font-size: 18px; font-weight: 900; letter-spacing: .24em; color:#0f172a; }
            .content-barcode { display:grid; grid-template-columns: 1fr .8fr; gap: 14px; align-items: stretch; }
            .caption { margin-top: 10px; font-size: 11px; color:#64748b; font-weight:700; line-height:1.4; }
            .price-box-small { min-width: 0; display:flex; flex-direction:column; justify-content:space-between; }
            .price-box-small .price { font-size: 30px; }
            .unit { margin-top: 10px; font-size: 11px; font-weight:700; color: rgba(255,255,255,.8); }
            .size-40x30 { --label-width: 40mm; --label-height: 30mm; }
            .size-50x30 { --label-width: 50mm; --label-height: 30mm; }
            .size-60x40 { --label-width: 60mm; --label-height: 40mm; }
            .size-70x50 { --label-width: 70mm; --label-height: 50mm; }
            .orient-portrait { --label-width: var(--label-width); --label-height: var(--label-height); }
            .orient-landscape { --print-width: var(--label-height); --print-height: var(--label-width); }
            .orient-landscape .label { width: var(--print-width); min-height: var(--print-height); }
            .margin-narrow { --page-padding: 3mm; --page-gap: 4mm; }
            .margin-normal { --page-padding: 6mm; --page-gap: 6mm; }
            .margin-wide { --page-padding: 10mm; --page-gap: 8mm; }
            @media print { body { padding: var(--page-padding); } }
          </style>
        </head>
        <body class="size-${labelSize} orient-${labelOrientation} margin-${labelMargin}">
          <div class="grid">${rows}</div>
          <script>
            window.onload = function () {
              window.focus();
              window.print();
              setTimeout(function () { window.close(); }, 300);
            };
          </script>
        </body>
      </html>`);
    win.document.close();
  };

  const featureCards = [
    { title: '实时经营报表', description: reportEnabled ? '已开启，可直接查看今日销售与班次汇总' : '点击开启后，系统会同步今日经营数据', icon: BarChart3, active: reportEnabled, onClick: toggleReport, actionLabel: '查看' },
    { title: '组合商品 / 捆绑销售', description: bundleEnabled ? '已开启，适合套餐、组合促销和搭配销售' : '点击开启后，可在零售店启用组合销售', icon: Boxes, active: bundleEnabled, onClick: toggleBundle, actionLabel: '切换' },
    { title: '价格分级', description: `当前等级：${priceTier} 级，点击切换 A / B / C`, icon: BadgePercent, active: true, onClick: cycleTier, actionLabel: '切换' },
    { title: '离线操作模式', description: offlineEnabled ? '已开启，断网时也能继续收银并保留记录' : '点击开启后，离线也能先进行门店操作', icon: WifiOff, active: offlineEnabled, onClick: toggleOffline, actionLabel: '切换' },
    { title: '标签 / 条码打印', description: '进入独立标签打印工作台，支持模板、尺寸和批量打印', icon: Tags, active: false, onClick: () => { window.location.hash = '#label-print'; }, actionLabel: '进入' },
  ] as const;
  const selectedTemplate = templateMeta[labelTemplate];

  return (
    <>
      <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.2 }} className="w-full space-y-5">
        <div className="ui-card bg-white border border-slate-200 rounded-[28px] p-4 sm:p-6 shadow-sm">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <div className="inline-flex items-center gap-2 rounded-full border border-[#dbe7ff] bg-[#eef4ff] px-3 py-1 text-[10px] font-black tracking-[0.24em] text-[#1a237e]">零售功能中心</div>
              <h2 className="mt-3 text-2xl font-black text-slate-900">把新增功能独立出来</h2>
              <p className="mt-1 text-sm font-semibold text-slate-500">零售店现在可以单独管理经营报表、组合销售、价格分级、离线模式和专业标签打印。</p>
            </div>
            <div className="flex items-center gap-2">
              <button type="button" onClick={() => { window.location.hash = '#retail-pos'; }} className="ui-btn ui-btn-secondary px-4 py-2 rounded-xl text-sm font-black">
                <ChevronLeft size={16} /> 返回收银
              </button>
              <div className="inline-flex items-center gap-2 rounded-full bg-[#eef4ff] border border-[#dbe7ff] px-3 py-2 text-xs font-black text-[#1a237e]">
                <ShoppingCart size={14} /> {accountId || '未选择门店'}
              </div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-5 gap-3">
          {featureCards.map((card) => {
            const Icon = card.icon;
            return (
              <button key={card.title} onClick={card.onClick} className={`ui-card text-left p-4 rounded-[24px] border transition-all ${card.active ? 'border-[#1a237e] bg-[#eef4ff]' : 'border-slate-200 bg-white hover:border-[#1a237e]/30'}`}>
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2 text-[#1a237e] font-black text-sm">
                    <Icon size={16} />
                    <span>{card.title}</span>
                  </div>
                  <span className="inline-flex items-center rounded-full border border-[#dbe7ff] bg-white px-2.5 py-1 text-[10px] font-black text-[#1a237e]">{card.active ? '已启用' : '未启用'}</span>
                </div>
                <div className="mt-3 text-[11px] font-semibold leading-5 text-slate-500">{card.description}</div>
                <div className="mt-4 inline-flex items-center gap-1 text-[11px] font-black text-[#1a237e]">
                  {card.actionLabel}
                  <span className="text-slate-400">→</span>
                </div>
              </button>
            );
          })}
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-4 gap-4">
          <div className="xl:col-span-1 space-y-4">
            <div className="ui-card bg-white border border-slate-200 rounded-[28px] p-4 shadow-sm">
              <div className="flex items-center gap-2 text-[#1a237e] font-black text-sm"><BarChart3 size={16} />今日经营概览</div>
              <div className="mt-4 grid grid-cols-2 gap-3">
                <div className="rounded-2xl border border-slate-200 bg-[#f8f9fa] p-3"><div className="text-[10px] font-black tracking-widest text-slate-500">销售单数</div><div className="mt-2 text-2xl font-black text-[#1a237e]">{report.salesCount}</div></div>
                <div className="rounded-2xl border border-slate-200 bg-[#f8f9fa] p-3"><div className="text-[10px] font-black tracking-widest text-slate-500">销售金额</div><div className="mt-2 text-2xl font-black text-[#1a237e]">{formatVT(report.totalAmount)}</div></div>
                <div className="rounded-2xl border border-slate-200 bg-[#f8f9fa] p-3"><div className="text-[10px] font-black tracking-widest text-slate-500">商品件数</div><div className="mt-2 text-2xl font-black text-[#1a237e]">{report.itemCount}</div></div>
                <div className="rounded-2xl border border-slate-200 bg-[#f8f9fa] p-3"><div className="text-[10px] font-black tracking-widest text-slate-500">当班状态</div><div className="mt-2 text-sm font-black text-[#1a237e]">{report.activeShift ? '进行中' : '未开班'}</div></div>
              </div>
            </div>

            <div className="ui-card bg-white border border-slate-200 rounded-[28px] p-4 shadow-sm">
              <div className="flex items-center gap-2 text-[#1a237e] font-black text-sm"><Wallet size={16} />支付方式汇总</div>
              <div className="mt-3 space-y-2">
                {(Object.keys(paymentLabelMap) as PosPaymentMethod[]).map((method) => (
                  <div key={method} className="flex items-center justify-between gap-3 border-b border-slate-100 pb-2 last:border-0 last:pb-0 text-sm">
                    <span className="text-slate-600 font-semibold">{paymentLabelMap[method]}</span>
                    <span className="text-[#1a237e] font-black">{formatVT(report.paymentBreakdown[method])}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="xl:col-span-3 grid grid-cols-1 lg:grid-cols-2 gap-4">
            <div className="ui-card bg-white border border-slate-200 rounded-[28px] p-4 shadow-sm">
              <div className="flex items-center gap-2 text-[#1a237e] font-black text-sm"><Clock3 size={16} />班次与交班</div>
              <div className="mt-3 rounded-2xl border border-slate-200 bg-[#f8f9fa] p-4 space-y-2 text-sm">
                <div className="flex items-center justify-between gap-4"><span className="text-slate-500 font-semibold">当前班次</span><span className="font-black text-slate-900">{report.activeShift ? report.activeShift.id : '无'}</span></div>
                <div className="flex items-center justify-between gap-4"><span className="text-slate-500 font-semibold">收银员</span><span className="font-black text-slate-900">{report.activeShift?.cashierName || '未指定'}</span></div>
                <div className="flex items-center justify-between gap-4"><span className="text-slate-500 font-semibold">班次数量</span><span className="font-black text-[#1a237e]">{report.totalShifts}</span></div>
                <div className="flex items-center justify-between gap-4"><span className="text-slate-500 font-semibold">日结次数</span><span className="font-black text-[#1a237e]">{report.dayClosures}</span></div>
                <div className="flex items-center justify-between gap-4"><span className="text-slate-500 font-semibold">月结次数</span><span className="font-black text-[#1a237e]">{report.monthClosures}</span></div>
              </div>
              <div className="mt-3 text-xs font-semibold text-slate-500">这里保留的是收银数据联动，不会影响零售收银本身。</div>
            </div>

            <div className="ui-card bg-white border border-slate-200 rounded-[28px] p-4 shadow-sm">
              <div className="flex items-center gap-2 text-[#1a237e] font-black text-sm"><ReceiptText size={16} />最近销售</div>
              <div className="mt-3 space-y-2">
                {report.latestSales.length === 0 ? (
                  <div className="rounded-2xl border border-dashed border-slate-200 bg-[#f8f9fa] py-10 text-center text-sm font-semibold text-slate-500">今天还没有销售记录</div>
                ) : (
                  report.latestSales.map((sale) => (
                    <div key={sale.id} className="rounded-2xl border border-slate-200 bg-[#f8f9fa] p-3 flex items-center justify-between gap-3">
                      <div>
                        <div className="text-sm font-black text-slate-900">{sale.id}</div>
                        <div className="mt-1 text-[10px] font-semibold text-slate-500">{sale.createdAt.replace('T', ' ').slice(0, 19)}</div>
                      </div>
                      <div className="text-right">
                        <div className="text-sm font-black text-[#1a237e]">{formatVT(sale.amount)}</div>
                        <div className="text-[10px] font-semibold text-slate-500">{sale.itemCount} 件</div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

            <div className="ui-card bg-white border border-slate-200 rounded-[28px] p-4 shadow-sm lg:col-span-2">
              <div className="flex items-center gap-2 text-[#1a237e] font-black text-sm"><TrendingUp size={16} />使用说明</div>
              <div className="mt-3 grid grid-cols-1 md:grid-cols-2 gap-3 text-sm text-slate-600">
                <div className="rounded-2xl border border-slate-200 bg-[#f8f9fa] p-4">实时经营报表适合店长查看当天收银概览，数据来自当前门店账号。</div>
                <div className="rounded-2xl border border-slate-200 bg-[#f8f9fa] p-4">价格分级、组合销售和离线模式都可以按门店独立保存。</div>
                <div className="rounded-2xl border border-slate-200 bg-[#f8f9fa] p-4">如果门店还没有开班，收银页会继续按原规则拦截结算。</div>
                <div className="rounded-2xl border border-slate-200 bg-[#f8f9fa] p-4">这里独立出来后，收银页会更干净，功能也更容易继续加。</div>
              </div>
            </div>
          </div>
        </div>
        <AnimatePresence>
          {showReportModal && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-[96] bg-white/90 backdrop-blur-sm flex items-center justify-center p-3 sm:p-6">
              <motion.div initial={{ scale: 0.97, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.97, opacity: 0 }} className="w-full max-w-5xl max-h-[90vh] overflow-y-auto rounded-[28px] border border-slate-200 bg-white p-4 sm:p-6 shadow-2xl space-y-4">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <div className="text-xl font-black text-slate-900">实时经营报表</div>
                    <div className="mt-1 text-[10px] font-semibold text-slate-500">今天的销售、班次和支付结构一目了然</div>
                  </div>
                  <button onClick={() => setShowReportModal(false)} className="w-9 h-9 rounded-full bg-slate-100 text-slate-600 flex items-center justify-center"><X size={18} /></button>
                </div>
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                  <div className="ui-card p-4"><div className="text-[10px] font-black tracking-widest text-slate-500">销售单数</div><div className="mt-2 text-2xl font-black text-[#1a237e]">{report.salesCount}</div></div>
                  <div className="ui-card p-4"><div className="text-[10px] font-black tracking-widest text-slate-500">销售金额</div><div className="mt-2 text-2xl font-black text-[#1a237e]">{formatVT(report.totalAmount)}</div></div>
                  <div className="ui-card p-4"><div className="text-[10px] font-black tracking-widest text-slate-500">商品件数</div><div className="mt-2 text-2xl font-black text-[#1a237e]">{report.itemCount}</div></div>
                  <div className="ui-card p-4"><div className="text-[10px] font-black tracking-widest text-slate-500">当班状态</div><div className="mt-2 text-sm font-black text-[#1a237e]">{report.activeShift ? '进行中' : '未开班'}</div><div className="mt-1 text-[10px] text-slate-500">班次 {report.totalShifts} / 日结 {report.dayClosures} / 月结 {report.monthClosures}</div></div>
                </div>
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
                  <div className="ui-card p-4 space-y-3">
                    <div className="text-sm font-black text-slate-900">支付方式</div>
                    {(Object.keys(paymentLabelMap) as PosPaymentMethod[]).map((method) => (
                      <div key={method} className="flex items-center justify-between text-sm border-b border-slate-100 pb-2 last:border-0 last:pb-0"><span className="text-slate-600 font-semibold">{paymentLabelMap[method]}</span><span className="text-[#1a237e] font-black">{formatVT(report.paymentBreakdown[method])}</span></div>
                    ))}
                  </div>
                  <div className="ui-card p-4 space-y-3">
                    <div className="text-sm font-black text-slate-900">最近销售</div>
                    {report.latestSales.length === 0 ? (
                      <div className="text-sm text-slate-500 py-6 text-center">今天还没有销售记录</div>
                    ) : (
                      report.latestSales.map((sale) => (
                        <div key={sale.id} className="flex items-center justify-between gap-3 border-b border-slate-100 pb-2 last:border-0 last:pb-0"><div><div className="text-sm font-black text-slate-900">{sale.id}</div><div className="text-[10px] text-slate-500 font-semibold">{sale.createdAt.replace('T', ' ').slice(0, 19)}</div></div><div className="text-right"><div className="text-sm font-black text-[#1a237e]">{formatVT(sale.amount)}</div><div className="text-[10px] text-slate-500 font-semibold">{sale.itemCount} 件</div></div></div>
                      ))
                    )}
                  </div>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        {showLabelModal && (
          <div className="fixed inset-0 z-[97] bg-white/90 backdrop-blur-sm flex items-center justify-center p-3 sm:p-6 print:hidden">
            <div className="w-full max-w-6xl rounded-[28px] border border-slate-200 bg-white shadow-2xl p-4 sm:p-6 space-y-4 max-h-[92vh] overflow-y-auto">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <div className="inline-flex items-center gap-2 rounded-full border border-[#dbe7ff] bg-[#eef4ff] px-3 py-1 text-[10px] font-black tracking-[0.24em] text-[#1a237e]">商用标签打印</div>
                  <div className="mt-3 text-2xl font-black text-slate-900">标签 / 条码打印</div>
                  <div className="mt-1 text-sm font-semibold text-slate-500">按模板、商品、份数进行快速打印，适合门店日常使用。</div>
                </div>
                <button onClick={() => setShowLabelModal(false)} className="w-9 h-9 rounded-full bg-slate-100 text-slate-600 flex items-center justify-center"><X size={18} /></button>
              </div>

              <div className="grid grid-cols-1 xl:grid-cols-[1.1fr_0.9fr] gap-4">
                <div className="space-y-4">
                  <div className="ui-card bg-white border border-slate-200 rounded-[24px] p-4 space-y-4">
                    <div className="flex items-center gap-2 text-[#1a237e] font-black text-sm"><Search size={16} />搜索商品</div>
                    <div className="grid grid-cols-1 lg:grid-cols-[1fr_auto] gap-3">
                      <div className="rounded-2xl border border-slate-200 bg-[#f8f9fa] px-3 py-2 flex items-center gap-2">
                        <Search size={16} className="text-slate-400" />
                        <input value={labelSearch} onChange={(e) => setLabelSearch(e.target.value)} placeholder="输入商品名、条码或分类" className="w-full bg-transparent outline-none text-sm font-semibold text-slate-800 placeholder:text-slate-400" />
                      </div>
                      <div className="inline-flex items-center gap-2 rounded-2xl border border-[#dbe7ff] bg-[#eef4ff] px-4 py-2 text-xs font-black text-[#1a237e]"><Package size={14} />{productCatalog.length} 个商品</div>
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                      <button type="button" onClick={addFilteredProductsToQueue} className="rounded-xl border border-[#dbe7ff] bg-[#eef4ff] px-3 py-2 text-xs font-black text-[#1a237e]">加入筛选结果</button>
                      <button type="button" onClick={addVisibleProductsToQueue} className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-black text-slate-700">加入当前显示</button>
                      <button type="button" onClick={() => setQueuedLabelItems([])} className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-black text-slate-600">清空队列</button>
                    </div>
                    <div className="flex items-center justify-between gap-3 rounded-[22px] border border-slate-200 bg-[#f8f9fa] px-3 py-2">
                      <div className="text-xs font-black text-slate-700">打印队列：{queuedLabelItems.length} 个商品</div>
                      <div className="flex items-center gap-2">
                        <button type="button" onClick={clearLabelQueue} className="rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-black text-slate-600">清空队列</button>
                        <button type="button" onClick={() => setQueuedLabelItems(productCatalog.slice(0, 6).map((product) => ({ productId: product.id, copies: 1 })))} className="rounded-xl border border-[#dbe7ff] bg-[#eef4ff] px-3 py-1.5 text-xs font-black text-[#1a237e]">快速加入前6个</button>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 max-h-[240px] overflow-y-auto pr-1">
                      {productCatalog.slice(0, 18).map((product) => {
                        const selected = product.id === selectedProduct?.id;
                        const queueEntry = queuedLabelItems.find((item) => item.productId === product.id);
                        return (
                          <div
                            key={product.id}
                            onClick={() => { setSelectedProductId(product.id); setLabelForm((prev) => ({ ...prev, title: product.title, barcode: product.barcode, shelf: product.shelfId || prev.shelf })); }}
                            className={`relative cursor-pointer rounded-[22px] border p-2 text-left transition-all ${selected ? 'border-[#1a237e] bg-[#eef4ff]' : 'border-slate-200 bg-white hover:border-[#1a237e]/30'}`}
                          >
                            <button
                              type="button"
                              onClick={(e) => { e.stopPropagation(); addQueueProduct(product.id); }}
                              className={`absolute right-2 top-2 z-10 rounded-full px-2.5 py-1 text-[10px] font-black ${queueEntry ? 'bg-[#1a237e] text-white' : 'bg-white text-[#1a237e] border border-[#dbe7ff]'}`}
                            >
                              {queueEntry ? '已选' : '加入'}
                            </button>
                            <div className="relative overflow-hidden rounded-2xl bg-[#f8f9fa] aspect-[1.1/1]">
                              <img src={product.imageUrl} alt={product.title} className="h-full w-full object-cover" />
                              <div className="absolute left-2 top-2 rounded-full bg-white/90 px-2 py-1 text-[10px] font-black text-[#1a237e] shadow-sm">{product.category || '商品'}</div>
                            </div>
                            <div className="mt-2 text-sm font-black text-slate-900 line-clamp-2">{product.title}</div>
                            <div className="mt-1 text-[10px] font-semibold text-slate-500">{product.barcode}</div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
            <div className="ui-card bg-white border border-slate-200 rounded-[24px] p-4 space-y-4">
                    <div className="flex items-center gap-2 text-[#1a237e] font-black text-sm"><Store size={16} />模板与参数</div>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                      {(Object.entries(templateMeta) as [LabelTemplate, typeof templateMeta[LabelTemplate]][]).map(([key, meta]) => (
                        <button key={key} onClick={() => { setLabelTemplate(key); setLabelSize(meta.defaultSize); }} className={`rounded-[22px] border p-4 text-left transition-all ${labelTemplate === key ? 'border-[#1a237e] bg-[#eef4ff]' : 'border-slate-200 bg-white hover:border-[#1a237e]/30'}`}>
                          <div className="inline-flex items-center rounded-full border border-[#dbe7ff] bg-white px-2.5 py-1 text-[10px] font-black text-[#1a237e]">{meta.badge}</div>
                          <div className="mt-3 text-base font-black text-slate-900">{meta.title}</div>
                          <div className="mt-1 text-[11px] font-semibold text-slate-500">{meta.subtitle}</div>
                          <div className="mt-2 text-[10px] font-black text-[#1a237e]">推荐尺寸：{labelSizeMeta[meta.defaultSize].title}</div>
                        </button>
                      ))}
                    </div>

                    <div className="space-y-2">
                      <div className="text-[10px] font-black tracking-widest text-slate-500">常用尺寸</div>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                        {(Object.entries(labelSizeMeta) as [LabelSizeKey, typeof labelSizeMeta[LabelSizeKey]][]).map(([key, meta]) => (
                          <button key={key} onClick={() => setLabelSize(key)} className={`rounded-2xl border px-3 py-3 text-left transition-all ${labelSize === key ? 'border-[#1a237e] bg-[#eef4ff] text-[#1a237e]' : 'border-slate-200 bg-white text-slate-700 hover:border-[#1a237e]/30'}`}>
                            <div className="text-sm font-black">{meta.title}</div>
                            <div className="mt-1 text-[10px] font-semibold">{meta.subtitle}</div>
                          </button>
                        ))}
                      </div>
                    </div>

                    <div className="space-y-3 rounded-[22px] border border-slate-200 bg-white p-3">
                      <div className="flex items-center justify-between gap-3">
                        <div>
                          <div className="text-sm font-black text-slate-900">模板方案管理</div>
                          <div className="mt-1 text-[11px] font-semibold text-slate-500">把当前模板、尺寸、方向和边距保存成可复用方案。</div>
                        </div>
                        <span className="rounded-full border border-[#dbe7ff] bg-[#eef4ff] px-3 py-1 text-[10px] font-black text-[#1a237e]">{labelPresets.length} 个方案</span>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-[1fr_auto] gap-2">
                        <input
                          value={labelPresetName}
                          onChange={(e) => setLabelPresetName(e.target.value)}
                          placeholder="例如：门店价签标准版"
                          className="w-full rounded-xl border border-slate-200 bg-[#f8f9fa] px-3 py-2 text-sm outline-none focus:border-[#1a237e]"
                        />
                        <button onClick={saveLabelPreset} className="ui-btn ui-btn-primary rounded-xl px-4 py-2 text-sm font-black">
                          保存当前方案
                        </button>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                        {labelPresets.length === 0 ? (
                          <div className="md:col-span-2 rounded-2xl border border-dashed border-slate-200 bg-[#f8f9fa] p-4 text-center text-sm font-semibold text-slate-500">当前还没有模板方案，先保存一个常用组合。</div>
                        ) : (
                          labelPresets.map((preset) => {
                            const active = preset.id === activeLabelPresetId;
                            return (
                              <div key={preset.id} className={`rounded-2xl border p-3 ${active ? 'border-[#1a237e] bg-[#eef4ff]' : 'border-slate-200 bg-[#f8f9fa]'}`}>
                                <div className="flex items-start justify-between gap-3">
                                  <div className="min-w-0">
                                    <div className="truncate text-sm font-black text-slate-900">{preset.name}</div>
                                    <div className="mt-1 text-[10px] font-semibold text-slate-500">
                                      {templateMeta[preset.template].title} · {labelSizeMeta[preset.size].title} · {preset.orientation === 'portrait' ? '纵向' : '横向'} · {labelMarginMeta[preset.margin].title}
                                    </div>
                                  </div>
                                  <div className="flex items-center gap-2 shrink-0">
                                    {active && <span className="rounded-full bg-[#1a237e] px-2 py-1 text-[10px] font-black text-white">当前</span>}
                                    <button type="button" onClick={() => applyLabelPreset(preset)} className="rounded-full border border-[#dbe7ff] bg-white px-2.5 py-1 text-[10px] font-black text-[#1a237e]">应用</button>
                                    <button type="button" onClick={() => removeLabelPreset(preset.id)} className="rounded-full border border-slate-200 bg-white px-2.5 py-1 text-[10px] font-black text-slate-500">删除</button>
                                  </div>
                                </div>
                              </div>
                            );
                          })
                        )}
                      </div>
                    </div>

                    <div className="space-y-2">
                      <div className="text-[10px] font-black tracking-widest text-slate-500">纸张方向</div>
                      <div className="grid grid-cols-2 gap-2">
                        <button onClick={() => setLabelOrientation('portrait')} className={`rounded-2xl border px-3 py-3 text-left transition-all ${labelOrientation === 'portrait' ? 'border-[#1a237e] bg-[#eef4ff] text-[#1a237e]' : 'border-slate-200 bg-white text-slate-700 hover:border-[#1a237e]/30'}`}>
                          <div className="text-sm font-black">纵向</div>
                          <div className="mt-1 text-[10px] font-semibold">适合标准价签</div>
                        </button>
                        <button onClick={() => setLabelOrientation('landscape')} className={`rounded-2xl border px-3 py-3 text-left transition-all ${labelOrientation === 'landscape' ? 'border-[#1a237e] bg-[#eef4ff] text-[#1a237e]' : 'border-slate-200 bg-white text-slate-700 hover:border-[#1a237e]/30'}`}>
                          <div className="text-sm font-black">横向</div>
                          <div className="mt-1 text-[10px] font-semibold">适合货架标签</div>
                        </button>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <div className="text-[10px] font-black tracking-widest text-slate-500">边距</div>
                      <div className="grid grid-cols-3 gap-2">
                        {(Object.entries(labelMarginMeta) as [LabelMarginKey, typeof labelMarginMeta[LabelMarginKey]][]).map(([key, meta]) => (
                          <button key={key} onClick={() => setLabelMargin(key)} className={`rounded-2xl border px-3 py-3 text-left transition-all ${labelMargin === key ? 'border-[#1a237e] bg-[#eef4ff] text-[#1a237e]' : 'border-slate-200 bg-white text-slate-700 hover:border-[#1a237e]/30'}`}>
                            <div className="text-sm font-black">{meta.title}</div>
                            <div className="mt-1 text-[10px] font-semibold">{meta.subtitle}</div>
                          </button>
                        ))}
                      </div>
                    </div>

                    <div className="flex items-center justify-between gap-3 rounded-[22px] border border-slate-200 bg-[#f8f9fa] p-3">
                      <div>
                        <div className="text-sm font-black text-slate-900">批量打印队列</div>
                        <div className="mt-1 text-[11px] font-semibold text-slate-500">可把多个商品加入队列，一次打印多张标签。</div>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="rounded-full border border-[#dbe7ff] bg-white px-3 py-1 text-[10px] font-black text-[#1a237e]">{queuedLabelItems.length} 个商品</span>
                        <button type="button" onClick={clearLabelQueue} className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-black text-slate-600">清空</button>
                      </div>
                    </div>

                    <div className="rounded-[22px] border border-slate-200 bg-[#f8f9fa] p-3 space-y-3">
                      <div className="flex items-center justify-between gap-3">
                        <div>
                          <div className="text-sm font-black text-slate-900">打印队列详情</div>
                          <div className="mt-1 text-[11px] font-semibold text-slate-500">每个商品可单独调打印张数。</div>
                        </div>
                        <span className="rounded-full border border-[#dbe7ff] bg-white px-3 py-1 text-[10px] font-black text-[#1a237e]">{queuedLabelItems.length} 个商品</span>
                      </div>
                      {queuedLabelItems.length === 0 ? (
                        <div className="rounded-2xl border border-dashed border-slate-200 bg-white p-4 text-center text-sm font-semibold text-slate-500">队列为空，先给商品点“加入”。</div>
                      ) : (
                        <div className="space-y-2">
                          {queuedLabelItems.map((entry) => {
                            const product = productMap.get(entry.productId);
                            if (!product) return null;
                            return (
                              <div key={entry.productId} className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-white p-3">
                                <div className="h-12 w-12 overflow-hidden rounded-2xl bg-[#f8f9fa] shrink-0">
                                  <img src={product.imageUrl} alt={product.title} className="h-full w-full object-cover" />
                                </div>
                                <div className="min-w-0 flex-1">
                                  <div className="truncate text-sm font-black text-slate-900">{product.title}</div>
                                  <div className="mt-1 text-[10px] font-semibold text-slate-500">{product.barcode}</div>
                                </div>
                                <div className="flex items-center gap-2">
                                  <button type="button" onClick={() => setQueueCopies(entry.productId, entry.copies - 1)} className="h-7 w-7 rounded-lg border border-slate-200 bg-[#f8f9fa] text-sm font-black text-slate-600">-</button>
                                  <div className="min-w-8 text-center text-sm font-black text-[#1a237e]">{entry.copies}</div>
                                  <button type="button" onClick={() => setQueueCopies(entry.productId, entry.copies + 1)} className="h-7 w-7 rounded-lg border border-slate-200 bg-[#eef4ff] text-sm font-black text-[#1a237e]">+</button>
                                  <button type="button" onClick={() => removeQueueProduct(entry.productId)} className="ml-1 rounded-full border border-slate-200 bg-white px-3 py-1 text-[10px] font-black text-slate-500">移除</button>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>

                    <div className="flex flex-wrap items-center justify-between gap-3 rounded-[22px] border border-slate-200 bg-[#f8f9fa] p-3">
                      <div>
                        <div className="text-sm font-black text-slate-900">门店默认设置</div>
                        <div className="mt-1 text-[11px] font-semibold text-slate-500">保存后，下次打开会自动带出当前模板、尺寸、方向和边距。</div>
                      </div>
                      <button onClick={saveLabelDefaults} className="ui-btn ui-btn-primary rounded-xl px-4 py-2 text-sm font-black">
                        保存为门店默认
                      </button>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      <label className="block space-y-1"><span className="text-[10px] font-black tracking-widest text-slate-500">商品名称</span><input value={labelForm.title} onChange={(e) => setLabelForm((s) => ({ ...s, title: e.target.value }))} className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-[#1a237e]" /></label>
                      <label className="block space-y-1"><span className="text-[10px] font-black tracking-widest text-slate-500">条码</span><input value={labelForm.barcode} onChange={(e) => setLabelForm((s) => ({ ...s, barcode: e.target.value }))} className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-[#1a237e]" /></label>
                      <label className="block space-y-1"><span className="text-[10px] font-black tracking-widest text-slate-500">零售价（VT）</span><input value={labelForm.price} onChange={(e) => setLabelForm((s) => ({ ...s, price: e.target.value }))} className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-[#1a237e]" /></label>
                      <label className="block space-y-1"><span className="text-[10px] font-black tracking-widest text-slate-500">打印份数</span><input type="number" min={1} max={20} value={labelCopies} onChange={(e) => setLabelCopies(Number.parseInt(e.target.value || '1', 10) || 1)} className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-[#1a237e]" /></label>
                      <label className="block space-y-1"><span className="text-[10px] font-black tracking-widest text-slate-500">单位</span><input value={labelForm.unit} onChange={(e) => setLabelForm((s) => ({ ...s, unit: e.target.value }))} className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-[#1a237e]" /></label>
                      <label className="block space-y-1"><span className="text-[10px] font-black tracking-widest text-slate-500">货架位</span><input value={labelForm.shelf} onChange={(e) => setLabelForm((s) => ({ ...s, shelf: e.target.value }))} className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-[#1a237e]" /></label>
                    </div>

                    <label className="block space-y-1"><span className="text-[10px] font-black tracking-widest text-slate-500">附加说明</span><input value={labelForm.note} onChange={(e) => setLabelForm((s) => ({ ...s, note: e.target.value }))} className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-[#1a237e]" /></label>
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="ui-card bg-white border border-slate-200 rounded-[24px] p-4 shadow-sm">
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex items-center gap-2 text-[#1a237e] font-black text-sm"><Printer size={16} />标签预览</div>
                      <div className="flex items-center gap-2">
                        <div className="inline-flex items-center rounded-full border border-[#dbe7ff] bg-[#eef4ff] px-3 py-1 text-[10px] font-black text-[#1a237e]">{selectedTemplate.title}</div>
                        <div className="inline-flex items-center rounded-full border border-[#dbe7ff] bg-white px-3 py-1 text-[10px] font-black text-[#1a237e]">{selectedSizeMeta.title}</div>
                        <div className="inline-flex items-center rounded-full border border-[#dbe7ff] bg-white px-3 py-1 text-[10px] font-black text-[#1a237e]">{labelOrientation === 'portrait' ? '纵向' : '横向'}</div>
                        <div className="inline-flex items-center rounded-full border border-[#dbe7ff] bg-white px-3 py-1 text-[10px] font-black text-[#1a237e]">{selectedMarginMeta.title}</div>
                      </div>
                    </div>

                <div className="mt-4 grid grid-cols-1 gap-4">
                      {renderLabelPreview({
                        key: 0,
                        title: labelForm.title || '商品名称',
                        barcode: labelForm.barcode || '--',
                        price: labelForm.price || '0',
                        unit: labelForm.unit || '件',
                        shelf: labelForm.shelf || '--',
                        note: labelForm.note || '瓦努阿图 POS 标签',
                      })}

                      <div className="rounded-[28px] border border-dashed border-slate-200 bg-white p-4">
                        <div className="flex items-center justify-between gap-3">
                          <div className="text-sm font-black text-slate-900">打印排版</div>
                          <div className="inline-flex items-center gap-2 rounded-full border border-[#dbe7ff] bg-[#eef4ff] px-3 py-1 text-[10px] font-black text-[#1a237e]"><ScanLine size={12} />{labelCopies} 份</div>
                        </div>
                        <div className="mt-3 grid grid-cols-3 gap-2 text-[10px] font-black">
                          {(Object.keys(templateMeta) as LabelTemplate[]).map((key) => (
                            <button key={key} onClick={() => setLabelTemplate(key)} className={`rounded-2xl border px-3 py-2 transition-all ${labelTemplate === key ? 'border-[#1a237e] bg-[#eef4ff] text-[#1a237e]' : 'border-slate-200 bg-white text-slate-600'}`}>
                              {templateMeta[key].title}
                            </button>
                          ))}
                        </div>
                      </div>
                    </div>

                    <div className="mt-4 flex items-center gap-2">
                      <button onClick={handlePrint} className="ui-btn bg-[#1a237e] text-white rounded-xl px-4 py-2 text-sm font-black">打印标签</button>
                      <button onClick={() => setShowLabelModal(false)} className="ui-btn ui-btn-secondary rounded-xl px-4 py-2 text-sm font-black">关闭</button>
                    </div>
                  </div>

                  <div className="ui-card bg-white border border-slate-200 rounded-[24px] p-4 shadow-sm">
                    <div className="text-sm font-black text-slate-900">最近选择的商品</div>
                    <div className="mt-1 text-[11px] font-semibold text-slate-500">可继续加入打印队列，右侧会按当前模板和尺寸一起输出。</div>
                    <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-[300px] overflow-y-auto pr-1">
                      {productCatalog.slice(0, 12).map((product) => {
                        const selected = product.id === selectedProduct?.id;
                        const queueEntry = queuedLabelItems.find((item) => item.productId === product.id);
                        return (
                          <div
                            key={product.id}
                            onClick={() => { setSelectedProductId(product.id); setLabelForm((prev) => ({ ...prev, title: product.title, barcode: product.barcode, shelf: product.shelfId || prev.shelf })); }}
                            className={`relative cursor-pointer rounded-[22px] border p-3 text-left transition-all ${selected ? 'border-[#1a237e] bg-[#eef4ff]' : 'border-slate-200 bg-white hover:border-[#1a237e]/30'}`}
                          >
                            <button
                              type="button"
                              onClick={(e) => { e.stopPropagation(); addQueueProduct(product.id); }}
                              className={`absolute right-3 top-3 rounded-full px-2 py-1 text-[10px] font-black ${queueEntry ? 'bg-[#1a237e] text-white' : 'bg-white text-[#1a237e] border border-[#dbe7ff]'}`}
                            >
                              {queueEntry ? '队列中' : '加入队列'}
                            </button>
                            <div className="flex items-center gap-3">
                              <div className="w-16 h-16 rounded-2xl bg-[#f8f9fa] overflow-hidden shrink-0"><img src={product.imageUrl} alt={product.title} className="w-full h-full object-cover" /></div>
                              <div className="min-w-0">
                                <div className="text-sm font-black text-slate-900 line-clamp-2">{product.title}</div>
                                <div className="mt-1 text-[10px] font-semibold text-slate-500">{product.barcode}</div>
                                <div className="mt-2 text-[10px] font-black text-[#1a237e]">{product.category || '商品'}</div>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        <div className="hidden print:block p-6">
          <div className="grid grid-cols-2 gap-4">
            {labelItems.map((item) => (
              <div key={item.key}>{renderLabelPreview(item)}</div>
            ))}
          </div>
        </div>
      </motion.div>
    </>
  );
};

export default RetailToolsCenterPage;
