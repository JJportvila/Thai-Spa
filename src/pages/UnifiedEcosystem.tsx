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
              <h3 className="text-sm font-black uppercase tracking-widest text-slate-500">网络主体</h3>
              <div className="flex gap-2">
                 {(['WHOLESALER', 'PLATFORM', 'RETAILER'] as UserRole[]).map(role => (
                   <button 
                    key={role}
                    onClick={() => setSelectedRole(role)}
                    className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase transition-all ${
                      selectedRole === role ? 'bg-white text-[#1a237e] shadow-lg' : 'bg-slate-50 text-slate-500 hover:bg-slate-100'
                    }`}
                   >
                     {role === 'WHOLESALER' ? '批发商' : role === 'PLATFORM' ? '平台' : '零售商'}
                   </button>
                 ))}
              </div>
           </div>
           
           <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {entities.filter(e => e.role === selectedRole).map(entity => (
                <div key={entity.id} className="p-6 bg-slate-50 rounded-2xl border border-slate-100 space-y-4 group hover:border-[#dbe7ff] transition-all">
                   <div className="flex justify-between items-start">
                      <div className="p-3 bg-white rounded-xl shadow-sm">
                         {entity.role === 'WHOLESALER' ? <Building2 className="text-[#1a237e]" /> : 
                          entity.role === 'PLATFORM' ? <ShieldCheck className="text-[#1a237e]" /> : 
                          <Store className="text-[#1a237e]" />}
                      </div>
                      <div className="text-right">
                         <div className="text-[10px] font-black text-slate-500 uppercase tracking-tighter">
                            {entity.id} {entity.sub_type && (
                               <span className={`ml-2 px-2 py-0.5 rounded-md ${entity.sub_type === 'DIRECT' ? 'bg-[#1a237e] text-[#1a237e]' : 'bg-slate-200 text-slate-500'}`}>
                                  {entity.sub_type === 'DIRECT' ? '直营' : '外部'}
                               </span>
                            )}
                         </div>
                         <div className="text-xs font-black text-slate-800">{entity.name}</div>
                      </div>
                   </div>
                   <div className="pt-2 border-t border-slate-200 flex justify-between items-end">
                      <div>
                         <div className="text-[9px] font-black text-slate-500 uppercase">余额</div>
                         <div className={`text-lg font-black ${entity.balance < 0 ? 'text-[#1a237e]' : 'text-slate-800'}`}>
                            {formatVT(entity.balance)}
                         </div>
                      </div>
                      <div className="text-right">
                         <div className="text-[9px] font-black text-slate-500 uppercase tracking-tighter">授信额度</div>
                         <div className="text-xs font-black text-slate-600 truncate">{formatVT(entity.credit_limit)}</div>
                      </div>
                   </div>
                </div>
              ))}
           </div>
        </div>

        {/* Global Financial Pulse */}
        <div className="ui-panel w-full md:w-80 bg-white rounded-[24px] sm:rounded-[32px] p-5 sm:p-8 text-[#1a237e] space-y-8 shadow-xl">
           <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-[#1a237e] rounded-2xl flex items-center justify-center shadow-lg shadow-slate-200">
                 <Wallet size={20} />
              </div>
              <div>
                 <div className="text-[10px] font-black uppercase text-slate-500 tracking-[0.2em]">平台资金池</div>
                 <div className="text-2xl font-black text-[#1a237e]">{formatVT(1250000)}</div>
              </div>
           </div>
           
           <div className="space-y-4">
              <div className="flex justify-between text-[10px] font-black uppercase">
                 <span className="text-slate-500">预留增值税 (15%)</span>
                 <span className="text-[#1a237e]">+ {formatVT(187500)}</span>
              </div>
              <div className="flex justify-between text-[10px] font-black uppercase">
                 <span className="text-slate-500">退货准备金</span>
                 <span className="text-[#1a237e]">- {formatVT(50000)}</span>
              </div>
              <div className="h-0.5 bg-white" />
              <button className="w-full py-4 bg-white/5 hover:bg-white/10 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all">
                 结算批发商
              </button>
           </div>
        </div>
      </div>

      {/* 2. Exception Handling Terminal (RMA) */}
      <div className="ui-card bg-white rounded-[24px] sm:rounded-[40px] p-5 sm:p-8 lg:p-10 border border-slate-200 shadow-sm space-y-8">
         <div className="flex items-center justify-between">
            <div className="space-y-1">
               <h3 className="text-lg font-black text-slate-800 uppercase tracking-widest flex items-center gap-3">
                  <PackageX className="text-[#1a237e]" /> 异常与退货处理台
               </h3>
               <p className="text-slate-500 text-xs font-medium uppercase tracking-tight">统一处理退货、破损和红字冲减单据。</p>
            </div>
            <div className="flex gap-3">
               <button className="bg-slate-50 text-slate-500 px-6 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest border border-slate-100 flex items-center gap-2">
                  <History size={14} /> 审计日志
               </button>
            </div>
         </div>

         <div className="grid grid-cols-1 gap-6">
            {rmas.map(rma => (
              <motion.div 
                key={rma.id}
                layout
                className={`p-8 rounded-[32px] border-2 ${
                  rma.status === 'PENDING' ? 'bg-[#1a237e] border-[#dbe7ff]' : 'bg-slate-50 border-slate-200'
                } flex flex-col md:flex-row justify-between gap-8 transition-all relative overflow-hidden`}
              >
                 {rma.status === 'PENDING' && (
                   <div className="absolute top-0 right-0 px-6 py-2 bg-[#1a237e] text-[#1a237e] text-[9px] font-black uppercase tracking-widest rounded-bl-2xl">
                     紧急异常
                   </div>
                 )}
                 
                 <div className="flex-1 space-y-6">
                    <div className="flex items-center gap-6">
                       <div className={`p-4 rounded-2xl ${rma.type === 'DAMAGED' ? 'bg-[#1a237e] text-[#1a237e]' : 'bg-[#1a237e] text-[#1a237e]'}`}>
                          {rma.type === 'DAMAGED' ? <AlertTriangle /> : <RefreshCcw />}
                       </div>
                       <div>
                          <div className="text-[10px] font-black text-slate-500 uppercase tracking-widest">{rma.id} 路 {rma.type}</div>
                          <div className="text-xl font-black text-slate-800">
                             {extendedVanuatuProducts.find(p => p.id === rma.productId)?.title}
                          </div>
                          <div className="text-xs font-bold text-slate-500 mt-1 italic">"{rma.reason}"</div>
                       </div>
                    </div>

                    <div className="flex items-center gap-8">
                       <div className="space-y-1">
                          <div className="text-[9px] font-black text-slate-500 uppercase">数量</div>
                          <div className="text-sm font-black text-slate-700">{rma.quantity} 件</div>
                       </div>
                       <div className="w-px h-8 bg-slate-200" />
                       <div className="space-y-1">
                          <div className="text-[9px] font-black text-slate-500 uppercase">退款金额</div>
                          <div className="text-sm font-black text-[#1a237e]">{formatVT(rma.amount)}</div>
                       </div>
                       <div className="w-px h-8 bg-slate-200" />
                       <div className="space-y-1">
                          <div className="text-[9px] font-black text-slate-500 uppercase">来源门店</div>
                          <div className="text-sm font-black text-slate-700 flex items-center gap-2">
                             <Store size={14} className="text-[#1a237e]" /> {entities.find(e => e.id === rma.fromId)?.name}
                          </div>
                       </div>
                    </div>
                 </div>

                 <div className="flex flex-col justify-center gap-3 min-w-[200px]">
                    {rma.status === 'PENDING' ? (
                      <>
                        <button 
                          onClick={() => resolveRMA(rma.id, 'RESOLVED')}
                          className="w-full bg-[#1a237e] text-[#1a237e] py-4 rounded-2xl font-black text-[10px] uppercase tracking-widest flex items-center justify-center gap-2 shadow-xl shadow-slate-200"
                        >
                           <CheckCircle2 size={16} /> 通过退款
                        </button>
                        <button 
                          onClick={() => resolveRMA(rma.id, 'REJECTED')}
                          className="w-full bg-white text-[#1a237e] py-4 rounded-2xl font-black text-[10px] uppercase tracking-widest flex items-center justify-center gap-2 shadow-xl shadow-slate-200"
                        >
                           <XCircle size={16} /> 驳回申请
                        </button>
                      </>
                    ) : (
                      <div className={`w-full py-4 rounded-2xl font-black text-[10px] uppercase tracking-widest flex items-center justify-center gap-2 border-2 ${
                        rma.status === 'RESOLVED' ? 'bg-[#1a237e] text-[#1a237e] border-[#dbe7ff]' : 'bg-slate-100 text-slate-500 border-slate-200'
                      }`}>
                         {rma.status === 'RESOLVED' ? <CheckCircle2 size={16} /> : <XCircle size={16} />} 
                         {rma.status === 'RESOLVED' ? '已生成红字单' : '已驳回申请'}
                      </div>
                    )}
                 </div>
              </motion.div>
            ))}
         </div>
      </div>
      
      {/* 3. Cross-Chain Settlement Matrix */}
      <div className="ui-panel bg-white rounded-[24px] sm:rounded-[40px] p-5 sm:p-8 lg:p-10 text-[#1a237e] relative overflow-hidden">
         <div className="absolute top-0 right-0 w-96 h-96 bg-[#1a237e] blur-[120px] rounded-full -mr-48 -mt-48" />
         
         <div className="relative space-y-10">
            <div className="flex items-center justify-between">
               <h3 className="text-lg font-black uppercase tracking-[0.2em] flex items-center gap-3">
                  <ArrowRightLeft className="text-[#1a237e]" /> 生态结算矩阵
               </h3>
               <span className="bg-[#1a237e] text-[#1a237e] px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest animate-pulse">
                  实时同步
               </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
               <div className="p-8 bg-white/5 rounded-[32px] border border-white/10 space-y-6">
                  <div className="text-[10px] font-black uppercase text-slate-500 tracking-widest">零售商应收</div>
                  <div className="text-3xl font-black text-[#1a237e]">{formatVT(45000)}</div>
                  <div className="text-[9px] font-medium text-slate-500 leading-relaxed uppercase">
                     针对各岛门店的赊销应收，14 天内免息。
                  </div>
               </div>
               <div className="p-8 bg-white/5 rounded-[32px] border border-white/10 space-y-6">
                  <div className="text-[10px] font-black uppercase text-slate-500 tracking-widest">平台周转金</div>
                  <div className="text-3xl font-black text-[#1a237e]">{formatVT(1250000)}</div>
                  <div className="text-[9px] font-medium text-slate-500 leading-relaxed uppercase">
                     用于发货到确认收货之间的资金托管。
                  </div>
               </div>
               <div className="p-8 bg-white/5 rounded-[32px] border border-white/10 space-y-6">
                  <div className="text-[10px] font-black uppercase text-slate-500 tracking-widest">批发商应付</div>
                  <div className="text-3xl font-black text-[#1a237e]">{formatVT(4500000)}</div>
                  <div className="text-[9px] font-medium text-slate-500 leading-relaxed uppercase">
                     面向主要供货商的待结算款项汇总。
                  </div>
               </div>
            </div>

            <button className="ui-btn ui-btn-secondary w-full py-6 rounded-[24px] sm:rounded-[32px] text-xs uppercase tracking-[0.3em] shadow-2xl hover:bg-[#1a237e] hover:text-[#1a237e]">
               生成全局财务报表
            </button>
         </div>
      </div>
    </div>
  );
};

export default UnifiedEcosystemPage;


