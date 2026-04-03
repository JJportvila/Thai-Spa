import React, { useState, useEffect } from 'react';
import { 
  Truck, 
  MapPin, 
  Navigation, 
  CheckCircle2, 
  PhoneCall, 
  Clock, 
  Package, 
  ChevronRight,
  AlertCircle,
  Hash,
  Box,
  Layout
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import { formatVT } from '../lib/utils';

interface DeliveryTask {
  id: string;
  orderId: string;
  sourceType: 'WHOLESALER' | 'PLATFORM' | 'RETAILER';
  sender: string;
  receiver: string;
  origin: string;
  destination: string;
  status: 'PENDING' | 'PICKED_UP' | 'IN_TRANSIT' | 'DELIVERED';
  itemsCount: number;
  priority: 'URGENT' | 'NORMAL';
  estimatedTime: string;
}

const UnifiedDriverAppPage: React.FC = () => {
  const { t } = useTranslation();
  const [activeTask, setActiveTask] = useState<DeliveryTask | null>(null);
  
  // Mock High-Tier Multi-Segment Logistics Chain
  const [tasks, setTasks] = useState<DeliveryTask[]>([
    { 
      id: 'WHOL-001', 
      orderId: 'ORD-9901', 
      sourceType: 'WHOLESALER',
      sender: 'Vanuatu Bev (Wholesale)', 
      receiver: 'Stret Platform Hub', 
      origin: 'Port Vila Industrial Zone', 
      destination: 'Stret Platform Main Warehouse', 
      status: 'PENDING', 
      itemsCount: 500, 
      priority: 'URGENT', 
      estimatedTime: '25 mins' 
    },
    { 
      id: 'WHOL-002', 
      orderId: 'ORD-9905', 
      sourceType: 'WHOLESALER',
      sender: 'Santo Meat Co. (Wholesale)', 
      receiver: 'Sunrise Mini-Mart (Retail)', 
      origin: 'Santo Wharf', 
      destination: 'Airport Retail Road', 
      status: 'PENDING', 
      itemsCount: 150, 
      priority: 'NORMAL', 
      estimatedTime: '40 mins' 
    },
    { 
      id: 'PLAT-001', 
      orderId: 'ORD-1022', 
      sourceType: 'PLATFORM',
      sender: 'Stret Platform Hub', 
      receiver: 'Efate North Hub (Direct)', 
      origin: 'Stret Main Port Vila', 
      destination: 'Civic Centre Direct Shop', 
      status: 'PENDING', 
      itemsCount: 85, 
      priority: 'URGENT', 
      estimatedTime: '15 mins' 
    },
    { 
      id: 'RE-102', 
      orderId: 'POS-556', 
      sourceType: 'RETAILER',
      sender: 'Aore Island Store (Retailer)', 
      receiver: 'Private Customer (Bislama Resident)', 
      origin: 'Aore Retail Counter', 
      destination: 'Customer Home (Tanna East)', 
      status: 'PENDING', 
      itemsCount: 3, 
      priority: 'NORMAL', 
      estimatedTime: '10 mins' 
    },
  ]);

  const updateTaskStatus = (id: string, nextStatus: DeliveryTask['status']) => {
    setTasks(prev => prev.map(t => t.id === id ? { ...t, status: nextStatus } : t));
    if (nextStatus === 'DELIVERED') setActiveTask(null);
  };

  return (
    <div className="flex flex-col gap-4 sm:gap-6 lg:gap-8 max-w-5xl mx-auto pb-24 h-full">
      {/* 1. Header & Live Status */}
      <div className="ui-panel bg-slate-900 rounded-[24px] sm:rounded-[40px] p-5 sm:p-8 text-white relative overflow-hidden shadow-2xl">
         <div className="absolute top-0 right-0 w-64 h-64 bg-sky-500/20 blur-[100px] rounded-full -mr-32 -mt-32" />
         
         <div className="flex flex-col sm:flex-row sm:items-center justify-between relative gap-4">
            <div className="flex items-center gap-4">
               <div className="w-14 h-14 bg-sky-500 rounded-2xl flex items-center justify-center shadow-lg shadow-sky-500/30">
                  <Truck size={28} />
               </div>
               <div>
                  <h2 className="text-xl font-black uppercase tracking-tighter">Vanuatu Logistics</h2>
                  <div className="flex items-center gap-2 text-sky-400 text-[9px] font-black uppercase tracking-widest mt-1">
                     <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse" />
                     Live on Efate Network
                  </div>
               </div>
            </div>
            <div className="text-left sm:text-right">
               <div className="text-[10px] font-black uppercase text-slate-500 tracking-widest">Driver Account</div>
               <div className="text-lg font-black">{formatVT(12500)}</div>
            </div>
         </div>
      </div>

      <AnimatePresence mode="wait">
        {!activeTask ? (
          /* 2. Available Jobs List (Platform & Retail) */
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, x: -50 }}
            className="space-y-4 sm:space-y-6"
          >
             <div className="flex items-center justify-between px-2">
                <h3 className="text-sm font-black uppercase text-slate-400 tracking-[0.2em] flex items-center gap-2">
                   <Layout size={16} /> Available Manifests
                </h3>
             </div>

             <div className="space-y-3 sm:space-y-4">
                {tasks.filter(t => t.status === 'PENDING').map(task => (
                  <div 
                    key={task.id}
                    className="ui-card bg-white rounded-[24px] sm:rounded-[32px] p-4 sm:p-6 lg:p-8 border border-slate-200 shadow-sm hover:shadow-xl hover:border-sky-100 transition-all group"
                  >
                     <div className="flex flex-col md:flex-row gap-4 sm:gap-6 lg:gap-8">
                        <div className="flex-1 space-y-4 sm:space-y-6">
                           <div className="flex items-center justify-between">
                              <div className="flex items-center gap-3">
                                 <span className="bg-slate-100 px-3 py-1 rounded text-[10px] font-black uppercase tracking-widest text-slate-400">{task.id}</span>
                                 <span className={`text-[10px] font-black px-2 py-0.5 rounded uppercase ${
                                    task.sourceType === 'WHOLESALER' ? 'bg-indigo-100 text-indigo-600' :
                                    task.sourceType === 'PLATFORM' ? 'bg-sky-100 text-sky-600' :
                                    'bg-emerald-100 text-emerald-600'
                                 }`}>
                                    {task.sourceType} Order
                                 </span>
                                 {task.priority === 'URGENT' && <span className="text-[10px] font-black text-rose-500 bg-rose-50 px-2 py-0.5 rounded uppercase">Urgent</span>}
                              </div>
                              <div className="flex items-center gap-2 text-slate-400 text-xs font-bold">
                                 <Clock size={14} /> Est: {task.estimatedTime}
                              </div>
                           </div>

                           <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-8 relative">
                              <div className="absolute left-[34px] top-6 bottom-6 w-px border-l-2 border-dotted border-slate-200 hidden md:block" />
                              
                              <div className="flex items-center gap-4 group-hover:translate-x-1 transition-transform">
                                 <div className="w-10 h-10 bg-slate-50 rounded-xl flex items-center justify-center text-slate-400">
                                    <MapPin size={18} />
                                 </div>
                                 <div className="min-w-0">
                                    <div className="text-[9px] font-black uppercase text-slate-400 tracking-tighter">Pickup (Sender)</div>
                                    <div className="text-sm font-black text-slate-800 truncate">{task.sender}</div>
                                    <div className="text-[8px] text-slate-400 font-bold uppercase truncate">{task.origin}</div>
                                 </div>
                              </div>

                              <div className="flex items-center gap-4 group-hover:translate-x-1 transition-transform">
                                 <div className="w-10 h-10 bg-sky-50 rounded-xl flex items-center justify-center text-sky-500">
                                    <Navigation size={18} />
                                 </div>
                                 <div className="min-w-0">
                                    <div className="text-[9px] font-black uppercase text-slate-400 tracking-tighter">Dropoff (Receiver)</div>
                                    <div className="text-sm font-black text-slate-800 truncate">{task.receiver}</div>
                                    <div className="text-[8px] text-slate-400 font-bold uppercase truncate">{task.destination}</div>
                                 </div>
                              </div>
                           </div>
                        </div>

                        <div className="flex flex-col gap-3 justify-center md:w-48">
                           <button 
                            onClick={() => setActiveTask(task)}
                            className="ui-btn ui-btn-primary w-full py-4 sm:py-5 rounded-[20px] sm:rounded-[24px] text-[10px] uppercase tracking-widest flex items-center justify-center gap-2 shadow-xl"
                           >
                              Accept Job <ChevronRight size={14} />
                           </button>
                           <div className="flex items-center justify-between px-2 text-[10px] font-black text-slate-400 uppercase">
                              <span>{task.itemsCount} Cartons</span>
                              <Box size={14} />
                           </div>
                        </div>
                     </div>
                  </div>
                ))}
             </div>
          </motion.div>
        ) : (
          /* 3. Active Mission Tracking View */
          <motion.div 
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="space-y-4 sm:space-y-6"
          >
             <div className="ui-card bg-white rounded-[24px] sm:rounded-[40px] p-5 sm:p-8 lg:p-10 border border-slate-200 shadow-sm space-y-6 sm:space-y-10 relative overflow-hidden">
                <div className="absolute top-0 left-0 bottom-0 w-2 bg-sky-500" />
                
                <div className="flex items-center justify-between">
                   <div className="flex items-center gap-4">
                      <div className="p-4 bg-sky-50 text-sky-600 rounded-2xl animate-pulse">
                         <Navigation size={24} />
                      </div>
                      <div>
                         <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none mb-1">Navigation Active</div>
                         <h3 className="text-2xl font-black text-slate-800 uppercase tracking-tighter">Mission: {activeTask.id}</h3>
                      </div>
                   </div>
                   <button 
                    onClick={() => setActiveTask(null)}
                    className="p-3 bg-slate-50 text-slate-400 rounded-2xl hover:bg-rose-50 hover:text-rose-500 transition-all"
                   >
                      Cancel
                   </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 sm:gap-6">
                   <div className="p-6 bg-slate-50 rounded-2xl space-y-2">
                      <div className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Current Leg</div>
                      <div className="text-sm font-black text-slate-800 truncate uppercase">Towards {activeTask.destination}</div>
                   </div>
                   <div className="p-6 bg-slate-50 rounded-2xl space-y-2">
                      <div className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Cargo</div>
                      <div className="text-sm font-black text-slate-800 flex items-center gap-2">
                         <Box size={14} className="text-indigo-500" /> {activeTask.itemsCount} SKU Cartons
                      </div>
                   </div>
                   <div className="p-6 bg-slate-50 rounded-2xl space-y-2">
                      <div className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Partner Info</div>
                      <div className="text-sm font-black text-slate-800 flex items-center justify-between">
                         <span className="truncate">{activeTask.receiver}</span>
                         <PhoneCall size={14} className="text-emerald-500 cursor-pointer" />
                      </div>
                   </div>
                </div>

                {/* Progress Visualizer */}
                <div className="relative pt-10 pb-4">
                   <div className="h-2 bg-slate-100 rounded-full w-full absolute top-[52px]" />
                   <div className={`h-2 bg-sky-500 rounded-full absolute top-[52px] transition-all duration-1000 ${
                     activeTask.status === 'IN_TRANSIT' ? 'w-2/3' : 'w-1/3'
                   }`} />
                   
                   <div className="flex justify-between items-start relative">
                      {[
                        { label: 'Pickup', status: 'PICKED_UP', icon: Package },
                        { label: 'Transport', status: 'IN_TRANSIT', icon: Truck },
                        { label: 'Delivery', status: 'DELIVERED', icon: CheckCircle2 },
                      ].map((step, i) => (
                        <div key={i} className="flex flex-col items-center gap-4">
                           <div className={`w-10 h-10 rounded-full flex items-center justify-center transition-all ${
                             activeTask.status === step.status || (activeTask.status === 'IN_TRANSIT' && i === 0)
                             ? 'bg-sky-500 text-white shadow-xl scale-110' : 'bg-slate-100 text-slate-400'
                           }`}>
                              <step.icon size={18} />
                           </div>
                           <div className="text-[10px] font-black uppercase tracking-tighter text-slate-400">{step.label}</div>
                        </div>
                      ))}
                   </div>
                </div>

                <div className="pt-6 sm:pt-8 border-t border-slate-100">
                   {activeTask.status === 'PENDING' && (
                     <button 
                      onClick={() => updateTaskStatus(activeTask.id, 'PICKED_UP')}
                      className="ui-btn ui-btn-primary w-full py-5 sm:py-6 rounded-[24px] sm:rounded-[32px] text-xs uppercase tracking-[0.2em] sm:tracking-[0.3em] shadow-2xl"
                     >
                        Arrived at Pickup & Load
                     </button>
                   )}
                   {activeTask.status === 'PICKED_UP' && (
                     <button 
                      onClick={() => updateTaskStatus(activeTask.id, 'IN_TRANSIT')}
                      className="ui-btn w-full bg-indigo-600 text-white py-5 sm:py-6 rounded-[24px] sm:rounded-[32px] text-xs uppercase tracking-[0.2em] sm:tracking-[0.3em] hover:bg-sky-600 shadow-2xl"
                     >
                        Confirm Dispatch (In Transit)
                     </button>
                   )}
                   {activeTask.status === 'IN_TRANSIT' && (
                     <button 
                      onClick={() => updateTaskStatus(activeTask.id, 'DELIVERED')}
                      className="ui-btn w-full bg-emerald-500 text-white py-5 sm:py-6 rounded-[24px] sm:rounded-[32px] text-xs uppercase tracking-[0.2em] sm:tracking-[0.3em] hover:bg-emerald-600 shadow-2xl"
                     >
                        Package Delivered & Sign-off
                     </button>
                   )}
                </div>
             </div>
             
             <div className="ui-panel bg-amber-50 rounded-[24px] sm:rounded-[32px] p-4 sm:p-6 border border-amber-100 flex items-center gap-3 sm:gap-4 text-amber-700">
                <AlertCircle size={20} />
                <div className="text-[10px] font-black uppercase tracking-widest">
                   Traffic Warning: Delays expected near Mele Road. Recalculating...
                </div>
             </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default UnifiedDriverAppPage;
