import React from 'react';
import { 
  TrendingUp, 
  Users, 
  Package, 
  Truck, 
  ArrowUpRight, 
  ArrowDownRight,
  TrendingDown,
  LayoutDashboard
} from 'lucide-react';
import { formatVT } from '../lib/utils';
import { useTranslation } from 'react-i18next';
import { getFullLocation } from '../lib/productLogic';
import { extendedVanuatuProducts } from '../lib/mockDataFull';
import { StretAccount } from '../lib/accountService';

const DashboardPage: React.FC<{ userAccount?: StretAccount }> = ({ userAccount }) => {
  const { t } = useTranslation();
  const stats = [
    { label: t('todayGross'), value: 250000, trend: '+12%', isUp: true, icon: TrendingUp, isCurrency: true },
    { label: t('pendingDeliveries'), value: 5, trend: '-2', isUp: false, icon: Truck, isCurrency: false },
    { label: t('staffContribution'), value: 8, trend: 'VNPF 已启用', isUp: true, icon: Users, isCurrency: false },
    { label: t('lowStockSKU'), value: 14, trend: '待补货', isUp: false, icon: Package, isCurrency: false },
  ];

  const recentTransactions = [
    { id: 'TX-900', partner: 'Hebrida Market', amount: 45000, status: '已完成', type: '销售' },
    { id: 'TX-901', partner: '供应商 A', amount: 120000, status: '待入账', type: '采购' },
    { id: 'TX-902', partner: 'Au Bon Marche', amount: 89000, status: '已完成', type: '销售' },
  ];

  return (
    <div className="space-y-4 sm:space-y-6 lg:space-y-8 pb-12">
      {/* App Highlights */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4 sm:gap-6">
        {stats.map((stat, i) => (
          <div key={i} className="ui-card bg-white p-4 sm:p-6 rounded-3xl border border-slate-200 shadow-sm hover:shadow-md transition-all">
            <div className="flex items-center justify-between mb-4">
              <div className="p-3 bg-slate-50 text-slate-500 rounded-2xl">
                <stat.icon size={22} />
              </div>
              <div className={`flex items-center gap-1 text-[10px] font-black uppercase px-2 py-1 rounded-lg ${
                stat.isUp ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-rose-600'
              }`}>
                {stat.isUp ? <ArrowUpRight size={10} /> : <ArrowDownRight size={10} />}
                {stat.trend}
              </div>
            </div>
            <div className="space-y-1">
              <span className="text-xs font-black text-slate-400 uppercase tracking-widest">{stat.label}</span>
              <div className="text-2xl font-black text-slate-900">
                {typeof stat.value === 'number' && stat.isCurrency ? formatVT(stat.value) : stat.value}
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6 lg:gap-8">
        {/* Analytics Card */}
        <div className="ui-card lg:col-span-2 bg-white rounded-[24px] sm:rounded-[32px] p-5 sm:p-8 border border-slate-200 shadow-sm space-y-6 sm:space-y-8">
          <div className="flex items-center justify-between">
            <h3 className="font-black text-slate-800 uppercase tracking-widest text-sm flex items-center gap-2">
              <span className="w-1.5 h-1.5 bg-sky-500 rounded-full" />
              {t('volumeAnalysis')}
            </h3>
            <div className="flex gap-2">
              <button className="ui-btn ui-btn-secondary px-3 py-1.5 rounded-xl text-[10px] uppercase tracking-widest">日视图</button>
              <button className="ui-btn ui-btn-primary px-3 py-1.5 rounded-xl text-[10px] uppercase tracking-widest shadow-xl shadow-sky-500/20">周视图</button>
            </div>
          </div>
          
          <div className="h-64 flex items-end justify-between gap-4 px-4">
             {/* Mock chart bars */}
             {[40, 70, 45, 90, 65, 80, 55].map((h, i) => (
               <div key={i} className="flex-1 group relative">
                 <div 
                   style={{ height: `${h}%` }} 
                   className={`w-full rounded-t-2xl transition-all duration-500 group-hover:scale-x-110 ${
                     i === 3 ? 'bg-sky-500 shadow-lg shadow-sky-200' : 'bg-slate-100 group-hover:bg-slate-200'
                   }`} 
                 />
                 <div className="text-center mt-4 text-[10px] font-black text-slate-400 uppercase tracking-tighter">第{i + 1}天</div>
               </div>
             ))}
          </div>
        </div>

        {/* Action Panel */}
        <div className="ui-panel bg-slate-900 rounded-[24px] sm:rounded-[32px] p-5 sm:p-8 text-white shadow-2xl space-y-6 sm:space-y-8 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-32 h-32 bg-sky-500/10 blur-2xl rounded-full" />
          
          <div className="relative z-10 space-y-6">
            <h3 className="text-xs font-black text-slate-400 uppercase tracking-[0.2em]">{t('recentActivity')}</h3>
            <div className="space-y-4">
              {recentTransactions.map((tx, i) => (
                <div key={i} className="flex items-center gap-4 group">
                  <div className={`p-2 rounded-xl bg-slate-800 text-slate-400 group-hover:bg-sky-500 group-hover:text-white transition-all`}>
                    {tx.type === '销售' ? <ArrowUpRight size={16} /> : <TrendingDown size={16} />}
                  </div>
                  <div className="flex-1">
                    <div className="font-black text-sm">{tx.partner}</div>
                    <div className="text-[10px] font-bold text-slate-500 uppercase tracking-tighter">{tx.id} · {tx.status}</div>
                  </div>
                  <div className="text-right">
                    <div className="font-black text-sm">{formatVT(tx.amount)}</div>
                    <div className="text-[10px] font-bold text-sky-500 uppercase">{tx.type}</div>
                  </div>
                </div>
              ))}
            </div>
            
            <button className="ui-btn w-full bg-slate-800 hover:bg-slate-700 py-4 rounded-2xl text-xs uppercase tracking-widest">
              查看审计日志
            </button>
          </div>
        </div>
      </div>

      {/* 仓库实时库存（示意） */}
      <div className="ui-card bg-white rounded-[24px] sm:rounded-[32px] p-5 sm:p-8 border border-slate-200 shadow-sm space-y-6">
        <div className="flex items-center justify-between">
          <h3 className="font-black text-slate-800 uppercase tracking-widest text-sm flex items-center gap-2">
            <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full" />
            仓库实时库存地图（示意）
          </h3>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-6">
          {extendedVanuatuProducts.slice(0, 12).map((product) => (
            <div key={product.id} className="relative group">
              <div className={`absolute -inset-0.5 bg-gradient-to-r ${
                product.zoneColor === 'Green' ? 'from-emerald-500 to-teal-500' :
                product.zoneColor === 'Red' ? 'from-rose-500 to-orange-500' :
                product.zoneColor === 'Blue' ? 'from-sky-500 to-indigo-500' :
                'from-amber-500 to-yellow-500'
              } rounded-2xl blur opacity-25 group-hover:opacity-100 transition duration-1000 group-hover:duration-200`}></div>
              <div className="relative p-5 bg-white border border-slate-100 rounded-2xl shadow-sm space-y-4">
                <div className="flex justify-between items-start gap-4">
                  <div className="flex-1 space-y-1">
                    <div className="font-black text-slate-900 leading-tight">{product.title}</div>
                    <div className="text-[10px] text-slate-400 font-bold uppercase tracking-tight">
                      @{getFullLocation(product, t)}
                    </div>
                  </div>
                  {product.imageUrl && (
                    <div className="w-16 h-16 bg-slate-50 rounded-xl overflow-hidden border border-slate-100 p-1 flex-shrink-0">
                      <img src={product.imageUrl} alt={product.title} className="w-full h-full object-contain" />
                    </div>
                  )}
                </div>
                
                <div className="flex items-center justify-between pt-2 border-t border-slate-50">
                   <div className="flex items-center gap-2">
                      <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse" />
                      <div className="text-sm font-black text-slate-900">{product.stock} <span className="text-[10px] text-slate-400 uppercase">{t('bottles')}</span></div>
                   </div>
                   <div className="text-[10px] text-slate-300 font-medium tracking-widest">{product.barcode}</div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="ui-panel bg-emerald-50 border-2 border-dashed border-emerald-100 rounded-3xl p-5 sm:p-8 flex flex-col md:flex-row items-center justify-between gap-6">
         <div className="flex items-center gap-5">
           <div className="w-16 h-16 bg-emerald-500 rounded-[24px] flex items-center justify-center text-white shadow-xl shadow-emerald-200">
             <ShieldCheckIcon />
           </div>
           <div>
             <h4 className="text-lg font-black text-emerald-900 leading-tight">合规护盾已开启</h4>
             <p className="text-emerald-700/70 text-sm font-medium">系统会自动计算 VNPF（12%）与 VAT（15%）并留档。</p>
           </div>
         </div>
         <span className="bg-emerald-100 text-emerald-700 px-4 py-2 rounded-full text-xs font-black tracking-widest uppercase">
           UTC+11 已校验
         </span>
      </div>
    </div>
  );
};

const ShieldCheckIcon = () => (
  <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
    <path d="m9 12 2 2 4-4" />
  </svg>
);

export default DashboardPage;
