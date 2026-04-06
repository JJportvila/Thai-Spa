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
      {/* 批发开单页头 */}
      <div className="ui-card bg-white rounded-[24px] sm:rounded-[32px] p-4 sm:p-6 lg:p-8 border border-slate-200 shadow-sm flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-4 sm:gap-6 lg:gap-8">
        <div className="flex items-center gap-5">
          <div className="w-14 h-14 bg-[#1a237e] rounded-2xl flex items-center justify-center text-white shadow-lg ring-4 ring-[#eef4ff]">
            <FileText size={28} />
          </div>
          <div>
            <h1 className="text-2xl font-['Manrope'] font-black uppercase text-[#1a237e] italic leading-none">批发报价单</h1>
            <div className="flex items-center gap-2 mt-1">
              <span className="text-[10px] font-black text-[#1a237e] uppercase tracking-[0.2em]">{quoteId}</span>
              <span className="w-1 h-1 bg-slate-300 rounded-full"></span>
              <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest italic">批发业务台账</span>
            </div>
          </div>
        </div>

        <div className="flex-1 max-w-3xl grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4 sm:gap-6">
          <div className="space-y-2">
            <label className="text-[9px] font-black text-slate-400 uppercase tracking-[0.15em] flex items-center gap-2 px-1"><User size={12} /> 客户选择</label>
            <select 
              className="w-full bg-white border border-slate-200 rounded-2xl px-4 py-3 text-[11px] font-bold text-[#1a237e] outline-none focus:ring-2 focus:ring-[#1a237e]/10 focus:bg-white transition-all shadow-sm cursor-pointer"
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
            <label className="text-[9px] font-black text-slate-400 uppercase tracking-[0.15em] flex items-center gap-2 px-1"><History size={12} /> 账期</label>
            <select 
              className="w-full bg-white border border-slate-200 rounded-2xl px-4 py-3 text-[11px] font-bold text-[#1a237e] outline-none focus:ring-2 focus:ring-[#1a237e]/10 focus:bg-white transition-all shadow-sm cursor-pointer"
              value={paymentTerms}
              onChange={(e) => setPaymentTerms(e.target.value as any)}
            >
              <option value="NET30">30天账期</option>
              <option value="DUE_UPON">现结 / 到付</option>
              <option value="NET60">60天账期</option>
            </select>
          </div>
          <div className="space-y-2">
            <label className="text-[9px] font-black text-slate-400 uppercase tracking-[0.15em] flex items-center gap-2 px-1"><Calendar size={12} /> 有效期</label>
            <div className="w-full bg-white border border-slate-200 rounded-2xl px-4 py-3 text-[11px] font-black text-[#1a237e] uppercase italic shadow-sm flex items-center justify-between">
              {validUntil}
 <div className="w-1.5 h-1.5 bg-[#1a237e] rounded-full animate-pulse"></div>
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
              {/* 批发报价区域 */}
            <div className="col-span-12 xl:col-span-8 space-y-4 sm:space-y-6 lg:space-y-8">
              {/* 商品明细表 */}
              <section className="ui-card bg-white rounded-[24px] sm:rounded-[40px] shadow-sm border border-slate-100 overflow-hidden ring-1 ring-slate-100">
                <div className="p-4 sm:p-6 lg:p-10 pb-4 sm:pb-6 flex flex-col md:flex-row justify-between items-start md:items-center gap-4 sm:gap-6">
                  <div className="flex items-center gap-4">
                    <div className="p-3 bg-[#eef4ff] rounded-2xl text-[#1a237e] ring-1 ring-[#dbe7ff]"><Archive size={24} /></div>
                    <div>
                         <h3 className="text-xl font-['Manrope'] font-black text-[#1a237e] italic uppercase">报价商品明细</h3>
                         <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-0.5">批发开单录入</p>
                    </div>
                  </div>
                  <div className="relative w-full md:w-72 lg:w-80">
                    <Search className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                    <input 
                      type="text" 
                      placeholder="请输入商品 SKU、名称或条码..."
                      className="w-full pl-14 pr-6 py-4 bg-white border border-slate-200 rounded-2xl text-[11px] font-bold text-[#1a237e] placeholder:text-slate-400 focus:ring-2 focus:ring-[#1a237e]/10 focus:bg-white transition-all outline-none shadow-sm"
                      value={searchQuery}
                      onChange={(e) => { setSearchQuery(e.target.value); setIsSearching(true); }}
                    />
                    {/* 自动联想下拉 */}
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
                              <div className="text-[10px] font-black text-[#1a237e] uppercase italic truncate max-w-[140px]">{product.title}</div>
                                  <div className="text-[8px] font-bold text-slate-400">条码：{product.barcode}</div>
                                </div>
                              </div>
                              <Plus size={14} className="text-[#1a237e]" />
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
                        <th className="py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest w-[55%]">商品说明</th>
                        <th className="py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">数量</th>
                        <th className="py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">单价</th>
                        <th className="py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">小计</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-50">
                      {cart.length === 0 ? (
                        <tr>
                          <td colSpan={4} className="py-24 text-center text-slate-300 text-[10px] font-black italic tracking-widest uppercase">
                            暂无商品，请先搜索并添加到报价单。
                          </td>
                        </tr>
                      ) : (
                        cart.map((item: CartItem) => (
                          <tr key={item.id} className="group hover:bg-slate-50/50 transition-colors border-b border-slate-100/50">
                            <td className="py-2.5">
                              <p className="text-[13px] font-bold text-[#1a237e] uppercase italic tracking-tight">{item.title}</p>
                              <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest">条码：{item.barcode}</p>
                            </td>
                            <td className="py-2.5 text-center">
                              <input 
                                type="number" 
                                className="w-14 bg-white border border-slate-200 text-center rounded-lg p-1.5 text-xs font-black text-[#1a237e] focus:bg-white focus:ring-1 focus:ring-[#1a237e] transition-all outline-none shadow-inner"
                                value={item.quantity}
                                onChange={(e) => updateQuantity(item.id, e.target.value)}
                              />
                            </td>
                            <td className="py-2.5 text-right font-medium text-slate-500 text-xs">{formatVT(casePrice)}</td>
                            <td className="py-2.5 text-right font-black text-[#0b193c] text-xs italic">
                              <div className="flex items-center justify-end gap-3">
                                {formatVT(casePrice * item.quantity)}
                              <button onClick={() => removeItem(item.id)} className="opacity-0 group-hover:opacity-100 p-1 text-slate-200 hover:text-[#1a237e] transition-all"><Trash2 size={12} /></button>
                            </div>
                            </td>
                          </tr>
                        ))
                      )}
                      {/* ONLY ONE CLICKABLE TRIGGER ROW AS REQUESTED */}
                      <tr key="add-trigger" 
                        onClick={() => setShowProductBrowser(true)}
                        className="group cursor-pointer hover:bg-[#eef4ff] transition-all border-t border-slate-100"
                      >
                        <td colSpan={4} className="py-8">
                          <div className="flex items-center justify-center gap-4 group-hover:scale-105 transition-transform duration-300">
                            <div className="w-10 h-10 bg-[#1a237e] rounded-2xl flex items-center justify-center text-white shadow-xl shadow-[#1a237e]/10">
                              <Plus size={20} />
                            </div>
                            <div className="text-left">
                              <span className="block font-black italic text-sm uppercase tracking-[0.2em] text-[#1a237e]">
                                + 点击此处添加商品
                              </span>
                              <span className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">打开商品选择目录</span>
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
              <div className="ui-card bg-white p-5 sm:p-8 lg:p-10 rounded-[28px] sm:rounded-[48px] shadow-sm text-slate-900 relative overflow-hidden ring-1 ring-slate-200">
                <div className="absolute inset-0 opacity-[0.03] pointer-events-none" style={{ backgroundImage: 'radial-gradient(circle at 2px 2px, #1a237e 1px, transparent 0)', backgroundSize: '16px 16px' }}></div>
                <div className="relative z-10">
                  <p className="text-[10px] font-black text-[#1a237e] uppercase tracking-[0.3em] mb-10 italic">汇总</p>
                  <div className="space-y-4 mb-8">
                    <div className="flex justify-between items-center text-xs font-bold text-slate-500 uppercase italic tracking-wider">
                      <span>含税小计</span>
                      <span>{formatVT(subtotal)}</span>
                    </div>
                    <div className="flex justify-between items-center text-xs font-bold text-slate-500 uppercase italic tracking-wider">
                      <span>增值税（15%）</span>
                      <span>+{formatVT(vat)}</span>
                    </div>
                    <div className="h-px bg-slate-200 my-6" />
                    <div className="flex justify-between items-end">
                      <span className="text-[10px] font-black text-[#1a237e] uppercase tracking-widest">应付总额</span>
                      <span className="text-4xl font-['Manrope'] font-bold italic tracking-tighter text-[#1a237e] leading-none">{formatVT(total)}</span>
                    </div>
                  </div>
                  
                  <div className="space-y-3">
                    <button 
                      onClick={() => setShowInvoice(true)}
                      disabled={cart.length === 0}
                      className="w-full py-5 bg-[#1a237e] text-white font-black text-xs uppercase tracking-[0.2em] rounded-2xl shadow-xl hover:bg-[#24308f] transition-all flex items-center justify-center gap-3 active:scale-95 disabled:opacity-50"
                    >
                      <Send size={16} /> 生成报价单
                    </button>
                    <button className="w-full py-4 bg-white hover:bg-slate-50 text-[#1a237e] font-black text-[10px] uppercase tracking-widest rounded-2xl transition-all flex items-center justify-center gap-3 border border-slate-200">
                      <Download size={14} /> 预览 PDF
                    </button>
                  </div>
                </div>
              </div>

              <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-100">
                <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-4">库存健康</p>
                <div className="space-y-3">
                  <div className="flex justify-between text-[10px] font-black uppercase tracking-tighter">
                    <span className="text-[#1a237e]">已预留</span>
                    <span className="text-slate-400">95%</span>
                  </div>
                  <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden">
                    <div className="w-[95%] h-full bg-[#1a237e] shadow-[0_0_10px_rgba(26,35,126,0.18)]"></div>
                  </div>
                </div>
              </div>
            </div>
          </div>
      </main>

      {/* FINAL DOCUMENT MODAL (Maritime Style) */}
      <AnimatePresence>
        {showInvoice && (
 <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-white/85 backdrop-blur-md">
            <motion.div initial={{ scale: 0.98, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.98, opacity: 0 }} 
              className="bg-white w-full max-w-5xl h-[90vh] rounded-[48px] overflow-hidden shadow-2xl relative flex flex-col no-print"
            >
                <div className="bg-white p-6 flex justify-between items-center text-slate-900 no-print border-b border-slate-200">
                  <div className="flex items-center gap-4 text-xs font-black uppercase italic tracking-widest">
                  <Receipt className="text-[#1a237e]" size={24} /> A4 文档预览
                </div>
                <button onClick={() => setShowInvoice(false)} className="p-2 hover:bg-slate-100 rounded-full transition-all"><X size={24} /></button>
              </div>
              
              <div className="p-8 overflow-y-auto bg-[#f8f9fa] flex justify-center no-scrollbar h-full">
                {/* A4 CANVAS */}
                <div id="printable-area" className="bg-white w-[210mm] min-h-[297mm] shadow-2xl p-[20mm] flex flex-col font-['Inter'] relative text-slate-900 border border-slate-200">
                  <div className="flex justify-between items-start mb-16">
                    <div>
                      <div className="flex items-center gap-3 mb-4">
                        <div className="w-10 h-10 bg-[#1a237e] rounded-xl flex items-center justify-center text-white font-black italic text-xl">S</div>
                        <h2 className="text-2xl font-['Manrope'] font-black text-[#1a237e] italic tracking-tighter uppercase">报价单</h2>
                      </div>
                      <div className="text-[10px] font-black text-slate-500 uppercase tracking-widest leading-relaxed">
                        STRET 批发部 &bull; 瓦努阿图<br/>
                        维拉港码头路<br/>
                        税号：VN-0033-9 &bull; info@stret.vu
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">单据编号</div>
                      <div className="text-2xl font-black text-[#1a237e] italic mb-4">{quoteId}</div>
                      <div className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">开单日期</div>
                      <div className="text-[11px] font-bold text-slate-900">{new Date().toLocaleDateString()}</div>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-12 border-y border-slate-100 py-8 mb-12">
                    <div>
                      <div className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-3">收单客户</div>
                      <div className="text-base font-black text-[#1a237e] uppercase italic mb-1">{selectedClient.name}</div>
                      <div className="text-[10px] text-slate-500 uppercase font-medium">{selectedClient.address}</div>
                      <div className="text-[8px] font-bold text-slate-400 mt-2 uppercase">电话：{selectedClient.phone} &bull; {selectedClient.email}</div>
                    </div>
                    <div className="text-right">
                      <div className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-3">单据条款</div>
                      <div className="text-[11px] font-bold text-slate-900 mb-1">{paymentTerms === 'NET30' ? '30天账期' : paymentTerms === 'DUE_UPON' ? '现结 / 到付' : '60天账期'}</div>
                      <div className="text-[11px] font-black text-[#1a237e] uppercase italic">有效至：{validUntil}</div>
                    </div>
                  </div>

                  <table className="w-full text-left mb-auto">
                    <thead>
                      <tr className="border-b-2 border-[#1a237e] text-[9px] font-black text-[#1a237e] uppercase tracking-widest">
                        <th className="pb-4 w-12">序号</th>
                        <th className="pb-4">商品说明</th>
                        <th className="pb-4 text-center">数量</th>
                        <th className="pb-4 text-right">单价 VT</th>
                        <th className="pb-4 text-right">总价 VT</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-50 text-[11px] font-medium text-slate-800">
                      {cart.map((item: CartItem, idx) => (
                        <tr key={item.id}>
                          <td className="py-4 text-slate-400 font-bold">{(idx + 1).toString().padStart(2, '0')}</td>
                          <td className="py-4 font-black">
                            <div className="uppercase italic">{item.title}</div>
                            <div className="text-[8px] font-bold text-slate-400 tracking-wider">条码：{item.barcode}</div>
                          </td>
                          <td className="py-4 text-center">{item.quantity}</td>
                          <td className="py-4 text-right">{formatVT(casePrice)}</td>
                          <td className="py-4 text-right font-black text-[#1a237e] italic">{formatVT(casePrice * item.quantity)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>

                  <div className="mt-12 pt-8 border-t-[3px] border-[#1a237e]">
                    <div className="flex justify-end gap-16">
                      <div className="text-right space-y-2">
                        <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest">未税小计</div>
                        <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest">增值税（15.0%）</div>
                        <div className="text-[11px] font-black text-[#1a237e] uppercase italic pt-2">应付总额</div>
                      </div>
                      <div className="text-right space-y-2">
                        <div className="text-[11px] font-bold text-slate-900">{formatVT(subtotal)}</div>
                        <div className="text-[11px] font-bold text-slate-900">+{formatVT(vat)}</div>
                        <div className="text-3xl font-['Manrope'] font-black text-[#1a237e] italic tracking-tighter pt-2">{formatVT(total)}</div>
                      </div>
                    </div>
                  </div>

                  <div className="mt-24 text-center">
                    <div className="w-32 h-px bg-slate-200 mx-auto mb-4" />
                    <p className="text-[8px] font-black text-slate-300 uppercase tracking-[0.3em]">正式批发单据</p>
                  </div>
                </div>

                <div className="fixed bottom-10 flex gap-4 no-print">
                  <button onClick={() => window.print()} className="px-10 py-5 bg-[#1a237e] text-white rounded-2xl text-xs font-black uppercase tracking-widest shadow-2xl flex items-center justify-center gap-4 hover:bg-[#24308f] transition-all active:scale-95">
                    <Printer size={18} /> 打印 A4 PDF
                  </button>
                  <button onClick={() => setShowInvoice(false)} className="px-10 py-5 bg-white text-[#1a237e] border border-slate-200 rounded-2xl text-xs font-black uppercase tracking-widest shadow-xl flex items-center justify-center gap-4 hover:bg-slate-50 transition-all">
                    关闭预览
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
 <div className="fixed inset-0 z-[210] flex items-center justify-center p-6 bg-white/85 backdrop-blur-xl">
            <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }} 
              className="bg-white w-full max-w-4xl h-[85vh] rounded-[48px] overflow-hidden shadow-2xl relative flex flex-col border border-slate-200"
            >
              <div className="bg-white p-5 sm:p-8 lg:p-10 flex justify-between items-center text-slate-900 relative border-b border-slate-200">
                <div className="absolute inset-0 opacity-10 pointer-events-none" style={{ backgroundImage: 'radial-gradient(circle at 2px 2px, #1a237e 1px, transparent 0)', backgroundSize: '24px 24px' }}></div>
                <div className="relative z-10">
                  <h3 className="text-2xl font-['Manrope'] font-black italic uppercase tracking-tighter flex items-center gap-4">
                    <Package className="text-[#1a237e]" size={32} /> 商品目录
                  </h3>
                  <p className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-400 mt-1">选择商品加入报价单</p>
                </div>
                <button onClick={() => setShowProductBrowser(false)} className="p-4 hover:bg-slate-100 rounded-full transition-all relative z-10 bg-slate-50 shadow-inner text-slate-600"><X size={28} /></button>
              </div>

              <div className="p-8 bg-[#f8f9fa] border-b border-slate-200">
                <div className="relative max-w-2xl mx-auto">
                  <Search className="absolute left-6 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
                  <input 
                    autoFocus
                    type="text" 
                    placeholder="按商品名、SKU 或分类搜索..." 
                    className="w-full pl-16 pr-8 py-6 bg-white border-2 border-slate-100 rounded-3xl text-sm font-bold text-[#1a237e] focus:ring-4 focus:ring-[#1a237e]/10 focus:border-[#1a237e] transition-all outline-none shadow-xl"
                    value={browserSearchQuery}
                    onChange={(e) => setBrowserSearchQuery(e.target.value)}
                  />
                </div>
              </div>

              <div className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-10 grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6 bg-[#f8f9fa]/50">
                {browserSuggestions.map((product: StretProduct) => {
                  const isInCart = cart.find(i => i.id === product.id);
                  return (
                    <div 
                      key={product.id}
                      onClick={() => !isInCart && addToCart(product)}
                      className={`p-6 rounded-[32px] border-2 transition-all flex items-center justify-between group cursor-pointer ${
                        isInCart ? 'bg-slate-100 border-slate-200 opacity-50' : 'bg-white border-white hover:border-[#1a237e] hover:shadow-2xl hover:-translate-y-1'
                      }`}
                    >
                      <div className="flex items-center gap-5">
                          <div className="w-16 h-16 rounded-2xl bg-slate-100 flex items-center justify-center text-slate-300 font-black italic text-[10px] overflow-hidden group-hover:bg-[#eef4ff] group-hover:text-[#1a237e] transition-colors">
                          图
                        </div>
                        <div>
                          <h4 className="font-['Manrope'] font-black text-[#1a237e] uppercase italic text-sm group-hover:text-[#1a237e] transition-colors">{product.title}</h4>
                          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-1">条码：{product.barcode}</p>
                          <p className="text-[10px] font-bold text-[#1a237e] uppercase mt-2">{formatVT(1500)} / 箱</p>
                        </div>
                      </div>
                      {isInCart ? (
                        <div className="w-12 h-12 rounded-2xl bg-slate-200 flex items-center justify-center text-slate-400">
                          <CheckCircle2 size={24} />
                        </div>
                      ) : (
                        <div className="w-12 h-12 rounded-2xl bg-slate-50 flex items-center justify-center text-[#1a237e] group-hover:bg-[#1a237e] group-hover:text-white transition-all shadow-sm">
                          <Plus size={24} />
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
              
              <div className="p-8 bg-white border-t border-slate-100 flex justify-between items-center">
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">当前显示 {browserSuggestions.length} 个商品</p>
                <button 
                  onClick={() => setShowProductBrowser(false)}
                  className="px-10 py-4 bg-[#1a237e] text-white rounded-2xl text-[10px] font-black uppercase tracking-[0.3em] hover:bg-[#24308f] transition-all shadow-xl"
                >
                  完成选择
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


