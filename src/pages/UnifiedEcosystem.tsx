import React, { useState } from 'react';
import { 
  Building2, 
  Store, 
  ShieldCheck, 
  History, 
  FileText, 
  UserPlus, 
  ArrowRightLeft, 
  Wallet,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  RefreshCcw,
  PackageX
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import { formatVT } from '../lib/utils';
import { extendedVanuatuProducts } from '../lib/mockDataFull';
import { StretAccount, RetailerSubType } from '../lib/accountService';

type UserRole = 'WHOLESALER' | 'PLATFORM' | 'RETAILER';

interface AccountEntity extends StretAccount {
  retailerType?: RetailerSubType; // Map DB sub_type to UI
}

interface ExceptionalTransaction {
  id: string;
  type: 'RETURN' | 'DAMAGED' | 'DISPUTE';
  productId: string;
  quantity: number;
  fromId: string; // Retailer
  toId: string;   // Platform or Wholesaler
  status: 'PENDING' | 'RESOLVED' | 'REJECTED';
  amount: number;
  timestamp: string;
  reason: string;
}

const UnifiedEcosystemPage: React.FC = () => {
  const { t } = useTranslation();
  const [selectedRole, setSelectedRole] = useState<UserRole>('PLATFORM');
  const [showRMA, setShowRMA] = useState(false);

  // Mock Entities
  const entities: AccountEntity[] = [
    { id: 'W-001', name: 'Vanuatu Bev Wholesaler', role: 'WHOLESALER', balance: 4500000, credit_limit: 10000000, location: 'Port Vila Industrial' },
    { id: 'P-001', name: 'Stret Platform Hub', role: 'PLATFORM', balance: 1250000, credit_limit: 5000000, location: 'Main Wharf Road' },
    { id: 'R-001', name: 'Aore Island Store (Direct)', role: 'RETAILER', sub_type: 'DIRECT', balance: -45000, credit_limit: 200000, location: 'Santo Coast' },
    { id: 'R-002', name: 'Sunrise Mini-Mart', role: 'RETAILER', sub_type: 'EXTERNAL', balance: 12000, credit_limit: 150000, location: 'Tanna Airport' },
    { id: 'R-003', name: 'Efate North Hub (Direct)', role: 'RETAILER', sub_type: 'DIRECT', balance: 85000, credit_limit: 300000, location: 'Civic Centre' },
  ];

  // Mock RMAs (Returns/Damages)
  const [rmas, setRmas] = useState<ExceptionalTransaction[]>([
    { id: 'RMA-501', type: 'DAMAGED', productId: 'P-001', quantity: 12, fromId: 'R-001', toId: 'P-001', status: 'PENDING', amount: 36000, timestamp: '2026-03-21 16:00', reason: 'Crushed during shipping 4x4' },
    { id: 'RMA-502', type: 'RETURN', productId: 'P-005', quantity: 50, fromId: 'R-002', toId: 'P-001', status: 'RESOLVED', amount: 15000, timestamp: '2026-03-21 11:30', reason: 'Expired stock refill' },
  ]);

  const resolveRMA = (id: string, status: 'RESOLVED' | 'REJECTED') => {
    setRmas(prev => prev.map(r => r.id === id ? { ...r, status } : r));
  };

  return (
    <div className="space-y-8 pb-20">
      {/* 1. Account Selection & Pulse */}
      <div className="flex flex-col md:flex-row gap-6">
        <div className="ui-card flex-1 bg-white rounded-[24px] sm:rounded-[32px] p-5 sm:p-8 border border-slate-200 shadow-sm space-y-6">
           <div className="flex items-center justify-between">
              <h3 className="text-sm font-black uppercase tracking-widest text-slate-400">Network Entities</h3>
              <div className="flex gap-2">
                 {(['WHOLESALER', 'PLATFORM', 'RETAILER'] as UserRole[]).map(role => (
                   <button 
                    key={role}
                    onClick={() => setSelectedRole(role)}
                    className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase transition-all ${
                      selectedRole === role ? 'bg-slate-900 text-white shadow-lg' : 'bg-slate-50 text-slate-400 hover:bg-slate-100'
                    }`}
                   >
                     {role}
                   </button>
                 ))}
              </div>
           </div>
           
           <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {entities.filter(e => e.role === selectedRole).map(entity => (
                <div key={entity.id} className="p-6 bg-slate-50 rounded-2xl border border-slate-100 space-y-4 group hover:border-sky-500 transition-all">
                   <div className="flex justify-between items-start">
                      <div className="p-3 bg-white rounded-xl shadow-sm">
                         {entity.role === 'WHOLESALER' ? <Building2 className="text-indigo-500" /> : 
                          entity.role === 'PLATFORM' ? <ShieldCheck className="text-sky-500" /> : 
                          <Store className="text-emerald-500" />}
                      </div>
                      <div className="text-right">
                         <div className="text-[10px] font-black text-slate-400 uppercase tracking-tighter">
                            {entity.id} {entity.sub_type && (
                               <span className={`ml-2 px-2 py-0.5 rounded-md ${entity.sub_type === 'DIRECT' ? 'bg-indigo-500 text-white' : 'bg-slate-200 text-slate-500'}`}>
                                  {entity.sub_type === 'DIRECT' ? 'Direct (鐩磋惀)' : 'External (鍏朵粬)'}
                               </span>
                            )}
                         </div>
                         <div className="text-xs font-black text-slate-800">{entity.name}</div>
                      </div>
                   </div>
                   <div className="pt-2 border-t border-slate-200 flex justify-between items-end">
                      <div>
                         <div className="text-[9px] font-black text-slate-400 uppercase">Balance</div>
                         <div className={`text-lg font-black ${entity.balance < 0 ? 'text-rose-500' : 'text-slate-800'}`}>
                            {formatVT(entity.balance)}
                         </div>
                      </div>
                      <div className="text-right">
                         <div className="text-[9px] font-black text-slate-400 uppercase tracking-tighter">Line of Credit</div>
                         <div className="text-xs font-black text-slate-600 truncate">{formatVT(entity.credit_limit)}</div>
                      </div>
                   </div>
                </div>
              ))}
           </div>
        </div>

        {/* Global Financial Pulse */}
        <div className="ui-panel w-full md:w-80 bg-slate-900 rounded-[24px] sm:rounded-[32px] p-5 sm:p-8 text-white space-y-8 shadow-xl">
           <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-sky-500 rounded-2xl flex items-center justify-center shadow-lg shadow-sky-500/20">
                 <Wallet size={20} />
              </div>
              <div>
                 <div className="text-[10px] font-black uppercase text-slate-500 tracking-[0.2em]">Stret Treasury</div>
                 <div className="text-2xl font-black text-white">{formatVT(1250000)}</div>
              </div>
           </div>
           
           <div className="space-y-4">
              <div className="flex justify-between text-[10px] font-black uppercase">
                 <span className="text-slate-500">VAT (15%) Reserved</span>
                 <span className="text-emerald-400">+ {formatVT(187500)}</span>
              </div>
              <div className="flex justify-between text-[10px] font-black uppercase">
                 <span className="text-slate-500">RMA Reserve</span>
                 <span className="text-rose-400">- {formatVT(50000)}</span>
              </div>
              <div className="h-0.5 bg-slate-800" />
              <button className="w-full py-4 bg-white/5 hover:bg-white/10 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all">
                 Settle Wholesalers
              </button>
           </div>
        </div>
      </div>

      {/* 2. Exception Handling Terminal (RMA) */}
      <div className="ui-card bg-white rounded-[24px] sm:rounded-[40px] p-5 sm:p-8 lg:p-10 border border-slate-200 shadow-sm space-y-8">
         <div className="flex items-center justify-between">
            <div className="space-y-1">
               <h3 className="text-lg font-black text-slate-800 uppercase tracking-widest flex items-center gap-3">
                  <PackageX className="text-rose-500" /> Exception & RMA Terminal
               </h3>
               <p className="text-slate-400 text-xs font-medium uppercase tracking-tight">Managing returns, breakages, and credit notes across the chain.</p>
            </div>
            <div className="flex gap-3">
               <button className="bg-slate-50 text-slate-400 px-6 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest border border-slate-100 flex items-center gap-2">
                  <History size={14} /> Audit Log
               </button>
            </div>
         </div>

         <div className="grid grid-cols-1 gap-6">
            {rmas.map(rma => (
              <motion.div 
                key={rma.id}
                layout
                className={`p-8 rounded-[32px] border-2 ${
                  rma.status === 'PENDING' ? 'bg-rose-50/50 border-rose-100' : 'bg-slate-50 border-slate-200'
                } flex flex-col md:flex-row justify-between gap-8 transition-all relative overflow-hidden`}
              >
                 {rma.status === 'PENDING' && (
                   <div className="absolute top-0 right-0 px-6 py-2 bg-rose-500 text-white text-[9px] font-black uppercase tracking-widest rounded-bl-2xl">
                     Urgent Exception
                   </div>
                 )}
                 
                 <div className="flex-1 space-y-6">
                    <div className="flex items-center gap-6">
                       <div className={`p-4 rounded-2xl ${rma.type === 'DAMAGED' ? 'bg-rose-100 text-rose-600' : 'bg-amber-100 text-amber-600'}`}>
                          {rma.type === 'DAMAGED' ? <AlertTriangle /> : <RefreshCcw />}
                       </div>
                       <div>
                          <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{rma.id} 路 {rma.type}</div>
                          <div className="text-xl font-black text-slate-800">
                             {extendedVanuatuProducts.find(p => p.id === rma.productId)?.title}
                          </div>
                          <div className="text-xs font-bold text-slate-500 mt-1 italic">"{rma.reason}"</div>
                       </div>
                    </div>

                    <div className="flex items-center gap-8">
                       <div className="space-y-1">
                          <div className="text-[9px] font-black text-slate-400 uppercase">Quantity</div>
                          <div className="text-sm font-black text-slate-700">{rma.quantity} Units</div>
                       </div>
                       <div className="w-px h-8 bg-slate-200" />
                       <div className="space-y-1">
                          <div className="text-[9px] font-black text-slate-400 uppercase">Refund Value</div>
                          <div className="text-sm font-black text-rose-600">{formatVT(rma.amount)}</div>
                       </div>
                       <div className="w-px h-8 bg-slate-200" />
                       <div className="space-y-1">
                          <div className="text-[9px] font-black text-slate-400 uppercase">From Retailer</div>
                          <div className="text-sm font-black text-slate-700 flex items-center gap-2">
                             <Store size={14} className="text-emerald-500" /> {entities.find(e => e.id === rma.fromId)?.name}
                          </div>
                       </div>
                    </div>
                 </div>

                 <div className="flex flex-col justify-center gap-3 min-w-[200px]">
                    {rma.status === 'PENDING' ? (
                      <>
                        <button 
                          onClick={() => resolveRMA(rma.id, 'RESOLVED')}
                          className="w-full bg-emerald-500 text-white py-4 rounded-2xl font-black text-[10px] uppercase tracking-widest flex items-center justify-center gap-2 shadow-xl shadow-emerald-100"
                        >
                           <CheckCircle2 size={16} /> Approve Credit Note
                        </button>
                        <button 
                          onClick={() => resolveRMA(rma.id, 'REJECTED')}
                          className="w-full bg-slate-900 text-white py-4 rounded-2xl font-black text-[10px] uppercase tracking-widest flex items-center justify-center gap-2 shadow-xl shadow-slate-200"
                        >
                           <XCircle size={16} /> Reject Claim
                        </button>
                      </>
                    ) : (
                      <div className={`w-full py-4 rounded-2xl font-black text-[10px] uppercase tracking-widest flex items-center justify-center gap-2 border-2 ${
                        rma.status === 'RESOLVED' ? 'bg-emerald-50 text-emerald-600 border-emerald-100' : 'bg-slate-100 text-slate-400 border-slate-200'
                      }`}>
                         {rma.status === 'RESOLVED' ? <CheckCircle2 size={16} /> : <XCircle size={16} />} 
                         {rma.status === 'RESOLVED' ? 'Credit Note Issued' : 'Claim Rejected'}
                      </div>
                    )}
                 </div>
              </motion.div>
            ))}
         </div>
      </div>
      
      {/* 3. Cross-Chain Settlement Matrix */}
      <div className="ui-panel bg-slate-900 rounded-[24px] sm:rounded-[40px] p-5 sm:p-8 lg:p-10 text-white relative overflow-hidden">
         <div className="absolute top-0 right-0 w-96 h-96 bg-sky-500/10 blur-[120px] rounded-full -mr-48 -mt-48" />
         
         <div className="relative space-y-10">
            <div className="flex items-center justify-between">
               <h3 className="text-lg font-black uppercase tracking-[0.2em] flex items-center gap-3">
                  <ArrowRightLeft className="text-sky-400" /> Ecosystem Settlement Matrix
               </h3>
               <span className="bg-sky-500 text-white px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest animate-pulse">
                  Live Sync
               </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
               <div className="p-8 bg-white/5 rounded-[32px] border border-white/10 space-y-6">
                  <div className="text-[10px] font-black uppercase text-slate-500 tracking-widest">Retailer Debts</div>
                  <div className="text-3xl font-black text-rose-400">{formatVT(45000)}</div>
                  <div className="text-[9px] font-medium text-slate-400 leading-relaxed uppercase">
                     Outstanding credit extended to small island stores. Interest-free within 14 days.
                  </div>
               </div>
               <div className="p-8 bg-white/5 rounded-[32px] border border-white/10 space-y-6">
                  <div className="text-[10px] font-black uppercase text-slate-500 tracking-widest">Platform Float</div>
                  <div className="text-3xl font-black text-sky-400">{formatVT(1250000)}</div>
                  <div className="text-[9px] font-medium text-slate-400 leading-relaxed uppercase">
                     Active escrow balance holding funds between delivery and confirmation.
                  </div>
               </div>
               <div className="p-8 bg-white/5 rounded-[32px] border border-white/10 space-y-6">
                  <div className="text-[10px] font-black uppercase text-slate-500 tracking-widest">Wholesaler Payouts</div>
                  <div className="text-3xl font-black text-indigo-400">{formatVT(4500000)}</div>
                  <div className="text-[9px] font-medium text-slate-400 leading-relaxed uppercase">
                     Total payables to primary manufacturers like Vanuatu Beverages.
                  </div>
               </div>
            </div>

            <button className="ui-btn ui-btn-secondary w-full py-6 rounded-[24px] sm:rounded-[32px] text-xs uppercase tracking-[0.3em] shadow-2xl hover:bg-sky-500 hover:text-white">
               Generate Global Financial Statement
            </button>
         </div>
      </div>
    </div>
  );
};

export default UnifiedEcosystemPage;

