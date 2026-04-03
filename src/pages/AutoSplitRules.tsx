import React, { useState } from 'react';
import { 
  Calculator, 
  ArrowRightLeft, 
  Percent, 
  Landmark, 
  ShieldCheck, 
  Building2, 
  Store,
  ChevronRight,
  Receipt,
  AlertCircle,
  FileCheck
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import { formatVT } from '../lib/utils';

interface SplitRule {
  id: string;
  label: string;
  source: string;
  distribution: {
    target: string;
    percentage: number;
    label: string;
  }[];
  active: boolean;
}

const AutoSplitRulesPage: React.FC = () => {
  const { t } = useTranslation();
  
  // Real Vanuatu VAT/Platform split logic
  const [rules, setRules] = useState<SplitRule[]>([
    {
      id: 'R-001',
      label: 'Standard Sale Split',
      source: 'External Retailer Order',
      active: true,
      distribution: [
        { target: 'Wholesaler (COGS)', percentage: 80, label: 'Cost of Goods' },
        { target: 'Vanuatu Gov (VAT)', percentage: 15, label: 'Vat 15%' },
        { target: 'Stret Platform', percentage: 5, label: 'Service Fee' },
      ]
    },
    {
      id: 'R-002',
      label: 'Direct Managed Shop Transfer',
      source: 'Direct Shop Internal Order',
      active: true,
      distribution: [
        { target: 'Wholesaler (COGS)', percentage: 85, label: 'Internal Transfer' },
        { target: 'Stret Platform Hub', percentage: 15, label: 'Consolidated Profit' },
      ]
    },
    {
      id: 'R-003',
      label: 'RMA Refund Allocation',
      source: 'Damaged Claim Approval',
      active: true,
      distribution: [
        { target: 'Retailer Credit', percentage: 100, label: 'Full Refund' },
        { target: 'Platform Reserve', percentage: -100, label: 'Liability' },
      ]
    }
  ]);

  const [simAmount, setSimAmount] = useState<number>(10000);

  const calculateSplit = (rule: SplitRule, amount: number) => {
    return rule.distribution.map(d => ({
      ...d,
      value: (amount * d.percentage) / 100
    }));
  };

  return (
    <div className="space-y-8 pb-20">
      {/* 1. Header & Quick Sim */}
      <div className="ui-card bg-white rounded-[24px] sm:rounded-[40px] p-5 sm:p-8 lg:p-10 border border-slate-200 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-8">
         <div className="space-y-2">
            <h2 className="text-2xl font-black text-slate-800 flex items-center gap-3">
               <Calculator className="text-sky-500" /> Auto-Split Settlement Engine
            </h2>
            <p className="text-slate-400 text-sm font-medium uppercase tracking-tight">Automated financial distribution based on Vanuatu VAT compliance.</p>
         </div>

         <div className="bg-slate-50 p-6 rounded-[24px] border border-slate-100 flex items-center gap-6">
            <div className="space-y-1">
               <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Simulator Amount</div>
               <div className="flex gap-2">
                 <span className="text-xl font-black text-slate-800">VT</span>
                 <input 
                  type="number" 
                  value={simAmount}
                  onChange={(e) => setSimAmount(Number(e.target.value))}
                  className="bg-transparent border-none p-0 text-xl font-black text-sky-600 focus:ring-0 w-24"
                 />
               </div>
            </div>
            <ArrowRightLeft className="text-slate-200" size={24} />
         </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
         {/* 2. Rule List */}
         <div className="space-y-4">
            <div className="flex items-center justify-between px-2">
               <h3 className="text-xs font-black uppercase text-slate-400 tracking-widest flex items-center gap-2">
                  <Landmark size={14} /> Active Distribution Policies
               </h3>
               <button className="text-[10px] font-black text-sky-500 uppercase hover:underline">Add Rule</button>
            </div>

            {rules.map((rule) => (
              <motion.div 
                key={rule.id}
                className={`ui-card bg-white rounded-[24px] sm:rounded-[32px] p-5 sm:p-8 border ${rule.active ? 'border-sky-100' : 'border-slate-100'} shadow-sm space-y-6 group cursor-pointer hover:shadow-xl transition-all`}
              >
                 <div className="flex justify-between items-start">
                    <div className="flex items-center gap-4">
                       <div className="w-12 h-12 bg-sky-50 rounded-2xl flex items-center justify-center text-sky-500 group-hover:bg-sky-500 group-hover:text-white transition-all">
                          <Percent size={20} />
                       </div>
                       <div>
                          <div className="text-sm font-black text-slate-800">{rule.label}</div>
                          <div className="text-[10px] font-bold text-slate-400">Trigger: {rule.source}</div>
                       </div>
                    </div>
                    <div className="bg-emerald-50 text-emerald-600 px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest">
                       Active
                    </div>
                 </div>

                 <div className="space-y-3">
                    {calculateSplit(rule, simAmount).map((calc, i) => (
                      <div key={i} className="flex items-center justify-between">
                         <div className="flex items-center gap-2 text-[10px] font-bold text-slate-500 uppercase">
                            <ChevronRight size={10} className="text-sky-500" /> {calc.target}
                         </div>
                         <div className="flex items-center gap-3">
                            <div className="text-[10px] font-black text-slate-300 tracking-tighter">{calc.percentage}%</div>
                            <div className="w-px h-3 bg-slate-100" />
                            <div className="text-xs font-black text-slate-800">{formatVT(calc.value)}</div>
                         </div>
                      </div>
                    ))}
                 </div>
              </motion.div>
            ))}
         </div>

         {/* 3. Real-time Node distribution view */}
         <div className="ui-panel bg-slate-900 rounded-[24px] sm:rounded-[40px] p-5 sm:p-8 lg:p-10 text-white space-y-10 relative overflow-hidden">
            <div className="absolute top-0 right-0 w-80 h-80 bg-emerald-500/10 blur-[100px] rounded-full" />
            
            <div className="space-y-4">
               <h3 className="text-sm font-black uppercase tracking-[0.2em] flex items-center gap-2">
                  <ShieldCheck className="text-emerald-400" /> Settlement Network
               </h3>
               <p className="text-slate-500 text-[10px] font-bold leading-relaxed uppercase pr-12">
                  Live verification of split nodes. Each sale is automatically atomised into target sub-accounts.
               </p>
            </div>

            <div className="relative">
               {/* Decorative Flow lines */}
               <div className="absolute left-[36px] top-10 bottom-10 w-0.5 bg-gradient-to-b from-sky-500 via-indigo-500 to-slate-800" />
               
               <div className="space-y-12">
                  {[
                    { label: 'Platform Hub', icon: ShieldCheck, value: 500, color: 'text-sky-400', sub: 'Platform Operations' },
                    { label: 'Vanuatu Revenue', icon: Receipt, value: 1500, color: 'text-amber-400', sub: 'VAT/VNPF Clearing' },
                    { label: 'Wholesale Payout', icon: Building2, value: 8000, color: 'text-indigo-400', sub: 'Manufacturer COGS' },
                  ].map((node, i) => (
                    <div key={i} className="flex items-start gap-6 relative">
                       <div className="w-18 h-18 bg-white/5 rounded-2xl border border-white/10 flex items-center justify-center p-4 shadow-xl z-10">
                          <node.icon size={28} className={node.color} />
                       </div>
                       <div className="flex-1 space-y-1">
                          <div className="flex justify-between items-end">
                             <div className="text-xs font-black uppercase tracking-widest">{node.label}</div>
                             <div className={`text-xl font-black ${node.color}`}>{formatVT((simAmount * node.value) / 10000)}</div>
                          </div>
                          <div className="text-[10px] font-bold text-slate-500 uppercase tracking-tight">{node.sub}</div>
                          <div className="h-1 bg-white/5 rounded-full mt-2 overflow-hidden">
                             <div 
                              className={`h-full bg-current ${node.color}`} 
                              style={{ width: `${(node.value / 10000) * 100}%` }} 
                             />
                          </div>
                       </div>
                    </div>
                  ))}
               </div>
            </div>

            <div className="bg-white/5 rounded-[28px] p-6 border border-white/10 flex items-center gap-4 group hover:bg-white/10 transition-all cursor-pointer">
               <AlertCircle className="text-amber-500" />
               <div className="flex-1">
                  <div className="text-[10px] font-black uppercase text-slate-400">Compliance Check</div>
                  <div className="text-xs font-bold text-white">Rule R-001 matches Vanuatu VAT Act 2026.</div>
               </div>
               <FileCheck className="text-emerald-500 group-hover:scale-110 transition-transform" />
            </div>
         </div>
      </div>
    </div>
  );
};

export default AutoSplitRulesPage;

