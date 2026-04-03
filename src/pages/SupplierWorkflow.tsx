import React, { useState } from 'react';
import { 
  ClipboardList, 
  Truck, 
  ShieldCheck, 
  CheckCircle2, 
  Hourglass, 
  PackageSearch, 
  ArrowRight,
  UserCheck,
  MapPin,
  AlertCircle,
  PlusCircle
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import { extendedVanuatuProducts } from '../lib/mockDataFull';

type OrderStatus = 'REQUESTED' | 'DISPATCHED' | 'IN_TRANSIT' | 'ARRIVED' | 'INSPECTED' | 'COMPLETED';

interface SupplyOrder {
  id: string;
  vendor: string;
  items: { productId: string; quantity: number }[];
  status: OrderStatus;
  timestamp: string;
  driver?: string;
  location?: string;
}

const SupplierWorkflowPage: React.FC = () => {
  const { t } = useTranslation();
  const [activeTab, setActiveTab] = useState<OrderStatus | 'ALL'>('ALL');
  const [notification, setNotification] = useState<string | null>(null);
  const orderStatusMap: Record<OrderStatus, string> = {
    REQUESTED: '已申请',
    DISPATCHED: '已派发',
    IN_TRANSIT: '运输中',
    ARRIVED: '已到仓',
    INSPECTED: '已质检',
    COMPLETED: '已完成',
  };

  // Mock Orders with Lifecycle States
  const [orders, setOrders] = useState<SupplyOrder[]>([
    { id: 'ORD-9901', vendor: 'Vanuatu Beverages (Tusker)', items: [{ productId: 'P-001', quantity: 500 }], status: 'IN_TRANSIT', timestamp: '2026-03-21 09:00', driver: 'Atis K.', location: 'Teouma Road' },
    { id: 'ORD-9902', vendor: 'Azure Pure Water', items: [{ productId: 'P-005', quantity: 1000 }], status: 'DISPATCHED', timestamp: '2026-03-21 10:30', driver: 'John B.' },
    { id: 'ORD-9903', vendor: 'Santo Meat Co.', items: [{ productId: 'P-018', quantity: 200 }], status: 'ARRIVED', timestamp: '2026-03-21 14:00' },
    { id: 'ORD-9904', vendor: 'Lapita Chips', items: [{ productId: 'P-010', quantity: 300 }], status: 'REQUESTED', timestamp: '2026-03-21 15:45' },
  ]);

  const updateStatus = (orderId: string, nextStatus: OrderStatus) => {
    setOrders(prev => prev.map(o => o.id === orderId ? { ...o, status: nextStatus } : o));
    
    // Trigger Success Notification for auto-inventory
    if (nextStatus === 'COMPLETED') {
      setNotification(`库存已更新！订单 ${orderId} 已同步至仓库。`);
      setTimeout(() => setNotification(null), 4000);
    }
  };

  const getStatusIcon = (status: OrderStatus) => {
    switch (status) {
      case 'REQUESTED': return <Hourglass className="text-amber-500" />;
      case 'DISPATCHED': return <UserCheck className="text-sky-500" />;
      case 'IN_TRANSIT': return <Truck className="text-indigo-500" />;
      case 'ARRIVED': return <PackageSearch className="text-blue-500" />;
      case 'INSPECTED': return <ShieldCheck className="text-emerald-500" />;
      case 'COMPLETED': return <CheckCircle2 className="text-emerald-500" />;
    }
  };

  const statusFlow: OrderStatus[] = ['REQUESTED', 'DISPATCHED', 'IN_TRANSIT', 'ARRIVED', 'INSPECTED', 'COMPLETED'];

  return (
    <div className="space-y-8 pb-20 relative">
      {/* Dynamic Toast Notification */}
      <AnimatePresence>
        {notification && (
          <motion.div 
            initial={{ opacity: 0, y: -50, x: '-50%' }}
            animate={{ opacity: 1, y: 30, x: '-50%' }}
            exit={{ opacity: 0, scale: 0.9 }}
            className="fixed top-0 left-1/2 z-[100] bg-emerald-900 border border-emerald-500 text-emerald-100 px-8 py-4 rounded-[28px] shadow-[0_20px_40px_rgba(0,0,0,0.3)] flex items-center gap-4 min-w-[320px]"
          >
             <div className="w-10 h-10 bg-emerald-500 rounded-2xl flex items-center justify-center text-white">
                <CheckCircle2 size={24} />
             </div>
             <div className="flex-1">
                <div className="text-[10px] font-black uppercase tracking-widest text-emerald-400">库存同步成功</div>
                <div className="text-sm font-bold">{notification}</div>
             </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Workflow Strategy Bar */}
      <div className="ui-card bg-white rounded-[24px] sm:rounded-[32px] p-2 border border-slate-200 shadow-sm flex items-center justify-between overflow-x-auto gap-2">
         {statusFlow.map((s, i) => (
           <div key={s} className="flex items-center gap-2">
             <div className="px-6 py-4 flex items-center gap-3 whitespace-nowrap group">
               <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-black transition-all ${
                 orders.some(o => o.status === s) ? 'bg-sky-500 text-white shadow-lg shadow-sky-100 scale-110' : 'bg-slate-100 text-slate-400'
               }`}>
                 {i + 1}
               </div>
               <div className={`text-[10px] font-black uppercase tracking-widest transition-colors ${
                 orders.some(o => o.status === s) ? 'text-slate-900' : 'text-slate-400'
               }`}>
                 {orderStatusMap[s]}
               </div>
             </div>
             {i < statusFlow.length - 1 && <ArrowRight size={14} className="text-slate-200 flex-shrink-0" />}
           </div>
         ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Main Orders Board */}
        <div className="lg:col-span-2 space-y-6">
           <div className="flex items-center justify-between">
              <h2 className="text-xl font-black text-slate-900 uppercase tracking-widest flex items-center gap-3">
                 <ClipboardList className="text-sky-500" /> {t('activeSupplyChain')}
              </h2>
              <button className="ui-btn ui-btn-primary text-white px-6 py-3 rounded-2xl text-[10px] uppercase tracking-widest flex items-center gap-2 shadow-xl shadow-slate-200">
                 <PlusCircle size={16} /> {t('requestRestock')}
              </button>
           </div>

           <div className="grid grid-cols-1 gap-4">
              {orders.map((order) => (
                <motion.div 
                  key={order.id}
                  layout
                  className="ui-card bg-white rounded-[24px] sm:rounded-[32px] p-5 sm:p-8 border border-slate-100 shadow-sm hover:shadow-xl hover:shadow-slate-100 transition-all border-l-[6px] border-l-slate-200"
                  style={{ borderLeftColor: 
                    order.status === 'IN_TRANSIT' ? '#6366f1' : 
                    order.status === 'ARRIVED' ? '#3b82f6' : 
                    order.status === 'INSPECTED' ? '#10b981' : '#e2e8f0' 
                  }}
                >
                  <div className="flex flex-col md:flex-row justify-between gap-6">
                     <div className="space-y-4 flex-1">
                        <div className="flex items-center gap-3">
                           <div className="w-10 h-10 bg-slate-50 rounded-xl flex items-center justify-center">
                              {getStatusIcon(order.status)}
                           </div>
                           <div>
                              <div className="text-sm font-black text-slate-900 tracking-tight">{order.vendor}</div>
                              <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{order.id} 路 {orderStatusMap[order.status]} 路 {order.timestamp}</div>
                           </div>
                        </div>

                        <div className="flex flex-wrap gap-2">
                           {order.items.map((item, idx) => (
                             <div key={idx} className="bg-slate-100 px-3 py-1.5 rounded-lg text-[10px] font-black text-slate-600">
                                {extendedVanuatuProducts.find(p => p.id === item.productId)?.title || '商品'}：{item.quantity} 瓶
                             </div>
                           ))}
                        </div>

                        {order.driver && (
                          <div className="flex items-center gap-6 pt-2">
                             <div className="flex items-center gap-2">
                                <Truck size={12} className="text-slate-400" />
                                <span className="text-[10px] font-black text-slate-700 uppercase">{order.driver}</span>
                             </div>
                             {order.location && (
                               <div className="flex items-center gap-2">
                                  <MapPin size={12} className="text-sky-500" />
                                  <span className="text-[10px] font-bold text-sky-600 uppercase tracking-tighter">{order.location}</span>
                               </div>
                             )}
                          </div>
                        )}
                     </div>

                     <div className="flex flex-col justify-center gap-3 min-w-[180px]">
                        {order.status === 'REQUESTED' && (
                          <button onClick={() => updateStatus(order.id, 'DISPATCHED')} className="w-full bg-slate-900 text-white py-4 rounded-2xl font-black text-[10px] uppercase tracking-widest hover:bg-slate-800 transition-all shadow-lg shadow-slate-200">
                             {t('supplierConfirm')}
                          </button>
                        )}
                        {order.status === 'DISPATCHED' && (
                          <button onClick={() => updateStatus(order.id, 'IN_TRANSIT')} className="w-full bg-indigo-500 text-white py-4 rounded-2xl font-black text-[10px] uppercase tracking-widest hover:bg-indigo-600 transition-all shadow-lg shadow-indigo-100">
                             {t('assignDriver')}
                          </button>
                        )}
                        {order.status === 'IN_TRANSIT' && (
                          <button onClick={() => updateStatus(order.id, 'ARRIVED')} className="w-full bg-blue-500 text-white py-4 rounded-2xl font-black text-[10px] uppercase tracking-widest hover:bg-blue-600 transition-all shadow-lg shadow-blue-100">
                             {t('confirmArrival')}
                          </button>
                        )}
                        {order.status === 'ARRIVED' && (
                          <button onClick={() => updateStatus(order.id, 'INSPECTED')} className="w-full bg-emerald-500 text-white py-4 rounded-2xl font-black text-[10px] uppercase tracking-widest hover:bg-emerald-600 transition-all shadow-lg shadow-emerald-100">
                             {t('startInspection')}
                          </button>
                        )}
                        {order.status === 'INSPECTED' && (
                          <motion.button 
                            initial={{ scale: 0.95 }}
                            animate={{ scale: 1 }}
                            onClick={() => updateStatus(order.id, 'COMPLETED')} 
                            className="w-full bg-gradient-to-r from-emerald-500 to-teal-500 text-white py-4 rounded-2xl font-black text-[10px] uppercase tracking-[0.2em] shadow-xl shadow-emerald-200"
                          >
                             {t('approveAuto')}
                          </motion.button>
                        )}
                        {order.status === 'COMPLETED' && (
                          <div className="w-full bg-slate-50 text-slate-400 py-4 rounded-2xl font-black text-[10px] uppercase tracking-widest flex items-center justify-center gap-2 border border-slate-100">
                             <CheckCircle2 size={14} /> {t('fullStockSuccess')}
                          </div>
                        )}
                     </div>
                  </div>
                </motion.div>
              ))}
           </div>
        </div>

        {/* Right Sidebar: Supply Alerts */}
        <div className="space-y-6">
           <div className="ui-panel bg-slate-900 rounded-[24px] sm:rounded-[32px] p-5 sm:p-8 text-white space-y-8">
              <h3 className="text-sm font-black uppercase tracking-widest flex items-center gap-2">
                 <AlertCircle size={18} className="text-rose-400" /> {t('autoRestockNeeds')}
              </h3>
              <p className="text-slate-500 text-[10px] font-bold leading-relaxed uppercase">
                 {t('restockDesc')}
              </p>

              <div className="space-y-4">
                 {extendedVanuatuProducts.filter(p => p.stock < 50).slice(0, 5).map(p => (
                   <div key={p.id} className="flex items-center justify-between group">
                      <div className="flex items-center gap-3">
                         <div className="w-10 h-10 bg-slate-800 rounded-xl overflow-hidden p-1 border border-slate-700">
                            <img src={p.imageUrl || 'https://placehold.co/50x50'} className="w-full h-full object-contain opacity-70 group-hover:opacity-100 transition-opacity" />
                         </div>
                         <div>
                            <div className="text-[10px] font-black">{p.title}</div>
                            <div className="text-[9px] font-bold text-rose-400 uppercase tracking-tighter">当前：{p.stock} 件</div>
                         </div>
                      </div>
                      <button className="bg-white/10 hover:bg-white text-white/50 hover:text-slate-900 px-3 py-1.5 rounded-lg text-[9px] font-black uppercase transition-all">
                         {t('resupply')}
                      </button>
                   </div>
                 ))}
              </div>

              <div className="pt-6 border-t border-slate-800">
                 <div className="bg-slate-800/50 rounded-2xl p-6 space-y-4">
                    <div className="text-xs font-black uppercase tracking-widest text-slate-400">{t('inventoryHealth')}</div>
                    <div className="h-2 bg-slate-700 rounded-full overflow-hidden">
                       <div className="h-full bg-emerald-500 w-[78%]" />
                    </div>
                    <div className="flex justify-between text-[10px] font-black uppercase">
                       <span>78% 已优化</span>
                       <span className="text-rose-400">22% 风险项</span>
                    </div>
                 </div>
              </div>
           </div>
        </div>
      </div>
    </div>
  );
};

export default SupplierWorkflowPage;

