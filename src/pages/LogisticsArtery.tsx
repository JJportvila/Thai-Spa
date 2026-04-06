import React, { useState } from 'react';
import { 
  Ship, 
  Truck, 
  Map, 
  Activity, 
  Anchor, 
  Wind, 
  Navigation, 
  ChevronRight,
  Droplets,
  Package,
  Globe
} from 'lucide-react';
import { motion } from 'framer-motion';
import { useTranslation } from 'react-i18next';

const LogisticsArteryPage: React.FC = () => {
  const { t } = useTranslation();
  const [activeLeg, setActiveLeg] = useState<string | null>(null);

  // High-level Artery Nodes
  const arteries = [
    { 
      id: 'A-1', 
      name: 'South Efate Industrial', 
      type: 'SOURCE', 
      desc: 'Beverage & Meat Production Hub',
      stat: 'High Throughput', 
      color: 'bg-[#1a237e]',
      icon: <Wind />
    },
    { 
      id: 'A-2', 
      name: 'Stret Central Warehouse', 
      type: 'HUB', 
      desc: 'Secondary Sorting & Logistics Control',
      stat: '85% Capacity', 
      color: 'bg-[#1a237e]',
      icon: <Layout />
    },
    { 
      id: 'A-3', 
      name: 'Port Vila North Pier', 
      type: 'TRANSIT', 
      desc: 'Marine Distribution to Outer Islands',
      stat: 'Vessel Departing 14:00', 
      color: 'bg-[#1a237e]',
      icon: <Ship />
    },
    { 
      id: 'A-4', 
      name: 'Santo / Tanna Hubs', 
      type: 'SPOKE', 
      desc: 'Island Retail Distribution Points',
      stat: 'Last Mile Ready', 
      color: 'bg-[#1a237e]',
      icon: <Anchor />
    }
  ];

  return (
    <div className="space-y-10 pb-20 overflow-hidden">
      {/* 1. Hero Artery View */}
      <div className="ui-panel bg-slate-900 rounded-[24px] sm:rounded-[48px] p-5 sm:p-8 lg:p-12 text-white relative overflow-hidden min-h-[320px] sm:min-h-[400px] flex flex-col justify-end shadow-2xl">
         <div className="absolute top-0 right-0 w-[800px] h-[800px] bg-[#1a237e] blur-[150px] rounded-full -mr-[400px] -mt-[400px]" />
         
         {/* Live Artery Pulse Visualizer */}
         <div className="absolute top-20 left-20 right-20 h-0.5 bg-white/5 flex items-center justify-between">
            <div className="w-4 h-4 rounded-full bg-[#1a237e] shadow-[0_0_20px_#6366f1]" />
            <motion.div 
              animate={{ x: [0, 800], opacity: [0, 1, 0] }}
              transition={{ duration: 3, repeat: Infinity, ease: "linear" }}
              className="w-12 h-12 bg-[#1a237e] rounded-full flex items-center justify-center border border-[#dbe7ff]"
            >
               <Truck size={14} className="text-[#1a237e]" />
            </motion.div>
            <div className="w-4 h-4 rounded-full bg-[#1a237e] shadow-[0_0_20px_#24308f]" />
            <div className="w-4 h-4 rounded-full bg-[#1a237e] shadow-[0_0_20px_#f43f5e]" />
         </div>

         <div className="relative z-10 space-y-4">
            <h2 className="text-5xl font-black tracking-tighter uppercase leading-none italic italic-important">Vanuatu Logistics Artery</h2>
            <div className="flex items-center gap-4 text-slate-500 text-xs font-black uppercase tracking-[0.4em]">
               <Activity size={16} className="text-[#1a237e] animate-pulse" /> Live Backbone Pulse Sync 2026
            </div>
         </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
         {/* 2. Artery Nodes */}
         <div className="lg:col-span-2 space-y-6">
            <div className="flex items-center justify-between px-2">
               <h3 className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-400">Node Infrastructure</h3>
               <span className="text-[10px] font-black text-[#1a237e]">View Network Topology</span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
               {arteries.map(node => (
                 <div 
                  key={node.id}
                  className="ui-card bg-white rounded-[24px] sm:rounded-[32px] p-5 sm:p-8 border border-slate-100 shadow-sm hover:shadow-xl hover:border-[#dbe7ff] group transition-all"
                 >
                    <div className="flex justify-between items-start mb-6">
                       <div className={`w-14 h-14 ${node.color} rounded-2xl flex items-center justify-center text-white shadow-xl shadow-${node.color.split('-')[1]}-200 group-hover:scale-110 transition-transform`}>
                          {node.icon}
                       </div>
                       <div className="text-[10px] font-black text-slate-300 tracking-widest">{node.id}</div>
                    </div>
                    <div className="space-y-1">
                       <div className="text-[9px] font-black text-[#1a237e] uppercase tracking-widest">{node.type}</div>
                       <div className="text-xl font-black text-slate-800 tracking-tighter uppercase leading-none mb-2">{node.name}</div>
                       <p className="text-[10px] font-medium text-slate-400 uppercase leading-relaxed pr-6">{node.desc}</p>
                    </div>
                    <div className="mt-8 pt-6 border-t border-slate-50 flex items-center justify-between">
                       <div className="text-[10px] font-black text-slate-900 uppercase">{node.stat}</div>
                       <ChevronRight className="text-slate-200" size={16} />
                    </div>
                 </div>
               ))}
            </div>
         </div>

         {/* 3. Real-time Fluid Status */}
         <div className="space-y-8">
            <div className="ui-panel bg-slate-900 rounded-[24px] sm:rounded-[40px] p-5 sm:p-8 lg:p-10 text-white space-y-10 relative overflow-hidden">
               <div className="absolute top-0 right-0 w-40 h-40 bg-[#1a237e] blur-[80px] rounded-full" />
               
               <h3 className="text-sm font-black uppercase tracking-[0.2em] flex items-center gap-3">
                  <Droplets className="text-[#1a237e]" /> Fluid Dynamics
               </h3>

               <div className="space-y-10">
                  <div className="space-y-4">
                     <div className="flex justify-between text-[10px] font-black uppercase tracking-widest">
                        <span className="text-slate-500">Marine Shipping</span>
                        <span className="text-[#1a237e]">Stable</span>
                     </div>
                     <div className="h-2 bg-white/5 rounded-full overflow-hidden">
                        <motion.div initial={{ width: 0 }} animate={{ width: '75%' }} className="h-full bg-[#1a237e]" />
                     </div>
                  </div>
                  <div className="space-y-4">
                     <div className="flex justify-between text-[10px] font-black uppercase tracking-widest">
                        <span className="text-slate-500">Road Transport</span>
                        <span className="text-[#1a237e]">Peak Load</span>
                     </div>
                     <div className="h-2 bg-white/5 rounded-full overflow-hidden">
                        <motion.div initial={{ width: 0 }} animate={{ width: '92%' }} className="h-full bg-[#1a237e]" />
                     </div>
                  </div>
                  <div className="space-y-4">
                     <div className="flex justify-between text-[10px] font-black uppercase tracking-widest">
                        <span className="text-slate-500">Node Clearance</span>
                        <span className="text-[#1a237e]">Optimized</span>
                     </div>
                     <div className="h-2 bg-white/5 rounded-full overflow-hidden">
                        <motion.div initial={{ width: 0 }} animate={{ width: '45%' }} className="h-full bg-[#1a237e]" />
                     </div>
                  </div>
               </div>

               <button className="ui-btn w-full bg-white/5 border border-white/10 text-white py-6 rounded-[24px] sm:rounded-[32px] text-[10px] uppercase tracking-[0.3em] hover:bg-white/10">
                  Artery Analysis Report
               </button>
            </div>

            <div className="ui-card bg-white rounded-[24px] sm:rounded-[32px] p-5 sm:p-8 border border-slate-200 shadow-sm space-y-4 flex items-center gap-6">
               <div className="w-16 h-16 bg-[#1a237e] rounded-2xl flex items-center justify-center text-[#1a237e] shadow-xl shadow-slate-200">
                  <Globe size={32} strokeWidth={1} />
               </div>
               <div className="flex-1">
                  <div className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Geographical Span</div>
                  <div className="text-lg font-black text-slate-800">Inter-Island Mesh</div>
               </div>
            </div>
         </div>
      </div>
    </div>
  );
};

const Layout: React.FC = () => <div className="p-4"><div className="w-full h-full bg-current opacity-20" /></div>;

export default LogisticsArteryPage;



