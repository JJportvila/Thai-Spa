import React, { useState } from 'react';
import { 
  Users, 
  Truck, 
  UserPlus, 
  Search, 
  MoreVertical, 
  PhoneCall, 
  Star, 
  MapPin, 
  Calendar,
  ShieldCheck,
  CheckCircle2,
  XCircle,
  Clock,
  Layout
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import { formatVT } from '../lib/utils';

interface Driver {
  id: string;
  name: string;
  status: 'ACTIVE' | 'ON_LEAVE' | 'IN_TRANSIT';
  vehicle: string;
  rating: number;
  completedTasks: number;
  phone: string;
  joinDate: string;
  location: string;
}

interface FleetManagerProps {
  role: 'PLATFORM' | 'WHOLESALER';
}

const FleetManagementPage: React.FC<FleetManagerProps> = ({ role }) => {
  const { t } = useTranslation();
  const [filter, setFilter] = useState('ALL');

  // Specific mock drivers based on the owner role
  const platformDrivers: Driver[] = [
    { id: 'DR-P-001', name: 'James Kalmet', status: 'IN_TRANSIT', vehicle: 'Hino 4-Ton Truck', rating: 4.9, completedTasks: 1250, phone: '+678 55501', joinDate: '2024-05', location: 'Port Vila Wharf' },
    { id: 'DR-P-002', name: 'Mary Tabi', status: 'ACTIVE', vehicle: 'Toyota Hilux 4x4', rating: 4.8, completedTasks: 840, phone: '+678 55502', joinDate: '2024-08', location: 'Stret Hub Central' },
  ];

  const wholesalerDrivers: Driver[] = [
    { id: 'DR-W-101', name: 'Robert Napuat', status: 'IN_TRANSIT', vehicle: 'Isuzu Reefer Truck', rating: 5.0, completedTasks: 2100, phone: '+678 55510', joinDate: '2023-11', location: 'Industrial Zone 1' },
    { id: 'DR-W-102', name: 'John Siba', status: 'ACTIVE', vehicle: 'Mitsubishi Fuso', rating: 4.7, completedTasks: 320, phone: '+678 55511', joinDate: '2025-01', location: 'Beverage Factory' },
  ];

  const drivers = role === 'PLATFORM' ? platformDrivers : wholesalerDrivers;

  return (
    <div className="space-y-8 pb-24 h-full">
      {/* 1. Dynamic Header */}
      <div className={`ui-panel rounded-[24px] sm:rounded-[48px] p-5 sm:p-8 lg:p-12 text-white relative overflow-hidden shadow-2xl ${
        role === 'PLATFORM' ? 'bg-slate-900 shadow-slate-200' : 'bg-[#1a237e] shadow-slate-200'
      }`}>
         <div className={`absolute top-0 right-0 w-[500px] h-[500px] blur-[120px] rounded-full -mr-32 -mt-32 ${
           role === 'PLATFORM' ? 'bg-[#1a237e]' : 'bg-[#1a237e]'
         }`} />
         
         <div className="flex flex-col md:flex-row justify-between items-center gap-10 relative">
            <div className="space-y-6">
               <div className="flex items-center gap-6">
                  <div className={`w-16 h-16 rounded-3xl flex items-center justify-center shadow-xl ${
                    role === 'PLATFORM' ? 'bg-[#1a237e] shadow-slate-200' : 'bg-[#1a237e] shadow-slate-200'
                  }`}>
                     <Truck size={32} />
                  </div>
                  <div>
                    <h2 className="text-4xl font-black uppercase tracking-tighter">
                       {role === 'PLATFORM' ? t('platformFleet') : t('wholesaleFleet')}
                    </h2>
                    <p className="text-slate-400 text-xs font-black uppercase tracking-[0.3em] mt-1 italic">
                       {role === 'PLATFORM' ? t('nationalLogistics') : t('directDistribution')}
                    </p>
                  </div>
               </div>
               
               <div className="flex gap-4">
                  <div className="flex items-center gap-3 bg-white/5 py-3 px-6 rounded-2xl border border-white/10">
                    <Users className="text-[#1a237e]" size={16} />
                    <span className="text-xs font-black uppercase tracking-widest text-slate-300">{drivers.length} 名已登记司机</span>
                  </div>
                  <div className="flex items-center gap-3 bg-white/5 py-3 px-6 rounded-2xl border border-white/10">
                    <CheckCircle2 className="text-[#1a237e]" size={16} />
                    <span className="text-xs font-black uppercase tracking-widest text-slate-300">98% 服务达成率</span>
                  </div>
               </div>
            </div>
            
            <div className="min-w-[280px]">
               <button className={`ui-btn w-full py-5 rounded-[24px] sm:rounded-[32px] text-xs uppercase tracking-[0.3em] flex items-center justify-center gap-3 transition-all ${
                 role === 'PLATFORM' ? 'bg-[#1a237e] hover:bg-[#1a237e] shadow-slate-200' : 'bg-[#1a237e] hover:bg-[#1a237e] shadow-slate-200'
               } text-white shadow-2xl`}>
                  <UserPlus size={20} /> 新增司机
               </button>
            </div>
         </div>
      </div>

      {/* 2. Control Bar */}
      <div className="flex flex-col md:flex-row gap-6">
         <div className="ui-card flex-1 flex items-center gap-4 bg-white px-4 sm:px-8 py-4 rounded-[24px] sm:rounded-[40px] border border-slate-200 shadow-sm transition-all focus-within:border-[#dbe7ff] focus-within:shadow-xl">
            <Search className="text-slate-300" size={20} />
            <input 
              type="text" 
              placeholder={t('searchDriverPlaceholder')}
              className="flex-1 bg-transparent border-none outline-none text-[10px] font-black uppercase tracking-widest placeholder:text-slate-300"
            />
         </div>
         <div className="ui-card flex bg-white rounded-[24px] sm:rounded-[40px] p-2 border border-slate-200 shadow-sm overflow-hidden">
            {['ALL', 'ACTIVE', 'IN_TRANSIT', 'OFFLINE'].map(tab => (
               <button 
                 key={tab}
                 onClick={() => setFilter(tab)}
                 className={`px-6 py-3 rounded-[32px] text-[10px] font-black uppercase tracking-widest transition-all ${
                   filter === tab ? 'bg-slate-900 text-white shadow-lg' : 'text-slate-400 hover:text-slate-600'
                 }`}
               >
                  {tab === 'ALL' ? '全部' : tab === 'ACTIVE' ? '空闲' : tab === 'IN_TRANSIT' ? '配送中' : '离线'}
               </button>
            ))}
         </div>
      </div>

      {/* 3. Fleet Grid */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-8">
         <AnimatePresence>
            {drivers.map(driver => (
               <motion.div 
                 layout
                 key={driver.id}
                 initial={{ opacity: 0, scale: 0.95 }}
                 animate={{ opacity: 1, scale: 1 }}
                 className="ui-card bg-white rounded-[24px] sm:rounded-[48px] p-5 sm:p-8 lg:p-10 border border-slate-100 shadow-sm hover:shadow-2xl transition-all group relative overflow-hidden"
               >
                  {/* Status Indicator */}
                  <div className={`absolute top-0 right-0 px-8 py-3 rounded-bl-[32px] text-[10px] font-black uppercase tracking-widest text-white ${
                    driver.status === 'ACTIVE' ? 'bg-[#1a237e] animate-pulse' : 
                    driver.status === 'IN_TRANSIT' ? 'bg-[#1a237e]' : 'bg-slate-400'
                  }`}>
                     {driver.status}
                  </div>

                  <div className="flex flex-col md:flex-row gap-10">
                     <div className="space-y-8 flex-1">
                        <div className="flex gap-6">
                           <div className="w-20 h-20 bg-slate-100 rounded-[32px] flex items-center justify-center text-slate-400 border-4 border-white shadow-xl relative">
                              <span className="text-2xl font-black italic">{driver.name[0]}</span>
                              <div className="absolute -bottom-1 -right-1 w-6 h-6 bg-white rounded-full flex items-center justify-center p-0.5 shadow-md">
                                 <ShieldCheck size={14} className="text-[#1a237e]" />
                              </div>
                           </div>
                           <div>
                                 <div className="text-[10px] font-black text-slate-300 uppercase tracking-widest">#{driver.id}</div>
                              <h4 className="text-2xl font-black text-slate-800 tracking-tight leading-none mb-2">{driver.name}</h4>
                              <div className="flex items-center gap-4">
                                 <div className="flex items-center gap-1 text-[#1a237e] text-sm font-black">
                                    <Star size={14} fill="currentColor" /> {driver.rating}
                                 </div>
                                 <div className="w-px h-4 bg-slate-100" />
                                 <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                                    {driver.completedTasks}+ 单
                                 </div>
                              </div>
                           </div>
                        </div>

                        <div className="grid grid-cols-2 gap-6">
                           <div className="space-y-1">
                              <div className="text-[9px] font-black text-slate-300 uppercase tracking-widest">当前车辆</div>
                              <div className="flex items-center gap-2 text-xs font-black text-slate-700">
                                 <Truck size={14} className="text-slate-400" /> {driver.vehicle}
                              </div>
                           </div>
                           <div className="space-y-1">
                              <div className="text-[9px] font-black text-slate-300 uppercase tracking-widest">当前位置</div>
                              <div className="flex items-center gap-2 text-xs font-black text-slate-700">
                                 <MapPin size={14} className="text-[#1a237e]" /> {driver.location}
                              </div>
                           </div>
                        </div>
                     </div>

                     <div className="md:w-px h-auto bg-slate-50" />

                     <div className="md:w-48 flex flex-col justify-center gap-4">
                        <button className="ui-btn ui-btn-primary w-full py-4 rounded-2xl flex items-center justify-center gap-2 text-[10px] uppercase tracking-widest shadow-xl">
                           <Layout size={16} /> 司机看板
                        </button>
                        <button className="w-full py-4 bg-slate-50 text-slate-800 rounded-2xl flex items-center justify-center gap-2 text-[10px] font-black uppercase tracking-widest border border-slate-100 hover:bg-white transition-all">
                           <PhoneCall size={16} /> 联系司机
                        </button>
                        <button className="text-[9px] font-black text-slate-300 uppercase underline text-center hover:text-[#1a237e] transition-colors">
                           查看司机资料
                        </button>
                     </div>
                  </div>

                  <div className="mt-8 pt-8 border-t border-slate-50 flex items-center justify-between">
                     <div className="flex items-center gap-2 text-[10px] font-black text-slate-400 uppercase">
                        <Calendar size={14} /> 入职 {driver.joinDate}
                     </div>
                     <div className="flex items-center gap-2 text-[10px] font-black text-[#1a237e] uppercase">
                        <Clock size={14} /> 最近活跃 5 分钟前
                     </div>
                  </div>
               </motion.div>
            ))}
         </AnimatePresence>
      </div>
    </div>
  );
};

export default FleetManagementPage;


