import React, { useState, useMemo, useEffect, useRef } from 'react';
import {
  ShoppingCart, 
  Trash2, 
  Plus, 
  Minus, 
  Receipt, 
  CreditCard, 
  Wallet,
  CheckCircle2,
  X,
  Package,
  Search,
  ScanLine,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import { formatVT } from '../lib/utils';
import { extendedVanuatuProducts } from '../lib/mockDataFull';
import { StretProduct } from '../lib/productLogic';
import {
  ensureRetailInventorySeed,
  getRetailInventoryMap,
  setRetailInventoryMap,
  getAccountProgramSettings,
  patchAccountProgramSettings,
} from '../lib/accountScopedStore';
import { getPosOpsState, recordPosSale } from '../lib/posOpsStore';

interface CartItem extends StretProduct {
  quantity: number;
}

type PaymentMethod = 'CASH' | 'CARD' | 'STRET_PAY' | 'CHECK';
type ReceiptPaper = '58MM' | '80MM';

interface ReceiptResult {
  paidAmount: number;
  changeAmount: number;
  receiptNo: string;
  printedAt: string;
}

interface SavedOrder {
  id: string;
  cart: CartItem[];
  paymentMethod: PaymentMethod;
  cashInput: string;
  createdAt: string;
}

interface RetailPOSPageProps {
  headerSearchQuery?: string;
  accountId?: string;
}

const RetailPOSPage: React.FC<RetailPOSPageProps> = ({ headerSearchQuery, accountId }) => {
  const { t } = useTranslation();
  const [cart, setCart] = useState<CartItem[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('ALL');
  const [showReceipt, setShowReceipt] = useState(false);
  const [showSettlement, setShowSettlement] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('CASH');
  const [receiptPaper, setReceiptPaper] = useState<ReceiptPaper>('58MM');
  const [cashInput, setCashInput] = useState('');
  const [receiptResult, setReceiptResult] = useState<ReceiptResult | null>(null);
  const [checkInfo, setCheckInfo] = useState({ number: '', phone: '' });
  const [savedOrders, setSavedOrders] = useState<SavedOrder[]>([]);
  const [inventoryMap, setInventoryMap] = useState<Record<string, number>>({});
  const [isMobileView, setIsMobileView] = useState(window.innerWidth < 1280);
  const [showMobileCart, setShowMobileCart] = useState(false);
  const [scannerEnabled, setScannerEnabled] = useState(true);
  const [scannerHint, setScannerHint] = useState('\u7ea2\u5916\u626b\u7801\u5df2\u5f00\u542f');
  const [autoFocusScan, setAutoFocusScan] = useState(true);
  const [scanToast, setScanToast] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const searchInputRef = useRef<HTMLInputElement | null>(null);
  const scanBufferRef = useRef('');
  const scanTimerRef = useRef<number | null>(null);
  const [taxQrEnabled, setTaxQrEnabled] = useState(false);
  const [taxQrTemplate, setTaxQrTemplate] = useState(
    'https://tax.gov.vu/receipt/verify?tin={tin}&branch={branch}&receipt={receiptNo}&amount={amount}&time={datetime}'
  );
  const [taxMerchantTin, setTaxMerchantTin] = useState('');
  const [taxBranchCode, setTaxBranchCode] = useState('');
  useEffect(() => {
    if (typeof headerSearchQuery === 'string') {
      setSearchQuery(headerSearchQuery);
    }
  }, [headerSearchQuery]);

  useEffect(() => {
    const onResize = () => setIsMobileView(window.innerWidth < 1280);
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  useEffect(() => {
    if (!autoFocusScan) return;
    focusScanInput();
  }, [autoFocusScan]);

  useEffect(() => {
    if (!accountId) return;
    let mounted = true;
    (async () => {
      await ensureRetailInventorySeed(accountId, extendedVanuatuProducts);
      const inv = await getRetailInventoryMap(accountId);
      if (mounted) setInventoryMap(inv);
      const settings = await getAccountProgramSettings(accountId);
      if (!mounted) return;
      if (settings.retailPosCategory) setSelectedCategory(settings.retailPosCategory);
      if (settings.retailPosPayment) setPaymentMethod(settings.retailPosPayment);
      if (settings.retailReceiptPaper === '58MM' || settings.retailReceiptPaper === '80MM') {
        setReceiptPaper(settings.retailReceiptPaper);
      }
      if (typeof settings.taxQrEnabled === 'boolean') setTaxQrEnabled(settings.taxQrEnabled);
      if (settings.taxQrTemplate) setTaxQrTemplate(settings.taxQrTemplate);
      if (settings.taxMerchantTin) setTaxMerchantTin(settings.taxMerchantTin);
      if (settings.taxBranchCode) setTaxBranchCode(settings.taxBranchCode);
    })();
    return () => {
      mounted = false;
    };
  }, [accountId]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const key = `stret-pos:saved-orders:${accountId || 'guest'}`;
    try {
      const raw = window.localStorage.getItem(key);
      if (!raw) {
        setSavedOrders([]);
        return;
      }
      const parsed = JSON.parse(raw) as SavedOrder[];
      setSavedOrders(Array.isArray(parsed) ? parsed : []);
    } catch {
      setSavedOrders([]);
    }
  }, [accountId]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const key = `stret-pos:saved-orders:${accountId || 'guest'}`;
    try {
      window.localStorage.setItem(key, JSON.stringify(savedOrders));
    } catch {}
  }, [savedOrders, accountId]);

  // Filter products for POS
  const categoryMap: Record<string, string> = {
    Beverage: '\u996e\u6599',
    Snack: '\u96f6\u98df',
    Staple: '\u4e3b\u98df',
    Household: '\u65e5\u7528\u54c1',
    Produce: '\u751f\u9c9c',
  };
  const categoryTabs = useMemo(() => {
    const values = Array.from(new Set(extendedVanuatuProducts.map((p) => p.category).filter(Boolean) as string[]));
    return ['ALL', ...values];
  }, []);
  const categoryCounts = useMemo(() => {
    const counts: Record<string, number> = { ALL: extendedVanuatuProducts.length };
    for (const p of extendedVanuatuProducts) {
      if (!p.category) continue;
      counts[p.category] = (counts[p.category] || 0) + 1;
    }
    return counts;
  }, []);

  const productsForAccount = useMemo(
    () =>
      extendedVanuatuProducts.map((p) => ({
        ...p,
        stock: inventoryMap[p.id] ?? p.stock,
      })),
    [inventoryMap]
  );

  const filteredProducts = useMemo(() => {
    return productsForAccount.filter(p => 
      (p.title.toLowerCase().includes(searchQuery.toLowerCase()) || p.barcode.includes(searchQuery)) &&
      (selectedCategory === 'ALL' || p.category === selectedCategory)
    );
  }, [productsForAccount, searchQuery, selectedCategory]);

  const playTone = (frequency: number, duration = 120) => {
    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();
      const oscillator = ctx.createOscillator();
      const gain = ctx.createGain();
      oscillator.type = 'sine';
      oscillator.frequency.value = frequency;
      gain.gain.value = 0.05;
      oscillator.connect(gain);
      gain.connect(ctx.destination);
      oscillator.start();
      window.setTimeout(() => {
        oscillator.stop();
        void ctx.close();
      }, duration);
    } catch {}
  };

  const showScanToast = (type: 'success' | 'error', text: string) => {
    setScanToast({ type, text });
    window.setTimeout(() => setScanToast(null), 1600);
  };

  const focusScanInput = () => {
    if (!autoFocusScan) return;
    window.setTimeout(() => {
      searchInputRef.current?.focus();
    }, 20);
  };

  useEffect(() => {
    if (!scannerEnabled) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Enter') {
        const code = scanBufferRef.current.trim();
        if (!code) return;
        const hit = productsForAccount.find((p) => p.barcode === code || p.id === code);
        if (hit) {
          addToCart(hit);
          setSearchQuery(code);
          setScannerHint(`已扫码：${code}`);
          playTone(1240, 90);
          showScanToast('success', `扫描成功，已添加 ${hit.title}`);
        } else {
          setSearchQuery(code);
          setScannerHint(`未匹配商品：${code}`);
          playTone(260, 160);
          if (typeof navigator !== 'undefined' && typeof navigator.vibrate === 'function') {
            navigator.vibrate([90, 40, 90]);
          }
          showScanToast('error', `未找到商品：${code}`);
        }
        scanBufferRef.current = '';
        focusScanInput();
        return;
      }
      if (event.key.length !== 1) return;
      scanBufferRef.current += event.key;
      if (scanTimerRef.current) window.clearTimeout(scanTimerRef.current);
      scanTimerRef.current = window.setTimeout(() => {
        scanBufferRef.current = '';
      }, 250);
    };
    window.addEventListener('keydown', onKeyDown);
    return () => {
      window.removeEventListener('keydown', onKeyDown);
      if (scanTimerRef.current) window.clearTimeout(scanTimerRef.current);
    };
  }, [scannerEnabled, productsForAccount, autoFocusScan]);

  const addToCart = (product: StretProduct) => {
    setCart(prev => {
      const existing = prev.find(item => item.id === product.id);
      if (existing) {
        return prev.map(item => item.id === product.id ? { ...item, quantity: item.quantity + 1 } : item);
      }
      return [...prev, { ...product, quantity: 1, unitPrice: 150 }]; // Mock unitPrice
    });
  };

  const removeFromCart = (productId: string) => {
    setCart(prev => prev.filter(item => item.id !== productId));
  };

  const updateQuantity = (productId: string, delta: number) => {
    setCart(prev => prev.map(item => {
      if (item.id === productId) {
        const newQty = Math.max(1, item.quantity + delta);
        return { ...item, quantity: newQty };
      }
      return item;
    }));
  };

  const handleSearchAdd = () => {
    const keyword = searchQuery.trim();
    if (!keyword) return;
    const hit = productsForAccount.find(
      (p) => p.barcode === keyword || p.id === keyword || p.title.toLowerCase().includes(keyword.toLowerCase())
    );
    if (!hit) {
      setScannerHint('未找到商品');
      playTone(260, 160);
      if (typeof navigator !== 'undefined' && typeof navigator.vibrate === 'function') {
        navigator.vibrate([90, 40, 90]);
      }
      showScanToast('error', '未找到匹配商品');
      focusScanInput();
      return;
    }
    addToCart(hit);
    setScannerHint(`已添加：${hit.title}`);
    playTone(1240, 90);
    showScanToast('success', `已添加：${hit.title}`);
    focusScanInput();
  };

  const subtotal = cart.reduce((sum, item) => sum + 150 * item.quantity, 0);
  const vat = subtotal * 0.15;
  const total = subtotal + vat;
  const paidAmount = paymentMethod === 'CASH' ? Number.parseFloat(cashInput || '0') || 0 : total;
  const changeAmount = Math.max(0, paidAmount - total);
  const isSettleReady = paymentMethod === 'CASH' ? paidAmount >= total : true;
  const currentShift = accountId ? getPosOpsState(accountId).activeShift : null;
  const paymentLabelMap: Record<PaymentMethod, string> = {
    CASH: '现金',
    CARD: '刷卡',
    CHECK: '支票',
    STRET_PAY: 'Stret Pay',
  };
  const taxQrVerifyUrl = useMemo(() => {
    if (!taxQrEnabled || !receiptResult) return '';
    const encodedDate = encodeURIComponent(receiptResult.printedAt);
    return taxQrTemplate
      .replaceAll('{receiptNo}', encodeURIComponent(receiptResult.receiptNo))
      .replaceAll('{amount}', encodeURIComponent(total.toFixed(2)))
      .replaceAll('{datetime}', encodedDate)
      .replaceAll('{tin}', encodeURIComponent(taxMerchantTin || ''))
      .replaceAll('{branch}', encodeURIComponent(taxBranchCode || ''))
      .replaceAll('{accountId}', encodeURIComponent(accountId || ''));
  }, [taxQrEnabled, receiptResult, taxQrTemplate, total, taxMerchantTin, taxBranchCode, accountId]);
  const taxQrImageUrl = taxQrVerifyUrl
    ? `https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=${encodeURIComponent(taxQrVerifyUrl)}`
    : '';

  const handleCheckout = () => {
    if (cart.length === 0) return;
    if (accountId) {
      const ops = getPosOpsState(accountId);
      if (!ops.activeShift) {
        alert('\u8bf7\u5148\u5728\u4eea\u8868\u76d8\u5f00\u59cb\u5f53\u73ed\uff0c\u518d\u8fdb\u884c\u6536\u94f6\u3002');
        return;
      }
    }
    setCashInput('');
    setShowMobileCart(false);
    setShowSettlement(true);
  };

  const applyCashKey = (key: string) => {
    setCashInput((prev) => {
      if (key === 'clear') return '';
      if (key === 'del') return prev.slice(0, -1);
      if (key === '.' && prev.includes('.')) return prev;
      if (key === '.' && prev.length === 0) return '0.';
      if (prev === '0' && key !== '.') return key;
      return `${prev}${key}`;
    });
  };

  const applyQuickCash = (value: number) => {
    setCashInput(value.toFixed(0));
  };

  const saveCurrentOrder = () => {
    if (cart.length === 0) return;
    const snapshot: SavedOrder = {
      id: `SO-${Date.now().toString().slice(-8)}`,
      cart: cart.map((item) => ({ ...item })),
      paymentMethod,
      cashInput,
      createdAt: new Date().toLocaleString(),
    };
    setSavedOrders((prev) => [snapshot, ...prev].slice(0, 20));
    setCart([]);
    setCashInput('');
    setShowMobileCart(false);
    setShowSettlement(false);
  };

  const restoreLatestOrder = () => {
    setSavedOrders((prev) => {
      if (prev.length === 0) return prev;
      const [latest, ...rest] = prev;
      setCart(latest.cart.map((item) => ({ ...item })));
      setPaymentMethod(latest.paymentMethod);
      setCashInput(latest.cashInput);
      setShowMobileCart(false);
      return rest;
    });
  };

  useEffect(() => {
    if (!showSettlement) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        setShowSettlement(false);
        return;
      }
      if (paymentMethod !== 'CASH') {
        if (event.key === 'Enter') {
          event.preventDefault();
          finalizeCheckout();
        }
        return;
      }
      const key = event.key;
      if (/^[0-9]$/.test(key) || key === '.' || key === 'Backspace' || key === 'Delete' || key === 'Enter') {
        event.preventDefault();
      }
      if (/^[0-9]$/.test(key)) {
        applyCashKey(key);
      } else if (key === '.') {
        applyCashKey('.');
      } else if (key === 'Backspace' || key === 'Delete') {
        applyCashKey('del');
      } else if (key === 'Enter') {
        finalizeCheckout();
      }
    };
    window.addEventListener('keydown', onKeyDown, true);
    return () => window.removeEventListener('keydown', onKeyDown, true);
  }, [showSettlement, paymentMethod, cashInput, total, isSettleReady]);

  const finalizeCheckout = () => {
    if (!isSettleReady || cart.length === 0) return;
    if (accountId) {
      const nextInventory = { ...inventoryMap };
      for (const item of cart) {
        const current = nextInventory[item.id] ?? item.stock;
        nextInventory[item.id] = Math.max(0, current - item.quantity);
      }
      setInventoryMap(nextInventory);
      void setRetailInventoryMap(accountId, nextInventory);
      recordPosSale(accountId, {
        amount: total,
        paymentMethod,
        itemCount: cart.length,
      });
    }

    setReceiptResult({
      paidAmount,
      changeAmount,
      receiptNo: `RC-${Date.now().toString().slice(-6)}`,
      printedAt: new Date().toLocaleString(),
    });
    setShowSettlement(false);
    setShowReceipt(true);
  };

  return (
      <div className="flex flex-col xl:grid xl:grid-cols-[minmax(0,1fr)_360px] 2xl:grid-cols-[minmax(0,1fr)_400px] gap-4 sm:gap-6 xl:h-[calc(100dvh-8.5rem)] xl:overflow-hidden">
      {/* 1. Product Selection Area */}
      <div className="flex-1 min-w-0 min-h-0 flex flex-col gap-4 sm:gap-6">
        <div className="ui-card bg-white rounded-[24px] sm:rounded-[32px] border border-slate-200 shadow-sm p-4 sm:p-5 lg:p-6">
          <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-3 mb-3 sm:mb-4">
            <div>
              <h2 className="text-xl sm:text-2xl font-black text-slate-900 leading-none">精选商品</h2>
              <p className="text-[10px] sm:text-xs font-semibold text-slate-500 mt-1">当前分类共 24 个商品</p>
            </div>
            <div className="flex items-center gap-1.5">
              <button className="ui-btn px-3.5 h-10 rounded-xl bg-white border border-slate-200 text-slate-600 text-xs font-black inline-flex items-center gap-1.5">
                <span className="inline-block w-3 h-3 rounded-sm border border-slate-400" /> 筛选
              </button>
              <button className="ui-btn px-3.5 h-10 rounded-xl bg-white border border-slate-200 text-slate-600 text-xs font-black inline-flex items-center gap-1.5">
                <span className="inline-block w-3 h-3 rounded-sm border border-slate-400" /> 排序
              </button>
            </div>
          </div>
          <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar">
            {categoryTabs.map((cat) => (
              <button
                key={cat}
                onClick={() => {
                  setSelectedCategory(cat);
                  if (accountId) {
                    void patchAccountProgramSettings(accountId, { retailPosCategory: cat });
                  }
                }}
                 className={`px-2.5 sm:px-3.5 py-2 rounded-xl text-[10px] sm:text-xs font-black tracking-widest whitespace-nowrap transition-all ${
                  selectedCategory === cat
                    ? 'bg-[#1a237e] text-white border-[#1a237e] shadow-lg shadow-[#1a237e]/10'
                    : 'bg-white text-slate-500 border-slate-200 hover:bg-slate-50'
                }`}
              >
                <span>{cat === 'ALL' ? '全部分类' : (categoryMap[cat] || cat)}</span>
                <span className={`ml-2 inline-flex min-w-5 h-5 px-1 items-center justify-center rounded-full text-[9px] ${
                  selectedCategory === cat ? 'bg-white/20 text-white' : 'bg-white text-slate-500'
                }`}>
                  {categoryCounts[cat] || 0}
                </span>
              </button>
            ))}
          </div>
        </div>

        <div className="ui-card bg-white rounded-2xl border border-slate-200 shadow-sm p-3 sm:p-4 space-y-3">
          <div className="flex items-center gap-2">
                  <div className="relative flex-1">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                ref={searchInputRef}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleSearchAdd();
                }}
                onBlur={() => {
                  if (autoFocusScan) focusScanInput();
                }}
                placeholder="搜索商品 / 条码"
                className="w-full h-10 rounded-xl border border-slate-200 bg-white pl-9 pr-3 text-sm outline-none focus:border-[#1a237e]"
              />
            </div>
              <button
                onClick={handleSearchAdd}
                className="ui-btn px-3 h-10 rounded-xl bg-[#1a237e] text-white text-xs font-black whitespace-nowrap"
              >
              添加
              </button>
            <button
              onClick={() => {
                setScannerEnabled((v) => !v);
                setScannerHint(scannerEnabled ? '红外扫码已关闭' : '红外扫码已开启');
              }}
              className={`ui-btn px-3 h-10 rounded-xl text-xs font-black whitespace-nowrap ${
                scannerEnabled ? 'bg-white text-[#1a237e] border border-[#1a237e]' : 'bg-slate-100 text-slate-600'
              }`}
            >
              <span className="inline-flex items-center gap-1"><ScanLine size={14} />红外扫码</span>
            </button>
            <button
              onClick={() => {
                const next = !autoFocusScan;
                setAutoFocusScan(next);
                setScannerHint(next ? '自动聚焦扫码输入' : '已关闭自动聚焦');
                if (next) focusScanInput();
              }}
              className={`ui-btn px-3 h-10 rounded-xl text-xs font-black whitespace-nowrap ${
                autoFocusScan ? 'bg-white text-[#1a237e] border border-[#1a237e]' : 'bg-slate-100 text-slate-600'
              }`}
            >
              自动聚焦
            </button>
          </div>
          <div className="text-[10px] font-black text-slate-500">{scannerHint}</div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 2xl:grid-cols-5 gap-x-2 gap-y-3 overflow-y-auto xl:flex-1 xl:min-h-0 pr-1 sm:pr-2 custom-scrollbar">
           {filteredProducts.map(product => (
              <motion.div 
                key={product.id}
                whileHover={{ y: -4 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => addToCart(product)}
                className="ui-card bg-white rounded-[20px] sm:rounded-[28px] p-2 sm:p-2.5 border border-slate-100 shadow-sm hover:shadow-xl hover:border-[#dbe7ff] cursor-pointer transition-all group relative overflow-hidden h-[168px] sm:h-[176px] flex flex-col"
              >
               <div className="bg-white rounded-2xl mb-1 overflow-hidden relative h-[98px] sm:h-[104px] shrink-0">
                   {product.imageUrl ? (
                     <img src={product.imageUrl} alt={product.title} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" />
                   ) : (
                     <div className="w-full h-full flex items-center justify-center text-slate-300">
                        <Package size={48} />
                     </div>
                   )}
                     <div className="absolute top-2 right-2 bg-white/95 backdrop-blur px-2 py-1 rounded-lg text-[9px] font-black uppercase text-slate-500 border border-slate-200">
                        {'\u5e93\u5b58'} {product.stock}
                     </div>
                     <div className="absolute bottom-2 right-2 bg-[#1a237e] text-white px-2.5 py-1 rounded-lg text-[10px] font-black shadow-lg shadow-[#1a237e]/15">
                        {formatVT(150)}
                     </div>
                  </div>
                  <div className="pt-0 h-[42px] sm:h-[46px] flex items-center">
                     <div className="w-full text-[11px] font-black text-slate-800 line-clamp-2 leading-tight overflow-hidden">{product.title}</div>
                  </div>
                 <div className="absolute inset-0 bg-white/0 group-hover:bg-[#1a237e]/5 transition-colors" />
              </motion.div>
           ))}
        </div>
      </div>

      {/* 2. Modern Checkout Cart Area */}
      <div className="hidden xl:flex w-full min-h-0 flex-col gap-4 sm:gap-6">
           <div className="ui-card bg-white rounded-[24px] sm:rounded-[40px] p-4 sm:p-6 lg:p-8 text-slate-900 flex-1 min-h-0 flex flex-col shadow-sm relative overflow-hidden border border-slate-200">
            <div className="absolute top-0 right-0 w-64 h-64 bg-[#eef4ff] blur-[100px] rounded-full -mr-32 -mt-32" />
            
             <div className="flex items-center justify-between mb-5 sm:mb-8 relative gap-3">
                <div className="flex items-center gap-3">
                   <div className="w-10 h-10 bg-[#1a237e] rounded-2xl flex items-center justify-center shadow-lg shadow-slate-200 text-white">
                      <ShoppingCart size={20} />
                </div>
                <div>
                  <h3 className="text-lg sm:text-xl font-black uppercase tracking-tighter">当前订单</h3>
                </div>
                </div>
                <button className="text-[10px] font-black uppercase tracking-widest text-rose-500 hover:underline" onClick={() => setCart([])}>
                   全部清空
                </button>
             </div>

             <div className="flex-1 overflow-y-auto pr-1.5 custom-scrollbar relative">
                <AnimatePresence>
                   {cart.length === 0 ? (
                     <div className="h-full flex flex-col items-center justify-center text-slate-500 space-y-4 opacity-50 bg-white rounded-[28px] border border-dashed border-slate-200">
                        <Receipt size={64} className="stroke-[1px] text-[#1a237e]" />
                     <div className="text-[10px] font-black uppercase tracking-[0.2em]">购物车为空</div>
                     </div>
                   ) : (
                     <div className="overflow-hidden rounded-[22px] border border-slate-200 bg-white shadow-sm">
                       <table className="w-full table-fixed border-collapse">
                         <thead className="sticky top-0 z-[1] bg-white">
                           <tr className="border-b border-slate-200 text-[10px] font-black uppercase tracking-widest text-slate-400">
                             <th className="w-[44%] px-3 py-2 text-left">商品</th>
                             <th className="w-[22%] px-2 py-2 text-center">数量</th>
                             <th className="w-[24%] px-2 py-2 text-right">小计</th>
                             <th className="w-[10%] px-2 py-2 text-center">删</th>
                           </tr>
                         </thead>
                         <tbody>
                           {cart.map((item) => (
                             <motion.tr
                               initial={{ opacity: 0, x: 20 }}
                               animate={{ opacity: 1, x: 0 }}
                               exit={{ opacity: 0, scale: 0.95 }}
                               key={item.id}
                               className="border-b border-slate-100 last:border-b-0"
                             >
                               <td className="px-3 py-3 align-top">
                                 <div className="min-w-0">
                                   <div className="truncate text-[12px] sm:text-sm font-black text-slate-900 leading-tight">{item.title}</div>
                                   <div className="mt-1 text-[10px] font-semibold text-slate-400">{formatVT(150)} / 件</div>
                                 </div>
                               </td>
                               <td className="px-2 py-3 align-middle">
                                 <div className="flex items-center justify-center gap-1">
                                   <button
                                     onClick={() => updateQuantity(item.id, -1)}
                                     className="w-5 h-5 !min-h-0 aspect-square p-0 rounded-sm bg-slate-100 hover:bg-[#f4f7ff] flex items-center justify-center text-slate-500 transition-all border border-slate-200 shrink-0"
                                   >
                                     <Minus size={10} />
                                   </button>
                                   <span className="w-5 text-center text-[12px] font-black text-slate-900">{item.quantity}</span>
                                   <button
                                     onClick={() => updateQuantity(item.id, 1)}
                                     className="w-5 h-5 !min-h-0 aspect-square p-0 rounded-sm bg-white hover:bg-[#eef4ff] flex items-center justify-center text-[#1a237e] border border-slate-200 transition-all shrink-0"
                                   >
                                     <Plus size={10} />
                                   </button>
                                 </div>
                               </td>
                               <td className="px-2 py-3 align-middle text-right">
                                 <div className="text-[12px] sm:text-sm font-black text-slate-900 whitespace-nowrap">{formatVT(150 * item.quantity)}</div>
                               </td>
                               <td className="px-2 py-3 align-middle text-center">
                                 <button
                                   onClick={() => removeFromCart(item.id)}
                                   className="inline-flex h-7 w-7 items-center justify-center rounded-lg text-slate-400 hover:bg-[#eef4ff] hover:text-[#1a237e] transition-colors"
                                 >
                                   <Trash2 size={13} />
                                 </button>
                               </td>
                             </motion.tr>
                           ))}
                         </tbody>
                       </table>
                     </div>
                   )}
               </AnimatePresence>
            </div>

              <div className="mt-5 sm:mt-8 pt-5 sm:pt-8 border-t border-slate-200 space-y-2.5 sm:space-y-3 relative">
                 <div className="flex justify-between text-[10px] font-black uppercase tracking-widest text-slate-500">
                  <span>含税小计</span>
                   <span>{formatVT(subtotal)}</span>
                </div>
                <div className="flex justify-between text-[10px] font-black uppercase tracking-widest text-slate-500">
                  <span>增值税 (15%)</span>
                   <span className="text-[#1a237e]">{formatVT(vat)}</span>
                </div>
                 <div className="flex justify-between items-end pt-1.5">
                    <div className="text-xs font-black uppercase text-slate-400">总计</div>
                    <div className="text-3xl font-black text-[#1a237e]">{formatVT(total)}</div>
                 </div>
              </div>
           </div>
 
          <div className="ui-card bg-white rounded-[24px] sm:rounded-[32px] p-4 sm:p-6 border border-slate-200 shadow-sm space-y-3">
             <div className="grid grid-cols-2 gap-2">
                <button
                  className="ui-btn rounded-2xl py-3 bg-white border border-slate-200 text-[#1a237e] font-black"
                  onClick={saveCurrentOrder}
                  disabled={cart.length === 0}
                >
                  保存订单{savedOrders.length > 0 ? `（${savedOrders.length}）` : ''}
                </button>
                <button
                  className="ui-btn rounded-2xl py-3 bg-white border border-slate-200 text-[#1a237e] font-black"
                  onClick={restoreLatestOrder}
                  disabled={savedOrders.length === 0}
                >
                  取回订单{savedOrders.length > 0 ? `（${savedOrders.length}）` : ''}
                </button>
             </div>
              <button
                onClick={handleCheckout}
                disabled={cart.length === 0}
                className={`ui-btn w-full py-5 rounded-[22px] text-base font-black shadow-xl transition-all ${
                  cart.length > 0 ? 'bg-[#1a237e] text-white hover:bg-[#24308f] active:scale-95' : 'bg-slate-100 text-slate-400 cursor-not-allowed'
                }`}
              >
               去结算
             </button>
          </div>      </div>


      {isMobileView && (
        <button
          onClick={() => setShowMobileCart(true)}
          className="fixed right-4 bottom-6 z-[80] w-16 h-16 rounded-full bg-[#1a237e] text-white shadow-2xl shadow-slate-300 flex flex-col items-center justify-center"
        >
          <ShoppingCart size={18} />
          <span className="text-[10px] font-black leading-none mt-1">{cart.length}</span>
        </button>
      )}

      <AnimatePresence>
        {scanToast && (
          <motion.div
            initial={{ y: -20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: -20, opacity: 0 }}
            className="fixed top-20 left-1/2 -translate-x-1/2 z-[85] px-4 py-2 rounded-xl text-sm font-black shadow-lg bg-[#1a237e] text-white"
          >
            {scanToast.text}
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {isMobileView && showMobileCart && (
          <div className="fixed inset-0 z-[90] bg-white/85 backdrop-blur-sm flex items-end sm:items-center justify-center">
            <motion.div
              initial={{ y: 30, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 30, opacity: 0 }}
                className="w-full sm:max-w-lg bg-white rounded-t-3xl sm:rounded-3xl p-4 sm:p-6 space-y-4 max-h-[85dvh] overflow-y-auto shadow-2xl"
            >
              <div className="flex items-center justify-between">
                <div className="text-base font-black text-slate-900">购物车</div>
                <button onClick={() => setShowMobileCart(false)} className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-slate-600">
                  <X size={16} />
                </button>
              </div>

              <div className="space-y-2">
                {cart.length === 0 ? (
                  <div className="text-sm text-slate-500 py-8 text-center">购物车为空</div>
                ) : (
                  cart.map((item) => (
                    <div key={item.id} className="rounded-xl border border-slate-200 p-3 flex items-center gap-3">
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-black text-slate-800 truncate">{item.title}</div>
                        <div className="text-xs text-slate-500">{formatVT(150)} x {item.quantity}</div>
                      </div>
                      <div className="flex items-center gap-2">
                        <button onClick={() => updateQuantity(item.id, -1)} className="w-7 h-7 rounded-lg bg-slate-100 flex items-center justify-center"><Minus size={12} /></button>
                        <span className="text-xs font-black w-4 text-center">{item.quantity}</span>
                        <button onClick={() => updateQuantity(item.id, 1)} className="w-7 h-7 rounded-lg bg-[#1a237e] text-white flex items-center justify-center"><Plus size={12} /></button>
                      </div>
                    </div>
                  ))
                )}
              </div>

          <div className="ui-card bg-white rounded-[24px] sm:rounded-[32px] p-4 sm:p-6 border border-slate-200 shadow-sm space-y-3">
             <div className="grid grid-cols-2 gap-2">
                <button
                  className="ui-btn rounded-2xl py-3 bg-white border border-slate-200 text-[#1a237e] font-black"
                  onClick={saveCurrentOrder}
                  disabled={cart.length === 0}
                >
                  保存订单{savedOrders.length > 0 ? `（${savedOrders.length}）` : ''}
                </button>
                <button
                  className="ui-btn rounded-2xl py-3 bg-white border border-slate-200 text-[#1a237e] font-black"
                  onClick={restoreLatestOrder}
                  disabled={savedOrders.length === 0}
                >
                  取回订单{savedOrders.length > 0 ? `（${savedOrders.length}）` : ''}
                </button>
             </div>

              <button
                onClick={handleCheckout}
                disabled={cart.length === 0}
                className={`ui-btn w-full py-5 rounded-[22px] text-base font-black shadow-xl transition-all ${
                  cart.length > 0 ? 'bg-[#1a237e] text-white hover:bg-[#24308f] active:scale-95' : 'bg-slate-100 text-slate-400 cursor-not-allowed'
                }`}
              >
               去结算
             </button>
          </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* 3. Settlement Modal */}
      <AnimatePresence>
        {showSettlement && (
          <div className="fixed inset-0 z-[95] flex items-center justify-center p-3 sm:p-6 bg-white/85 backdrop-blur-sm">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white w-full max-w-2xl rounded-[24px] sm:rounded-[32px] shadow-2xl p-4 sm:p-6 space-y-4"
            >
              <div className="flex items-center justify-between">
                <h3 className="text-lg sm:text-xl font-black text-slate-900">结算</h3>
                <button
                  onClick={() => setShowSettlement(false)}
                  className="w-9 h-9 rounded-full bg-slate-100 text-slate-600 flex items-center justify-center"
                >
                  <X size={18} />
                </button>
              </div>

              <div className="grid grid-cols-4 gap-2">
                {[
                  { id: 'CASH', label: '现金' },
                  { id: 'CARD', label: '刷卡' },
                  { id: 'CHECK', label: '支票支付' },
                  { id: 'STRET_PAY', label: '电子支付' },
                ].map((method) => (
                  <button
                    key={method.id}
                    onClick={() => {
                      const next = method.id as PaymentMethod;
                      setPaymentMethod(next);
                      if (accountId) {
                        void patchAccountProgramSettings(accountId, { retailPosPayment: next });
                      }
                      if (next !== "CASH") setCashInput("");
                    }}
                    className={`ui-btn rounded-xl py-2 text-[11px] font-black border ${
                      paymentMethod === method.id ? 'bg-[#eef4ff] text-[#1a237e] border-[#dbe7ff] shadow-sm' : 'bg-white text-slate-600 border-slate-200'
                    }`}
                  >
                    {method.label}
                  </button>
                ))}
              </div>

              <div className="rounded-2xl bg-white border border-slate-200 p-4 space-y-2">
                <div className="flex justify-between text-sm font-bold text-slate-600">
                  <span>应收</span>
                  <span>{formatVT(total)}</span>
                </div>
                <div className="flex justify-between text-sm font-bold text-slate-600">
                  <span>实收</span>
                  <span>{formatVT(paidAmount)}</span>
                </div>
                <div className="flex justify-between text-base font-black text-[#1a237e]">
                  <span>找零</span>
                  <span>{formatVT(changeAmount)}</span>
                </div>
              </div>

              {paymentMethod === "CASH" ? (
                <div className="space-y-3">
                  <input
                    type="text"
                    value={cashInput}
                    onChange={(e) => setCashInput(e.target.value.replace(/[^\d.]/g, ""))}
                    placeholder="输入实收金额"
                    className="w-full bg-white border border-slate-200 rounded-xl px-4 py-3 text-base font-black outline-none focus:border-[#dbe7ff]"
                  />
                  <div className="grid grid-cols-4 gap-2">
                    {[7, 8, 9, "del", 4, 5, 6, "clear", 1, 2, 3, ".", 0, "00"].map((key) => (
                      <button
                        key={String(key)}
                        onClick={() => applyCashKey(String(key))}
                        className={`ui-btn rounded-xl py-3 font-black ${
                          key === "clear" || key === "del"
                            ? 'bg-white text-[#1a237e] border border-slate-200'
                            : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                        }`}
                      >
                        {key === "del" ? "⌫" : key === "clear" ? "清空" : key === "00" ? "00" : key}
                      </button>
                    ))}
                  </div>
                  <div className="grid grid-cols-3 gap-2">
                    <button className="ui-btn rounded-xl py-2 bg-slate-100 text-slate-700" onClick={() => applyQuickCash(Math.ceil(total))}>抹整</button>
                    <button className="ui-btn rounded-xl py-2 bg-slate-100 text-slate-700" onClick={() => applyQuickCash(Math.ceil(total / 10) * 10)}>补到10</button>
                    <button className="ui-btn rounded-xl py-2 bg-slate-100 text-slate-700" onClick={() => applyQuickCash(Math.ceil(total / 50) * 50)}>补到50</button>
                  </div>
                  <div className="text-[11px] font-bold text-slate-500">键盘可直接输入数字、退格、回车和小数点，自动同步到虚拟键盘。</div>
                </div>
              ) : (
                <div className="rounded-xl bg-white border border-slate-200 px-4 py-3 text-sm text-[#1a237e] font-bold">
                  当前选择的支付方式不需要输入实收金额，确认后直接完成结算。
                </div>
              )}

              <button
                onClick={finalizeCheckout}
                disabled={!isSettleReady}
                className={`ui-btn w-full rounded-2xl py-4 text-sm font-black ${
                  isSettleReady ? 'bg-[#1a237e] text-white hover:bg-[#24308f]' : 'bg-slate-100 text-slate-400 cursor-not-allowed'
                }`}
              >
                确认结算并生成小票
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* 4. Success MODAL / RECEIPT View */}
      <AnimatePresence>
        {showReceipt && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-3 sm:p-6 bg-white/85 backdrop-blur-sm">
             <motion.div 
               initial={{ scale: 0.9, opacity: 0 }}
               animate={{ scale: 1, opacity: 1 }}
               exit={{ scale: 0.9, opacity: 0 }}
               className={`bg-white w-full ${receiptPaper === '80MM' ? 'max-w-lg' : 'max-w-md'} rounded-[24px] sm:rounded-[48px] overflow-hidden shadow-[0_40px_80px_rgba(26,35,126,0.18)] flex flex-col`}
               style={{ width: receiptPaper === '80MM' ? '80mm' : '58mm', maxWidth: '100%' }}
             >
                <div className="bg-white p-6 sm:p-12 text-center text-slate-900 relative border-b border-slate-200">
                   <button 
                    onClick={() => { setShowReceipt(false); setCart([]); setReceiptResult(null); }}
                    className="absolute top-6 right-6 p-2 bg-slate-100 rounded-full hover:bg-slate-200 transition-all text-slate-600"
                   >
                      <X size={20} />
                   </button>
                   <div className="w-20 h-20 bg-[#1a237e] rounded-[32px] flex items-center justify-center mx-auto mb-6 text-white shadow-2xl">
                      <CheckCircle2 size={40} />
                   </div>
                   <h2 className="text-3xl font-black uppercase tracking-tighter">结算成功！</h2>
                   <p className="text-slate-500 text-xs font-bold uppercase tracking-wider mt-2">
                     {paymentMethod === 'CHECK' ? '支票支付已登记' : `付款成功 · ${paymentLabelMap[paymentMethod]}`}
                   </p>
                   {paymentMethod === 'CHECK' && (
                      <div className="mt-4 bg-[#eef4ff] inline-block px-4 py-2 rounded-xl text-[9px] font-black uppercase tracking-widest text-[#1a237e]">
                         支票：{checkInfo.number} · 电话：{checkInfo.phone}
                      </div>
                   )}
                   <div className="mt-3 text-[10px] font-black uppercase tracking-widest text-slate-500">小票格式 {receiptPaper}</div>
                </div>
                
                <div className="p-5 sm:p-12 space-y-6 sm:space-y-8 flex-1">
                   <div className="rounded-2xl border border-slate-200 bg-white p-4 text-xs font-bold text-slate-600 space-y-2">
                     <div className="flex justify-between"><span>门店账号</span><span>{accountId ?? '--'}</span></div>
                     <div className="flex justify-between"><span>收银员</span><span>{currentShift?.cashierName ?? '未指定'}</span></div>
                     <div className="flex justify-between"><span>班次号</span><span>{currentShift?.id?.slice(-6) ?? '--'}</span></div>
                     <div className="flex justify-between"><span>支付方式</span><span>{paymentLabelMap[paymentMethod]}</span></div>
                   </div>

                   <div className="space-y-4">
                      {cart.map(item => (
                        <div key={item.id} className="flex justify-between items-center py-2 border-b border-dotted border-slate-200">
                           <div className="text-sm font-black text-slate-800">{item.title} <span className="text-slate-400 ml-2">x{item.quantity}</span></div>
                           <div className="text-sm font-black text-slate-600">{formatVT(150 * item.quantity)}</div>
                        </div>
                      ))}
                   </div>

                   <div className="pt-4 space-y-3">
                      <div className="flex justify-between text-xs font-black text-slate-400 uppercase tracking-widest">
                         <span>实收</span>
                         <span>{formatVT(receiptResult?.paidAmount ?? total)}</span>
                      </div>
                      <div className="flex justify-between text-xs font-black text-slate-400 uppercase tracking-widest">
                         <span>找零</span>
                         <span>{formatVT(receiptResult?.changeAmount ?? 0)}</span>
                      </div>
                      <div className="flex justify-between text-xs font-black text-slate-400 uppercase tracking-widest">
                         <span>增值税(15%)</span>
                         <span>{formatVT(vat)}</span>
                      </div>
                      <div className="flex justify-between items-center pt-4 border-t-2 border-slate-100">
                         <div className="text-lg font-black uppercase text-slate-900">应付合计</div>
                         <div className="text-3xl font-black text-[#1a237e]">{formatVT(total)}</div>
                      </div>
                   </div>

                   <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-3 flex items-center gap-3">
                     {taxQrImageUrl ? (
                       <img src={taxQrImageUrl} alt="tax-qr" className="w-16 h-16 rounded border border-slate-200 bg-white" />
                     ) : (
                       <div className="w-16 h-16 rounded border border-slate-200 bg-white flex items-center justify-center text-slate-400 text-[10px] font-bold">
                         QR
                       </div>
                     )}
                     <div className="text-xs">
                       <div className="font-black text-slate-900">税务电子小票码</div>
                       <div className="text-slate-500">
                         {taxQrEnabled ? '扫码进入瓦努阿图税务验真页面' : '后台未启用税务二维码'}
                       </div>
                     </div>
                   </div>

                   <button
                    onClick={() => {
                      document.title = `RECEIPT-${receiptResult?.receiptNo ?? 'POS'}`;
                      window.print();
                    }}
                   className="w-full bg-[#1a237e] text-white py-6 rounded-[32px] font-black text-[10px] uppercase tracking-[0.4em] hover:bg-[#24308f] transition-all shadow-xl shadow-slate-200"
                   >
                      打印小票
                   </button>
                   <div className="text-[10px] text-slate-400 text-center font-bold">
                     单号：{receiptResult?.receiptNo ?? '--'} · {receiptResult?.printedAt ?? '--'}
                   </div>
                </div>
             </motion.div>
          </div>
        )}
      </AnimatePresence>
      </div>
  );
};

export default RetailPOSPage;









