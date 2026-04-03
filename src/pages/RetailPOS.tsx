import React, { useState, useMemo, useEffect } from 'react';
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
  Package
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

interface CartItem extends StretProduct {
  quantity: number;
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
  const [paymentMethod, setPaymentMethod] = useState<'CASH' | 'CARD' | 'STRET_PAY' | 'CHECK'>('CASH');
  const [checkInfo, setCheckInfo] = useState({ number: '', phone: '' });
  const [inventoryMap, setInventoryMap] = useState<Record<string, number>>({});
  useEffect(() => {
    if (typeof headerSearchQuery === 'string') {
      setSearchQuery(headerSearchQuery);
    }
  }, [headerSearchQuery]);

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

  const subtotal = cart.reduce((sum, item) => sum + (150 * item.quantity), 0);
  const vat = subtotal * 0.15;
  const total = subtotal + vat;

  const handleCheckout = () => {
    if (cart.length === 0) return;
    if (accountId) {
      const nextInventory = { ...inventoryMap };
      for (const item of cart) {
        const current = nextInventory[item.id] ?? item.stock;
        nextInventory[item.id] = Math.max(0, current - item.quantity);
      }
      setInventoryMap(nextInventory);
      void setRetailInventoryMap(accountId, nextInventory);
    }
    setShowReceipt(true);
    // Future: Call accountService to record transaction & update stock
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

        <div className="grid grid-cols-2 sm:grid-cols-2 lg:[grid-template-columns:repeat(auto-fill,minmax(220px,1fr))] gap-3 sm:gap-4 overflow-y-auto xl:flex-1 xl:min-h-0 pr-1 sm:pr-2 custom-scrollbar">
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
      <div className="w-full min-h-0 flex flex-col gap-4 sm:gap-6">
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
                            <div className="text-[10px] text-slate-500 font-bold">{formatVT(150)} × {item.quantity}</div>
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
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
               {[
                 { id: 'CASH', label: t('cash'), icon: Wallet },
                 { id: 'CARD', label: t('card'), icon: CreditCard },
                 { id: 'CHECK', label: '支票支付', icon: Receipt },
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
                  className={`flex flex-col items-center gap-2 py-3 sm:py-4 rounded-2xl border-2 transition-all ${
                    paymentMethod === method.id ? 'border-sky-500 bg-sky-50 text-sky-600 shadow-lg shadow-sky-100' : 'border-slate-50 bg-slate-50 text-slate-400'
                  }`}
                 >
                    <method.icon size={18} />
                    <span className="text-[10px] font-black uppercase tracking-tighter">{method.label}</span>
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
                         placeholder="输入支票号码..." 
                         className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-[11px] font-bold outline-none focus:border-sky-500 transition-all"
                         value={checkInfo.number}
                         onChange={(e) => setCheckInfo({...checkInfo, number: e.target.value})}
                       />
                       <input 
                         type="text" 
                         placeholder="联系电话号码..." 
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

      {/* 3. Success MODAL / RECEIPT View */}
      <AnimatePresence>
        {showReceipt && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-3 sm:p-6 bg-slate-900/60 backdrop-blur-sm">
             <motion.div 
               initial={{ scale: 0.9, opacity: 0 }}
               animate={{ scale: 1, opacity: 1 }}
               exit={{ scale: 0.9, opacity: 0 }}
               className="bg-white w-full max-w-md rounded-[24px] sm:rounded-[48px] overflow-hidden shadow-[0_40px_80px_rgba(0,0,0,0.5)] flex flex-col"
             >
                <div className="bg-sky-500 p-6 sm:p-12 text-center text-white relative">
                   <button 
                    onClick={() => { setShowReceipt(false); setCart([]); }}
                    className="absolute top-6 right-6 p-2 bg-white/10 rounded-full hover:bg-white/20 transition-all"
                   >
                      <X size={20} />
                   </button>
                   <div className="w-20 h-20 bg-white rounded-[32px] flex items-center justify-center mx-auto mb-6 text-sky-500 shadow-2xl">
                      <CheckCircle2 size={40} />
                   </div>
                   <h2 className="text-3xl font-black uppercase tracking-tighter">{t('success')}!</h2>
                   <p className="text-sky-100 text-xs font-bold uppercase tracking-wider mt-2 opacity-80">
                     {paymentMethod === 'CHECK' ? '支票支付已登记' : `${t('paymentReceived')} ${paymentMethod}`}
                   </p>
                   {paymentMethod === 'CHECK' && (
                      <div className="mt-4 bg-white/10 backdrop-blur inline-block px-4 py-2 rounded-xl text-[9px] font-black uppercase tracking-widest text-white">
                         CHQ: {checkInfo.number} &bull; TEL: {checkInfo.phone}
                      </div>
                   )}
                </div>
                
                <div className="p-5 sm:p-12 space-y-6 sm:space-y-8 flex-1">
                   <div className="space-y-4">
                      {cart.map(item => (
                        <div key={item.id} className="flex justify-between items-center py-2 border-b border-dotted border-slate-200">
                           <div className="text-sm font-black text-slate-800">{item.title} <span className="text-slate-400 ml-2">×{item.quantity}</span></div>
                           <div className="text-sm font-black text-slate-600">{formatVT(150 * item.quantity)}</div>
                        </div>
                      ))}
                   </div>
                   
                   <div className="pt-4 space-y-3">
                      <div className="flex justify-between text-xs font-black text-slate-400 uppercase tracking-widest">
                         <span>{t('vat15')}</span>
                         <span>{formatVT(vat)}</span>
                      </div>
                      <div className="flex justify-between items-center pt-4 border-t-2 border-slate-100">
                         <div className="text-lg font-black uppercase text-slate-900">{t('totalPaid')}</div>
                         <div className="text-3xl font-black text-sky-600">{formatVT(total)}</div>
                      </div>
                   </div>

                   <button 
                    onClick={() => window.print()}
                    className="w-full bg-slate-900 text-white py-6 rounded-[32px] font-black text-[10px] uppercase tracking-[0.4em] hover:bg-sky-500 transition-all shadow-xl shadow-slate-200"
                   >
                      {t('printReceipt')}
                   </button>
                </div>
             </motion.div>
          </div>
        )}
      </AnimatePresence>
      </div>
  );
};

export default RetailPOSPage;
