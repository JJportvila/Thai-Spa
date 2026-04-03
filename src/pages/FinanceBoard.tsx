import React from 'react';
import { 
  TrendingUp, 
  TrendingDown, 
  Wallet, 
  Building2, 
  Users, 
  ArrowUpRight,
  ShieldCheck,
  FileText,
  Download
} from 'lucide-react';
import { formatVT } from '../lib/utils';
import { VAT_RATE, VNPF_EMPLOYEE_RATE, VNPF_EMPLOYER_RATE } from '../lib/constants';
import { useTranslation } from 'react-i18next';

const FinanceBoardPage: React.FC = () => {
  const { t } = useTranslation();
  // Mock data representing a daily summary
  const dailyGross = 250000;
  const gasExpenses = 12000;
  const salariesGross = 45000;
  
  // Logic calculations
  const vatAmount = dailyGross - (dailyGross / (1 + VAT_RATE));
  const netRevenue = dailyGross - vatAmount;
  
  const vnpfEmployee = salariesGross * VNPF_EMPLOYEE_RATE;
  const vnpfEmployer = salariesGross * VNPF_EMPLOYER_RATE;
  const totalSalariesCost = salariesGross + vnpfEmployer;
  
  const netProfit = netRevenue - gasExpenses - totalSalariesCost;

  const stats = [
    { label: t('grossRevenue'), value: dailyGross, color: 'text-slate-400', icon: Wallet },
    { label: t('vatLiability'), value: -vatAmount, color: 'text-rose-500', icon: ShieldCheck },
    { label: t('gasFuel'), value: -gasExpenses, color: 'text-rose-400', icon: TrendingDown },
    { label: t('staffCost'), value: -totalSalariesCost, color: 'text-rose-400', icon: Users },
  ];

  return (
    <div className="max-w-6xl mx-auto space-y-4 sm:space-y-6 lg:space-y-8 pb-12">
      {/* Top Banner - Net Profit */}
      <div className="bg-gradient-to-br from-slate-900 to-slate-800 ui-panel rounded-[24px] sm:rounded-[40px] p-5 sm:p-7 lg:p-10 text-white relative overflow-hidden shadow-2xl">
        <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-500/10 blur-3xl rounded-full" />
        <div className="absolute -bottom-20 -left-20 w-80 h-80 bg-sky-500/5 blur-3xl rounded-full" />
        
        <div className="relative z-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-5 sm:gap-8">
          <div className="space-y-3 sm:space-y-4 text-left">
            <h3 className="ui-kicker text-emerald-400 flex items-center gap-2">
              <span className="w-2 h-2 bg-emerald-400 rounded-full animate-pulse" />
              {t('netProfit')}
            </h3>
            <div className="text-4xl sm:text-5xl lg:text-6xl font-black tracking-tight break-all">{formatVT(netProfit)}</div>
            <p className="text-slate-400 text-sm max-w-md font-medium">
              {t('netProfitDesc')}
            </p>
          </div>
          
          <div className="flex w-full sm:w-auto gap-3 sm:gap-4">
            <button className="ui-btn ui-btn-primary flex-1 sm:flex-none px-6 sm:px-8 py-3.5 sm:py-4 rounded-2xl text-xs sm:text-sm flex items-center justify-center gap-2 shadow-xl shadow-sky-500/20">
              <Download size={18} /> Export CSV
            </button>
            <button className="ui-btn bg-slate-700 hover:bg-slate-600 text-white px-5 sm:px-8 py-3.5 sm:py-4 rounded-2xl text-xs sm:text-sm flex items-center justify-center gap-2">
              <FileText size={18} /> 
            </button>
          </div>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4 sm:gap-6">
        {stats.map((stat, i) => (
          <div key={i} className="ui-card bg-white p-4 sm:p-6 rounded-3xl border border-slate-200 shadow-sm transition-all hover:translate-y-[-4px]">
            <div className="flex items-center gap-3 text-slate-400 mb-4">
              <div className="p-2 bg-slate-50 rounded-xl">
                <stat.icon size={20} />
              </div>
              <span className="text-xs font-black uppercase tracking-widest">{stat.label}</span>
            </div>
            <div className={`text-2xl font-black ${stat.color}`}>
              {stat.value < 0 ? '-' : ''}{formatVT(Math.abs(stat.value))}
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6 lg:gap-8">
        {/* VNPF Breakdown */}
        <div className="ui-card bg-white rounded-[24px] sm:rounded-[32px] p-5 sm:p-8 border border-slate-200 shadow-sm space-y-6 sm:space-y-8">
          <div className="flex items-center justify-between">
            <h3 className="font-black text-slate-800 uppercase tracking-widest text-sm flex items-center gap-2">
              <span className="w-1.5 h-1.5 bg-sky-500 rounded-full" />
              {t('vnpfLiability')}
            </h3>
            <span className="bg-sky-50 text-sky-600 px-3 py-1 rounded-full text-[10px] font-black tracking-widest uppercase">
              {t('currentPeriod')}
            </span>
          </div>

          <div className="space-y-6">
            <div className="flex justify-between items-center group">
              <div>
                <div className="font-black text-slate-800 group-hover:text-sky-500 transition-colors">{t('vnpfEmployee')}</div>
                <div className="text-xs text-slate-400 font-medium tracking-tight">6% Automatically deducted from gross</div>
              </div>
              <div className="text-right font-black text-slate-700">{formatVT(vnpfEmployee)}</div>
            </div>
            
            <div className="h-px bg-slate-50" />

            <div className="flex justify-between items-center group">
              <div>
                <div className="font-black text-slate-800 group-hover:text-sky-500 transition-colors">{t('employerContribution')}</div>
                <div className="text-xs text-slate-400 font-medium tracking-tight">{t('employerContributionDescription', { rate: '6%' })}</div>
              </div>
              <div className="text-right font-black text-slate-700">{formatVT(vnpfEmployer)}</div>
            </div>

              <div className="bg-slate-900 rounded-2xl p-4 sm:p-6 flex justify-between items-center mt-6 sm:mt-8 gap-3">
                <div className="text-xs font-black text-slate-400 uppercase tracking-[0.2em]">{t('totalVNPF')}</div>
                <div className="text-xl sm:text-2xl font-black text-sky-400 break-all text-right">{formatVT(vnpfEmployee + vnpfEmployer)}</div>
              </div>
            </div>
          </div>
  
          {/* VAT Snapshot */}
          <div className="ui-card bg-white rounded-[24px] sm:rounded-[32px] p-5 sm:p-8 border border-slate-200 shadow-sm space-y-6 sm:space-y-8">
            <div className="flex items-center justify-between">
              <h3 className="font-black text-slate-800 uppercase tracking-widest text-sm flex items-center gap-2">
                <span className="w-1.5 h-1.5 bg-rose-500 rounded-full" />
                {t('vatReconciliation')}
              </h3>
            <span className="bg-rose-50 text-rose-600 px-3 py-1 rounded-full text-[10px] font-black tracking-widest uppercase">
              15.0% RATE
            </span>
          </div>

          <div className="space-y-6">
            <div className="flex justify-between items-center">
              <div className="text-slate-400 font-medium uppercase tracking-[0.05em] text-xs">{t('grossReceipts')}</div>
              <div className="font-black text-slate-800">{formatVT(dailyGross)}</div>
            </div>

            <div className="h-px bg-slate-50" />

            <div className="flex justify-between items-center">
              <div className="text-slate-400 font-medium uppercase tracking-[0.05em] text-xs">{t('exemptSubtotal')}</div>
              <div className="font-black text-slate-800">{formatVT(netRevenue)}</div>
            </div>

            <div className="bg-rose-500 rounded-2xl p-4 sm:p-6 flex justify-between items-center mt-6 sm:mt-8 shadow-xl shadow-rose-200/50 gap-3">
              <div className="text-xs font-black text-white/70 uppercase tracking-[0.2em]">{t('vatLiability')}</div>
              <div className="text-xl sm:text-2xl font-black text-white break-all text-right">{formatVT(vatAmount)}</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default FinanceBoardPage;
