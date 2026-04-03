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
  ScanLine
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

interface RetailPOSPageProps {
  headerSearchQuery?: string;
  accountId?: string;
}

const RetailPOSPage: React.FC<RetailPOSPageProps> = ({ headerSearchQuery, accountId }) => {
  const { t } = useTranslation();
  const zoneNameMap: Record<string, string> = {
    Blue: '\u84dd\u533a',
    Green: '\u7eff\u533a',
    Red: '\u7ea2\u533a',
    Yellow: '\u9ec4\u533a',
  };
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
          setScannerHint(`\u5df2\u626b\u63cf\uff1a${code}`);
          playTone(1240, 90);
          showScanToast('success', `\u626b\u7801\u6210\u529f\uff1a${hit.title}`);
        } else {
          setSearchQuery(code);
          setScannerHint(`\u672a\u5339\u914d\u5546\u54c1\uff1a${code}`);
          playTone(260, 160);
          if (typeof navigator !== 'undefined' && typeof navigator.vibrate === 'function') {
            navigator.vibrate([90, 40, 90]);
          }
          showScanToast('error', `\u672a\u627e\u5230\uff1a${code}`);
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
      setScannerHint('\u672a\u627e\u5230\u5546\u54c1');
      playTone(260, 160);
      if (typeof navigator !== 'undefined' && typeof navigator.vibrate === 'function') {
        navigator.vibrate([90, 40, 90]);
      }
      showScanToast('error', '\u672a\u627e\u5230\u5339\u914d\u5546\u54c1');
      focusScanInput();
      return;
    }
    addToCart(hit);
    setScannerHint(`\u5df2\u6dfb\u52a0\uff1a${hit.title}`);
    playTone(1240, 90);
    showScanToast('success', `\u5df2\u6dfb\u52a0\uff1a${hit.title}`);
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
        <div className="ui-card bg-white rounded-2xl border border-slate-200 shadow-sm p-3 sm:p-4">
          <div className="flex items-center gap-2 overflow-x-auto no-scrollbar">
            {categoryTabs.map((cat) => (
              <button
                key={cat}
                onClick={() => {
                  setSelectedCategory(cat);
                  if (accountId) {
                    void patchAccountProgramSettings(accountId, { retailPosCategory: cat });
                  }
                }}
                className={`px-3 sm:px-4 py-2 rounded-xl text-[10px] sm:text-xs font-black tracking-widest whitespace-nowrap transition-all ${
                  selectedCategory === cat
                    ? 'bg-sky-500 text-white shadow-lg shadow-sky-100'
                    : 'bg-slate-100 text-slate-500 hover:bg-slate-200'
                }`}
              >
                <span>{cat === 'ALL' ? '鍏ㄩ儴鍒嗙被' : (categoryMap[cat] || cat)}</span>
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
                placeholder="\u641c\u7d22\u5546\u54c1/\u626b\u7801\u53f7"
                className="w-full h-10 rounded-xl border border-slate-200 bg-slate-50 pl-9 pr-3 text-sm outline-none focus:border-sky-500"
              />
            </div>
            <button
              onClick={handleSearchAdd}
              className="ui-btn px-3 h-10 rounded-xl bg-sky-500 text-white text-xs font-black whitespace-nowrap"
            >
              \u6dfb\u52a0
            </button>
            <button
              onClick={() => {
                setScannerEnabled((v) => !v);
                setScannerHint(scannerEnabled ? '\u7ea2\u5916\u626b\u7801\u5df2\u5173\u95ed' : '\u7ea2\u5916\u626b\u7801\u5df2\u5f00\u542f');
              }}
              className={`ui-btn px-3 h-10 rounded-xl text-xs font-black whitespace-nowrap ${
                scannerEnabled ? 'bg-emerald-500 text-white' : 'bg-slate-100 text-slate-600'
              }`}
            >
              <span className="inline-flex items-center gap-1"><ScanLine size={14} />\u7ea2\u5916\u626b\u7801</span>
            </button>
            <button
              onClick={() => {
                const next = !autoFocusScan;
                setAutoFocusScan(next);
                setScannerHint(next ? '\u81ea\u52a8\u805a\u7126\u626b\u7801\u8f93\u5165' : '\u5df2\u5173\u95ed\u81ea\u52a8\u805a\u7126');
                if (next) focusScanInput();
              }}
              className={`ui-btn px-3 h-10 rounded-xl text-xs font-black whitespace-nowrap ${
                autoFocusScan ? 'bg-indigo-500 text-white' : 'bg-slate-100 text-slate-600'
              }`}
            >
              \u81ea\u52a8\u805a\u7126
            </button>
          </div>
          <div className="text-[10px] font-black text-slate-500">{scannerHint}</div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:[grid-template-columns:repeat(auto-fill,minmax(220px,1fr))] gap-3 sm:gap-4 overflow-y-auto xl:flex-1 xl:min-h-0 pr-1 sm:pr-2 custom-scrollbar">
           {filteredProducts.map(product => (
             <motion.div 
               key={product.id}
               whileHover={{ y: -4 }}
               whileTap={{ scale: 0.95 }}
               onClick={() => addToCart(product)}
               className="ui-card bg-white rounded-[20px] sm:rounded-[32px] p-3 sm:p-4 border border-slate-100 shadow-sm hover:shadow-xl hover:border-sky-200 cursor-pointer transition-all group relative overflow-hidden min-h-[250px]"
             >
                <div className="aspect-square bg-slate-50 rounded-2xl mb-4 overflow-hidden relative">
                   {product.imageUrl ? (
                     <img src={product.imageUrl} alt={product.title} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" />
                   ) : (
                     <div className="w-full h-full flex items-center justify-center text-slate-300">
                        <Package size={48} />
                     </div>
                   )}
                   <div className="absolute top-2 right-2 bg-white/90 backdrop-blur px-2 py-1 rounded-lg text-[9px] font-black uppercase text-slate-500">
                      {'\u5e93\u5b58'} {product.stock}
                   </div>
                </div>
                <div className="space-y-1">
                   <div className="text-[10px] font-black text-sky-500 uppercase tracking-widest">{zoneNameMap[product.zoneColor] || product.zoneColor}</div>
                   <div className="text-sm font-black text-slate-800 line-clamp-1">{product.title}</div>
                   <div className="text-lg font-black text-slate-900 mt-2">{formatVT(150)}</div>
                </div>
                <div className="absolute inset-0 bg-sky-500/0 group-hover:bg-sky-500/5 transition-colors" />
             </motion.div>
           ))}
        </div>
      </div>

      {/* 2. Modern Checkout Cart Area */}
      <div className="hidden xl:flex w-full min-h-0 flex-col gap-4 sm:gap-6">
         <div className="ui-panel bg-slate-900 rounded-[24px] sm:rounded-[40px] p-4 sm:p-6 lg:p-8 text-white flex-1 min-h-0 flex flex-col shadow-2xl relative overflow-hidden">
            <div className="absolute top-0 right-0 w-64 h-64 bg-sky-500/10 blur-[100px] rounded-full -mr-32 -mt-32" />
            
            <div className="flex items-center justify-between mb-5 sm:mb-8 relative gap-3">
               <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-sky-500 rounded-2xl flex items-center justify-center shadow-lg shadow-sky-500/20">
                     <ShoppingCart size={20} />
               </div>
               <h3 className="text-xl font-black uppercase tracking-tighter">{'\u8d2d\u7269\u8f66'}</h3>
               </div>
               <span className="bg-white/10 text-[10px] font-black px-2.5 py-1 rounded-full uppercase tracking-widest text-sky-400 whitespace-nowrap">
                  {cart.length} {t('items')}
               </span>
            </div>

            <div className="flex-1 overflow-y-auto space-y-4 pr-2 custom-scrollbar relative">
               <AnimatePresence>
                  {cart.length === 0 ? (
                    <div className="h-full flex flex-col items-center justify-center text-slate-500 space-y-4 opacity-50">
                       <Receipt size={64} className="stroke-[1px]" />
                       <div className="text-[10px] font-black uppercase tracking-[0.2em]">{t('cartEmpty')}</div>
                    </div>
                  ) : (
                    cart.map(item => (
                      <motion.div 
                        initial={{ opacity: 0, x: 20 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, scale: 0.9 }}
                        key={item.id} 
                        className="bg-white/5 p-4 rounded-2xl border border-white/10 flex items-center gap-4 group"
                      >
                         <div className="w-12 h-12 rounded-xl bg-slate-800 overflow-hidden shrink-0 border border-white/5">
                            {item.imageUrl && <img src={item.imageUrl} className="w-full h-full object-cover" />}
                         </div>
                         <div className="flex-1 min-w-0">
                            <div className="text-xs font-black truncate">{item.title}</div>
                            <div className="text-[10px] text-slate-500 font-bold">{formatVT(150)} 脳 {item.quantity}</div>
                         </div>
                         <div className="flex items-center gap-2">
                            <button 
                              onClick={() => updateQuantity(item.id, -1)}
                              className="w-6 h-6 rounded-lg bg-white/5 hover:bg-white/10 flex items-center justify-center text-slate-400 transition-all"
                            >
                               <Minus size={12} />
                            </button>
                            <span className="text-xs font-black w-4 text-center">{item.quantity}</span>
                            <button 
                              onClick={() => updateQuantity(item.id, 1)}
                              className="w-6 h-6 rounded-lg bg-sky-500 hover:bg-sky-400 flex items-center justify-center text-white shadow-lg shadow-sky-500/20 transition-all"
                            >
                               <Plus size={12} />
                            </button>
                            <button 
                              onClick={() => removeFromCart(item.id)}
                              className="ml-2 text-rose-500 opacity-0 group-hover:opacity-100 transition-opacity"
                            >
                               <Trash2 size={14} />
                            </button>
                         </div>
                      </motion.div>
                    ))
                  )}
               </AnimatePresence>
            </div>

            <div className="mt-5 sm:mt-8 pt-5 sm:pt-8 border-t border-white/10 space-y-3 sm:space-y-4 relative">
               <div className="flex justify-between text-[10px] font-black uppercase tracking-widest text-slate-500">
                  <span>{t('subtotal')}</span>
                  <span>{formatVT(subtotal)}</span>
               </div>
               <div className="flex justify-between text-[10px] font-black uppercase tracking-widest text-slate-500">
                  <span>{t('vat15')}</span>
                  <span className="text-amber-400">+{formatVT(vat)}</span>
               </div>
               <div className="flex justify-between items-end pt-2">
                  <div className="text-xs font-black uppercase text-slate-400">{t('grandTotal')}</div>
                  <div className="text-3xl font-black text-white">{formatVT(total)}</div>
               </div>
            </div>
         </div>

         {/* Payment Selection */}
         <div className="ui-card bg-white rounded-[24px] sm:rounded-[32px] p-4 sm:p-6 border border-slate-200 shadow-sm space-y-4">
            <div className="text-[10px] font-black uppercase text-slate-400 tracking-widest px-2">{t('selectPayment')}</div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5">
               {[
                 { id: 'CASH', label: t('cash'), icon: Wallet },
                 { id: 'CARD', label: t('card'), icon: CreditCard },
                 { id: 'CHECK', label: '鏀エ鏀粯', icon: Receipt },
                 { id: 'STRET_PAY', label: t('stretPay'), icon: CheckCircle2 },
               ].map(method => (
                 <button 
                 key={method.id}
                  onClick={() => {
                    const next = method.id as 'CASH' | 'CARD' | 'STRET_PAY' | 'CHECK';
                    setPaymentMethod(next);
                    if (accountId) {
                      void patchAccountProgramSettings(accountId, { retailPosPayment: next });
                    }
                  }}
                  className={`flex flex-col items-center gap-1 py-2 sm:py-2.5 rounded-xl border transition-all ${
                    paymentMethod === method.id ? 'border-sky-500 bg-sky-50 text-sky-600 shadow-lg shadow-sky-100' : 'border-slate-50 bg-slate-50 text-slate-400'
                  }`}
                 >
                    <method.icon size={14} />
                    <span className="text-[9px] font-black uppercase tracking-tight">{method.label}</span>
                 </button>
               ))}
            </div>

            {/* CHECK SPECIFIC FIELDS */}
            <AnimatePresence>
               {paymentMethod === 'CHECK' && (
                 <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="space-y-3 overflow-hidden">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                       <input 
                         type="text" 
                         placeholder="杈撳叆鏀エ鍙风爜..." 
                         className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-[11px] font-bold outline-none focus:border-sky-500 transition-all"
                         value={checkInfo.number}
                         onChange={(e) => setCheckInfo({...checkInfo, number: e.target.value})}
                       />
                       <input 
                         type="text" 
                         placeholder="鑱旂郴鐢佃瘽鍙风爜..." 
                         className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-[11px] font-bold outline-none focus:border-sky-500 transition-all"
                         value={checkInfo.phone}
                         onChange={(e) => setCheckInfo({...checkInfo, phone: e.target.value})}
                       />
                    </div>
                 </motion.div>
               )}
            </AnimatePresence>
            
            <button 
              onClick={handleCheckout}
              disabled={cart.length === 0}
              className={`ui-btn w-full py-5 sm:py-6 rounded-3xl text-xs uppercase tracking-[0.2em] sm:tracking-[0.3em] shadow-xl transition-all ${
                cart.length > 0 ? 'bg-sky-500 text-white hover:bg-sky-600 active:scale-95' : 'bg-slate-100 text-slate-400 cursor-not-allowed'
              }`}
            >
               {t('orderAndPrint')}
            </button>
         </div>

      </div>

      {isMobileView && (
        <button
          onClick={() => setShowMobileCart(true)}
          className="fixed right-4 bottom-6 z-[80] w-16 h-16 rounded-full bg-sky-500 text-white shadow-2xl shadow-sky-500/40 flex flex-col items-center justify-center"
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
            className={`fixed top-20 left-1/2 -translate-x-1/2 z-[85] px-4 py-2 rounded-xl text-sm font-black shadow-lg ${
              scanToast.type === 'success' ? 'bg-emerald-500 text-white' : 'bg-rose-500 text-white'
            }`}
          >
            {scanToast.text}
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {isMobileView && showMobileCart && (
          <div className="fixed inset-0 z-[90] bg-slate-900/60 backdrop-blur-sm flex items-end sm:items-center justify-center">
            <motion.div
              initial={{ y: 30, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 30, opacity: 0 }}
              className="w-full sm:max-w-lg bg-white rounded-t-3xl sm:rounded-3xl p-4 sm:p-6 space-y-4 max-h-[85dvh] overflow-y-auto"
            >
              <div className="flex items-center justify-between">
                <div className="text-base font-black text-slate-900">{'\u8d2d\u7269\u8f66'}</div>
                <button onClick={() => setShowMobileCart(false)} className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-slate-600">
                  <X size={16} />
                </button>
              </div>

              <div className="space-y-2">
                {cart.length === 0 ? (
                  <div className="text-sm text-slate-500 py-8 text-center">{t('cartEmpty')}</div>
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
                        <button onClick={() => updateQuantity(item.id, 1)} className="w-7 h-7 rounded-lg bg-sky-500 text-white flex items-center justify-center"><Plus size={12} /></button>
                      </div>
                    </div>
                  ))
                )}
              </div>

              <div className="grid grid-cols-4 gap-2">
                {[
                  { id: 'CASH', label: t('cash') },
                  { id: 'CARD', label: t('card') },
                  { id: 'CHECK', label: '\u652f\u7968' },
                  { id: 'STRET_PAY', label: 'Stret' },
                ].map((method) => (
                  <button
                    key={method.id}
                    onClick={() => {
                      const next = method.id as PaymentMethod;
                      setPaymentMethod(next);
                      if (accountId) {
                        void patchAccountProgramSettings(accountId, { retailPosPayment: next });
                      }
                    }}
                    className={`ui-btn rounded-xl py-2 text-[11px] font-black border ${
                      paymentMethod === method.id ? 'bg-sky-500 text-white border-sky-500' : 'bg-white text-slate-600 border-slate-200'
                    }`}
                  >
                    {method.label}
                  </button>
                ))}
              </div>

              <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 space-y-1 text-sm">
                <div className="flex justify-between"><span>{t('subtotal')}</span><span>{formatVT(subtotal)}</span></div>
                <div className="flex justify-between"><span>{t('vat15')}</span><span>{formatVT(vat)}</span></div>
                <div className="flex justify-between font-black text-slate-900"><span>{t('grandTotal')}</span><span>{formatVT(total)}</span></div>
              </div>

              <button
                onClick={handleCheckout}
                disabled={cart.length === 0}
                className={`ui-btn w-full rounded-2xl py-4 text-sm font-black ${
                  cart.length > 0 ? 'bg-sky-500 text-white' : 'bg-slate-100 text-slate-400 cursor-not-allowed'
                }`}
              >
                {'\u53bb\u7ed3\u7b97'}
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* 3. Settlement Modal */}
      <AnimatePresence>
        {showSettlement && (
          <div className="fixed inset-0 z-[95] flex items-center justify-center p-3 sm:p-6 bg-slate-900/60 backdrop-blur-sm">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white w-full max-w-xl rounded-[24px] sm:rounded-[32px] shadow-2xl p-4 sm:p-6 space-y-4"
            >
              <div className="flex items-center justify-between">
                <h3 className="text-lg sm:text-xl font-black text-slate-900">缁撶畻</h3>
                <button
                  onClick={() => setShowSettlement(false)}
                  className="w-9 h-9 rounded-full bg-slate-100 text-slate-600 flex items-center justify-center"
                >
                  <X size={18} />
                </button>
              </div>

              <div className="rounded-2xl bg-slate-50 border border-slate-200 p-4 space-y-2">
                <div className="flex justify-between text-sm font-bold text-slate-600">
                  <span>搴旀敹</span>
                  <span>{formatVT(total)}</span>
                </div>
                <div className="flex justify-between text-sm font-bold text-slate-600">
                  <span>瀹炴敹</span>
                  <span>{formatVT(paidAmount)}</span>
                </div>
                <div className="flex justify-between text-base font-black text-emerald-600">
                  <span>鎵鹃浂</span>
                  <span>{formatVT(changeAmount)}</span>
                </div>
              </div>

              {paymentMethod === 'CASH' ? (
                <>
                  <input
                    type="text"
                    value={cashInput}
                    onChange={(e) => setCashInput(e.target.value.replace(/[^\d.]/g, ''))}
                    placeholder="杈撳叆瀹炴敹閲戦"
                    className="w-full bg-white border border-slate-200 rounded-xl px-4 py-3 text-base font-black outline-none focus:border-sky-500"
                  />
                  <div className="grid grid-cols-4 gap-2">
                    {[7, 8, 9, 'del', 4, 5, 6, 'clear', 1, 2, 3, '.', 0].map((key) => (
                      <button
                        key={String(key)}
                        onClick={() => applyCashKey(String(key))}
                        className={`ui-btn rounded-xl py-3 font-black ${
                          key === 'clear'
                            ? 'bg-rose-50 text-rose-600'
                            : key === 'del'
                            ? 'bg-amber-50 text-amber-600'
                            : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                        }`}
                      >
                        {key === 'del' ? '\u232b' : key === 'clear' ? '\u6e05\u7a7a' : key}
                      </button>
                    ))}
                  </div>
                  <div className="grid grid-cols-3 gap-2">
                    <button className="ui-btn rounded-xl py-2 bg-slate-100 text-slate-700" onClick={() => applyQuickCash(Math.ceil(total))}>抹整</button>
                    <button className="ui-btn rounded-xl py-2 bg-slate-100 text-slate-700" onClick={() => applyQuickCash(Math.ceil(total / 10) * 10)}>补到10</button>
                    <button className="ui-btn rounded-xl py-2 bg-slate-100 text-slate-700" onClick={() => applyQuickCash(Math.ceil(total / 50) * 50)}>补到50</button>
                  </div>
                </>
              ) : (
                <div className="rounded-xl bg-sky-50 border border-sky-200 px-4 py-3 text-sm text-sky-700 font-bold">
                  褰撳墠鏀粯鏂瑰紡鏃犻渶杈撳叆瀹炴敹閲戦锛岀‘璁ゅ悗鐩存帴鍑哄皬绁ㄣ€?
                </div>
              )}

              <button
                onClick={finalizeCheckout}
                disabled={!isSettleReady}
                className={`ui-btn w-full rounded-2xl py-4 text-sm font-black ${
                  isSettleReady ? 'bg-sky-500 text-white hover:bg-sky-600' : 'bg-slate-100 text-slate-400 cursor-not-allowed'
                }`}
              >
                纭缁撶畻骞剁敓鎴愬皬绁?
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* 4. Success MODAL / RECEIPT View */}
      <AnimatePresence>
        {showReceipt && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-3 sm:p-6 bg-slate-900/60 backdrop-blur-sm">
             <motion.div 
               initial={{ scale: 0.9, opacity: 0 }}
               animate={{ scale: 1, opacity: 1 }}
               exit={{ scale: 0.9, opacity: 0 }}
               className={`bg-white w-full ${receiptPaper === '80MM' ? 'max-w-lg' : 'max-w-md'} rounded-[24px] sm:rounded-[48px] overflow-hidden shadow-[0_40px_80px_rgba(0,0,0,0.5)] flex flex-col`}
               style={{ width: receiptPaper === '80MM' ? '80mm' : '58mm', maxWidth: '100%' }}
             >
                <div className="bg-sky-500 p-6 sm:p-12 text-center text-white relative">
                   <button 
                    onClick={() => { setShowReceipt(false); setCart([]); setReceiptResult(null); }}
                    className="absolute top-6 right-6 p-2 bg-white/10 rounded-full hover:bg-white/20 transition-all"
                   >
                      <X size={20} />
                   </button>
                   <div className="w-20 h-20 bg-white rounded-[32px] flex items-center justify-center mx-auto mb-6 text-sky-500 shadow-2xl">
                      <CheckCircle2 size={40} />
                   </div>
                   <h2 className="text-3xl font-black uppercase tracking-tighter">{t('success')}!</h2>
                   <p className="text-sky-100 text-xs font-bold uppercase tracking-wider mt-2 opacity-80">
                     {paymentMethod === 'CHECK' ? '\u652f\u7968\u652f\u4ed8\u5df2\u767b\u8bb0' : `${t('paymentReceived')} ${paymentMethod}`}
                   </p>
                   {paymentMethod === 'CHECK' && (
                      <div className="mt-4 bg-white/10 backdrop-blur inline-block px-4 py-2 rounded-xl text-[9px] font-black uppercase tracking-widest text-white">
                         CHQ: {checkInfo.number} &bull; TEL: {checkInfo.phone}
                      </div>
                   )}
                   <div className="mt-3 text-[10px] font-black uppercase tracking-widest text-white/90">{'\u5c0f\u7968\u683c\u5f0f'} {receiptPaper}</div>
                </div>
                
                <div className="p-5 sm:p-12 space-y-6 sm:space-y-8 flex-1">
                   <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 text-xs font-bold text-slate-600 space-y-2">
                     <div className="flex justify-between"><span>{'\u95e8\u5e97\u8d26\u53f7'}</span><span>{accountId ?? '--'}</span></div>
                     <div className="flex justify-between"><span>{'\u6536\u94f6\u5458'}</span><span>{currentShift?.cashierName ?? '\u672a\u6307\u5b9a'}</span></div>
                     <div className="flex justify-between"><span>{'\u73ed\u6b21\u53f7'}</span><span>{currentShift?.id?.slice(-6) ?? '--'}</span></div>
                     <div className="flex justify-between"><span>{'\u652f\u4ed8\u65b9\u5f0f'}</span><span>{paymentLabelMap[paymentMethod]}</span></div>
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
                         <span>{'\u5b9e\u6536'}</span>
                         <span>{formatVT(receiptResult?.paidAmount ?? total)}</span>
                      </div>
                      <div className="flex justify-between text-xs font-black text-slate-400 uppercase tracking-widest">
                         <span>{'\u627e\u96f6'}</span>
                         <span>{formatVT(receiptResult?.changeAmount ?? 0)}</span>
                      </div>
                      <div className="flex justify-between text-xs font-black text-slate-400 uppercase tracking-widest">
                         <span>{t('vat15')}</span>
                         <span>{formatVT(vat)}</span>
                      </div>
                      <div className="flex justify-between items-center pt-4 border-t-2 border-slate-100">
                         <div className="text-lg font-black uppercase text-slate-900">{t('totalPaid')}</div>
                         <div className="text-3xl font-black text-sky-600">{formatVT(total)}</div>
                      </div>
                   </div>

                   <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-3 flex items-center gap-3">
                     {taxQrImageUrl ? (
                       <img src={taxQrImageUrl} alt="tax-qr" className="w-16 h-16 rounded border border-slate-200 bg-white" />
                     ) : (
                       <div className="w-16 h-16 rounded border border-slate-200 bg-slate-50 flex items-center justify-center text-slate-400 text-[10px] font-bold">
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
                    className="w-full bg-slate-900 text-white py-6 rounded-[32px] font-black text-[10px] uppercase tracking-[0.4em] hover:bg-sky-500 transition-all shadow-xl shadow-slate-200"
                   >
                      {t('printReceipt')}
                   </button>
                   <div className="text-[10px] text-slate-400 text-center font-bold">
                     No: {receiptResult?.receiptNo ?? '--'} 路 {receiptResult?.printedAt ?? '--'}
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


