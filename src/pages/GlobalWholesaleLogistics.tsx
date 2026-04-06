import React, { useState } from 'react';
import { 
  Globe, 
  Ship, 
  Plane, 
  TrendingUp, 
  DollarSign, 
  Clock, 
  ShieldCheck, 
  Info,
  ChevronRight,
  ArrowRight,
  Database,
  Calculator,
  Scale,
  FileSearch
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import { formatVT } from '../lib/utils';

interface OverseasCargo {
  id: string;
  origin: string; // e.g. China, Australia
  vessel: string;
  eta: string;
  status: 'SAILING' | 'CLEARANCE' | 'PORT_VILA';
  containers: number;
  value: number;
  freightCost: number;
  dutyTax: number;
}

const GlobalWholesaleLogistics: React.FC = () => {
  const { t } = useTranslation();
  const [activeCargo, setActiveCargo] = useState<OverseasCargo | null>(null);

  // Mock Overseas Inbound Shipments
  const shipments: OverseasCargo[] = [
    { 
      id: 'SHIP-CN-202', 
      origin: 'Guangzhou, China', 
      vessel: 'Vanuatu Hope', 
      eta: '2026-04-12', 
      status: 'SAILING', 
      containers: 4, 
      value: 8500000, 
      freightCost: 450000, 
      dutyTax: 1275000 
    },
    { 
      id: 'SHIP-AU-085', 
      origin: 'Sydney, Australia', 
      vessel: 'Coral Streamer', 
      eta: '2026-03-25', 
      status: 'CLEARANCE', 
      containers: 2, 
      value: 3200000, 
      freightCost: 180000, 
      dutyTax: 480000 
    },
  ];

  return (
    <div className="space-y-4 sm:space-y-6 lg:space-y-8 pb-24">
      {/* 1. Global Vision Header */}
      <div className="ui-panel bg-slate-900 rounded-[24px] sm:rounded-[48px] p-5 sm:p-8 lg:p-12 text-white relative overflow-hidden shadow-2xl">
         <div className="absolute top-0 right-0 w-[600px] h-[600px] bg-[#1a237e] blur-[120px] rounded-full -mr-64 -mt-64" />
         
         <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-8 relative">
            <div className="space-y-4">
               <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-[#1a237e] rounded-2xl flex items-center justify-center shadow-lg shadow-slate-200">
                     <Globe size={24} />
                  </div>
                  <h2 className="text-3xl font-black uppercase tracking-tighter italic italic-important">{t('globalInboundBridge')}</h2>
               </div>
               <p className="text-slate-400 text-sm font-medium uppercase tracking-widest max-w-md">{t('globalInboundDesc')}</p>
            </div>
            
            <div className="flex gap-4">
               <div className="p-6 bg-white/5 rounded-[32px] border border-white/10">
                  <div className="text-[10px] font-black uppercase text-slate-500 mb-1">保税货值</div>
                  <div className="text-xl font-black">{formatVT(11700000)}</div>
               </div>
               <div className="p-6 bg-[#1a237e] rounded-[32px] text-white shadow-xl shadow-slate-200">
                  <div className="text-[10px] font-black uppercase text-white/60 mb-1">清关节点</div>
                  <div className="text-xl font-black">维拉港码头</div>
               </div>
            </div>
         </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6 lg:gap-8">
         {/* 2. Shipment Manifests */}
         <div className="lg:col-span-2 space-y-4 sm:space-y-6">
            <div className="flex items-center justify-between px-2">
               <h3 className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-400">{t('documentVault')}</h3>
               <div className="flex items-center gap-2 text-[10px] font-black text-slate-500">
                  <Scale size={14} /> {t('complianceRate')}: 100%
               </div>
            </div>

            <div className="space-y-4">
               {shipments.map(ship => (
                 <motion.div 
                  key={ship.id}
                  whileHover={{ scale: 1.01 }}
                  className="ui-card bg-white rounded-[24px] sm:rounded-[40px] p-5 sm:p-8 border border-slate-100 shadow-sm hover:shadow-2xl hover:border-[#dbe7ff] transition-all flex flex-col md:flex-row gap-6 sm:gap-8 items-center"
                 >
                    <div className="w-20 h-20 bg-slate-50 rounded-[24px] flex items-center justify-center shrink-0 border border-slate-100 relative overflow-hidden group">
                       <Ship size={32} className="text-[#1a237e] relative z-10" />
                       <div className="absolute inset-0 bg-[#1a237e] group-hover:bg-[#1a237e] transition-colors" />
                    </div>

                    <div className="flex-1 space-y-4">
                       <div className="flex items-center gap-4">
                          <span className="text-[10px] font-black text-slate-400 py-1 px-3 bg-slate-50 rounded-full">{ship.id}</span>
                          <h4 className="text-xl font-black text-slate-800 uppercase tracking-tighter">{ship.origin}</h4>
                       </div>
                       
                       <div className="grid grid-cols-2 lg:grid-cols-4 gap-6">
                          <div className="space-y-1">
                             <div className="text-[9px] font-black uppercase text-slate-400">{t('vessel')}</div>
                             <div className="text-xs font-bold text-slate-700">{ship.vessel}</div>
                          </div>
                          <div className="space-y-1">
                             <div className="text-[9px] font-black uppercase text-slate-400">{t('load')}</div>
                             <div className="text-xs font-bold text-slate-700">{ship.containers} {t('containers')}</div>
                          </div>
                          <div className="space-y-1">
                             <div className="text-[9px] font-black uppercase text-slate-400">{t('eta')}</div>
                             <div className="text-xs font-black text-[#1a237e]">{ship.eta}</div>
                          </div>
                          <div className="space-y-1">
                             <div className="text-[9px] font-black uppercase text-slate-400">{t('status')}</div>
                             <span className={`px-2 py-0.5 rounded text-[8px] font-black uppercase ${
                                ship.status === 'SAILING' ? 'bg-[#1a237e] text-[#1a237e]' : 'bg-[#1a237e] text-[#1a237e]'
                             }`}>
                                {t(ship.status.toLowerCase())}
                             </span>
                          </div>
                       </div>
                    </div>

                    <div className="w-full md:w-32">
                       <button className="ui-btn ui-btn-primary w-full py-4 rounded-2xl flex items-center justify-center gap-2 text-[10px] uppercase tracking-widest">
                          {t('inspect')} <ChevronRight size={14} />
                       </button>
                    </div>
                 </motion.div>
               ))}
            </div>

            {/* Digital Customs Docs */}
            <div className="ui-card bg-white rounded-[24px] sm:rounded-[40px] p-5 sm:p-8 border border-slate-100 shadow-sm flex flex-col md:flex-row gap-6 sm:gap-8 items-center">
               <div className="w-20 h-20 bg-slate-50 rounded-[24px] flex items-center justify-center shrink-0 border border-slate-100 relative overflow-hidden group">
                  <Plane size={32} className="text-[#1a237e] relative z-10" />
                  <div className="absolute inset-0 bg-[#1a237e] group-hover:bg-[#1a237e] transition-colors" />
               </div>

               <div className="flex-1 space-y-4">
                  <div>
                    <h2 className="text-3xl font-black uppercase tracking-tighter">{t('customsClearanceTitle')}</h2>
                    <div className="flex items-center gap-2 text-[#1a237e] text-[10px] font-black uppercase tracking-widest mt-1">
                       <span className="w-2 h-2 bg-[#1a237e] rounded-full animate-pulse" />
                       {t('asycudaSyncActive')}
                    </div>
                  </div>
               </div>
            </div>
            
            <div className="flex gap-4">
               <button className="ui-btn px-6 sm:px-8 py-4 bg-slate-100 border border-slate-200 rounded-2xl text-[10px] uppercase tracking-widest hover:bg-slate-200 transition-all flex items-center gap-2 text-slate-600">
                  <FileSearch size={16} /> {t('auditHistory')}
               </button>
               <button className="ui-btn px-6 sm:px-8 py-4 bg-[#1a237e] rounded-2xl text-[10px] uppercase tracking-widest hover:bg-[#1a237e] transition-all text-white shadow-xl shadow-slate-200">
                  {t('submitNewEntry')}
               </button>
            </div>
         </div>

         {/* 3. Cost Analysis (LANDED COST) */}
         <div className="space-y-4 sm:space-y-8">
            <div className="ui-card bg-slate-50 rounded-[24px] sm:rounded-[40px] p-5 sm:p-8 lg:p-10 border border-slate-200 shadow-sm space-y-6 sm:space-y-8 h-full">
               <div className="space-y-2">
                  <h3 className="text-sm font-black uppercase tracking-[0.2em] text-slate-800 flex items-center gap-2">
                     <Calculator className="text-[#1a237e]" /> 到岸成本
                  </h3>
                  <p className="text-[10px] font-bold text-slate-400 uppercase">汇总货值、运保费、关税后的最终到岸成本。</p>
               </div>

               <div className="space-y-6">
                  <div className="p-6 bg-white rounded-[28px] border border-slate-100 space-y-4 shadow-sm">
                     <div className="flex justify-between items-center text-[10px] font-black uppercase text-slate-400">
                        <span>离岸货值</span>
                        <span>{formatVT(8500000)}</span>
                     </div>
                     <div className="flex justify-between items-center text-[10px] font-black uppercase text-slate-400">
                        <span>运费与保险</span>
                        <span className="text-[#1a237e]">+ {formatVT(450000)}</span>
                     </div>
                     <div className="flex justify-between items-center text-[10px] font-black uppercase text-slate-400">
                        <span>关税及税费（约 15%）</span>
                        <span className="text-[#1a237e]">+ {formatVT(1275000)}</span>
                     </div>
                     <div className="h-0.5 bg-slate-50 border-t border-dashed border-slate-200" />
                     <div className="flex justify-between items-end">
                        <div className="text-xs font-black uppercase text-slate-800">最终到岸成本</div>
                        <div className="text-2xl font-black text-[#1a237e]">{formatVT(10225000)}</div>
                     </div>
                  </div>

                  <div className="ui-panel bg-[#1a237e] rounded-[24px] sm:rounded-[32px] p-5 sm:p-8 text-white relative overflow-hidden">
                     <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 blur-[50px] rounded-full" />
                     <div className="space-y-4 relative">
                        <ShieldCheck className="text-[#1a237e]" size={32} />
                        <div>
                           <div className="text-[10px] font-black uppercase text-white/60 tracking-widest">定价建议</div>
                           <div className="text-sm font-black mt-1">建议批发端按到岸成本上浮 25% 作为参考售价。</div>
                        </div>
                     </div>
                  </div>
               </div>

               <div className="flex items-start gap-4 p-4 bg-[#1a237e] rounded-2xl border border-[#dbe7ff] mt-auto">
                  <Info className="text-[#1a237e] shrink-0" size={16} />
                  <p className="text-[9px] font-bold text-[#1a237e] uppercase leading-relaxed">
                     汇率提醒：VT/AUD 下调 1.2%，系统已同步调整悉尼来货的到岸成本估算。
                  </p>
               </div>
            </div>
         </div>
      </div>
    </div>
  );
};

export default GlobalWholesaleLogistics;

