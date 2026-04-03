import React, { useState, useMemo } from 'react';
import { 
  FileText, 
  Printer, 
  Download, 
  Send, 
  Calendar, 
  User, 
  Hash,
  ArrowRight,
  TrendingDown,
  Archive,
  Search, 
  Trash2, 
  Plus, 
  Minus, 
  Receipt, 
  CheckCircle2,
  X,
  Package,
  History,
  TrendingUp,
  LayoutGrid,
  Settings,
  Bell,
  Briefcase,
  ChevronRight
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import { formatVT } from '../lib/utils';
import { StretProduct } from '../lib/productLogic';
import { extendedVanuatuProducts, mockCustomers, Customer } from '../lib/mockDataFull';

interface CartItem extends StretProduct {
  quantity: number;
}

interface WholesalePOSProps {
  userAccount?: any;
}

const WholesalePOSPage: React.FC<WholesalePOSProps> = ({ userAccount }) => {
  const { t } = useTranslation();
  const [cart, setCart] = useState<CartItem[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [showInvoice, setShowInvoice] = useState(false);
  const [paymentTerms, setPaymentTerms] = useState<'NET30' | 'DUE_UPON' | 'NET60'>('NET30');
  const [selectedClient, setSelectedClient] = useState<Customer>(mockCustomers[0]);
  const [clientSearchQuery, setClientSearchQuery] = useState('');
  const [showClientDropdown, setShowClientDropdown] = useState(false);
  const [quoteId] = useState(`QT-2024-${Math.floor(Math.random() * 9000) + 1000}`);
  const [validUntil] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() + 30);
    return d.toISOString().split('T')[0];
  });
  const [isSearching, setIsSearching] = useState(false);
  const [showProductBrowser, setShowProductBrowser] = useState(false);
  const [browserSearchQuery, setBrowserSearchQuery] = useState('');

  const productSuggestions = useMemo(() => {
    if (!searchQuery) return [];
    return extendedVanuatuProducts.filter((p: StretProduct) => 
      p.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.barcode.includes(searchQuery)
    ).slice(0, 10);
  }, [searchQuery]);

  const browserSuggestions = useMemo(() => {
    return extendedVanuatuProducts.filter((p: StretProduct) => 
      p.title.toLowerCase().includes(browserSearchQuery.toLowerCase()) ||
      p.barcode.includes(browserSearchQuery)
    ).slice(0, 20);
  }, [browserSearchQuery]);

  const addToCart = (product: StretProduct) => {
    if (cart.find((i: CartItem) => i.id === product.id)) return;
    setCart((prev: CartItem[]) => [...prev, { ...product, quantity: 1 }]);
    setSearchQuery('');
    setIsSearching(false);
  };

  const updateQuantity = (productId: string, value: string) => {
    const num = parseInt(value) || 0;
    setCart((prev: CartItem[]) => prev.map((item: CartItem) => item.id === productId ? { ...item, quantity: Math.max(0, num) } : item));
  };

  const removeItem = (id: string) => setCart((prev: CartItem[]) => prev.filter((i: CartItem) => i.id !== id));

  const casePrice = 1500;
  const subtotal = cart.reduce((sum: number, item: CartItem) => sum + (casePrice * item.quantity), 0);
  const vat = subtotal * 0.15;
  const total = subtotal + vat;

  return (
    <div className="w-full space-y-4 sm:space-y-6 pb-20 sm:pb-28 lg:pb-32 pt-0 font-['Inter']">
      {/* RESTORED B2B HEADER (Original Style) */}
      <div className="ui-card bg-white rounded-[24px] sm:rounded-[32px] p-4 sm:p-6 lg:p-8 border border-slate-200 shadow-sm flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-4 sm:gap-6 lg:gap-8">
        <div className="flex items-center gap-5">
          <div className="w-14 h-14 bg-[#0b193c] rounded-2xl flex items-center justify-center text-white shadow-lg ring-4 ring-emerald-50">
            <FileText size={28} />
          </div>
          <div>
            <h1 className="text-2xl font-['Manrope'] font-black uppercase text-[#0b193c] italic leading-none">Quotes & Invoices</h1>
            <div className="flex items-center gap-2 mt-1">
              <span className="text-[10px] font-black text-indigo-500 uppercase tracking-[0.2em]">{quoteId}</span>
              <span className="w-1 h-1 bg-slate-300 rounded-full"></span>
              <span className="text-[10px] font-black text-emerald-500 uppercase tracking-widest italic">Maritime Ledger</span>
            </div>
          </div>
        </div>

        <div className="flex-1 max-w-3xl grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4 sm:gap-6">
          <div className="space-y-2">
            <label className="text-[9px] font-black text-slate-400 uppercase tracking-[0.15em] flex items-center gap-2 px-1"><User size={12} /> {t('clientSearch')}</label>
            <select 
              className="w-full bg-slate-50 border border-slate-100 rounded-2xl px-4 py-3 text-[11px] font-bold text-[#0b193c] outline-none focus:ring-2 focus:ring-emerald-500/20 focus:bg-white transition-all shadow-sm cursor-pointer"
              value={selectedClient.id}
              onChange={(e) => {
                const client = mockCustomers.find(c => c.id === e.target.value);
                if (client) setSelectedClient(client);
              }}
            >
              {mockCustomers.map(c => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </div>
          <div className="space-y-2">
            <label className="text-[9px] font-black text-slate-400 uppercase tracking-[0.15em] flex items-center gap-2 px-1"><History size={12} /> Terms</label>
            <select 
              className="w-full bg-slate-50 border border-slate-100 rounded-2xl px-4 py-3 text-[11px] font-bold text-[#0b193c] outline-none focus:ring-2 focus:ring-emerald-500/20 focus:bg-white transition-all shadow-sm cursor-pointer"
              value={paymentTerms}
              onChange={(e) => setPaymentTerms(e.target.value as any)}
            >
              <option value="NET30">NET 30 DAYS</option>
              <option value="DUE_UPON">COD / CASH</option>
              <option value="NET60">NET 60 DAYS</option>
            </select>
          </div>
          <div className="space-y-2">
            <label className="text-[9px] font-black text-slate-400 uppercase tracking-[0.15em] flex items-center gap-2 px-1"><Calendar size={12} /> Expiry</label>
            <div className="w-full bg-slate-50 border border-slate-100 rounded-2xl px-4 py-3 text-[11px] font-black text-rose-500 uppercase italic shadow-sm flex items-center justify-between">
              {validUntil}
              <div className="w-1.5 h-1.5 bg-rose-500 rounded-full animate-pulse"></div>
            </div>
          </div>
        </div>
      </div>
      
      {/* PRINT STYLES FOR A4 PORTRAIT */}
      <style>{`
        @media print {
          @page {
            size: A4 portrait;
            margin: 0;
          }
          body * {
            visibility: hidden;
          }
          #printable-area, #printable-area * {
            visibility: visible;
          }
          #printable-area {
            position: absolute;
            left: 0;
            top: 0;
            width: 210mm;
            height: 297mm;
            padding: 20mm;
            background: white !important;
            box-shadow: none !important;
            border: none !important;
          }
          .no-print {
            display: none !important;
          }
        }
      `}</style>

      <main className="flex-1">
          <div className="grid grid-cols-12 gap-4 sm:gap-6 lg:gap-8 items-start">
            {/* ENLARGED QUOTATION CANVAS */}
            <div className="col-span-12 xl:col-span-8 space-y-4 sm:space-y-6 lg:space-y-8">
              {/* LINE ITEMS TABLE - SPREADSHEET VIBE */}
              <section className="ui-card bg-white rounded-[24px] sm:rounded-[40px] shadow-sm border border-slate-100 overflow-hidden ring-1 ring-slate-100">
                <div className="p-4 sm:p-6 lg:p-10 pb-4 sm:pb-6 flex flex-col md:flex-row justify-between items-start md:items-center gap-4 sm:gap-6">
                  <div className="flex items-center gap-4">
                    <div className="p-3 bg-emerald-50 rounded-2xl text-emerald-600 ring-1 ring-emerald-100"><Archive size={24} /></div>
                    <div>
                         <h3 className="text-xl font-['Manrope'] font-black text-[#0b193c] italic uppercase">Quotation Items</h3>
                         <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-0.5">Maritime Ledger Entry System</p>
                    </div>
                  </div>
                  <div className="relative w-full md:w-72 lg:w-80">
                    <Search className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                    <input 
                      type="text" 
                      placeholder="杈撳叆浜у搧SKU鎴栧叏鍚?.." 
                      className="w-full pl-14 pr-6 py-4 bg-slate-50 border-none rounded-2xl text-[11px] font-bold text-[#0b193c] placeholder:text-slate-400 focus:ring-2 focus:ring-emerald-500 focus:bg-white transition-all outline-none shadow-sm"
                      value={searchQuery}
                      onChange={(e) => { setSearchQuery(e.target.value); setIsSearching(true); }}
                    />
                    {/* AUTO-SUGGEST DROPDOWN */}
                    <AnimatePresence>
                      {isSearching && productSuggestions.length > 0 && (
                        <motion.div initial={{ opacity: 0, y: 5 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} 
                          className="absolute top-full left-0 right-0 mt-3 bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden z-[100]"
                        >
                          {productSuggestions.map((product: StretProduct) => (
                            <div key={product.id} className="p-4 hover:bg-slate-50 cursor-pointer flex items-center justify-between border-b border-slate-100 last:border-0"
                              onClick={() => addToCart(product)}
                            >
                              <div className="flex items-center gap-3">
                                <div className="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center text-slate-300 overflow-hidden text-[8px] font-black uppercase italic">IMG</div>
                                <div>
                                  <div className="text-[10px] font-black text-[#0b193c] uppercase italic truncate max-w-[140px]">{product.title}</div>
                                  <div className="text-[8px] font-bold text-slate-400">SKU: {product.barcode}</div>
                                </div>
                              </div>
                              <Plus size={14} className="text-emerald-500" />
                            </div>
                          ))}
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                </div>

                <div className="px-4 sm:px-6 lg:px-8 pb-6 sm:pb-8 overflow-x-auto">
                  <table className="w-full border-collapse min-w-[620px]">
                    <thead>
                      <tr className="border-b border-slate-100 text-left">
                        <th className="py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest w-[55%]">Description</th>
                        <th className="py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">Qty</th>
                        <th className="py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">Unit VT</th>
                        <th className="py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">Total</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-50">
                      {cart.length === 0 ? (
                        <tr>
                          <td colSpan={4} className="py-24 text-center text-slate-300 text-[10px] font-black italic tracking-widest uppercase">
                            No items in quotation. Search to begin building.
                          </td>
                        </tr>
                      ) : (
                        cart.map((item: CartItem) => (
                          <tr key={item.id} className="group hover:bg-slate-50/50 transition-colors border-b border-slate-100/50">
                            <td className="py-2.5">
                              <p className="text-[13px] font-bold text-[#0b193c] uppercase italic tracking-tight">{item.title}</p>
                              <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest">SKU: {item.barcode}</p>
                            </td>
                            <td className="py-2.5 text-center">
                              <input 
                                type="number" 
                                className="w-14 bg-slate-100 border-none text-center rounded-lg p-1.5 text-xs font-black text-[#0b193c] focus:bg-white focus:ring-1 focus:ring-emerald-500 transition-all outline-none shadow-inner"
                                value={item.quantity}
                                onChange={(e) => updateQuantity(item.id, e.target.value)}
                              />
                            </td>
                            <td className="py-2.5 text-right font-medium text-slate-500 text-xs">{formatVT(casePrice)}</td>
                            <td className="py-2.5 text-right font-black text-[#0b193c] text-xs italic">
                              <div className="flex items-center justify-end gap-3">
                                {formatVT(casePrice * item.quantity)}
                                <button onClick={() => removeItem(item.id)} className="opacity-0 group-hover:opacity-100 p-1 text-slate-200 hover:text-rose-500 transition-all"><Trash2 size={12} /></button>
                              </div>
                            </td>
                          </tr>
                        ))
                      )}
                      {/* ONLY ONE CLICKABLE TRIGGER ROW AS REQUESTED */}
                      <tr key="add-trigger" 
                        onClick={() => setShowProductBrowser(true)}
                        className="group cursor-pointer hover:bg-emerald-50/30 transition-all border-t border-slate-100"
                      >
                        <td colSpan={4} className="py-8">
                          <div className="flex items-center justify-center gap-4 group-hover:scale-105 transition-transform duration-300">
                            <div className="w-10 h-10 bg-emerald-500 rounded-2xl flex items-center justify-center text-white shadow-xl shadow-emerald-200">
                              <Plus size={20} />
                            </div>
                            <div className="text-left">
                              <span className="block font-black italic text-sm uppercase tracking-[0.2em] text-[#0b193c]">
                                + 鐐瑰嚮姝ゅ娣诲姞浜у搧椤圭洰
                              </span>
                              <span className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">OPEN PRODUCT SELECTION CATALOG</span>
                            </div>
                          </div>
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </section>
            </div>

            {/* SUMMARY COLUMN - WIDER */}
            <div className="col-span-12 xl:col-span-4 space-y-4 sm:space-y-6 xl:sticky xl:top-10">
              <div className="ui-panel bg-[#0b193c] p-5 sm:p-8 lg:p-10 rounded-[28px] sm:rounded-[48px] shadow-2xl text-white relative overflow-hidden ring-4 ring-slate-100">
                <div className="absolute inset-0 opacity-[0.03] pointer-events-none" style={{ backgroundImage: 'radial-gradient(circle at 2px 2px, white 1px, transparent 0)', backgroundSize: '16px 16px' }}></div>
                <div className="relative z-10">
                  <p className="text-[10px] font-black text-emerald-400 uppercase tracking-[0.3em] mb-10 italic">Summary</p>
                  <div className="space-y-4 mb-8">
                    <div className="flex justify-between items-center text-xs font-bold text-slate-300 uppercase italic tracking-wider">
                      <span>Subtotal</span>
                      <span>{formatVT(subtotal)}</span>
                    </div>
                    <div className="flex justify-between items-center text-xs font-bold text-slate-300 uppercase italic tracking-wider">
                      <span>VAT (15%)</span>
                      <span>+{formatVT(vat)}</span>
                    </div>
                    <div className="h-px bg-white/10 my-6" />
                    <div className="flex justify-between items-end">
                      <span className="text-[10px] font-black text-emerald-400 uppercase tracking-widest">Total Amount</span>
                      <span className="text-4xl font-['Manrope'] font-bold italic tracking-tighter text-white leading-none">{formatVT(total)}</span>
                    </div>
                  </div>
                  
                  <div className="space-y-3">
                    <button 
                      onClick={() => setShowInvoice(true)}
                      disabled={cart.length === 0}
                      className="w-full py-5 bg-emerald-500 text-[#0b193c] font-black text-xs uppercase tracking-[0.2em] rounded-2xl shadow-xl hover:bg-emerald-400 transition-all flex items-center justify-center gap-3 active:scale-95 disabled:opacity-50"
                    >
                      <Send size={16} /> Generate Quote
                    </button>
                    <button className="w-full py-4 bg-white/10 hover:bg-white/20 text-white font-black text-[10px] uppercase tracking-widest rounded-2xl transition-all flex items-center justify-center gap-3">
                      <Download size={14} /> Preview PDF
                    </button>
                  </div>
                </div>
              </div>

              <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-100">
                <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-4">Stock Health</p>
                <div className="space-y-3">
                  <div className="flex justify-between text-[10px] font-black uppercase tracking-tighter">
                    <span className="text-emerald-600">Reserved</span>
                    <span className="text-slate-400">95%</span>
                  </div>
                  <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden">
                    <div className="w-[95%] h-full bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.3)]"></div>
                  </div>
                </div>
              </div>
            </div>
          </div>
      </main>

      {/* FINAL DOCUMENT MODAL (Maritime Style) */}
      <AnimatePresence>
        {showInvoice && (
          <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-[#0b1a3d]/80 backdrop-blur-md">
            <motion.div initial={{ scale: 0.98, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.98, opacity: 0 }} 
              className="bg-white w-full max-w-5xl h-[90vh] rounded-[48px] overflow-hidden shadow-2xl relative flex flex-col no-print"
            >
              <div className="bg-[#0b193c] p-6 flex justify-between items-center text-white no-print">
                <div className="flex items-center gap-4 text-xs font-black uppercase italic tracking-widest">
                  <Receipt className="text-emerald-400" size={24} /> A4 Document Preview
                </div>
                <button onClick={() => setShowInvoice(false)} className="p-2 hover:bg-white/10 rounded-full transition-all"><X size={24} /></button>
              </div>
              
              <div className="p-8 overflow-y-auto bg-slate-100 flex justify-center no-scrollbar h-full">
                {/* A4 CANVAS */}
                <div id="printable-area" className="bg-white w-[210mm] min-h-[297mm] shadow-2xl p-[20mm] flex flex-col font-['Inter'] relative text-slate-900 border border-slate-200">
                  <div className="flex justify-between items-start mb-16">
                    <div>
                      <div className="flex items-center gap-3 mb-4">
                        <div className="w-10 h-10 bg-[#0b193c] rounded-xl flex items-center justify-center text-white font-black italic text-xl">S</div>
                        <h2 className="text-2xl font-['Manrope'] font-black text-[#0b193c] italic tracking-tighter uppercase">QUOTATION</h2>
                      </div>
                      <div className="text-[10px] font-black text-slate-500 uppercase tracking-widest leading-relaxed">
                        STRET WHOLESALE &bull; VANUATU<br/>
                        PORT VILA WHARF RD<br/>
                        VAT: VN-0033-9 &bull; info@stret.vu
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">REFERENCE NO</div>
                      <div className="text-2xl font-black text-[#0b193c] italic mb-4">{quoteId}</div>
                      <div className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">DATE ISSUED</div>
                      <div className="text-[11px] font-bold text-slate-900">{new Date().toLocaleDateString()}</div>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-12 border-y border-slate-100 py-8 mb-12">
                    <div>
                      <div className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-3">BILL TO / RECIPIENT</div>
                      <div className="text-base font-black text-[#0b193c] uppercase italic mb-1">{selectedClient.name}</div>
                      <div className="text-[10px] text-slate-500 uppercase font-medium">{selectedClient.address}</div>
                      <div className="text-[8px] font-bold text-slate-400 mt-2 uppercase">TEL: {selectedClient.phone} &bull; {selectedClient.email}</div>
                    </div>
                    <div className="text-right">
                      <div className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-3">DOCUMENT TERMS</div>
                      <div className="text-[11px] font-bold text-slate-900 mb-1">{paymentTerms === 'NET30' ? 'Net 30 Days' : paymentTerms === 'DUE_UPON' ? 'Due Upon Receipt' : 'Net 60 Days'}</div>
                      <div className="text-[11px] font-black text-rose-500 uppercase italic">Valid Until: {validUntil}</div>
                    </div>
                  </div>

                  <table className="w-full text-left mb-auto">
                    <thead>
                      <tr className="border-b-2 border-[#0b193c] text-[9px] font-black text-[#0b193c] uppercase tracking-widest">
                        <th className="pb-4 w-12">ITEM</th>
                        <th className="pb-4">DESCRIPTION</th>
                        <th className="pb-4 text-center">QTY</th>
                        <th className="pb-4 text-right">UNIT VT</th>
                        <th className="pb-4 text-right">TOTAL VT</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-50 text-[11px] font-medium text-slate-800">
                      {cart.map((item: CartItem, idx) => (
                        <tr key={item.id}>
                          <td className="py-4 text-slate-400 font-bold">{(idx + 1).toString().padStart(2, '0')}</td>
                          <td className="py-4 font-black">
                            <div className="uppercase italic">{item.title}</div>
                            <div className="text-[8px] font-bold text-slate-400 tracking-wider">SKU: {item.barcode}</div>
                          </td>
                          <td className="py-4 text-center">{item.quantity}</td>
                          <td className="py-4 text-right">{formatVT(casePrice)}</td>
                          <td className="py-4 text-right font-black text-[#0b193c] italic">{formatVT(casePrice * item.quantity)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>

                  <div className="mt-12 pt-8 border-t-[3px] border-[#0b193c]">
                    <div className="flex justify-end gap-16">
                      <div className="text-right space-y-2">
                        <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Subtotal Excl VAT</div>
                        <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest">VAT (15.0%)</div>
                        <div className="text-[11px] font-black text-[#0b193c] uppercase italic pt-2">Grand Total</div>
                      </div>
                      <div className="text-right space-y-2">
                        <div className="text-[11px] font-bold text-slate-900">{formatVT(subtotal)}</div>
                        <div className="text-[11px] font-bold text-slate-900">+{formatVT(vat)}</div>
                        <div className="text-3xl font-['Manrope'] font-black text-[#0b193c] italic tracking-tighter pt-2">{formatVT(total)}</div>
                      </div>
                    </div>
                  </div>

                  <div className="mt-24 text-center">
                    <div className="w-32 h-px bg-slate-200 mx-auto mb-4" />
                    <p className="text-[8px] font-black text-slate-300 uppercase tracking-[0.3em]">Official Maritime Ledger Document</p>
                  </div>
                </div>

                <div className="fixed bottom-10 flex gap-4 no-print">
                  <button onClick={() => window.print()} className="px-10 py-5 bg-[#0b193c] text-white rounded-2xl text-xs font-black uppercase tracking-widest shadow-2xl flex items-center justify-center gap-4 hover:bg-emerald-600 transition-all active:scale-95">
                    <Printer size={18} /> Print A4 PDF
                  </button>
                  <button onClick={() => setShowInvoice(false)} className="px-10 py-5 bg-white text-[#0b193c] border border-slate-200 rounded-2xl text-xs font-black uppercase tracking-widest shadow-xl flex items-center justify-center gap-4 hover:bg-slate-50 transition-all">
                    Close Preview
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
      {/* PRODUCT BROWSER MODAL (Maritime Ledger Style) */}
      <AnimatePresence>
        {showProductBrowser && (
          <div className="fixed inset-0 z-[210] flex items-center justify-center p-6 bg-[#0b1a3d]/90 backdrop-blur-xl">
            <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }} 
              className="bg-white w-full max-w-4xl h-[85vh] rounded-[48px] overflow-hidden shadow-2xl relative flex flex-col border-[4px] border-white/20"
            >
              <div className="bg-[#0b193c] p-5 sm:p-8 lg:p-10 flex justify-between items-center text-white relative">
                <div className="absolute inset-0 opacity-10 pointer-events-none" style={{ backgroundImage: 'radial-gradient(circle at 2px 2px, white 1px, transparent 0)', backgroundSize: '24px 24px' }}></div>
                <div className="relative z-10">
                  <h3 className="text-2xl font-['Manrope'] font-black italic uppercase tracking-tighter flex items-center gap-4">
                    <Package className="text-emerald-400" size={32} /> Warehouse Catalog
                  </h3>
                  <p className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-400 mt-1">Select products to add to quotation</p>
                </div>
                <button onClick={() => setShowProductBrowser(false)} className="p-4 hover:bg-white/10 rounded-full transition-all relative z-10 bg-white/5 shadow-inner"><X size={28} /></button>
              </div>

              <div className="p-8 bg-slate-50 border-b border-slate-200">
                <div className="relative max-w-2xl mx-auto">
                  <Search className="absolute left-6 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
                  <input 
                    autoFocus
                    type="text" 
                    placeholder="Search by Product Name, SKU, or Category..." 
                    className="w-full pl-16 pr-8 py-6 bg-white border-2 border-slate-100 rounded-3xl text-sm font-bold text-[#0b193c] focus:ring-4 focus:ring-emerald-500/10 focus:border-emerald-500 transition-all outline-none shadow-xl"
                    value={browserSearchQuery}
                    onChange={(e) => setBrowserSearchQuery(e.target.value)}
                  />
                </div>
              </div>

              <div className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-10 grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6 bg-slate-50/50">
                {browserSuggestions.map((product: StretProduct) => {
                  const isInCart = cart.find(i => i.id === product.id);
                  return (
                    <div 
                      key={product.id}
                      onClick={() => !isInCart && addToCart(product)}
                      className={`p-6 rounded-[32px] border-2 transition-all flex items-center justify-between group cursor-pointer ${
                        isInCart ? 'bg-slate-100 border-slate-200 opacity-50' : 'bg-white border-white hover:border-emerald-500 hover:shadow-2xl hover:-translate-y-1'
                      }`}
                    >
                      <div className="flex items-center gap-5">
                        <div className="w-16 h-16 rounded-2xl bg-slate-100 flex items-center justify-center text-slate-300 font-black italic text-[10px] overflow-hidden group-hover:bg-emerald-50 group-hover:text-emerald-200 transition-colors">
                          IMG
                        </div>
                        <div>
                          <h4 className="font-['Manrope'] font-black text-[#0b193c] uppercase italic text-sm group-hover:text-emerald-600 transition-colors">{product.title}</h4>
                          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-1">SKU: {product.barcode}</p>
                          <p className="text-[10px] font-bold text-emerald-600 uppercase mt-2">{formatVT(1500)} / Case</p>
                        </div>
                      </div>
                      {isInCart ? (
                        <div className="w-12 h-12 rounded-2xl bg-slate-200 flex items-center justify-center text-slate-400">
                          <CheckCircle2 size={24} />
                        </div>
                      ) : (
                        <div className="w-12 h-12 rounded-2xl bg-slate-50 flex items-center justify-center text-emerald-500 group-hover:bg-emerald-500 group-hover:text-white transition-all shadow-sm">
                          <Plus size={24} />
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
              
              <div className="p-8 bg-white border-t border-slate-100 flex justify-between items-center">
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Showing {browserSuggestions.length} products</p>
                <button 
                  onClick={() => setShowProductBrowser(false)}
                  className="px-10 py-4 bg-[#0b193c] text-white rounded-2xl text-[10px] font-black uppercase tracking-[0.3em] hover:bg-emerald-600 transition-all shadow-xl"
                >
                  Done Selecting
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default WholesalePOSPage;

