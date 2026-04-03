import React, { useState, useEffect } from 'react';
import { 
  Package,
  Plus, 
  Trash2, 
  Scan, 
  ChevronRight, 
  Save, 
  RefreshCcw,
  CheckCircle2
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { CASE_TO_BOTTLE_RATIO, VAT_RATE } from '../lib/constants';
import { formatVT } from '../lib/utils';
import { useTranslation } from 'react-i18next';

interface StockItem {
  id: string;
  sku: string;
  name: string;
  cases: number;
  unitPriceWithVat: number;
}

const SupplierEntryPage: React.FC = () => {
  const { t } = useTranslation();
  const [items, setItems] = useState<StockItem[]>([
    { id: '1', sku: 'VNB-LGR-330', name: 'Vanuatu Lager 330ml', cases: 10, unitPriceWithVat: 5500 }
  ]);
  const [newItem, setNewItem] = useState({ sku: '', name: '', cases: 0, unitPriceWithVat: 0 });
  const [isScanning, setIsScanning] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);

  const addItem = () => {
    if (!newItem.sku || newItem.cases <= 0) return;
    setItems([...items, { ...newItem, id: Date.now().toString() }]);
    setNewItem({ sku: '', name: '', cases: 0, unitPriceWithVat: 0 });
  };

  const removeItem = (id: string) => {
    setItems(items.filter(item => item.id !== id));
  };

  const calculateTotals = () => {
    const totalCases = items.reduce((sum, item) => sum + item.cases, 0);
    const totalBottles = totalCases * CASE_TO_BOTTLE_RATIO;
    const totalGross = items.reduce((sum, item) => sum + (item.cases * item.unitPriceWithVat), 0);
    const vatAmount = totalGross - (totalGross / (1 + VAT_RATE));
    const subtotal = totalGross - vatAmount;

    return { totalCases, totalBottles, totalGross, vatAmount, subtotal };
  };

  const totals = calculateTotals();

  const handleSave = () => {
    setIsSaving(true);
    setTimeout(() => {
      setIsSaving(false);
      setShowSuccess(true);
      setItems([]);
      setTimeout(() => setShowSuccess(false), 3000);
    }, 1500);
  };

  return (
    <div className="max-w-6xl mx-auto pb-12">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Input Form */}
        <div className="lg:col-span-2 space-y-6">
          <div className="ui-card bg-white rounded-3xl p-5 sm:p-8 border border-slate-200 shadow-sm transition-all hover:shadow-md">
            <h2 className="text-xl font-black text-slate-900 mb-6 flex items-center gap-2">
              <span className="w-2 h-6 bg-sky-500 rounded-full" />
              {t('quickIntake')}
            </h2>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mb-6">
              <div className="space-y-2">
                <label className="text-xs font-black text-slate-400 uppercase tracking-widest">{t('skuBarcode')}</label>
                <div className="relative group">
                  <input 
                    type="text" 
                    placeholder={t('scanOrTypeSku')}
                    className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl px-5 py-4 focus:bg-white focus:border-sky-500 transition-all outline-none"
                    value={newItem.sku}
                    onChange={(e) => setNewItem({...newItem, sku: e.target.value})}
                  />
                  <button 
                    onClick={() => setIsScanning(true)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 p-2 bg-slate-200 text-slate-600 rounded-xl hover:bg-sky-500 hover:text-white transition-all group-focus-within:bg-sky-500 group-focus-within:text-white"
                  >
                    <Scan size={20} />
                  </button>
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-xs font-black text-slate-400 uppercase tracking-widest">{t('productName')}</label>
                <input 
                  type="text" 
                  placeholder={t('productNamePlaceholder')}
                  className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl px-5 py-4 focus:bg-white focus:border-sky-500 transition-all outline-none"
                  value={newItem.name}
                  onChange={(e) => setNewItem({...newItem, name: e.target.value})}
                />
              </div>
              <div className="space-y-2">
                <label className="text-xs font-black text-slate-400 uppercase tracking-widest">{t('quantityCases')}</label>
                <div className="relative">
                  <input 
                    type="number" 
                    placeholder="0"
                    className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl px-5 py-4 focus:bg-white focus:border-sky-500 transition-all outline-none font-bold text-lg"
                    value={newItem.cases || ''}
                    onChange={(e) => setNewItem({...newItem, cases: Number(e.target.value)})}
                  />
                  {newItem.cases > 0 && (
                    <div className="absolute right-5 top-1/2 -translate-y-1/2 bg-sky-100 text-sky-600 px-3 py-1 rounded-lg text-xs font-bold">
                       {newItem.cases * CASE_TO_BOTTLE_RATIO} {t('bottles')}
                    </div>
                  )}
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-xs font-black text-slate-400 uppercase tracking-widest">Unit Price (VT w/ VAT)</label>
                <input 
                  type="number" 
                  placeholder="0.00"
                  className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl px-5 py-4 focus:bg-white focus:border-sky-500 transition-all outline-none font-bold text-lg text-emerald-600"
                  value={newItem.unitPriceWithVat || ''}
                  onChange={(e) => setNewItem({...newItem, unitPriceWithVat: Number(e.target.value)})}
                />
              </div>
            </div>

            <button 
              onClick={addItem}
              className="ui-btn ui-btn-primary w-full py-4 rounded-2xl text-lg flex items-center justify-center gap-3 shadow-xl shadow-slate-200"
            >
              <Plus /> Add to List
            </button>
          </div>

          {/* Items Table */}
          <div className="ui-card bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="p-6 border-b border-slate-100 flex items-center justify-between">
              <h3 className="font-black text-slate-800 uppercase tracking-widest text-sm">{t('inventoryLog')}</h3>
              <span className="bg-slate-100 text-slate-600 px-3 py-1 rounded-full text-xs font-black">{items.length} {t('items')}</span>
            </div>
            <div className="overflow-x-auto">
              {items.length === 0 ? (
                <div className="p-20 flex flex-col items-center justify-center text-slate-300">
                  <Package size={64} strokeWidth={1} className="mb-4" />
                  <p className="font-bold">{t('noItemsAdded')}</p>
                </div>
              ) : (
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-100">
                      <th className="px-6 py-4 text-xs font-black text-slate-400 uppercase">{t('product')}</th>
                      <th className="px-6 py-4 text-xs font-black text-slate-400 uppercase text-center">{t('cases')}</th>
                      <th className="px-6 py-4 text-xs font-black text-slate-400 uppercase text-center">{t('bottles')}</th>
                      <th className="px-6 py-4 text-xs font-black text-slate-400 uppercase text-right">{t('totalVT')}</th>
                      <th className="px-6 py-4 text-xs font-black text-slate-400 uppercase text-right">{t('action')}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {items.map((item) => (
                      <tr key={item.id} className="border-b border-slate-50 hover:bg-slate-50 transition-colors">
                        <td className="px-6 py-4">
                          <div className="font-black text-slate-800">{item.name}</div>
                          <div className="text-xs text-slate-400 font-medium">{item.sku}</div>
                        </td>
                        <td className="px-6 py-4 text-center font-bold">{item.cases}</td>
                        <td className="px-6 py-4 text-center font-bold text-sky-500">{item.cases * CASE_TO_BOTTLE_RATIO}</td>
                        <td className="px-6 py-4 text-right font-black text-emerald-600">{formatVT(item.cases * item.unitPriceWithVat)}</td>
                        <td className="px-6 py-4 text-right">
                          <button onClick={() => removeItem(item.id)} className="p-2 text-rose-500 hover:bg-rose-50 rounded-xl transition-all">
                            <Trash2 size={18} />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        </div>

        {/* Totals Summary */}
        <div className="space-y-6">
          <div className="ui-panel bg-slate-900 rounded-[24px] sm:rounded-[32px] p-5 sm:p-8 text-white shadow-2xl shadow-slate-200">
            <h3 className="text-xs font-black text-slate-400 uppercase tracking-[0.2em] mb-8">{t('summaryVatInc')}</h3>
            
            <div className="space-y-6">
              <div className="flex justify-between items-center group">
                <span className="text-slate-400 font-medium">Total Volume</span>
                <div className="text-right">
                  <div className="font-black text-xl">{totals.totalCases} <span className="text-xs text-slate-500">CASES</span></div>
                  <div className="text-sky-400 text-xs font-black tracking-widest">{totals.totalBottles} BOTTLES</div>
                </div>
              </div>
              
              <div className="h-px bg-slate-800" />
              
              <div className="flex justify-between items-center">
                <span className="text-slate-400 font-medium">Subtotal (Net)</span>
                <span className="font-bold text-slate-300">{formatVT(totals.subtotal)}</span>
              </div>
              
              <div className="flex justify-between items-center">
                <span className="text-slate-400 font-medium">VAT (15%)</span>
                <span className="font-bold text-rose-400">{formatVT(totals.vatAmount)}</span>
              </div>
              
              <div className="bg-slate-800/50 -mx-8 px-8 py-6 my-4 border-y border-white/5">
                <div className="flex justify-between items-center">
                  <span className="text-xs font-black uppercase tracking-widest text-sky-400">Total VT</span>
                  <span className="text-3xl font-black text-emerald-400">{formatVT(totals.totalGross)}</span>
                </div>
              </div>
            </div>

            <button 
              onClick={handleSave}
              disabled={items.length === 0 || isSaving}
              className={`ui-btn mt-6 w-full py-5 rounded-2xl text-lg flex items-center justify-center gap-3 transition-all shadow-xl shadow-sky-500/20 ${
                items.length > 0 
                ? 'bg-sky-500 text-white hover:bg-sky-400' 
                : 'bg-slate-800 text-slate-500 cursor-not-allowed'
              }`}
            >
              {isSaving ? (
                <><RefreshCcw className="animate-spin" /> {t('processing')}</>
              ) : (
                <><Save /> {t('commitToVault')}</>
              )}
            </button>
          </div>

          <div className="ui-panel bg-sky-50 border-2 border-dashed border-sky-100 rounded-3xl p-6">
            <h4 className="flex items-center gap-2 text-sky-600 font-black text-sm uppercase tracking-widest mb-3">
              <CheckCircle2 size={16} /> Vanuatu Compliance
            </h4>
            <ul className="text-xs space-y-2 text-sky-700/70 font-medium">
              <li>鈥?Automatically strips 15% VAT for books</li>
              <li>鈥?1 Case = 24 Units conversion standardized</li>
              <li>鈥?Records stored in UTC+11 timestamps</li>
            </ul>
          </div>
        </div>
      </div>

      <AnimatePresence>
        {showSuccess && (
          <motion.div 
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            className="fixed bottom-10 left-1/2 -translate-x-1/2 bg-emerald-500 text-white px-8 py-4 rounded-2xl font-black shadow-2xl z-50 flex items-center gap-3"
          >
            <CheckCircle2 /> {t('inventoryRecordedSuccess')}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default SupplierEntryPage;

