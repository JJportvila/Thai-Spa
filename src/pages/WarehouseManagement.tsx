import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Store,
  ShoppingCart,
  Package,
  ClipboardList,
  History,
  BarChart3,
  Calculator,
  Settings,
  User,
  Search,
  Plus,
  Pencil,
  Trash2,
  ChevronsUpDown,
  ChevronLeft,
  ChevronRight,
  X,
  Upload,
  ScanSearch,
  Wand2,
} from 'lucide-react';
import Tesseract from 'tesseract.js';
import { StretProduct } from '../lib/productLogic';
import {
  getRetailInventoryMap,
  setRetailInventoryMap,
  getAccountProgramSettings,
  patchAccountProgramSettings,
} from '../lib/accountScopedStore';
import { getWarehouseProducts, saveWarehouseProducts } from '../lib/procurementStore';
import { appendInventoryOpsLog, getInventoryOpsLog, InventoryOpRecord } from '../lib/inventoryOpsStore';
import { getPosOpsState } from '../lib/posOpsStore';

interface WarehouseManagementProps {
  accountId?: string;
}

type StockFilter = 'ALL' | 'IN_STOCK' | 'LOW_STOCK' | 'OUT_STOCK' | 'EXPIRY_7' | 'EXPIRY_30';
type EditMode = 'create' | 'edit';
type SummaryView = 'TOTAL' | 'LOW' | 'OUT' | 'VALUE' | 'EXPIRY';

type ProductForm = {
  id: string;
  sku: string;
  title: string;
  barcode: string;
  category: string;
  stock: string;
  unitPrice: string;
  costPrice: string;
  taxRate: string;
  baseUnit: string;
  salesUnit: string;
  unitsPerCase: string;
  imageUrl: string;
  safetyStock: string;
  productionDate: string;
  expiryDate: string;
  shelfLifeDays: string;
};

type ManagedProduct = StretProduct & {
  unitPrice: number;
  costPrice?: number;
  taxRate?: number;
  baseUnit?: string;
  salesUnit?: string;
  unitsPerCase?: number;
  sku?: string;
  productionDate?: string;
  expiryDate?: string;
  shelfLifeDays?: number;
};

type OcrImportRow = {
  id: string;
  barcode: string;
  title: string;
  quantity: number;
  unitPrice?: number;
  matchedProductId: string;
  confidence?: number;
  sourceLine: string;
};

const LOW_STOCK_THRESHOLD = 20;
const PAGE_SIZE = 8;
const DEFAULT_ACCOUNT = 'R-001';
const DEFAULT_IMAGE =
  'https://images.unsplash.com/photo-1472851294608-062f824d29cc?auto=format&fit=crop&w=800&q=80';

const iconClass = 'h-[18px] w-[18px] shrink-0';

const emptyForm = (): ProductForm => ({
  id: '',
  sku: '',
  title: '',
  barcode: '',
  category: '楗枡',
  stock: '0',
  unitPrice: '150',
  costPrice: '0',
  taxRate: '15',
  baseUnit: '瓶',
  salesUnit: '箱',
  unitsPerCase: '12',
  imageUrl: '',
  safetyStock: String(LOW_STOCK_THRESHOLD),
  productionDate: '',
  expiryDate: '',
  shelfLifeDays: '',
});

const toNumber = (value: string | number | undefined, fallback = 0) => {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
};

const parseOcrRows = (rawText: string): OcrImportRow[] => {
  const lines = rawText
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);
  const rows: OcrImportRow[] = [];
  for (const line of lines) {
    const barcodeMatch = line.match(/\b(\d{8,18})\b/);
    if (!barcodeMatch) continue;
    const barcode = barcodeMatch[1];
    const qtyMatch = line.match(/(?:x|X|qty|数量|件数|qty:)\s*([+-]?\d+(?:\.\d+)?)/i);
    const quantity = Math.max(1, Math.round(Number(qtyMatch?.[1] || 1)));
    const priceMatch = line.match(/(?:vt|vatu|price|单价|售价|金额)[:\s]*([0-9]+(?:\.[0-9]+)?)/i);
    const unitPrice = priceMatch ? Math.max(0, Number(priceMatch[1])) : undefined;
    const title = line
      .replace(barcode, '')
      .replace(/(?:x|X|qty|数量|件数|qty:)\s*[+-]?\d+(?:\.\d+)?/gi, '')
      .replace(/(?:vt|vatu|price|单价|售价|金额)[:\s]*[0-9]+(?:\.[0-9]+)?/gi, '')
      .replace(/[\s|,;:]+/g, ' ')
      .trim();
    rows.push({
      id: `ocr-${barcode}-${rows.length + 1}`,
      barcode,
      title: title || `OCR商品-${barcode.slice(-4)}`,
      quantity,
      unitPrice: Number.isFinite(unitPrice as number) ? unitPrice : undefined,
      matchedProductId: '',
      sourceLine: line,
    });
  }
  const dedup = new Map<string, OcrImportRow>();
  for (const row of rows) {
    const key = row.barcode;
    const current = dedup.get(key);
    if (!current) {
      dedup.set(key, { ...row });
      continue;
    }
    current.quantity += row.quantity;
    current.unitPrice = row.unitPrice ?? current.unitPrice;
    if (current.title.startsWith('OCR商品-') && row.title) current.title = row.title;
  }
  return Array.from(dedup.values());
};

const parseCsvLine = (line: string): string[] => {
  const out: string[] = [];
  let current = '';
  let inQuotes = false;
  for (let i = 0; i < line.length; i += 1) {
    const ch = line[i];
    if (ch === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"';
        i += 1;
      } else {
        inQuotes = !inQuotes;
      }
      continue;
    }
    if (ch === ',' && !inQuotes) {
      out.push(current.trim());
      current = '';
      continue;
    }
    current += ch;
  }
  out.push(current.trim());
  return out;
};

const toCsvCell = (value: unknown) => `"${String(value ?? '').replace(/"/g, '""')}"`;

const getPrice = (product: StretProduct) => toNumber((product as any).unitPrice ?? (product as any).price, 150);

const getStatus = (stock: number, safetyStock: number) => {
  if (stock <= 0) {
    return {
      text: '无货',
      textClass: 'text-[#1a237e]',
      dotClass: 'bg-[#1a237e]',
      stockClass: 'text-[#1a237e]',
    };
  }
  if (stock <= Math.max(1, safetyStock)) {
    return {
      text: '低库存',
      textClass: 'text-[#1a237e]',
      dotClass: 'bg-[#1a237e]',
      stockClass: 'text-[#1a237e]',
    };
  }
  return {
    text: '有库存',
    textClass: 'text-[#1a237e]',
    dotClass: 'bg-[#1a237e]',
    stockClass: 'text-slate-700',
  };
};

const getExpiryMeta = (expiryDate?: string) => {
  if (!expiryDate) {
    return { label: '未设置', className: 'text-slate-500' };
  }
  const target = new Date(expiryDate);
  if (Number.isNaN(target.getTime())) {
    return { label: '日期无效', className: 'text-[#1a237e]' };
  }
  const now = new Date();
  const diff = Math.ceil((target.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
  if (diff < 0) return { label: `已过期 ${Math.abs(diff)} 天`, className: 'text-[#1a237e]' };
  if (diff <= 30) return { label: `临期 ${diff} 天`, className: 'text-[#1a237e]' };
  return { label: `剩余 ${diff} 天`, className: 'text-[#1a237e]' };
};

const getDaysUntilExpiry = (expiryDate?: string) => {
  if (!expiryDate) return null;
  const target = new Date(expiryDate);
  if (Number.isNaN(target.getTime())) return null;
  return Math.ceil((target.getTime() - Date.now()) / (1000 * 60 * 60 * 24));
};

const isAlcoholLike = (title?: string, category?: string) => {
  const merged = `${String(title || '')} ${String(category || '')}`.toLowerCase();
  return /beer|alcohol|wine|whisky|vodka|rum|gin|liquor|酒/.test(merged);
};

const normalizeProduct = (product: StretProduct, stockMap: Record<string, number>) => {
  const id = String(product.id || '');
  const stock = toNumber(stockMap[id] ?? product.stock, 0);
  const safetyStock = toNumber(product.safetyStock, LOW_STOCK_THRESHOLD);
  return {
    ...product,
    id,
    title: String(product.title || ''),
    barcode: String(product.barcode || ''),
    category: String(product.category || '未分类'),
    imageUrl: product.imageUrl || DEFAULT_IMAGE,
    stock,
    safetyStock,
    unitPrice: getPrice(product),
    costPrice: toNumber((product as any).costPrice, 0),
    taxRate: toNumber((product as any).taxRate, 15),
    baseUnit: String((product as any).baseUnit || '瓶'),
    salesUnit: String((product as any).salesUnit || '箱'),
    unitsPerCase: Math.max(1, toNumber((product as any).unitsPerCase, 12)),
    sku: String((product as any).sku || id),
    productionDate: String((product as any).productionDate || ''),
    expiryDate: String((product as any).expiryDate || ''),
    shelfLifeDays: Math.max(0, toNumber((product as any).shelfLifeDays, 0)),
  } as ManagedProduct;
};

const WarehouseManagementPage: React.FC<WarehouseManagementProps> = ({ accountId }) => {
  const scopedAccountId = accountId || DEFAULT_ACCOUNT;
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [products, setProducts] = useState<ManagedProduct[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('ALL');
  const [stockFilter, setStockFilter] = useState<StockFilter>('ALL');
  const [page, setPage] = useState(1);
  const [error, setError] = useState('');
  const [showEditor, setShowEditor] = useState(false);
  const [editMode, setEditMode] = useState<EditMode>('create');
  const [form, setForm] = useState<ProductForm>(emptyForm());
  const [stockEditingId, setStockEditingId] = useState('');
  const [stockDraftUnits, setStockDraftUnits] = useState('0');
  const [stockDraftCases, setStockDraftCases] = useState('0');
  const [opsLog, setOpsLog] = useState<InventoryOpRecord[]>([]);
  const [logSourceFilter, setLogSourceFilter] = useState<'ALL' | 'POS' | 'INVENTORY'>('ALL');
  const [logTypeFilter, setLogTypeFilter] = useState<'ALL' | InventoryOpRecord['type']>('ALL');
  const [logKeyword, setLogKeyword] = useState('');
  const [operatorName, setOperatorName] = useState('操作员 01');
  const [headerNow, setHeaderNow] = useState(() => new Date());
  const [showOperatorMenu, setShowOperatorMenu] = useState(false);
  const [showOcrImport, setShowOcrImport] = useState(false);
  const [ocrRunning, setOcrRunning] = useState(false);
  const [ocrRows, setOcrRows] = useState<OcrImportRow[]>([]);
  const [ocrRawText, setOcrRawText] = useState('');
  const [ocrApproved, setOcrApproved] = useState(false);
  const [expiredSaleBlockEnabled, setExpiredSaleBlockEnabled] = useState(false);
  const [summaryView, setSummaryView] = useState<SummaryView | null>(null);
  const importProductsInputRef = useRef<HTMLInputElement | null>(null);
  const inventorySearchRef = useRef<HTMLInputElement | null>(null);

  const navigate = (view: string) => {
    window.dispatchEvent(new CustomEvent('app-navigate', { detail: view }));
  };

  const loadData = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const [warehouseProducts, inventoryMap, settings] = await Promise.all([
        getWarehouseProducts(scopedAccountId),
        getRetailInventoryMap(scopedAccountId),
        getAccountProgramSettings(scopedAccountId),
      ]);
      const normalized = warehouseProducts.map((item) => normalizeProduct(item, inventoryMap));
      setProducts(normalized);
      const logs = await getInventoryOpsLog(scopedAccountId);
      setOpsLog(logs);
      const activeShift = getPosOpsState(scopedAccountId).activeShift;
      setOperatorName(activeShift?.cashierName || '操作员 01');
      if (typeof (settings as any).retailExpiredBlockEnabled === 'boolean') {
        setExpiredSaleBlockEnabled(Boolean((settings as any).retailExpiredBlockEnabled));
      }
      if (!Object.keys(inventoryMap).length && normalized.length > 0) {
        const seeded = Object.fromEntries(normalized.map((item) => [item.id, item.stock]));
        await setRetailInventoryMap(scopedAccountId, seeded);
      }
    } catch (e: any) {
      setError(e?.message || '库存数据加载失败');
    } finally {
      setLoading(false);
    }
  }, [scopedAccountId]);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  useEffect(() => {
    const timer = window.setInterval(() => setHeaderNow(new Date()), 30000);
    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    let active = true;
    const refreshSafe = async () => {
      if (!active) return;
      await loadData();
    };
    const onInventoryUpdated = (event: Event) => {
      const detail = (event as CustomEvent<{ accountId?: string }>).detail;
      if (detail?.accountId && detail.accountId !== scopedAccountId) return;
      void refreshSafe();
    };
    const onFocus = () => void refreshSafe();
    const onVisibility = () => {
      if (document.visibilityState === 'visible') {
        void refreshSafe();
      }
    };

    window.addEventListener('retail-inventory-updated', onInventoryUpdated as EventListener);
    window.addEventListener('focus', onFocus);
    document.addEventListener('visibilitychange', onVisibility);
    const timer = window.setInterval(() => {
      void refreshSafe();
    }, 15000);

    return () => {
      active = false;
      window.removeEventListener('retail-inventory-updated', onInventoryUpdated as EventListener);
      window.removeEventListener('focus', onFocus);
      document.removeEventListener('visibilitychange', onVisibility);
      window.clearInterval(timer);
    };
  }, [loadData, scopedAccountId]);

  const categories = useMemo(() => {
    const set = new Set<string>();
    products.forEach((item) => {
      if (item.category) set.add(item.category);
    });
    return ['ALL', ...Array.from(set)];
  }, [products]);
  const selectableCategories = useMemo(() => categories.filter((c) => c !== 'ALL'), [categories]);

  const filteredProducts = useMemo(() => {
    const keyword = searchQuery.trim().toLowerCase();
    return products.filter((item) => {
      const safetyStock = toNumber(item.safetyStock, LOW_STOCK_THRESHOLD);
      const status = getStatus(toNumber(item.stock, 0), safetyStock);
      const matchKeyword =
        !keyword ||
        item.title.toLowerCase().includes(keyword) ||
        item.id.toLowerCase().includes(keyword) ||
        item.barcode.toLowerCase().includes(keyword);
      const matchCategory = categoryFilter === 'ALL' || item.category === categoryFilter;
      const daysUntilExpiry = getDaysUntilExpiry((item as any).expiryDate);
      const matchStock =
        stockFilter === 'ALL' ||
        (stockFilter === 'IN_STOCK' && status.text === '有库存') ||
        (stockFilter === 'LOW_STOCK' && status.text === '低库存') ||
        (stockFilter === 'OUT_STOCK' && status.text === '无货') ||
        (stockFilter === 'EXPIRY_7' && daysUntilExpiry !== null && daysUntilExpiry >= 0 && daysUntilExpiry <= 7) ||
        (stockFilter === 'EXPIRY_30' && daysUntilExpiry !== null && daysUntilExpiry >= 0 && daysUntilExpiry <= 30);
      return matchKeyword && matchCategory && matchStock;
    });
  }, [products, searchQuery, categoryFilter, stockFilter]);

  const pageCount = Math.max(1, Math.ceil(filteredProducts.length / PAGE_SIZE));
  const currentPage = Math.min(page, pageCount);
  const pagedProducts = filteredProducts.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

  useEffect(() => {
    setPage(1);
  }, [searchQuery, categoryFilter, stockFilter]);

  useEffect(() => {
    setPage((prev) => Math.min(prev, pageCount));
  }, [pageCount]);

  const summary = useMemo(() => {
    let low = 0;
    let out = 0;
    let expiry = 0;
    let value = 0;
    products.forEach((item) => {
      const stock = toNumber(item.stock, 0);
      const safetyStock = toNumber(item.safetyStock, LOW_STOCK_THRESHOLD);
      const status = getStatus(stock, safetyStock).text;
      const daysUntilExpiry = getDaysUntilExpiry((item as any).expiryDate);
      if (status === '低库存') low += 1;
      if (status === '无货') out += 1;
      if (daysUntilExpiry !== null && daysUntilExpiry >= 0 && daysUntilExpiry <= 30) expiry += 1;
      value += stock * toNumber(item.unitPrice, 150);
    });
    return { total: products.length, low, out, expiry, value };
  }, [products]);

  const summaryDetailProducts = useMemo(() => {
    if (!summaryView) return [];
    return products.filter((item) => {
      const stock = toNumber(item.stock, 0);
      const safetyStock = toNumber(item.safetyStock, LOW_STOCK_THRESHOLD);
      const status = getStatus(stock, safetyStock).text;
      if (summaryView === 'TOTAL') return true;
      if (summaryView === 'LOW') return status === '低库存';
      if (summaryView === 'OUT') return status === '无货';
      if (summaryView === 'VALUE') return stock > 0;
      if (summaryView === 'EXPIRY') {
        const daysUntilExpiry = getDaysUntilExpiry((item as any).expiryDate);
        return daysUntilExpiry !== null && daysUntilExpiry >= 0 && daysUntilExpiry <= 30;
      }
      return true;
    });
  }, [products, summaryView]);

  const guessMatchedProductId = useCallback(
    (barcode: string) => {
      const hit = products.find((p) => String(p.barcode || '').trim() === String(barcode || '').trim());
      return hit?.id || '';
    },
    [products]
  );

  const resetOcrImport = () => {
    setOcrRawText('');
    setOcrRows([]);
    setOcrRunning(false);
    setOcrApproved(false);
  };

  const handleOcrFile = async (file: File | null) => {
    if (!file) return;
    setOcrRunning(true);
    setError('');
    try {
      const result = await Tesseract.recognize(file, 'eng+chi_sim');
      const raw = result.data.text || '';
      setOcrRawText(raw);
      const parsed = parseOcrRows(raw).map((row) => ({
        ...row,
        matchedProductId: guessMatchedProductId(row.barcode),
      }));
      setOcrRows(parsed);
      setOcrApproved(false);
      if (!parsed.length) {
        setError('OCR 已完成，但未识别到有效条码行，请检查发票清晰度。');
      }
    } catch (e: any) {
      setError(e?.message || 'OCR 识别失败');
    } finally {
      setOcrRunning(false);
    }
  };

  const applyOcrRows = async () => {
    if (!ocrRows.length) {
      setError('暂无可导入数据');
      return;
    }
    if (!ocrApproved) {
      setError('请先审核并确认单据后再入库');
      return;
    }
    setSaving(true);
    setError('');
    try {
      const nextProducts = [...products];
      const nextLogs: InventoryOpRecord[] = [];
      for (const row of ocrRows) {
        const barcode = String(row.barcode || '').trim();
        if (!barcode) continue;
        const qty = Math.max(1, Math.round(Number(row.quantity) || 1));
        let target = nextProducts.find((p) => p.id === row.matchedProductId) || nextProducts.find((p) => String(p.barcode || '').trim() === barcode);
        if (target) {
          const nextStock = Math.max(0, toNumber(target.stock, 0) + qty);
          target.stock = nextStock;
          if (row.unitPrice && row.unitPrice > 0) target.unitPrice = row.unitPrice;
          if (!target.barcode) target.barcode = barcode;
          nextLogs.push({
            type: 'STOCK_ADJUST',
            source: 'INVENTORY',
            productId: target.id,
            productTitle: target.title,
            delta: qty,
            stockAfter: nextStock,
            note: 'OCR导入：条码匹配（忽略品名差异）',
            refNo: `OCR-${Date.now().toString().slice(-6)}`,
            operator: operatorName,
            at: Date.now(),
          });
        } else {
          const id = `P-${Date.now().toString().slice(-6)}-${Math.floor(Math.random() * 90 + 10)}`;
          const created: ManagedProduct = {
            id,
            sku: `SKU-${barcode.slice(-6)}`,
            barcode,
            title: row.title || `OCR商品-${barcode.slice(-4)}`,
            category: '未分类',
            stock: qty,
            safetyStock: LOW_STOCK_THRESHOLD,
            zoneColor: 'Blue',
            shelfId: 'A1',
            rowNum: 1,
            colNum: 1,
            imageUrl: DEFAULT_IMAGE,
            unitPrice: Math.max(0, Number(row.unitPrice) || 150),
            costPrice: 0,
            taxRate: 15,
            baseUnit: '件',
            salesUnit: '箱',
            unitsPerCase: 12,
            productionDate: '',
            expiryDate: '',
            shelfLifeDays: 0,
          };
          nextProducts.unshift(created);
          nextLogs.push({
            type: 'CREATE_PRODUCT',
            source: 'INVENTORY',
            productId: created.id,
            productTitle: created.title,
            delta: qty,
            stockAfter: qty,
            note: 'OCR导入：新建商品',
            refNo: `OCR-${Date.now().toString().slice(-6)}`,
            operator: operatorName,
            at: Date.now(),
          });
        }
      }
      setProducts(nextProducts);
      await persistProducts(nextProducts);
      if (nextLogs.length) {
        await appendInventoryOpsLog(scopedAccountId, nextLogs);
      }
      setShowOcrImport(false);
      resetOcrImport();
      await loadData();
    } catch (e: any) {
      setError(e?.message || 'OCR 批量导入失败');
    } finally {
      setSaving(false);
    }
  };

  const filteredOpsLog = useMemo(() => {
    const keyword = logKeyword.trim().toLowerCase();
    return opsLog.filter((item) => {
      const sourceMatch = logSourceFilter === 'ALL' || item.source === logSourceFilter;
      const typeMatch = logTypeFilter === 'ALL' || item.type === logTypeFilter;
      const keywordMatch =
        !keyword ||
        String(item.productTitle || '').toLowerCase().includes(keyword) ||
        String(item.productId || '').toLowerCase().includes(keyword) ||
        String(item.refNo || '').toLowerCase().includes(keyword) ||
        String(item.operator || '').toLowerCase().includes(keyword) ||
        String(item.note || '').toLowerCase().includes(keyword);
      return sourceMatch && typeMatch && keywordMatch;
    });
  }, [opsLog, logSourceFilter, logTypeFilter, logKeyword]);

  const exportOpsCsv = () => {
    const header = ['时间', '来源', '类型', '单据号', '商品ID', '商品名', '变更量', '变更后库存', '操作员', '备注'];
    const rows = filteredOpsLog.map((item) => [
      new Date(item.at).toLocaleString(),
      item.source,
      item.type,
      item.refNo || '',
      item.productId,
      item.productTitle,
      item.delta,
      item.stockAfter ?? '',
      item.operator || '',
      item.note || '',
    ]);
    const csv = [header, ...rows]
      .map((row) =>
        row
          .map((cell) => `"${String(cell ?? '').replace(/"/g, '""')}"`)
          .join(',')
      )
      .join('\r\n');
    const blob = new Blob([`\uFEFF${csv}`], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `库存操作日志_${scopedAccountId}_${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const exportProductsCsv = (rows: ManagedProduct[], namePrefix: string) => {
    const header = [
      '商品编号',
      'SKU',
      '条码',
      '商品名称',
      '分类',
      '库存',
      '预警库存',
      '基础单位',
      '销售单位',
      '箱规',
      '进价',
      '售价',
      '税率',
      '生产日期',
      '过期日期',
      '保质期天数',
      '图片URL',
    ];
    const csvRows = rows.map((item) =>
      [
        item.id,
        item.sku || '',
        item.barcode || '',
        item.title,
        item.category || '',
        toNumber(item.stock, 0),
        toNumber(item.safetyStock, LOW_STOCK_THRESHOLD),
        item.baseUnit || '件',
        item.salesUnit || '箱',
        Math.max(1, toNumber(item.unitsPerCase, 12)),
        toNumber(item.costPrice, 0),
        toNumber(item.unitPrice, 150),
        toNumber(item.taxRate, 15),
        (item as any).productionDate || '',
        (item as any).expiryDate || '',
        toNumber((item as any).shelfLifeDays, 0),
        item.imageUrl || '',
      ]
        .map((cell) => toCsvCell(cell))
        .join(',')
    );
    const csv = [header.map((h) => toCsvCell(h)).join(','), ...csvRows].join('\n');
    const blob = new Blob([`\uFEFF${csv}`], { type: 'text/csv;charset=utf-8;' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${namePrefix}_${scopedAccountId}_${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
  };

  const downloadProductsImportTemplate = () => {
    const header = [
      '商品编号',
      'SKU',
      '条码',
      '商品名称',
      '分类',
      '库存',
      '预警库存',
      '基础单位',
      '销售单位',
      '箱规',
      '进价',
      '售价',
      '税率',
      '生产日期',
      '过期日期',
      '保质期天数',
      '图片URL',
    ];
    const sample = [
      'P-001',
      'SKU-0001',
      '1234567890123',
      '绀轰緥商品',
      '楗枡',
      '120',
      '20',
      '瓶',
      '箱',
      '12',
      '100',
      '150',
      '15',
      '2026-01-01',
      '2026-12-31',
      '365',
      '',
    ];
    const csv = [header.map((h) => toCsvCell(h)).join(','), sample.map((v) => toCsvCell(v)).join(',')].join('\n');
    const blob = new Blob([`\uFEFF${csv}`], { type: 'text/csv;charset=utf-8;' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `商品导入模板_${scopedAccountId}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
  };

  const handleImportProductsCsv = async (file: File | null) => {
    if (!file) return;
    setSaving(true);
    setError('');
    try {
      const text = await file.text();
      const lines = text.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
      if (lines.length < 2) throw new Error('CSV 至少需要表头和一行数据');
      const headers = parseCsvLine(lines[0]).map((h) => h.trim());
      const indexOf = (...names: string[]) =>
        headers.findIndex((h) => names.some((n) => h.toLowerCase() === n.toLowerCase()));
      const idx = {
        id: indexOf('商品编号', 'id'),
        sku: indexOf('sku'),
        barcode: indexOf('条码', 'barcode'),
        title: indexOf('商品名称', '标题', 'title'),
        category: indexOf('分类', 'category'),
        stock: indexOf('库存', 'stock'),
        safetyStock: indexOf('预警库存', 'safetystock'),
        baseUnit: indexOf('基础单位', 'baseunit'),
        salesUnit: indexOf('销售单位', 'salesunit'),
        unitsPerCase: indexOf('箱规', 'unitspercase'),
        costPrice: indexOf('进价', 'costprice'),
        unitPrice: indexOf('售价', 'unitprice', 'price'),
        taxRate: indexOf('税率', 'taxrate'),
        productionDate: indexOf('生产日期', 'productiondate'),
        expiryDate: indexOf('过期日期', 'expirydate'),
        shelfLifeDays: indexOf('保质期天数', 'shelflifedays'),
        imageUrl: indexOf('图片URL', 'imageurl'),
      };
      if (idx.id < 0 || idx.title < 0) throw new Error('CSV 缺少必填列：商品编号/商品名称');

      const nextMap = new Map(products.map((p) => [p.id, { ...p } as ManagedProduct]));
      for (let i = 1; i < lines.length; i += 1) {
        const row = parseCsvLine(lines[i]);
        const id = String(row[idx.id] || '').trim();
        if (!id) continue;
        const prev = nextMap.get(id);
        const title = String(row[idx.title] || prev?.title || '').trim();
        if (!title) continue;
        const sku = idx.sku >= 0 ? String(row[idx.sku] || prev?.sku || id).trim() : (prev?.sku || id);
        const barcode = idx.barcode >= 0 ? String(row[idx.barcode] || prev?.barcode || id).trim() : (prev?.barcode || id);
        const item: ManagedProduct = {
          id,
          title,
          sku,
          barcode,
          zoneColor: prev?.zoneColor || 'Blue',
          shelfId: prev?.shelfId || 'A1',
          rowNum: prev?.rowNum || 1,
          colNum: prev?.colNum || 1,
          category: idx.category >= 0 ? String(row[idx.category] || prev?.category || '未分类').trim() : (prev?.category || '未分类'),
          stock: idx.stock >= 0 ? Math.max(0, toNumber(row[idx.stock], prev ? toNumber(prev.stock, 0) : 0)) : (prev ? toNumber(prev.stock, 0) : 0),
          safetyStock: idx.safetyStock >= 0 ? Math.max(1, toNumber(row[idx.safetyStock], prev ? toNumber(prev.safetyStock, LOW_STOCK_THRESHOLD) : LOW_STOCK_THRESHOLD)) : (prev ? toNumber(prev.safetyStock, LOW_STOCK_THRESHOLD) : LOW_STOCK_THRESHOLD),
          baseUnit: idx.baseUnit >= 0 ? String(row[idx.baseUnit] || prev?.baseUnit || '件').trim() : (prev?.baseUnit || '件'),
          salesUnit: idx.salesUnit >= 0 ? String(row[idx.salesUnit] || prev?.salesUnit || '箱').trim() : (prev?.salesUnit || '箱'),
          unitsPerCase: idx.unitsPerCase >= 0 ? Math.max(1, toNumber(row[idx.unitsPerCase], prev ? toNumber(prev.unitsPerCase, 12) : 12)) : (prev ? Math.max(1, toNumber(prev.unitsPerCase, 12)) : 12),
          costPrice: idx.costPrice >= 0 ? Math.max(0, toNumber(row[idx.costPrice], prev ? toNumber(prev.costPrice, 0) : 0)) : (prev ? toNumber(prev.costPrice, 0) : 0),
          unitPrice: idx.unitPrice >= 0 ? Math.max(0, toNumber(row[idx.unitPrice], prev ? toNumber(prev.unitPrice, 150) : 150)) : (prev ? toNumber(prev.unitPrice, 150) : 150),
          taxRate: idx.taxRate >= 0 ? Math.max(0, toNumber(row[idx.taxRate], prev ? toNumber(prev.taxRate, 15) : 15)) : (prev ? toNumber(prev.taxRate, 15) : 15),
          productionDate: idx.productionDate >= 0 ? String(row[idx.productionDate] || (prev as any)?.productionDate || '').trim() : String((prev as any)?.productionDate || ''),
          expiryDate: idx.expiryDate >= 0 ? String(row[idx.expiryDate] || (prev as any)?.expiryDate || '').trim() : String((prev as any)?.expiryDate || ''),
          shelfLifeDays: idx.shelfLifeDays >= 0 ? Math.max(0, toNumber(row[idx.shelfLifeDays], prev ? toNumber((prev as any).shelfLifeDays, 0) : 0)) : (prev ? Math.max(0, toNumber((prev as any).shelfLifeDays, 0)) : 0),
          imageUrl: idx.imageUrl >= 0 ? String(row[idx.imageUrl] || prev?.imageUrl || DEFAULT_IMAGE).trim() : (prev?.imageUrl || DEFAULT_IMAGE),
        };
        nextMap.set(id, item);
      }

      const nextProducts = Array.from(nextMap.values());
      setProducts(nextProducts);
      await persistProducts(nextProducts);
      await loadData();
    } catch (e: any) {
      setError(e?.message || 'CSV 导入失败');
    } finally {
      setSaving(false);
      if (importProductsInputRef.current) importProductsInputRef.current.value = '';
    }
  };

  const logOperation = async (
    entries: Array<{
      type: InventoryOpRecord['type'];
      productId: string;
      productTitle: string;
      delta: number;
      stockAfter?: number;
      note?: string;
      refNo?: string;
    }>
  ) => {
    if (entries.length === 0) return;
    const next = await appendInventoryOpsLog(
      scopedAccountId,
      entries.map((entry, idx) => ({
        id: `IOP-${Date.now()}-${idx}-${Math.random().toString(36).slice(2, 7)}`,
        at: new Date().toISOString(),
        accountId: scopedAccountId,
        type: entry.type,
        productId: entry.productId,
        productTitle: entry.productTitle,
        delta: entry.delta,
        stockAfter: entry.stockAfter,
        operator: operatorName || scopedAccountId,
        source: 'INVENTORY',
        note: entry.note,
        refNo: entry.refNo,
      }))
    );
    setOpsLog(next);
  };

  const persistProducts = async (nextProducts: ManagedProduct[]) => {
    const stockMap: Record<string, number> = {};
    const payload: StretProduct[] = nextProducts.map((item) => {
      stockMap[item.id] = toNumber(item.stock, 0);
      return {
        ...item,
        stock: toNumber(item.stock, 0),
        safetyStock: toNumber(item.safetyStock, LOW_STOCK_THRESHOLD),
        imageUrl: item.imageUrl || DEFAULT_IMAGE,
        category: item.category || '未分类',
        unitPrice: toNumber(item.unitPrice, 150),
        costPrice: toNumber(item.costPrice, 0),
        taxRate: toNumber(item.taxRate, 15),
        baseUnit: String(item.baseUnit || '瓶'),
        salesUnit: String(item.salesUnit || '箱'),
        unitsPerCase: Math.max(1, toNumber(item.unitsPerCase, 12)),
        sku: String(item.sku || item.id),
        productionDate: String((item as any).productionDate || ''),
        expiryDate: String((item as any).expiryDate || ''),
        shelfLifeDays: Math.max(0, toNumber((item as any).shelfLifeDays, 0)),
      } as StretProduct;
    });
    await Promise.all([
      saveWarehouseProducts(scopedAccountId, payload),
      setRetailInventoryMap(scopedAccountId, stockMap),
    ]);
    window.dispatchEvent(
      new CustomEvent('warehouse-products-updated', {
        detail: { accountId: scopedAccountId, at: Date.now() },
      })
    );
  };

  const openCreate = () => {
    setEditMode('create');
    setForm(emptyForm());
    setShowEditor(true);
  };

  const handleImageUpload = (file?: File | null) => {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const result = typeof reader.result === 'string' ? reader.result : '';
      if (result) {
        setForm((s) => ({ ...s, imageUrl: result }));
      }
    };
    reader.readAsDataURL(file);
  };

  const openEdit = (item: ManagedProduct) => {
    setEditMode('edit');
    setForm({
      id: item.id,
      sku: String(item.sku || item.id),
      title: item.title,
      barcode: item.barcode,
      category: item.category || '未分类',
      stock: String(toNumber(item.stock, 0)),
      unitPrice: String(toNumber(item.unitPrice, 150)),
      costPrice: String(toNumber(item.costPrice, 0)),
      taxRate: String(toNumber(item.taxRate, 15)),
      baseUnit: String(item.baseUnit || '瓶'),
      salesUnit: String(item.salesUnit || '箱'),
      unitsPerCase: String(Math.max(1, toNumber(item.unitsPerCase, 12))),
      imageUrl: item.imageUrl || '',
      safetyStock: String(toNumber(item.safetyStock, LOW_STOCK_THRESHOLD)),
      productionDate: String((item as any).productionDate || ''),
      expiryDate: String((item as any).expiryDate || ''),
      shelfLifeDays: String(Math.max(0, toNumber((item as any).shelfLifeDays, 0))),
    });
    setShowEditor(true);
  };

  const handleSave = async () => {
    const title = form.title.trim();
    const normalizedId = form.id.trim();
    const normalizedSku = form.sku.trim();
    const normalizedBarcode = form.barcode.trim();
    if (!title) {
      setError('商品名称不能为空');
      return;
    }
    if (!normalizedSku) {
      setError('SKU 不能为空');
      return;
    }
    if (!normalizedBarcode) {
      setError('条码不能为空');
      return;
    }
    if (normalizedId && normalizedId === normalizedSku) {
      setError('商品编号和 SKU 不能相同');
      return;
    }
    if (normalizedSku === normalizedBarcode) {
      setError('SKU 与条码不能相同');
      return;
    }
    const duplicatedSku = products.some(
      (item) => item.id !== form.id && String(item.sku || '').trim() === normalizedSku
    );
    if (duplicatedSku) {
      setError('SKU 已存在，请使用新的 SKU');
      return;
    }
    const duplicatedBarcode = products.some(
      (item) => item.id !== form.id && String(item.barcode || '').trim() === normalizedBarcode
    );
    if (duplicatedBarcode) {
      setError('条码已存在，请使用新的条码');
      return;
    }
    setSaving(true);
    setError('');
    try {
      const id =
        editMode === 'create'
          ? (normalizedId || `P-${String(Date.now()).slice(-6)}`)
          : form.id;
      const unitsPerCase = Math.max(1, toNumber(form.unitsPerCase, 12));
      const shelfLifeDays = Math.max(0, toNumber(form.shelfLifeDays, 0));
      const alcoholLike = isAlcoholLike(title, form.category);
      let baseUnit = form.baseUnit.trim() || '瓶';
      let salesUnit = form.salesUnit.trim() || '箱';
      let normalizedUnitsPerCase = unitsPerCase;
      if (alcoholLike) {
        baseUnit = '瓶';
        salesUnit = '箱';
        if (!form.unitsPerCase.trim() || unitsPerCase < 2) {
          normalizedUnitsPerCase = 12;
        }
      }
      let expiryDate = form.expiryDate || '';
      if (!expiryDate && form.productionDate && shelfLifeDays > 0) {
        const production = new Date(form.productionDate);
        if (!Number.isNaN(production.getTime())) {
          const calc = new Date(production.getTime() + shelfLifeDays * 24 * 60 * 60 * 1000);
          expiryDate = calc.toISOString().slice(0, 10);
        }
      }
      const nextItem = {
        id,
        sku: normalizedSku || id,
        title,
        barcode: normalizedBarcode || id,
        zoneColor: 'Blue',
        shelfId: 'A1',
        rowNum: 1,
        colNum: 1,
        stock: Math.max(0, toNumber(form.stock, 0)),
        safetyStock: Math.max(1, toNumber(form.safetyStock, LOW_STOCK_THRESHOLD)),
        imageUrl: form.imageUrl.trim() || DEFAULT_IMAGE,
        category: form.category.trim() || '未分类',
        unitPrice: Math.max(0, toNumber(form.unitPrice, 150)),
        costPrice: Math.max(0, toNumber(form.costPrice, 0)),
        taxRate: Math.max(0, toNumber(form.taxRate, 15)),
        baseUnit,
        salesUnit,
        unitsPerCase: normalizedUnitsPerCase,
        productionDate: form.productionDate || '',
        expiryDate,
        shelfLifeDays,
      } as ManagedProduct;
      const nextProducts =
        editMode === 'create'
          ? [nextItem, ...products]
          : products.map((item) => (item.id === form.id ? nextItem : item));
      setProducts(nextProducts);
      await persistProducts(nextProducts);
      await logOperation([
        {
          type: editMode === 'create' ? 'CREATE_PRODUCT' : 'UPDATE_PRODUCT',
          productId: nextItem.id,
          productTitle: nextItem.title,
          delta: editMode === 'create' ? toNumber(nextItem.stock, 0) : 0,
          stockAfter: toNumber(nextItem.stock, 0),
          note: editMode === 'create' ? '库存页新增商品' : '库存页编辑商品',
          refNo: `INV-${Date.now().toString().slice(-6)}`,
        },
      ]);
      setShowEditor(false);
    } catch (e: any) {
      setError(e?.message || '淇濆瓨澶辫触');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('确定删除该商品吗？')) return;
    setSaving(true);
    setError('');
    try {
      const target = products.find((item) => item.id === id);
      const nextProducts = products.filter((item) => item.id !== id);
      setProducts(nextProducts);
      await persistProducts(nextProducts);
      if (target) {
        await logOperation([
          {
            type: 'DELETE_PRODUCT',
            productId: target.id,
            productTitle: target.title,
            delta: -toNumber(target.stock, 0),
            stockAfter: 0,
            note: '库存页删除商品',
            refNo: `INV-${Date.now().toString().slice(-6)}`,
          },
        ]);
      }
    } catch (e: any) {
      setError(e?.message || '鍒犻櫎澶辫触');
    } finally {
      setSaving(false);
    }
  };

  const openStockEditor = (item: ManagedProduct) => {
    setStockEditingId(item.id);
    setStockDraftUnits('0');
    setStockDraftCases('0');
  };

  const handleStockSave = async () => {
    if (!stockEditingId) return;
    setSaving(true);
    setError('');
    try {
      const target = products.find((item) => item.id === stockEditingId);
      if (!target) {
        setSaving(false);
        return;
      }
      const unitDelta = toNumber(stockDraftUnits, 0);
      const caseDelta = toNumber(stockDraftCases, 0);
      const caseFactor = Math.max(1, toNumber(target.unitsPerCase, 12));
      const totalDelta = unitDelta + caseDelta * caseFactor;
      const nextStock = Math.max(0, toNumber(target.stock, 0) + totalDelta);
      const nextProducts = products.map((item) =>
        item.id === stockEditingId ? { ...item, stock: nextStock } : item
      );
      setProducts(nextProducts);
      await persistProducts(nextProducts);
      await logOperation([
        {
          type: 'STOCK_ADJUST',
          productId: target.id,
          productTitle: target.title,
          delta: nextStock - toNumber(target.stock, 0),
          stockAfter: nextStock,
          note: `库存页手动调整库存（${caseDelta}箱，${unitDelta}${target.baseUnit || '件'}）`,
          refNo: `INV-${Date.now().toString().slice(-6)}`,
        },
      ]);
      setStockEditingId('');
    } catch (e: any) {
      setError(e?.message || '库存鏇存柊澶辫触');
    } finally {
      setSaving(false);
    }
  };

  const formCost = Math.max(0, toNumber(form.costPrice, 0));
  const formSale = Math.max(0, toNumber(form.unitPrice, 150));
  const formProfit = Math.max(0, formSale - formCost);
  const formProfitRate = formSale > 0 ? (formProfit / formSale) * 100 : 0;
  const isLossPrice = formCost > formSale;
  const stockEditingTarget = stockEditingId ? products.find((item) => item.id === stockEditingId) || null : null;
  const stockCaseFactor = Math.max(1, toNumber(stockEditingTarget?.unitsPerCase, 12));
  const stockCaseDeltaNum = toNumber(stockDraftCases, 0);
  const stockUnitDeltaNum = toNumber(stockDraftUnits, 0);
  const stockConvertedUnits = stockCaseDeltaNum * stockCaseFactor;
  const stockConvertedCases = stockUnitDeltaNum / stockCaseFactor;
  const stockPreviewDelta = stockConvertedUnits + stockUnitDeltaNum;
  return (
    <div className="min-h-full bg-[#f4f6fb] text-slate-900 antialiased">
      <main className="mx-auto max-w-[1360px] px-4 sm:px-6 py-5 space-y-4">
        <div className="ui-card px-6 py-5">
          <div className="flex flex-col gap-3 xl:flex-row xl:items-start xl:justify-between">
            <div className="min-w-0">
              <div className="text-[38px] font-extrabold leading-none text-slate-900">库存管理</div>
              <div className="mt-2 text-sm text-slate-500">统一管理商品库存、条码、临期预警、调拨与进货明细。</div>
            </div>
            <div className="flex flex-wrap items-center gap-2 text-[11px] font-semibold text-slate-500 xl:justify-end">
              <span className="rounded-full bg-slate-100 px-3 py-1">ZH 简体中文</span>
              <span className="rounded-full bg-slate-100 px-3 py-1">UTC+11 Port Vila</span>
              <span className="rounded-full bg-slate-100 px-3 py-1">
                {headerNow.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit', hour12: true }).toLowerCase()}
              </span>
              <span className="rounded-full bg-slate-100 px-3 py-1">{scopedAccountId}</span>
              <span className="rounded-full bg-slate-100 px-3 py-1">SU</span>
            </div>
          </div>
        </div>

        <div className="ui-card px-4 py-4">
          <div className="flex flex-nowrap items-center gap-2 overflow-x-auto no-scrollbar">
            <select
              className="h-10 px-3 rounded-xl border border-slate-200 bg-white text-xs shrink-0 whitespace-nowrap flex-none"
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
            >
              {categories.map((cat) => (
                <option key={cat} value={cat}>
                  {cat === 'ALL' ? '全部分类' : cat}
                </option>
              ))}
            </select>
            <select
              className="h-10 px-3 rounded-xl border border-slate-200 bg-white text-xs shrink-0 whitespace-nowrap flex-none"
              value={stockFilter}
              onChange={(e) => setStockFilter(e.target.value as StockFilter)}
            >
              <option value="ALL">全部状态</option>
              <option value="IN_STOCK">有库存</option>
              <option value="LOW_STOCK">低库存</option>
              <option value="OUT_STOCK">无货</option>
              <option value="EXPIRY_7">临期预警（7天）</option>
              <option value="EXPIRY_30">临期预警（30天）</option>
            </select>
            <button
              className="ui-btn ui-btn-primary h-10 px-3 text-xs shrink-0 whitespace-nowrap flex-none inline-flex items-center gap-1.5"
              onClick={openCreate}
              disabled={saving}
            >
              <Plus className="h-3.5 w-3.5" /> 新增
            </button>
            <button
              className="ui-btn ui-btn-secondary h-10 px-3 text-xs shrink-0 whitespace-nowrap flex-none inline-flex items-center gap-1.5"
              onClick={() => setShowOcrImport(true)}
              disabled={saving || ocrRunning}
            >
              <ScanSearch className="h-3.5 w-3.5" /> OCR 批量导入
            </button>
            <button
              className={`h-10 px-3 rounded-xl text-xs font-semibold border shrink-0 whitespace-nowrap flex-none ${expiredSaleBlockEnabled ? 'bg-[#1a237e] text-[#1a237e] border-[#dbe7ff]' : 'bg-white text-slate-700 border-slate-200'}`}
              onClick={async () => {
                const next = !expiredSaleBlockEnabled;
                setExpiredSaleBlockEnabled(next);
                try {
                  await patchAccountProgramSettings(scopedAccountId, { retailExpiredBlockEnabled: next });
                } catch (e: any) {
      setError(e?.message || '保存过期禁售开关失败');
                }
              }}
            >
              {expiredSaleBlockEnabled ? '已过期禁止销售：开' : '已过期禁止销售：关'}
            </button>
            <button
              className="h-10 px-3 rounded-xl border border-slate-200 bg-white text-slate-700 text-xs font-semibold hover:bg-slate-50 shrink-0 whitespace-nowrap flex-none"
              onClick={downloadProductsImportTemplate}
            >
              下载导入模板
            </button>
            <button
              className="h-10 px-3 rounded-xl border border-slate-200 bg-white text-slate-700 text-xs font-semibold hover:bg-slate-50 shrink-0 whitespace-nowrap flex-none"
              onClick={() => importProductsInputRef.current?.click()}
              disabled={saving}
            >
              导入CSV
            </button>
            <button
              className="h-10 px-3 rounded-xl border border-slate-200 bg-white text-slate-700 text-xs font-semibold hover:bg-slate-50 shrink-0 whitespace-nowrap flex-none"
              onClick={() => exportProductsCsv(filteredProducts, '商品筛选导出')}
            >
              筛选导出
            </button>
            <button
              className="h-10 px-3 rounded-xl border border-slate-200 bg-white text-slate-700 text-xs font-semibold hover:bg-slate-50 shrink-0 whitespace-nowrap flex-none"
              onClick={() => {
                if (categoryFilter === 'ALL') {
                  setError('请先选择具体分类后再导出分类数据');
                  return;
                }
                exportProductsCsv(filteredProducts, `分类导出_${categoryFilter}`);
              }}
            >
              分类导出
            </button>
            <input
              ref={importProductsInputRef}
              type="file"
              accept=".csv,text/csv"
              className="hidden"
              onChange={(e) => void handleImportProductsCsv(e.target.files?.[0] || null)}
            />
          </div>
        </div>

        {error && <div className="ui-card border-[#dbe7ff] bg-[#1a237e] text-[#1a237e] px-4 py-3 text-sm">{error}</div>}

        <div className="grid grid-cols-1 xl:grid-cols-[minmax(0,1fr)_190px] gap-4 items-start">
          <div className="grid grid-cols-1 gap-2.5 xl:col-start-2 xl:row-start-1">
            <button onClick={() => setSummaryView('TOTAL')} className="ui-card p-3 text-left transition-colors hover:border-[#24308f]/30">
              <p className="text-[10px] font-bold tracking-wider text-slate-400">商品总数</p>
              <p className="mt-1 text-base font-bold">{summary.total.toLocaleString()}</p>
            </button>
            <button onClick={() => setSummaryView('LOW')} className="ui-card p-3 text-left transition-colors hover:border-[#dbe7ff]">
              <p className="text-[10px] font-bold tracking-wider text-[#1a237e]">低库存</p>
              <p className="mt-1 text-base font-bold text-[#1a237e]">{summary.low.toLocaleString()}</p>
            </button>
            <button onClick={() => setSummaryView('OUT')} className="ui-card p-3 text-left transition-colors hover:border-[#dbe7ff]">
              <p className="text-[10px] font-bold tracking-wider text-[#1a237e]">无货商品</p>
              <p className="mt-1 text-base font-bold text-[#1a237e]">{summary.out.toLocaleString()}</p>
            </button>
            <button onClick={() => setSummaryView('VALUE')} className="ui-card p-3 text-left transition-colors hover:border-[#dbe7ff]">
              <p className="text-[10px] font-bold tracking-wider text-slate-400">库存金额</p>
              <p className="mt-1 text-base font-bold">VT {Math.round(summary.value).toLocaleString()}</p>
            </button>
            <button onClick={() => setSummaryView('EXPIRY')} className="ui-card p-3 text-left transition-colors hover:border-[#dbe7ff]">
              <p className="text-[10px] font-bold tracking-wider text-slate-400">临期商品（30天）</p>
              <p className="mt-1 text-base font-bold text-[#1a237e]">{summary.expiry.toLocaleString()}</p>
            </button>
          </div>

          <div className="space-y-6 xl:col-start-1 xl:row-start-1">
            <div className="ui-card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[1040px] text-left border-collapse">
              <thead className="bg-slate-50 border-b border-slate-200">
                <tr>
                  <th className="px-3 py-2.5 text-[10px] font-bold text-slate-500 uppercase tracking-wider whitespace-nowrap">商品 / 项目</th>
                  <th className="px-3 py-2.5 text-[10px] font-bold text-slate-500 uppercase tracking-wider whitespace-nowrap">分类</th>
                  <th className="px-3 py-2.5 text-[10px] font-bold text-slate-500 uppercase tracking-wider whitespace-nowrap">SKU / 条码</th>
                  <th className="px-3 py-2.5 text-[10px] font-bold text-slate-500 uppercase tracking-wider whitespace-nowrap">库存状态</th>
                  <th className="px-3 py-2.5 text-[10px] font-bold text-slate-500 uppercase tracking-wider whitespace-nowrap">库存数量</th>
                  <th className="px-3 py-2.5 text-[10px] font-bold text-slate-500 uppercase tracking-wider whitespace-nowrap">价格 (VT)</th>
                  <th className="px-4 py-3 text-[11px] font-bold text-slate-500 uppercase tracking-wider text-right whitespace-nowrap">操作</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {!loading &&
                  pagedProducts.map((item) => {
                    const status = getStatus(
                      toNumber(item.stock, 0),
                      toNumber(item.safetyStock, LOW_STOCK_THRESHOLD)
                    );
                    const expiryMeta = getExpiryMeta((item as any).expiryDate);
                    return (
                      <tr key={item.id} className="hover:bg-slate-50 transition-colors">
                        <td className="px-3 py-2.5">
                          <div className="flex items-center gap-4">
                            <div className="w-12 h-12 rounded bg-slate-100 overflow-hidden flex-shrink-0">
                              <img className="w-full h-full object-cover" src={item.imageUrl || DEFAULT_IMAGE} alt={item.title} />
                            </div>
                            <div>
                              <p className="font-bold text-slate-900">{item.title}</p>
                              <p className="text-xs text-slate-500">
                                编号 {item.id} · SKU {item.sku || item.id} · {item.salesUnit || '箱'} = {Math.max(1, toNumber(item.unitsPerCase, 12))}
                                {item.baseUnit || '件'}
                              </p>
                              <p className="text-xs">
                                <span className="text-slate-500">生产 {(item as any).productionDate || '--'} · 过期 {(item as any).expiryDate || '--'} · </span>
                                <span className={expiryMeta.className}>{expiryMeta.label}</span>
                              </p>
                            </div>
                          </div>
                        </td>
                        <td className="px-3 py-2.5">
                          <span className="px-2.5 py-0.5 rounded-full text-xs font-medium bg-[#19217b]/10 text-[#19217b]">
                            {item.category || '未分类'}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-xs font-mono text-slate-500">
                          <div>{item.sku || item.id}</div>
                          <div>{item.barcode || '-'}</div>
                        </td>
                        <td className="px-3 py-2.5">
                          <span className={`flex items-center gap-1.5 text-xs font-bold ${status.textClass}`}>
                            <span className={`w-2 h-2 rounded-full ${status.dotClass}`} />
                            {status.text}
                          </span>
                        </td>
                        <td className={`px-6 py-4 text-sm font-medium ${status.stockClass}`}>
                            {toNumber(item.stock, 0).toLocaleString()} 件
                        </td>
                        <td className="px-6 py-4 text-sm font-bold">
                          <div>{Math.round(toNumber(item.unitPrice, 150)).toLocaleString()} VT</div>
                            <div className="text-xs font-normal text-slate-500">进价 {Math.round(toNumber(item.costPrice, 0)).toLocaleString()} VT</div>
                        </td>
                        <td className="px-6 py-4 text-right space-x-1">
                          <button
                            className="p-2 text-slate-400 hover:text-[#19217b] transition-colors"
                            title="调整库存"
                            onClick={() => openStockEditor(item)}
                          >
                            <ChevronsUpDown className="h-3.5 w-3.5" />
                          </button>
                          <button
                            className="p-2 text-slate-400 hover:text-[#19217b] transition-colors"
                            title="编辑"
                            onClick={() => openEdit(item)}
                          >
                            <Pencil className="h-3.5 w-3.5" />
                          </button>
                          <button
                            className="p-2 text-slate-400 hover:text-[#1a237e] transition-colors"
                            title="删除"
                            onClick={() => void handleDelete(item.id)}
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                {!loading && pagedProducts.length === 0 && (
                  <tr>
                    <td colSpan={7} className="px-6 py-16 text-center text-sm text-slate-500">
                      暂无匹配商品
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
          <div className="px-6 py-4 border-t border-slate-200 bg-slate-50 flex flex-col md:flex-row md:items-center justify-between gap-4">
            <p className="text-sm text-slate-500">
              {loading
                ? '加载中...'
                : '显示 ' +
                  String((currentPage - 1) * PAGE_SIZE + 1) +
                  ' 到 ' +
                  String(Math.min(currentPage * PAGE_SIZE, filteredProducts.length)) +
                  ' 条，共 ' +
                  String(filteredProducts.length) +
                  ' 条'}
            </p>
            <div className="flex items-center gap-1">
              <button
                className="w-8 h-8 rounded bg-white border border-slate-200 flex items-center justify-center text-slate-500 disabled:opacity-40"
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={currentPage <= 1}
              >
                <ChevronLeft className="h-3.5 w-3.5" />
              </button>
              <button className="w-8 h-8 rounded bg-[#19217b] text-white text-sm font-semibold">{currentPage}</button>
              <button
                className="w-8 h-8 rounded bg-white border border-slate-200 flex items-center justify-center text-slate-500 disabled:opacity-40"
                onClick={() => setPage((p) => Math.min(pageCount, p + 1))}
                disabled={currentPage >= pageCount}
              >
                <ChevronRight className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>
            </div>

            <div className="ui-card overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-200 bg-slate-50 space-y-3">
            <div className="flex items-center justify-between gap-3">
              <h3 className="text-sm font-bold text-slate-700">库存操作日志（含 POS 出入库）</h3>
              <button
                onClick={exportOpsCsv}
                className="ui-btn ui-btn-primary h-9 px-3 text-xs"
              >
                导出 CSV
              </button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-2">
              <input
                className="rounded-lg border border-slate-200 px-3 py-2 text-xs"
                placeholder="搜索商品/单据号/操作员"
                value={logKeyword}
                onChange={(e) => setLogKeyword(e.target.value)}
              />
              <select
                className="rounded-lg border border-slate-200 px-3 py-2 text-xs"
                value={logSourceFilter}
                onChange={(e) => setLogSourceFilter(e.target.value as 'ALL' | 'POS' | 'INVENTORY')}
              >
                <option value="ALL">全部来源</option>
                <option value="POS">POS</option>
                <option value="INVENTORY">库存页</option>
              </select>
              <select
                className="rounded-lg border border-slate-200 px-3 py-2 text-xs"
                value={logTypeFilter}
                onChange={(e) => setLogTypeFilter(e.target.value as 'ALL' | InventoryOpRecord['type'])}
              >
                <option value="ALL">全部类型</option>
                <option value="SALE">销售出库</option>
                <option value="RETURN">退货入库</option>
                <option value="CREATE_PRODUCT">新增商品</option>
                <option value="UPDATE_PRODUCT">编辑商品</option>
                <option value="DELETE_PRODUCT">删除商品</option>
                <option value="STOCK_ADJUST">库存调整</option>
              </select>
              <div className="text-xs text-slate-500 flex items-center justify-end">
                共 {filteredOpsLog.length} 条
              </div>
            </div>
          </div>
          <div className="max-h-72 overflow-auto">
            <table className="w-full min-w-[1040px] text-left border-collapse">
              <thead className="bg-white border-b border-slate-200">
                <tr>
                  <th className="px-4 py-3 text-xs font-bold text-slate-500 uppercase tracking-wider">时间</th>
                  <th className="px-4 py-3 text-xs font-bold text-slate-500 uppercase tracking-wider">来源</th>
                          <th className="px-4 py-3 text-xs font-bold text-slate-500 uppercase tracking-wider">单据号</th>
                  <th className="px-4 py-3 text-xs font-bold text-slate-500 uppercase tracking-wider">商品</th>
                  <th className="px-4 py-3 text-xs font-bold text-slate-500 uppercase tracking-wider">动作</th>
                  <th className="px-4 py-3 text-xs font-bold text-slate-500 uppercase tracking-wider">变动</th>
                  <th className="px-4 py-3 text-xs font-bold text-slate-500 uppercase tracking-wider">库存结余</th>
                  <th className="px-4 py-3 text-xs font-bold text-slate-500 uppercase tracking-wider">操作员</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredOpsLog.slice(0, 200).map((item) => (
                  <tr key={item.id}>
                    <td className="px-4 py-3 text-xs text-slate-500 whitespace-nowrap">{new Date(item.at).toLocaleString()}</td>
                    <td className="px-4 py-3 text-xs font-semibold">{item.source}</td>
                    <td className="px-4 py-3 text-xs text-slate-600">{item.refNo || '-'}</td>
                    <td className="px-4 py-3 text-sm text-slate-800">{item.productTitle}</td>
                    <td className="px-4 py-3 text-xs text-slate-600">{item.note || item.type}</td>
                    <td
                      className={
                        item.delta >= 0
                          ? 'px-4 py-3 text-sm font-semibold text-[#1a237e]'
                          : 'px-4 py-3 text-sm font-semibold text-[#1a237e]'
                      }
                    >
                      {item.delta >= 0 ? '+' + String(item.delta) : String(item.delta)}
                    </td>
                    <td className="px-4 py-3 text-sm text-slate-700">
                      {typeof item.stockAfter === 'number' ? item.stockAfter : '-'}
                    </td>
                    <td className="px-4 py-3 text-xs text-slate-600">{item.operator || '-'}</td>
                  </tr>
                ))}
                {filteredOpsLog.length === 0 && (
                  <tr>
                    <td colSpan={8} className="px-6 py-10 text-center text-sm text-slate-500">
                      暂无操作记录
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
            </div>
          </div>
        </div>

      </main>

      {summaryView && (
        <div className="fixed inset-0 z-50 bg-white/85 flex items-center justify-center p-3">
          <div className="w-[96vw] max-w-[1440px] bg-white rounded-2xl border border-slate-200 shadow-2xl max-h-[94vh] overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between">
              <h3 className="text-lg font-bold">
                {summaryView === 'TOTAL' && '商品总数明细'}
                {summaryView === 'LOW' && '低库存明细'}
                {summaryView === 'OUT' && '无货商品明细'}
                {summaryView === 'VALUE' && '库存金额明细'}
                {summaryView === 'EXPIRY' && '临期商品明细（30天）'}
              </h3>
              <button className="p-2 rounded hover:bg-slate-100" onClick={() => setSummaryView(null)}>
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="px-6 py-3 text-xs text-slate-500">
              共 {summaryDetailProducts.length} 条
            </div>
            <div className="max-h-[62vh] overflow-auto border-t border-slate-100">
              <table className="w-full min-w-[1040px] text-left border-collapse">
                <thead className="bg-slate-50 border-b border-slate-200 sticky top-0">
                  <tr>
                    <th className="px-4 py-3 text-xs font-bold text-slate-500 uppercase tracking-wider">商品</th>
                    <th className="px-4 py-3 text-xs font-bold text-slate-500 uppercase tracking-wider">条码</th>
                    <th className="px-4 py-3 text-xs font-bold text-slate-500 uppercase tracking-wider">库存</th>
                    <th className="px-4 py-3 text-xs font-bold text-slate-500 uppercase tracking-wider">单价</th>
                    <th className="px-4 py-3 text-xs font-bold text-slate-500 uppercase tracking-wider">库存金额</th>
                          <th className="px-4 py-3 text-xs font-bold text-slate-500 uppercase tracking-wider">状态</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {summaryDetailProducts.map((item) => {
                    const stock = toNumber(item.stock, 0);
                    const unitPrice = toNumber(item.unitPrice, 150);
                    const amount = stock * unitPrice;
                    const status = getStatus(stock, toNumber(item.safetyStock, LOW_STOCK_THRESHOLD));
                    return (
                      <tr key={String(summaryView) + '-' + String(item.id)}>
                        <td className="px-4 py-3 text-sm font-medium text-slate-800">{item.title}</td>
                        <td className="px-4 py-3 text-xs text-slate-500">{item.barcode || '-'}</td>
                        <td className="px-4 py-3 text-sm text-slate-700">{stock}</td>
                        <td className="px-4 py-3 text-sm text-slate-700">{Math.round(unitPrice).toLocaleString()} VT</td>
                        <td className="px-4 py-3 text-sm font-semibold text-slate-800">{Math.round(amount).toLocaleString()} VT</td>
                        <td className={'px-4 py-3 text-xs font-semibold ' + status.textClass}>{status.text}</td>
                      </tr>
                    );
                  })}
                  {summaryDetailProducts.length === 0 && (
                    <tr>
                      <td colSpan={6} className="px-4 py-10 text-center text-sm text-slate-500">
                        当前无数据
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {showEditor && (
        <div className="fixed inset-0 z-50 bg-white/85 flex items-center justify-center p-3">
          <div className="w-[96vw] max-w-[1440px] bg-white rounded-2xl border border-slate-200 shadow-2xl max-h-[94vh] overflow-y-auto">
            <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between">
              <h3 className="text-lg font-bold">{editMode === 'create' ? '新增商品' : '编辑商品'}</h3>
              <button className="p-2 rounded hover:bg-slate-100" onClick={() => setShowEditor(false)}>
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="px-6 pt-4 text-xs text-slate-500">请完整填写商品资料；每个输入框上方都有字段提示，商品编号 / SKU / 条码必须不同，保存后库存页与收银页同步生效。</div>
            <div className="px-6 pt-3">
              <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-2 text-xs text-slate-700 flex flex-wrap gap-x-4 gap-y-1">
                <span>成本：<b>{Math.round(formCost).toLocaleString()} VT</b></span>
                <span>售价：<b>{Math.round(formSale).toLocaleString()} VT</b></span>
                <span>单件毛利：<b>{Math.round(formProfit).toLocaleString()} VT</b></span>
                <span>毛利率：<b>{formProfitRate.toFixed(1)}%</b></span>
                {isLossPrice && (
                  <span className="text-[#1a237e] font-semibold">预警：当前售价低于成本（将亏损）</span>
                )}
              </div>
            </div>
            <div className="p-6 grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <p className="mb-1 text-xs font-semibold text-slate-600">商品编号</p>
                <input className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm" placeholder="如：P-001" value={form.id} onChange={(e) => setForm((s) => ({ ...s, id: e.target.value }))} disabled={editMode === 'edit'} />
              </div>
              <div>
                <p className="mb-1 text-xs font-semibold text-slate-600">SKU</p>
                <input className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm" placeholder="库存编码" value={form.sku} onChange={(e) => setForm((s) => ({ ...s, sku: e.target.value }))} />
              </div>
              <div>
                <p className="mb-1 text-xs font-semibold text-slate-600">条码</p>
                <input className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm" placeholder="商品条码" value={form.barcode} onChange={(e) => setForm((s) => ({ ...s, barcode: e.target.value }))} />
              </div>
              <div className="md:col-span-3">
                <p className="mb-1 text-xs font-semibold text-slate-600">商品名称</p>
                <input className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm" placeholder="输入完整商品名" value={form.title} onChange={(e) => setForm((s) => ({ ...s, title: e.target.value }))} />
              </div>
              <div>
                <p className="mb-1 text-xs font-semibold text-slate-600">分类</p>
                <select
                  className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm bg-white"
                  value={selectableCategories.includes(form.category) ? form.category : '__CUSTOM__'}
                  onChange={(e) => {
                    const value = e.target.value;
                    if (value === '__CUSTOM__') {
                      setForm((s) => ({ ...s, category: s.category || '' }));
                    } else {
                      setForm((s) => ({ ...s, category: value }));
                    }
                  }}
                >
                  {selectableCategories.map((cat) => (
                    <option key={cat} value={cat}>
                      {cat}
                    </option>
                  ))}
                  <option value="__CUSTOM__">自定义分类...</option>
                </select>
                {!selectableCategories.includes(form.category) && (
                  <input
                    className="mt-2 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
                    placeholder="输入自定义分类"
                    value={form.category}
                    onChange={(e) => setForm((s) => ({ ...s, category: e.target.value }))}
                  />
                )}
              </div>
              <div>
                  <p className="mb-1 text-xs font-semibold text-slate-600">当前库存（件）</p>
                <input className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm" placeholder="当前库存数量" type="number" value={form.stock} onChange={(e) => setForm((s) => ({ ...s, stock: e.target.value }))} />
              </div>
              <div>
                <p className="mb-1 text-xs font-semibold text-slate-600">预警库存</p>
                <input className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm" placeholder="低于该值提示低库存" type="number" value={form.safetyStock} onChange={(e) => setForm((s) => ({ ...s, safetyStock: e.target.value }))} />
              </div>
              <div>
                <p className="mb-1 text-xs font-semibold text-slate-600">基础单位</p>
                <input className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm" placeholder="如：件/瓶" value={form.baseUnit} onChange={(e) => setForm((s) => ({ ...s, baseUnit: e.target.value }))} />
              </div>
              <div>
                  <p className="mb-1 text-xs font-semibold text-slate-600">销售单位</p>
                <input className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm" placeholder="如：箱" value={form.salesUnit} onChange={(e) => setForm((s) => ({ ...s, salesUnit: e.target.value }))} />
              </div>
              <div>
                <p className="mb-1 text-xs font-semibold text-slate-600">箱规</p>
                <input className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm" placeholder="1箱等于多少基础单位" type="number" value={form.unitsPerCase} onChange={(e) => setForm((s) => ({ ...s, unitsPerCase: e.target.value }))} />
              </div>
              <div>
                <p className="mb-1 text-xs font-semibold text-slate-600">生产日期</p>
                <input className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm" type="date" value={form.productionDate} onChange={(e) => setForm((s) => ({ ...s, productionDate: e.target.value }))} />
              </div>
              <div>
                <p className="mb-1 text-xs font-semibold text-slate-600">保质期（天）</p>
                <input className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm" placeholder="例如 365" type="number" value={form.shelfLifeDays} onChange={(e) => setForm((s) => ({ ...s, shelfLifeDays: e.target.value }))} />
              </div>
              <div>
                <p className="mb-1 text-xs font-semibold text-slate-600">过期日期</p>
                <input className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm" type="date" value={form.expiryDate} onChange={(e) => setForm((s) => ({ ...s, expiryDate: e.target.value }))} />
              </div>
              <div>
                  <p className="mb-1 text-xs font-semibold text-slate-600">税率（%）</p>
                <input className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm" placeholder="默认 15" type="number" value={form.taxRate} onChange={(e) => setForm((s) => ({ ...s, taxRate: e.target.value }))} />
              </div>
              <div>
                  <p className="mb-1 text-xs font-semibold text-slate-600">进价（VT）</p>
                <input className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm" placeholder="成本价" type="number" value={form.costPrice} onChange={(e) => setForm((s) => ({ ...s, costPrice: e.target.value }))} />
              </div>
              <div>
                  <p className="mb-1 text-xs font-semibold text-slate-600">售价（VT）</p>
                <input className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm" placeholder="销售价" type="number" value={form.unitPrice} onChange={(e) => setForm((s) => ({ ...s, unitPrice: e.target.value }))} />
              </div>

              <div className="md:col-span-3 rounded-xl border border-slate-200 p-3 bg-slate-50">
                  <p className="mb-2 text-xs font-semibold text-slate-600">商品图片（URL / 上传 / 预览）</p>
                <div className="grid grid-cols-1 md:grid-cols-[1fr_auto_auto] gap-2 items-center">
                  <input className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm bg-white" placeholder="图片 URL（可选）" value={form.imageUrl} onChange={(e) => setForm((s) => ({ ...s, imageUrl: e.target.value }))} />
                  <label className="rounded-lg border border-dashed border-slate-300 px-3 py-2 text-sm text-slate-600 cursor-pointer hover:bg-slate-100 whitespace-nowrap text-center">
                    上传图片
                    <input type="file" accept="image/*" className="hidden" onChange={(e) => handleImageUpload(e.target.files?.[0] || null)} />
                  </label>
                  <div className="h-14 w-14 rounded-lg border border-slate-200 bg-white overflow-hidden flex items-center justify-center">
                    {form.imageUrl ? (
                      <img src={form.imageUrl} alt="preview" className="h-full w-full object-cover" />
                    ) : (
                      <span className="text-[10px] text-slate-400">无图</span>
                    )}
                  </div>
                </div>
              </div>
            </div>
            <div className="px-6 pb-6 flex justify-end gap-2">
              <button className="px-4 py-2 rounded-lg border border-slate-200 text-sm" onClick={() => setShowEditor(false)}>
                取消
              </button>
              <button className="px-4 py-2 rounded-lg bg-[#19217b] text-white text-sm font-semibold disabled:opacity-60" disabled={saving} onClick={() => void handleSave()}>
                {saving ? '保存中...' : '保存'}
              </button>
            </div>
          </div>
        </div>
      )}

      {showOcrImport && (
        <div className="fixed inset-0 z-50 bg-white/85 flex items-center justify-center p-3">
          <div className="w-[96vw] max-w-[1440px] bg-white rounded-2xl border border-slate-200 shadow-2xl max-h-[94vh] overflow-y-auto">
            <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between">
            <h3 className="text-lg font-bold">OCR 批量导入（发票 / 订单）</h3>
              <button className="p-2 rounded hover:bg-slate-100" onClick={() => { setShowOcrImport(false); resetOcrImport(); }}>
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="px-6 py-4 space-y-3">
              <div className="text-xs text-slate-500">
                规则：优先按<strong>条码</strong>匹配商品。即使 OCR 识别的品名有误，只要条码一致就归并到同一商品。
              </div>
              <div className="flex flex-wrap items-center gap-3">
                <label className="inline-flex items-center gap-2 rounded-lg border border-dashed border-slate-300 px-3 py-2 text-sm text-slate-700 cursor-pointer hover:bg-slate-50">
                  <Upload className="h-4 w-4" />
                  上传发票/订单图片
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => void handleOcrFile(e.target.files?.[0] || null)}
                  />
                </label>
                <button
                  className="inline-flex items-center gap-2 rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-700 hover:bg-slate-50"
                  onClick={() => {
                    const parsed = parseOcrRows(ocrRawText).map((row) => ({ ...row, matchedProductId: guessMatchedProductId(row.barcode) }));
                    setOcrRows(parsed);
                    setOcrApproved(false);
                  }}
                  disabled={!ocrRawText.trim()}
                >
                  <Wand2 className="h-4 w-4" />
                  重新解析文本
                </button>
                <button
                  className={
                    ocrApproved
                      ? 'inline-flex items-center gap-2 rounded-lg px-3 py-2 text-sm bg-[#1a237e] text-white'
                      : 'inline-flex items-center gap-2 rounded-lg px-3 py-2 text-sm border border-[#dbe7ff] text-[#1a237e] hover:bg-[#1a237e]'
                  }
                  onClick={() => setOcrApproved(true)}
                  disabled={ocrRows.length === 0}
                >
                  审核通过
                </button>
                <span className="text-xs text-slate-500">
                  {ocrRunning
                    ? 'OCR 识别中，请稍候...'
                    : '已识别 ' + String(ocrRows.length) + ' 行 · ' + (ocrApproved ? '已审核' : '待审核')}
                </span>
              </div>
              <textarea
                className="w-full h-28 rounded-lg border border-slate-200 px-3 py-2 text-xs font-mono"
                placeholder="OCR识别文本会显示在这里，可人工修正后再点“重新解析文本”"
                value={ocrRawText}
                onChange={(e) => {
                  setOcrRawText(e.target.value);
                  setOcrApproved(false);
                }}
              />
            </div>
            <div className="px-6 pb-2">
              <div className="rounded-xl border border-slate-200 overflow-hidden">
                <table className="w-full min-w-[1040px] text-left border-collapse">
                  <thead className="bg-slate-50 border-b border-slate-200">
                    <tr>
                      <th className="px-3 py-2 text-xs font-bold text-slate-500">条码</th>
                      <th className="px-3 py-2 text-xs font-bold text-slate-500">OCR 品名</th>
                      <th className="px-3 py-2 text-xs font-bold text-slate-500">数量</th>
                      <th className="px-3 py-2 text-xs font-bold text-slate-500">单价(VT)</th>
                      <th className="px-3 py-2 text-xs font-bold text-slate-500">匹配商品</th>
                      <th className="px-3 py-2 text-xs font-bold text-slate-500">说明</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {ocrRows.map((row) => {
                      const matched = products.find((p) => p.id === row.matchedProductId) || null;
                      const nameMismatch = matched && row.title && matched.title && row.title.trim() !== matched.title.trim();
                      return (
                        <tr key={row.id}>
                          <td className="px-3 py-2">
                            <input className="w-40 rounded border border-slate-200 px-2 py-1 text-xs" value={row.barcode} onChange={(e) => { setOcrApproved(false); setOcrRows((prev) => prev.map((it) => it.id === row.id ? { ...it, barcode: e.target.value } : it)); }} />
                          </td>
                          <td className="px-3 py-2">
                            <input className="w-full rounded border border-slate-200 px-2 py-1 text-xs" value={row.title} onChange={(e) => { setOcrApproved(false); setOcrRows((prev) => prev.map((it) => it.id === row.id ? { ...it, title: e.target.value } : it)); }} />
                          </td>
                          <td className="px-3 py-2">
                            <input className="w-20 rounded border border-slate-200 px-2 py-1 text-xs" type="number" value={row.quantity} onChange={(e) => { setOcrApproved(false); setOcrRows((prev) => prev.map((it) => it.id === row.id ? { ...it, quantity: Math.max(1, Math.round(Number(e.target.value) || 1)) } : it)); }} />
                          </td>
                          <td className="px-3 py-2">
                            <input className="w-24 rounded border border-slate-200 px-2 py-1 text-xs" type="number" value={row.unitPrice ?? ''} onChange={(e) => { setOcrApproved(false); setOcrRows((prev) => prev.map((it) => it.id === row.id ? { ...it, unitPrice: e.target.value === '' ? undefined : Math.max(0, Number(e.target.value) || 0) } : it)); }} />
                          </td>
                          <td className="px-3 py-2">
                            <select
                              className="w-full rounded border border-slate-200 px-2 py-1 text-xs"
                              value={row.matchedProductId}
                              onChange={(e) => { setOcrApproved(false); setOcrRows((prev) => prev.map((it) => it.id === row.id ? { ...it, matchedProductId: e.target.value } : it)); }}
                            >
                              <option value="">新建商品</option>
                              {products.map((p) => (
                                <option key={p.id} value={p.id}>{p.title} ({p.id})</option>
                              ))}
                            </select>
                          </td>
                          <td className="px-3 py-2 text-xs">
                            {matched ? (
                              <span className={nameMismatch ? 'text-[#1a237e] font-semibold' : 'text-[#1a237e] font-semibold'}>
                                {nameMismatch ? '条码一致，品名不一致：按条码合并' : '条码匹配成功'}
                              </span>
                            ) : (
                              <span className="text-slate-500">将新建商品</span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                    {ocrRows.length === 0 && (
                      <tr>
                        <td colSpan={6} className="px-3 py-8 text-center text-sm text-slate-500">
                          暂无导入行，请先上传发票或订单图片进行 OCR 识别。
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
            <div className="px-6 py-4 border-t border-slate-200 flex items-center justify-end gap-2">
              <button className="px-4 py-2 rounded-lg border border-slate-200 text-sm" onClick={() => { setShowOcrImport(false); resetOcrImport(); }}>
                取消
              </button>
              <button className="px-4 py-2 rounded-lg bg-[#19217b] text-white text-sm font-semibold disabled:opacity-60" onClick={() => void applyOcrRows()} disabled={saving || ocrRunning || ocrRows.length === 0 || !ocrApproved}>
                {saving ? '导入中...' : '确认批量导入'}
              </button>
            </div>
          </div>
        </div>
      )}

      {stockEditingId && (
        <div className="fixed inset-0 z-50 bg-white/85 flex items-center justify-center p-3">
          <div className="w-[96vw] max-w-[720px] bg-white rounded-2xl border border-slate-200 shadow-2xl">
            <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between">
              <h3 className="text-lg font-bold">调整库存</h3>
              <button className="p-2 rounded hover:bg-slate-100" onClick={() => setStockEditingId('')}>
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="p-6 space-y-3">
            <p className="text-sm text-slate-500">支持按“箱”和“件”同时调整；例如 1 箱 = 12 件会自动换算。</p>
              <div>
                <p className="mb-1 text-xs font-semibold text-slate-600">调整箱数（可正可负）</p>
              <input
                className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
                type="number"
                value={stockDraftCases}
                onChange={(e) => setStockDraftCases(e.target.value)}
                placeholder="调整箱数（可为负）"
              />
              </div>
              <div>
                <p className="mb-1 text-xs font-semibold text-slate-600">调整件数（可正可负）</p>
              <input
                className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
                type="number"
                value={stockDraftUnits}
                onChange={(e) => setStockDraftUnits(e.target.value)}
                placeholder="调整件数（可为负）"
              />
              </div>
              <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-600 space-y-1">
                <div>1 {stockEditingTarget?.salesUnit || '箱'} = {stockCaseFactor} {stockEditingTarget?.baseUnit || '件'}</div>
                <div>{stockCaseDeltaNum} {stockEditingTarget?.salesUnit || '箱'} = {stockConvertedUnits} {stockEditingTarget?.baseUnit || '件'}</div>
                <div>{stockUnitDeltaNum} {stockEditingTarget?.baseUnit || '件'} ≈ {stockConvertedCases.toFixed(2)} {stockEditingTarget?.salesUnit || '箱'}</div>
                <div className="font-semibold text-slate-800">本次净变动：{stockPreviewDelta >= 0 ? '+' : ''}{stockPreviewDelta} {stockEditingTarget?.baseUnit || '件'}</div>
              </div>
            </div>
            <div className="px-6 pb-6 flex justify-end gap-2">
              <button className="px-4 py-2 rounded-lg border border-slate-200 text-sm" onClick={() => setStockEditingId('')}>
                取消
              </button>
              <button className="px-4 py-2 rounded-lg bg-[#19217b] text-white text-sm font-semibold disabled:opacity-60" disabled={saving} onClick={() => void handleStockSave()}>
                {saving ? '更新中...' : '更新库存'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default WarehouseManagementPage;





