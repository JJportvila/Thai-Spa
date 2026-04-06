import React, { useEffect, useMemo, useState } from 'react';
import {
  ChevronLeft,
  Package,
  Printer,
  ScanLine,
  Search,
  Store,
  Tags,
  Minus,
  Plus,
  Trash2,
} from 'lucide-react';
import { formatVT } from '../lib/utils';
import { getAccountProgramSettings, patchAccountProgramSettings } from '../lib/accountScopedStore';
import { extendedVanuatuProducts } from '../lib/mockDataFull';

type Template = 'PRICE' | 'SHELF' | 'BARCODE';
type SizeKey = '40x30' | '50x30' | '60x40' | '70x50';
type Orientation = 'portrait' | 'landscape';
type Margin = 'narrow' | 'normal' | 'wide';

type QueueItem = { productId: string; copies: number };
type Preset = {
  id: string;
  name: string;
  template: Template;
  size: SizeKey;
  orientation: Orientation;
  margin: Margin;
};

type PreviewItem = {
  title: string;
  barcode: string;
  price: string;
  unit: string;
  shelf: string;
  note: string;
};

const templateMeta: Record<Template, { title: string; subtitle: string; badge: string; defaultSize: SizeKey }> = {
  PRICE: { title: '零售价签', subtitle: '适合货架陈列与商品价签打印', badge: '推荐', defaultSize: '60x40' },
  SHELF: { title: '货架标签', subtitle: '适合门店货架、分类位和陈列管理', badge: '标准', defaultSize: '70x50' },
  BARCODE: { title: '条码标签', subtitle: '适合扫描入库、贴码和批量打印', badge: '高效', defaultSize: '50x30' },
};

const sizeMeta: Record<SizeKey, { title: string; subtitle: string }> = {
  '40x30': { title: '40 × 30 mm', subtitle: '迷你价签' },
  '50x30': { title: '50 × 30 mm', subtitle: '条码贴纸' },
  '60x40': { title: '60 × 40 mm', subtitle: '商超价签' },
  '70x50': { title: '70 × 50 mm', subtitle: '货架标签' },
};

const marginMeta: Record<Margin, { title: string; subtitle: string }> = {
  narrow: { title: '紧凑边距', subtitle: '更省纸' },
  normal: { title: '标准边距', subtitle: '门店常用' },
  wide: { title: '宽松边距', subtitle: '留白更大' },
};

const makePresetId = () => `preset_${Math.random().toString(36).slice(2, 10)}`;

function escapeHtml(value: string) {
  return value.replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;').replaceAll("'", '&#39;');
}

export default function LabelPrintCenterPage({ accountId }: { accountId?: string }) {
  const initialProduct = extendedVanuatuProducts[0];

  const [search, setSearch] = useState('');
  const [selectedId, setSelectedId] = useState(initialProduct?.id ?? '');
  const [queue, setQueue] = useState<QueueItem[]>([]);
  const [template, setTemplate] = useState<Template>('PRICE');
  const [size, setSize] = useState<SizeKey>('60x40');
  const [orientation, setOrientation] = useState<Orientation>('portrait');
  const [margin, setMargin] = useState<Margin>('normal');
  const [copies, setCopies] = useState(1);
  const [presetName, setPresetName] = useState('商超常用');
  const [presets, setPresets] = useState<Preset[]>([]);
  const [activePresetId, setActivePresetId] = useState('');
  const [form, setForm] = useState<PreviewItem>({
    title: initialProduct?.title ?? '商品名称',
    barcode: initialProduct?.barcode ?? '000000000000',
    price: '150',
    unit: '件',
    shelf: initialProduct?.shelfId ?? 'A-01',
    note: '瓦努阿图 POS 标签',
  });

  const persist = async (patch: Record<string, unknown>) => {
    if (!accountId) return;
    await patchAccountProgramSettings(accountId, patch as any);
  };

  useEffect(() => {
    if (!accountId) return;
    let alive = true;
    (async () => {
      const settings = await getAccountProgramSettings(accountId);
      if (!alive) return;
      if (settings.retailLabelDefaultTemplate === 'PRICE' || settings.retailLabelDefaultTemplate === 'SHELF' || settings.retailLabelDefaultTemplate === 'BARCODE') {
        setTemplate(settings.retailLabelDefaultTemplate);
      }
      if (settings.retailLabelDefaultSize === '40x30' || settings.retailLabelDefaultSize === '50x30' || settings.retailLabelDefaultSize === '60x40' || settings.retailLabelDefaultSize === '70x50') {
        setSize(settings.retailLabelDefaultSize);
      }
      if (settings.retailLabelDefaultOrientation === 'portrait' || settings.retailLabelDefaultOrientation === 'landscape') {
        setOrientation(settings.retailLabelDefaultOrientation);
      }
      if (settings.retailLabelDefaultMargin === 'narrow' || settings.retailLabelDefaultMargin === 'normal' || settings.retailLabelDefaultMargin === 'wide') {
        setMargin(settings.retailLabelDefaultMargin);
      }
      if (Array.isArray(settings.retailLabelPresets)) {
        const loaded = settings.retailLabelPresets
          .map((preset: any) => {
            if (!preset || typeof preset !== 'object') return null;
            return {
              id: preset.id || makePresetId(),
              name: preset.name || '未命名模板',
              template: preset.template,
              size: preset.size,
              orientation: preset.orientation,
              margin: preset.margin,
            } as Preset;
          })
          .filter((preset): preset is Preset =>
            !!preset &&
            ['PRICE', 'SHELF', 'BARCODE'].includes(preset.template) &&
            ['40x30', '50x30', '60x40', '70x50'].includes(preset.size) &&
            ['portrait', 'landscape'].includes(preset.orientation) &&
            ['narrow', 'normal', 'wide'].includes(preset.margin),
          );
        setPresets(loaded);
        setActivePresetId(typeof settings.retailLabelActivePresetId === 'string' ? settings.retailLabelActivePresetId : loaded[0]?.id || '');
      }
    })();
    return () => {
      alive = false;
    };
  }, [accountId]);

  const catalog = useMemo(() => {
    const keyword = search.trim().toLowerCase();
    return extendedVanuatuProducts.filter(
      (product) =>
        !keyword ||
        product.title.toLowerCase().includes(keyword) ||
        product.barcode.toLowerCase().includes(keyword) ||
        product.category?.toLowerCase().includes(keyword),
    );
  }, [search]);

  const productMap = useMemo(() => new Map(extendedVanuatuProducts.map((product) => [product.id, product])), []);
  const selectedProduct = useMemo(
    () => extendedVanuatuProducts.find((product) => product.id === selectedId) || catalog[0] || initialProduct,
    [selectedId, catalog, initialProduct],
  );
  const queueProducts = useMemo(
    () =>
      queue
        .map((item) => {
          const product = productMap.get(item.productId);
          return product ? { product, copies: item.copies } : null;
        })
        .filter(Boolean)
        .map((item) => item!),
    [queue, productMap],
  );

  useEffect(() => {
    if (!selectedProduct) return;
    setForm((previous) => ({
      ...previous,
      title: selectedProduct.title,
      barcode: selectedProduct.barcode,
      shelf: selectedProduct.shelfId || previous.shelf,
    }));
  }, [selectedProduct?.id]);

  const addOne = (productId: string) => {
    setQueue((current) => {
      const found = current.find((item) => item.productId === productId);
      if (found) {
        return current.map((item) => (item.productId === productId ? { ...item, copies: Math.min(20, item.copies + 1) } : item));
      }
      return [...current, { productId, copies: 1 }];
    });
  };

  const addMany = (ids: string[]) => {
    setQueue((current) => {
      const next = [...current];
      ids.forEach((productId) => {
        const found = next.find((item) => item.productId === productId);
        if (found) {
          found.copies = Math.min(20, found.copies + 1);
        } else {
          next.push({ productId, copies: 1 });
        }
      });
      return next;
    });
  };

  const removeItem = (productId: string) => {
    setQueue((current) => current.filter((item) => item.productId !== productId));
  };

  const setItemCopies = (productId: string, nextCopies: number) => {
    setQueue((current) =>
      current.map((item) =>
        item.productId === productId ? { ...item, copies: Math.max(1, Math.min(20, nextCopies)) } : item,
      ),
    );
  };

  const clearQueue = () => setQueue([]);

  const saveDefault = async () => {
    await persist({
      retailLabelDefaultTemplate: template,
      retailLabelDefaultSize: size,
      retailLabelDefaultOrientation: orientation,
      retailLabelDefaultMargin: margin,
    });
  };

  const savePreset = async () => {
    const preset: Preset = {
      id: activePresetId || makePresetId(),
      name: presetName.trim() || `${templateMeta[template].title} · ${sizeMeta[size].title}`,
      template,
      size,
      orientation,
      margin,
    };
    const next = [...presets.filter((item) => item.id !== preset.id), preset].slice(0, 12);
    setPresets(next);
    setActivePresetId(preset.id);
    await persist({
      retailLabelPresets: next,
      retailLabelActivePresetId: preset.id,
      retailLabelDefaultTemplate: preset.template,
      retailLabelDefaultSize: preset.size,
      retailLabelDefaultOrientation: preset.orientation,
      retailLabelDefaultMargin: preset.margin,
    });
  };

  const applyPreset = async (preset: Preset) => {
    setActivePresetId(preset.id);
    setPresetName(preset.name);
    setTemplate(preset.template);
    setSize(preset.size);
    setOrientation(preset.orientation);
    setMargin(preset.margin);
    await persist({
      retailLabelActivePresetId: preset.id,
      retailLabelDefaultTemplate: preset.template,
      retailLabelDefaultSize: preset.size,
      retailLabelDefaultOrientation: preset.orientation,
      retailLabelDefaultMargin: preset.margin,
    });
  };

  const deletePreset = async (presetId: string) => {
    const next = presets.filter((item) => item.id !== presetId);
    const nextActive = activePresetId === presetId ? next[0]?.id || '' : activePresetId;
    setPresets(next);
    setActivePresetId(nextActive);
    await persist({ retailLabelPresets: next, retailLabelActivePresetId: nextActive || undefined });
  };
  const printItems = queueProducts.length
    ? queueProducts.flatMap(({ product, copies: itemCopies }) =>
        Array.from({ length: itemCopies }, (_, index) => ({
          key: `${product.id}-${index}`,
          title: product.title,
          barcode: product.barcode,
          price: form.price || '0',
          unit: form.unit || '件',
          shelf: product.shelfId || form.shelf || '--',
          note: product.category || form.note || '瓦努阿图 POS 标签',
        })),
      )
    : Array.from({ length: Math.max(1, Math.min(20, Number.parseInt(String(copies || 1), 10) || 1)) }, (_, index) => ({
        key: index,
        title: form.title || '商品名称',
        barcode: form.barcode || '--',
        price: form.price || '0',
        unit: form.unit || '件',
        shelf: form.shelf || '--',
        note: form.note || '瓦努阿图 POS 标签',
      }));

  const renderPreview = (item: PreviewItem) => {
    const priceText = formatVT(Number(item.price) || 0);

    if (template === 'SHELF') {
      return (
        <div className="rounded-[28px] border border-slate-200 bg-white p-4 shadow-sm">
          <div className="flex items-center justify-between gap-3">
            <div className="inline-flex items-center gap-2 rounded-full border border-[#dbe7ff] bg-[#eef4ff] px-3 py-1 text-[10px] font-black text-[#1a237e]">
              <Store size={12} /> 瓦努阿图 POS
            </div>
            <div className="inline-flex items-center gap-2">
              <div className="rounded-full border border-[#dbe7ff] bg-white px-3 py-1 text-[10px] font-black text-[#1a237e]">货架标签</div>
              <div className="rounded-full border border-[#dbe7ff] bg-[#eef4ff] px-3 py-1 text-[10px] font-black text-[#1a237e]">{sizeMeta[size].title}</div>
            </div>
          </div>
          <div className="mt-4 grid grid-cols-[0.92fr_1.08fr] gap-4 items-stretch">
            <div className="rounded-[22px] border border-slate-200 bg-[#f8f9fa] p-4 flex flex-col justify-between">
              <div>
                <div className="text-[10px] font-black tracking-[0.2em] text-slate-500">货架位</div>
                <div className="mt-2 text-3xl font-black text-[#1a237e] leading-tight">{item.shelf || '--'}</div>
              </div>
              <div className="mt-3 text-[10px] font-semibold text-slate-500">适合门店货架、分类位和陈列管理</div>
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
                  <div className="text-[10px] font-black tracking-[0.18em] text-slate-500">备注</div>
                  <div className="mt-1 text-sm font-black text-slate-900">{item.note}</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      );
    }

    if (template === 'BARCODE') {
      return (
        <div className="rounded-[28px] border border-slate-200 bg-white p-4 shadow-sm">
          <div className="flex items-center justify-between gap-3">
            <div className="inline-flex items-center gap-2 rounded-full border border-[#dbe7ff] bg-[#eef4ff] px-3 py-1 text-[10px] font-black text-[#1a237e]">
              <Store size={12} /> 瓦努阿图 POS
            </div>
            <div className="inline-flex items-center gap-2">
              <div className="rounded-full border border-[#dbe7ff] bg-white px-3 py-1 text-[10px] font-black text-[#1a237e]">条码标签</div>
              <div className="rounded-full border border-[#dbe7ff] bg-[#eef4ff] px-3 py-1 text-[10px] font-black text-[#1a237e]">{sizeMeta[size].title}</div>
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
                <div className="mt-3 text-[10px] font-semibold text-slate-500">适合扫描入库、贴码和批量打印</div>
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
            <Store size={12} /> 瓦努阿图 POS
          </div>
          <div className="flex items-center gap-2">
              <div className="text-[10px] font-black tracking-[0.24em] text-slate-400 uppercase">即时预览</div>
            <div className="rounded-full border border-[#dbe7ff] bg-white px-3 py-1 text-[10px] font-black text-[#1a237e]">{sizeMeta[size].title}</div>
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
            <div className="mt-3 text-[10px] font-semibold text-slate-500">
              模板：{templateMeta[template].title} · 尺寸：{sizeMeta[size].title} · 方向：{orientation === 'portrait' ? '纵向' : '横向'}
            </div>
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
    const rows = printItems
      .map((item: any) => {
        const priceText = formatVT(Number(item.price) || 0);
        if (template === 'SHELF') {
          return `<section class="label label-shelf"><div class="brand-row"><div class="brand">瓦努阿图 POS</div><div class="mode">货架标签</div></div><div class="content content-shelf"><div class="shelf-box"><div class="small-title">货架位</div><div class="shelf">${escapeHtml(item.shelf || '--')}</div><div class="shelf-caption">适合门店货架、分类位和陈列管理</div></div><div class="detail-box"><div class="small-title">商品名称</div><div class="product">${escapeHtml(item.title)}</div><div class="chips"><span>条码：${escapeHtml(item.barcode || '--')}</span><span>单位：${escapeHtml(item.unit || '件')}</span></div><div class="price-line"><div><div class="small-title">零售价</div><div class="price price-plain">${escapeHtml(priceText)}</div></div><div class="remark">${escapeHtml(item.note)}</div></div></div></div></section>`;
        }
        if (template === 'BARCODE') {
          return `<section class="label label-barcode"><div class="brand-row"><div class="brand">瓦努阿图 POS</div><div class="mode">条码标签</div></div><div class="barcode-strip"><div class="barcode-bars"></div><div class="barcode-text">${escapeHtml(item.barcode || '--')}</div></div><div class="content content-barcode"><div class="detail-box"><div class="small-title">商品名称</div><div class="product">${escapeHtml(item.title)}</div><div class="caption">适合扫描入库、贴码和批量打印</div></div><div class="price-box price-box-small"><div class="price-head">零售价</div><div class="price">${escapeHtml(priceText)}</div><div class="unit">单位：${escapeHtml(item.unit || '件')}</div></div></div></section>`;
        }
        return `<section class="label label-price"><div class="top"><div class="brand">瓦努阿图 POS</div><div class="note">推荐 · 零售价签</div></div><div class="body"><div class="left"><div class="field-title">商品名称</div><div class="product">${escapeHtml(item.title)}</div><div class="chips"><span>条码：${escapeHtml(item.barcode || '--')}</span><span>货架位：${escapeHtml(item.shelf || '--')}</span><span>单位：${escapeHtml(item.unit || '件')}</span></div></div><div class="right"><div class="price-box"><div class="price-head">零售价</div><div class="price">${escapeHtml(priceText)}</div></div></div></div><div class="footer">${escapeHtml(item.note)}</div></section>`;
      })
      .join('');

    const win = window.open('', '_blank', 'width=1200,height=900');
    if (!win) return;

    const width = size === '40x30' ? '40mm' : size === '50x30' ? '50mm' : size === '60x40' ? '60mm' : '70mm';
    const height = size === '40x30' ? '30mm' : size === '50x30' ? '30mm' : size === '60x40' ? '40mm' : '50mm';
    const printWidth = orientation === 'landscape' ? height : width;
    const printHeight = orientation === 'landscape' ? width : height;
    const padding = margin === 'narrow' ? '3mm' : margin === 'wide' ? '10mm' : '6mm';
    const gap = margin === 'narrow' ? '4mm' : margin === 'wide' ? '8mm' : '6mm';

    win.document.open();
    win.document.write(`<!doctype html><html><head><meta charset="utf-8" /><meta name="viewport" content="width=device-width, initial-scale=1" /><title>LABEL</title><style>*{box-sizing:border-box}html,body{margin:0;padding:0;background:#fff;color:#0f172a;font-family:Arial,'Noto Sans SC',sans-serif}body{padding:${padding}}.grid{display:flex;flex-wrap:wrap;gap:${gap};align-items:flex-start}.label{border:1px solid #cbd5e1;border-radius:18px;padding:4mm;background:#fff;break-inside:avoid;page-break-inside:avoid;width:${printWidth};min-height:${printHeight};overflow:hidden}.top,.brand-row{display:flex;justify-content:space-between;align-items:flex-start;gap:12px}.brand{display:inline-flex;align-items:center;padding:6px 10px;border-radius:999px;background:#eef4ff;color:#1a237e;border:1px solid #dbe7ff;font-size:10px;font-weight:700;letter-spacing:.18em}.note,.mode{font-size:10px;color:#94a3b8;font-weight:700;letter-spacing:.16em;text-transform:uppercase}.mode{color:#1a237e;background:#eef4ff;border:1px solid #dbe7ff;border-radius:999px;padding:6px 10px}.body{margin-top:14px;display:grid;grid-template-columns:1.2fr .8fr;gap:14px;align-items:start}.field-title,.small-title{font-size:10px;font-weight:700;letter-spacing:.18em;text-transform:uppercase;color:#64748b}.product{margin-top:8px;font-size:24px;line-height:1.12;font-weight:900;color:#0f172a}.chips{margin-top:12px;display:flex;flex-wrap:wrap;gap:8px}.chips span{padding:5px 9px;border:1px solid #dbe7ff;background:#fff;color:#1a237e;border-radius:999px;font-size:10px;font-weight:700}.right{display:flex;justify-content:flex-end}.price-box{min-width:120px;border-radius:18px;background:#1a237e;color:#fff;padding:14px 16px;text-align:right}.price-head{font-size:10px;font-weight:700;letter-spacing:.28em;text-transform:uppercase;color:rgba(255,255,255,.7)}.price{margin-top:6px;font-size:34px;line-height:1;font-weight:900}.footer{margin-top:12px;font-size:10px;color:#94a3b8;font-weight:700;text-align:right;letter-spacing:.14em}.content{margin-top:14px}.content-shelf{display:grid;grid-template-columns:.85fr 1.15fr;gap:14px}.shelf-box{border-radius:18px;border:1px solid #dbe7ff;background:#f8f9fa;padding:14px;display:flex;flex-direction:column;justify-content:space-between}.shelf{margin-top:8px;font-size:34px;font-weight:900;line-height:1;color:#1a237e}.shelf-caption{margin-top:12px;font-size:11px;color:#64748b;font-weight:700;line-height:1.4}.detail-box{border-radius:18px;border:1px solid #dbe7ff;background:#fff;padding:14px}.price-line{margin-top:16px;display:flex;align-items:flex-end;justify-content:space-between;gap:12px}.price-plain{margin-top:4px;font-size:28px;color:#1a237e}.remark{font-size:11px;font-weight:700;color:#64748b;text-align:right;max-width:140px;line-height:1.4}.barcode-strip{margin-top:14px;border-radius:20px;border:1px solid #dbe7ff;background:#f8f9fa;padding:14px}.barcode-bars{height:64px;width:100%;border-radius:14px;background:repeating-linear-gradient(90deg,#0f172a 0,#0f172a 2px,#ffffff 2px,#ffffff 5px,#0f172a 5px,#0f172a 6px,#ffffff 6px,#ffffff 10px)}.barcode-text{margin-top:8px;text-align:center;font-size:18px;font-weight:900;letter-spacing:.24em;color:#0f172a}.content-barcode{display:grid;grid-template-columns:1fr .8fr;gap:14px;align-items:stretch}.caption{margin-top:10px;font-size:11px;color:#64748b;font-weight:700;line-height:1.4}.price-box-small{min-width:0;display:flex;flex-direction:column;justify-content:space-between}.price-box-small .price{font-size:30px}.unit{margin-top:10px;font-size:11px;font-weight:700;color:rgba(255,255,255,.8)}@media print{body{padding:${padding}}}</style></head><body class="margin-${margin}"><div class="grid">${rows}</div><script>window.onload=function(){window.focus();window.print();setTimeout(function(){window.close();},300);};</script></body></html>`);
    win.document.close();
  };
  return (
    <div className="w-full space-y-5">
      <div className="ui-card rounded-[28px] border border-slate-200 bg-white p-4 shadow-sm sm:p-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-[#dbe7ff] bg-[#eef4ff] px-3 py-1 text-[10px] font-black tracking-[0.24em] text-[#1a237e]">
              标签作业台
            </div>
            <h2 className="mt-3 text-2xl font-black text-slate-900">门店标签打印工作台</h2>
            <p className="mt-1 text-sm font-semibold text-slate-500">用于价签、货架标签和条码标签的门店打印作业，支持模板、尺寸、方向、边距和方案保存。</p>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => {
                window.location.hash = '#retail-tools';
              }}
              className="ui-btn ui-btn-secondary rounded-xl px-4 py-2 text-sm font-black"
            >
              <ChevronLeft size={16} /> 返回功能中心
            </button>
            <button
              type="button"
              onClick={() => {
                window.location.hash = '#retail-pos';
              }}
              className="ui-btn ui-btn-secondary rounded-xl px-4 py-2 text-sm font-black"
            >
              <ChevronLeft size={16} /> 返回收银
            </button>
          </div>
        </div>
        <div className="mt-4 grid grid-cols-2 gap-3 xl:grid-cols-4">
          <div className="rounded-2xl border border-slate-200 bg-[#f8f9fa] px-3 py-3">
            <div className="text-[10px] font-black tracking-[0.22em] text-slate-400 uppercase">门店账号</div>
            <div className="mt-1 truncate text-sm font-black text-slate-900">{accountId || '未登录'}</div>
          </div>
          <div className="rounded-2xl border border-slate-200 bg-[#f8f9fa] px-3 py-3">
            <div className="text-[10px] font-black tracking-[0.22em] text-slate-400 uppercase">打印状态</div>
            <div className="mt-1 text-sm font-black text-[#1a237e]">标签打印机已就绪</div>
          </div>
          <div className="rounded-2xl border border-slate-200 bg-[#f8f9fa] px-3 py-3">
            <div className="text-[10px] font-black tracking-[0.22em] text-slate-400 uppercase">当前纸张</div>
            <div className="mt-1 text-sm font-black text-slate-900">{sizeMeta[size].title}</div>
          </div>
          <div className="rounded-2xl border border-slate-200 bg-[#f8f9fa] px-3 py-3">
            <div className="text-[10px] font-black tracking-[0.22em] text-slate-400 uppercase">待打印数</div>
            <div className="mt-1 text-sm font-black text-slate-900">{queue.length} 个任务</div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
        <div className="rounded-[22px] border border-slate-200 bg-white p-4 shadow-sm">
          <div className="text-[10px] font-black tracking-[0.24em] text-slate-400 uppercase">商品目录</div>
          <div className="mt-2 text-2xl font-black text-[#1a237e]">{catalog.length}</div>
          <div className="mt-1 text-xs font-semibold text-slate-500">可加入打印队列的商品</div>
        </div>
        <div className="rounded-[22px] border border-slate-200 bg-white p-4 shadow-sm">
          <div className="text-[10px] font-black tracking-[0.24em] text-slate-400 uppercase">待打印</div>
          <div className="mt-2 text-2xl font-black text-[#1a237e]">{queue.length}</div>
          <div className="mt-1 text-xs font-semibold text-slate-500">当前排队的商品数量</div>
        </div>
        <div className="rounded-[22px] border border-slate-200 bg-white p-4 shadow-sm">
          <div className="text-[10px] font-black tracking-[0.24em] text-slate-400 uppercase">当前模板</div>
          <div className="mt-2 text-2xl font-black text-[#1a237e]">{templateMeta[template].title}</div>
          <div className="mt-1 text-xs font-semibold text-slate-500">{sizeMeta[size].title} · {orientation === 'portrait' ? '纵向' : '横向'}</div>
        </div>
        <div className="rounded-[22px] border border-slate-200 bg-white p-4 shadow-sm">
          <div className="text-[10px] font-black tracking-[0.24em] text-slate-400 uppercase">方案状态</div>
          <div className="mt-2 text-2xl font-black text-[#1a237e]">{activePresetId ? '已保存' : '未保存'}</div>
          <div className="mt-1 text-xs font-semibold text-slate-500">{marginMeta[margin].title}</div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-[1.05fr_0.95fr]">
        <div className="space-y-4">
          <div className="ui-card rounded-[24px] border border-slate-200 bg-white p-4 space-y-4">
            <div className="flex items-center gap-2 text-sm font-black text-[#1a237e]">
              <Search size={16} /> 商品目录
            </div>
            <div className="grid grid-cols-1 gap-3 lg:grid-cols-[1fr_auto]">
              <div className="flex items-center gap-2 rounded-2xl border border-slate-200 bg-[#f8f9fa] px-3 py-2">
                <Search size={16} className="text-slate-400" />
                <input
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder="输入商品名、条码或分类"
                  className="w-full bg-transparent text-sm font-semibold text-slate-800 outline-none placeholder:text-slate-400"
                />
              </div>
              <div className="inline-flex items-center gap-2 rounded-2xl border border-[#dbe7ff] bg-[#eef4ff] px-4 py-2 text-xs font-black text-[#1a237e]">
                <Package size={14} /> {catalog.length} 个商品
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <button type="button" onClick={() => addMany(catalog.map((product) => product.id))} className="rounded-xl border border-[#dbe7ff] bg-[#eef4ff] px-3 py-2 text-xs font-black text-[#1a237e]">
                批量加入筛选结果
              </button>
              <button type="button" onClick={() => addMany(catalog.slice(0, 18).map((product) => product.id))} className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-black text-slate-700">
                加入当前页
              </button>
              <button type="button" onClick={clearQueue} className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-black text-slate-600">
                清空队列
              </button>
            </div>
            <div className="flex items-center justify-between gap-3 rounded-[22px] border border-slate-200 bg-[#f8f9fa] px-3 py-2">
              <div className="text-xs font-black text-slate-700">打印队列：{queue.length} 个商品</div>
            </div>

            <div className="grid max-h-[240px] grid-cols-2 gap-3 overflow-y-auto pr-1 sm:grid-cols-3">
              {catalog.slice(0, 18).map((product) => {
                const selectedCard = product.id === selectedProduct?.id;
                const queued = queue.some((item) => item.productId === product.id);
                return (
                  <div
                    key={product.id}
                    onClick={() => {
                      setSelectedId(product.id);
                      setForm((previous) => ({ ...previous, title: product.title, barcode: product.barcode, shelf: product.shelfId || previous.shelf }));
                    }}
                    className={`relative cursor-pointer rounded-[22px] border p-2 text-left transition-all ${selectedCard ? 'border-[#1a237e] bg-[#eef4ff]' : 'border-slate-200 bg-white hover:border-[#1a237e]/30'}`}
                  >
                    <button
                      type="button"
                      onClick={(event) => {
                        event.stopPropagation();
                        addOne(product.id);
                      }}
                      className={`absolute right-2 top-2 z-10 rounded-full px-2.5 py-1 text-[10px] font-black ${queued ? 'bg-[#1a237e] text-white' : 'border border-[#dbe7ff] bg-white text-[#1a237e]'}`}
                    >
                      {queued ? '已选' : '加入'}
                    </button>
                    <div className="relative aspect-[1.1/1] overflow-hidden rounded-2xl bg-[#f8f9fa]">
                      <img src={product.imageUrl} alt={product.title} className="h-full w-full object-cover" />
                      <div className="absolute left-2 top-2 rounded-full bg-white/90 px-2 py-1 text-[10px] font-black text-[#1a237e] shadow-sm">{product.category || '商品'}</div>
                    </div>
                    <div className="mt-2 line-clamp-2 text-sm font-black text-slate-900">{product.title}</div>
                    <div className="mt-1 text-[10px] font-semibold text-slate-500">{product.barcode}</div>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="ui-card rounded-[24px] border border-slate-200 bg-white p-4 space-y-4">
            <div className="text-sm font-black text-slate-900">待打印队列</div>
            <div className="text-[11px] font-semibold text-slate-500">每个商品可单独调整张数，适合门店批量作业。</div>
            {queue.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-slate-200 bg-[#f8f9fa] p-4 text-center text-sm font-semibold text-slate-500">
                队列为空，请先从商品目录加入待打印商品。
              </div>
            ) : (
              <div className="space-y-2">
                {queue.map((entry) => {
                  const product = productMap.get(entry.productId);
                  if (!product) return null;
                  return (
                    <div key={entry.productId} className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-[#f8f9fa] p-3">
                      <div className="h-12 w-12 shrink-0 overflow-hidden rounded-2xl bg-white">
                        <img src={product.imageUrl} alt={product.title} className="h-full w-full object-cover" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="truncate text-sm font-black text-slate-900">{product.title}</div>
                        <div className="mt-1 text-[10px] font-semibold text-slate-500">{product.barcode}</div>
                      </div>
                      <div className="flex items-center gap-2">
                        <button type="button" onClick={() => setItemCopies(entry.productId, entry.copies - 1)} className="h-6 w-6 rounded-md border border-slate-200 bg-white text-xs font-black text-slate-600">
                          <Minus size={12} className="mx-auto" />
                        </button>
                        <div className="min-w-8 text-center text-sm font-black text-[#1a237e]">{entry.copies}</div>
                        <button type="button" onClick={() => setItemCopies(entry.productId, entry.copies + 1)} className="h-6 w-6 rounded-md border border-slate-200 bg-[#eef4ff] text-xs font-black text-[#1a237e]">
                          <Plus size={12} className="mx-auto" />
                        </button>
                        <button type="button" onClick={() => removeItem(entry.productId)} className="ml-1 rounded-full border border-slate-200 bg-white px-3 py-1 text-[10px] font-black text-slate-500">
                          <Trash2 size={12} /> 移除
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        <div className="space-y-4">
          <div className="ui-card rounded-[24px] border border-slate-200 bg-white p-4 space-y-4">
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-2 text-sm font-black text-[#1a237e]">
                <Printer size={16} /> 标签预览
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <div className="inline-flex items-center rounded-full border border-[#dbe7ff] bg-[#eef4ff] px-3 py-1 text-[10px] font-black text-[#1a237e]">{templateMeta[template].title}</div>
                <div className="inline-flex items-center rounded-full border border-[#dbe7ff] bg-white px-3 py-1 text-[10px] font-black text-[#1a237e]">{sizeMeta[size].title}</div>
                <div className="inline-flex items-center rounded-full border border-[#dbe7ff] bg-white px-3 py-1 text-[10px] font-black text-[#1a237e]">{orientation === 'portrait' ? '纵向' : '横向'}</div>
                <div className="inline-flex items-center rounded-full border border-[#dbe7ff] bg-white px-3 py-1 text-[10px] font-black text-[#1a237e]">{marginMeta[margin].title}</div>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-4">{renderPreview({ ...form, price: form.price })}</div>
            <div className="rounded-[28px] border border-dashed border-slate-200 bg-white p-4 space-y-3">
              <div className="flex items-center justify-between gap-3">
                <div className="text-sm font-black text-slate-900">打印份数</div>
                <div className="inline-flex items-center gap-2 rounded-full border border-[#dbe7ff] bg-[#eef4ff] px-3 py-1 text-[10px] font-black text-[#1a237e]">
                  <ScanLine size={12} /> {copies} 份
                </div>
              </div>
              <input
                type="number"
                min={1}
                max={20}
                value={copies}
                onChange={(event) => setCopies(Number.parseInt(event.target.value || '1', 10) || 1)}
                className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-[#1a237e]"
              />
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <button onClick={handlePrint} className="ui-btn rounded-xl bg-[#1a237e] px-4 py-2 text-sm font-black text-white">
                打印标签
              </button>
              <button onClick={saveDefault} className="ui-btn ui-btn-secondary rounded-xl px-4 py-2 text-sm font-black">
                保存为门店默认
              </button>
            </div>
          </div>

          <div className="ui-card rounded-[24px] border border-slate-200 bg-white p-4 space-y-4">
            <div className="flex items-center gap-2 text-sm font-black text-[#1a237e]">
              <Tags size={16} /> 打印设置
            </div>
            <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
              {(Object.entries(templateMeta) as [Template, (typeof templateMeta)[Template]][]).map(([key, meta]) => (
                <button
                  key={key}
                  onClick={() => {
                    setTemplate(key);
                    setSize(meta.defaultSize);
                  }}
                  className={`rounded-[22px] border p-4 text-left transition-all ${template === key ? 'border-[#1a237e] bg-[#eef4ff]' : 'border-slate-200 bg-white hover:border-[#1a237e]/30'}`}
                >
                  <div className="inline-flex items-center rounded-full border border-[#dbe7ff] bg-white px-2.5 py-1 text-[10px] font-black text-[#1a237e]">{meta.badge}</div>
                  <div className="mt-3 text-base font-black text-slate-900">{meta.title}</div>
                  <div className="mt-1 text-[11px] font-semibold text-slate-500">{meta.subtitle}</div>
                  <div className="mt-2 text-[10px] font-black text-[#1a237e]">推荐尺寸：{sizeMeta[meta.defaultSize].title}</div>
                </button>
              ))}
            </div>

            <div className="space-y-2">
              <div className="text-[10px] font-black tracking-widest text-slate-500">模板方案</div>
              <div className="grid grid-cols-1 gap-2 md:grid-cols-[1fr_auto]">
                <input
                  value={presetName}
                  onChange={(event) => setPresetName(event.target.value)}
                  placeholder="例如：门店价签标准版"
                  className="w-full rounded-xl border border-slate-200 bg-[#f8f9fa] px-3 py-2 text-sm outline-none focus:border-[#1a237e]"
                />
                <button onClick={savePreset} className="ui-btn ui-btn-primary rounded-xl px-4 py-2 text-sm font-black">
                  保存当前方案
                </button>
              </div>
              <div className="grid grid-cols-1 gap-2 md:grid-cols-2">
                {presets.length === 0 ? (
                  <div className="md:col-span-2 rounded-2xl border border-dashed border-slate-200 bg-[#f8f9fa] p-4 text-center text-sm font-semibold text-slate-500">
                    当前还没有模板方案，先保存一个常用组合。
                  </div>
                ) : (
                  presets.map((preset) => {
                    const active = preset.id === activePresetId;
                    return (
                      <div key={preset.id} className={`rounded-2xl border p-3 ${active ? 'border-[#1a237e] bg-[#eef4ff]' : 'border-slate-200 bg-[#f8f9fa]'}`}>
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <div className="truncate text-sm font-black text-slate-900">{preset.name}</div>
                            <div className="mt-1 text-[10px] font-semibold text-slate-500">
                              {templateMeta[preset.template].title} · {sizeMeta[preset.size].title} · {preset.orientation === 'portrait' ? '纵向' : '横向'} · {marginMeta[preset.margin].title}
                            </div>
                          </div>
                          <div className="flex shrink-0 items-center gap-2">
                            {active && <span className="rounded-full bg-[#1a237e] px-2 py-1 text-[10px] font-black text-white">当前</span>}
                            <button type="button" onClick={() => applyPreset(preset)} className="rounded-full border border-[#dbe7ff] bg-white px-2.5 py-1 text-[10px] font-black text-[#1a237e]">
                              应用
                            </button>
                            <button type="button" onClick={() => deletePreset(preset.id)} className="rounded-full border border-slate-200 bg-white px-2.5 py-1 text-[10px] font-black text-slate-500">
                              删除
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>

            <div className="space-y-2">
              <div className="text-[10px] font-black tracking-widest text-slate-500">常用尺寸</div>
              <div className="grid grid-cols-2 gap-2 md:grid-cols-4">
                {(Object.entries(sizeMeta) as [SizeKey, (typeof sizeMeta)[SizeKey]][]).map(([key, meta]) => (
                  <button
                    key={key}
                    onClick={() => setSize(key)}
                    className={`rounded-2xl border px-3 py-3 text-left transition-all ${size === key ? 'border-[#1a237e] bg-[#eef4ff] text-[#1a237e]' : 'border-slate-200 bg-white text-slate-700 hover:border-[#1a237e]/30'}`}
                  >
                    <div className="text-sm font-black">{meta.title}</div>
                    <div className="mt-1 text-[10px] font-semibold">{meta.subtitle}</div>
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-2">
              <div className="text-[10px] font-black tracking-widest text-slate-500">纸张方向</div>
              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={() => setOrientation('portrait')}
                  className={`rounded-2xl border px-3 py-3 text-left transition-all ${orientation === 'portrait' ? 'border-[#1a237e] bg-[#eef4ff] text-[#1a237e]' : 'border-slate-200 bg-white text-slate-700 hover:border-[#1a237e]/30'}`}
                >
                  <div className="text-sm font-black">纵向</div>
                  <div className="mt-1 text-[10px] font-semibold">适合标准价签</div>
                </button>
                <button
                  onClick={() => setOrientation('landscape')}
                  className={`rounded-2xl border px-3 py-3 text-left transition-all ${orientation === 'landscape' ? 'border-[#1a237e] bg-[#eef4ff] text-[#1a237e]' : 'border-slate-200 bg-white text-slate-700 hover:border-[#1a237e]/30'}`}
                >
                  <div className="text-sm font-black">横向</div>
                  <div className="mt-1 text-[10px] font-semibold">适合货架标签</div>
                </button>
              </div>
            </div>

            <div className="space-y-2">
              <div className="text-[10px] font-black tracking-widest text-slate-500">边距</div>
              <div className="grid grid-cols-3 gap-2">
                {(Object.entries(marginMeta) as [Margin, (typeof marginMeta)[Margin]][]).map(([key, meta]) => (
                  <button
                    key={key}
                    onClick={() => setMargin(key)}
                    className={`rounded-2xl border px-3 py-3 text-left transition-all ${margin === key ? 'border-[#1a237e] bg-[#eef4ff] text-[#1a237e]' : 'border-slate-200 bg-white text-slate-700 hover:border-[#1a237e]/30'}`}
                  >
                    <div className="text-sm font-black">{meta.title}</div>
                    <div className="mt-1 text-[10px] font-semibold">{meta.subtitle}</div>
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
