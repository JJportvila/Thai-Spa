import React, { useState } from 'react';
import { 
  History, 
  ArrowDownLeft, 
  ArrowUpRight, 
  Maximize2, 
  Filter, 
  Search, 
  Calendar,
  Box,
  Truck,
  User,
  MoreVertical,
  Download
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import { formatVT } from '../lib/utils';
import { extendedVanuatuProducts } from '../lib/mockDataFull';
import { getFullLocation } from '../lib/productLogic';

interface InventoryTransaction {
  id: string;
  productId: string;
  type: 'IN' | 'OUT' | 'ADJUST';
  quantity: number;
  user: string;
  timestamp: string;
  ref: string; // Order # or Batch #
}

const WarehouseManagementPage: React.FC = () => {
  const { t } = useTranslation();
  const [searchTerm, setSearchTerm] = useState('');
  
  // Mock Transaction History
  const transactions: InventoryTransaction[] = [
    { id: 'TX-1001', productId: 'P-001', type: 'IN', quantity: 120, user: 'Jason M.', timestamp: '2026-03-21 14:30', ref: 'PO-9912' },
    { id: 'TX-1002', productId: 'P-003', type: 'OUT', quantity: 24, user: 'Driver-01', timestamp: '2026-03-21 15:15', ref: 'DO-4421' },
    { id: 'TX-1003', productId: 'P-010', type: 'ADJUST', quantity: -2, user: 'Stock-Admin', timestamp: '2026-03-21 16:00', ref: 'Cycle-Count' },
    { id: 'TX-1004', productId: 'P-005', type: 'IN', quantity: 200, user: 'Azure-Supp', timestamp: '2026-03-21 16:45', ref: 'PO-9915' },
  ];

  const getProductName = (id: string) => {
    return extendedVanuatuProducts.find(p => p.id === id)?.title || 'Unknown Product';
  };

  const getProductImg = (id: string) => {
    return extendedVanuatuProducts.find(p => p.id === id)?.imageUrl;
  };

  const filteredProducts = extendedVanuatuProducts.filter(p => 
    p.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
    p.barcode.includes(searchTerm)
  );

  return (
    <div className="space-y-4 sm:space-y-6 lg:space-y-8 pb-12">
      {/* 1. Global Stock Summary */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4 sm:gap-6">
        {[
          { label: 'Total SKUs', value: extendedVanuatuProducts.length, icon: Box, color: 'bg-sky-500' },
          { label: 'Inbound Today', value: '+450 Items', icon: ArrowDownLeft, color: 'bg-emerald-500' },
          { label: 'Outbound Today', value: '-82 Items', icon: ArrowUpRight, color: 'bg-rose-500' },
          { label: 'Low Stock Alerts', value: '12 Items', icon: AlertCircle, color: 'bg-amber-500' },
        ].map((stat, i) => (
          <div key={i} className="ui-card bg-white p-4 sm:p-6 rounded-[24px] sm:rounded-[28px] border border-slate-100 shadow-sm flex items-center gap-4 sm:gap-5">
            <div className={`w-14 h-14 ${stat.color} rounded-2xl flex items-center justify-center text-white shadow-lg`}>
              <stat.icon size={28} />
            </div>
            <div>
               <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{stat.label}</div>
               <div className="text-xl font-black text-slate-800">{stat.value}</div>
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-4 sm:gap-6 lg:gap-8">
        {/* 2. Stock Registry (Main List) */}
        <div className="xl:col-span-2 space-y-4 sm:space-y-6">
          <div className="ui-card bg-white rounded-[24px] sm:rounded-[32px] p-5 sm:p-8 border border-slate-200 shadow-sm space-y-6 sm:space-y-8">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <h3 className="text-lg font-black text-slate-800 uppercase tracking-widest flex items-center gap-2">
                 <History size={18} className="text-sky-500" /> Inventory Master Registry
              </h3>
              <div className="relative w-full md:w-auto">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                <input 
                  type="text" 
                  placeholder="Search SKU, Barcode, Area..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="bg-slate-50 border-none pl-12 pr-6 py-3 rounded-2xl text-sm font-medium focus:ring-2 focus:ring-sky-500 transition-all w-full md:w-64"
                />
              </div>
            </div>

            <div className="overflow-x-auto">
               <table className="w-full min-w-[760px] text-left">
                  <thead>
                     <tr className="text-[10px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-100">
                        <th className="pb-4 pl-2">Product Details</th>
                        <th className="pb-4">Location</th>
                        <th className="pb-4">In-Stock</th>
                        <th className="pb-4">Status</th>
                        <th className="pb-4 text-right pr-2">Actions</th>
                     </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50">
                     {filteredProducts.slice(0, 8).map((product) => (
                       <tr key={product.id} className="group hover:bg-slate-50/50 transition-colors">
                          <td className="py-4 pl-2">
                             <div className="flex items-center gap-4">
                               <div className="w-12 h-12 bg-slate-100 rounded-xl overflow-hidden border border-slate-200 p-1">
                                 <img src={product.imageUrl || 'https://placehold.co/100x100?text=No+Img'} className="w-full h-full object-contain" alt="" />
                               </div>
                               <div>
                                 <div className="text-sm font-black text-slate-800 leading-tight">{product.title}</div>
                                 <div className="text-[10px] font-bold text-slate-400">{product.barcode}</div>
                               </div>
                             </div>
                          </td>
                          <td className="py-4">
                             <div className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-[10px] font-black uppercase ${
                               product.zoneColor === 'Green' ? 'bg-emerald-50 text-emerald-600' :
                               product.zoneColor === 'Red' ? 'bg-rose-50 text-rose-600' :
                               product.zoneColor === 'Blue' ? 'bg-sky-50 text-sky-600' :
                               'bg-amber-50 text-amber-600'
                             }`}>
                                {getFullLocation(product, t)}
                             </div>
                          </td>
                          <td className="py-4">
                             <div className="text-sm font-black text-slate-800">{product.stock} <span className="text-[10px] text-slate-400 uppercase">{t('bottles')}</span></div>
                          </td>
                          <td className="py-4">
                             <span className={`px-2 py-1 rounded-md text-[9px] font-black uppercase tracking-widest ${
                               product.stock < 50 ? 'bg-rose-100 text-rose-600' : 'bg-emerald-100 text-emerald-600'
                             }`}>
                                {product.stock < 50 ? 'Low Stock' : 'Optimized'}
                             </span>
                          </td>
                          <td className="py-4 text-right pr-2">
                             <button className="p-2 hover:bg-slate-200 rounded-lg transition-colors"><MoreVertical size={16} className="text-slate-400" /></button>
                          </td>
                       </tr>
                     ))}
                  </tbody>
               </table>
            </div>

            <button className="ui-btn ui-btn-secondary w-full py-4 border-2 border-dashed border-slate-100 rounded-2xl text-[10px] text-slate-500 uppercase tracking-[0.2em]">
               Load More Master Data
            </button>
          </div>
        </div>

        {/* 3. Right Panel: Live Feed & Quick Audit */}
        <div className="space-y-4 sm:space-y-6">
           {/* Recent Transactions Feed */}
           <div className="ui-panel bg-slate-900 rounded-[24px] sm:rounded-[32px] p-5 sm:p-8 text-white space-y-6 sm:space-y-8 shadow-xl shadow-slate-200">
              <div className="flex items-center justify-between">
                 <h3 className="text-sm font-black uppercase tracking-widest flex items-center gap-2">
                    <History size={16} className="text-sky-400" /> Stock Feed
                 </h3>
                 <Download size={16} className="text-slate-500 cursor-pointer" />
              </div>

              <div className="space-y-6">
                 {transactions.map((tx) => {
                   const img = getProductImg(tx.productId);
                   return (
                     <div key={tx.id} className="flex gap-4 group">
                        <div className="relative">
                           <div className="w-10 h-10 bg-slate-800 rounded-xl overflow-hidden border border-slate-700 flex-shrink-0">
                              <img src={img || 'https://placehold.co/100x100?text=TX'} className="w-full h-full object-contain" />
                           </div>
                           <div className={`absolute -bottom-1 -right-1 w-5 h-5 rounded-full border-2 border-slate-900 flex items-center justify-center text-[8px] font-black ${
                              tx.type === 'IN' ? 'bg-emerald-500' : tx.type === 'OUT' ? 'bg-rose-500' : 'bg-amber-500'
                           }`}>
                              {tx.type === 'IN' ? '+' : tx.type === 'OUT' ? '-' : '•'}
                           </div>
                        </div>
                        <div className="flex-1 min-w-0">
                           <div className="flex justify-between items-start mb-0.5">
                              <div className="text-xs font-black truncate pr-4">{getProductName(tx.productId)}</div>
                              <div className="text-[10px] font-black text-sky-400 whitespace-nowrap">{tx.quantity > 0 ? `+${tx.quantity}` : tx.quantity}</div>
                           </div>
                           <div className="flex justify-between items-center">
                              <div className="text-[9px] font-bold text-slate-500 uppercase tracking-tighter flex items-center gap-2">
                                 <User size={10} /> {tx.user} · {tx.timestamp}
                              </div>
                              <div className="text-[8px] font-black text-slate-600 uppercase bg-slate-800 px-1.5 py-0.5 rounded">{tx.ref}</div>
                           </div>
                        </div>
                     </div>
                   );
                 })}
              </div>

              <button className="w-full bg-slate-800 hover:bg-sky-500 py-4 rounded-2xl font-black text-[10px] uppercase tracking-widest transition-all">
                 Full Audit Trail
              </button>
           </div>

           {/* Quick Actions Card */}
           <div className="ui-panel bg-gradient-to-br from-indigo-600 to-sky-500 rounded-[24px] sm:rounded-[32px] p-5 sm:p-8 text-white space-y-6">
              <h4 className="text-sm font-black uppercase tracking-widest">Warehouse Ops</h4>
              <div className="grid grid-cols-2 gap-4">
                 {[
                   { label: 'Bulk intake', icon: ArrowDownLeft },
                   { label: 'Dispatch', icon: Truck },
                   { label: 'Stocktake', icon: Calendar },
                   { label: 'Export Report', icon: Download },
                 ].map((op, i) => (
                   <button key={i} className="bg-white/10 hover:bg-white/20 p-4 rounded-2xl transition-all flex flex-col items-center gap-2">
                     <op.icon size={20} />
                     <span className="text-[9px] font-black uppercase tracking-tighter">{op.label}</span>
                   </button>
                 ))}
              </div>
           </div>
        </div>
      </div>
    </div>
  );
};

const AlertCircle = ({ size, className }: { size: number, className?: string }) => (
  <svg width={size} height={size} className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="10" />
    <line x1="12" y1="8" x2="12" y2="12" />
    <line x1="12" y1="16" x2="12.01" y2="16" />
  </svg>
);

export default WarehouseManagementPage;
