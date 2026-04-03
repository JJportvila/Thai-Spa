import React, { useEffect, useMemo, useState } from 'react';
import { ArrowDownRight, ArrowUpRight, Package, TrendingUp, Truck, Users } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { StretAccount } from '../lib/accountService';
import { getCashierCandidates } from '../lib/employeeStore';
import { closePosDay, closePosMonth, getPosOpsState, handoverPosShift, startPosShift } from '../lib/posOpsStore';
import { formatVT } from '../lib/utils';

const DashboardPage: React.FC<{ userAccount?: StretAccount }> = ({ userAccount }) => {
  const { t } = useTranslation();
  const [ops, setOps] = useState(() => (userAccount?.id ? getPosOpsState(userAccount.id) : getPosOpsState('')));
  const [startCashier, setStartCashier] = useState('');
  const [handoverTo, setHandoverTo] = useState('');

  useEffect(() => {
    if (!userAccount?.id) return;
    setOps(getPosOpsState(userAccount.id));
    const cashiers = getCashierCandidates(userAccount.id);
    setStartCashier(cashiers[0]?.name || userAccount.name);
  }, [userAccount?.id, userAccount?.name]);

  const cashiers = useMemo(() => getCashierCandidates(userAccount?.id || ''), [userAccount?.id, ops.activeShift?.cashierName]);

  const canHandover = !!ops.activeShift && !!handoverTo.trim() && handoverTo.trim() !== ops.activeShift?.cashierName;
  const latestMonth = ops.monthClosures[0];

  const stats = [
    { label: '今日营收', value: ops.activeShift?.salesAmount || 0, trend: '实收', isUp: true, icon: TrendingUp, isCurrency: true },
    { label: '待配送', value: 5, trend: '-2', isUp: false, icon: Truck, isCurrency: false },
    { label: '在线员工', value: cashiers.length, trend: '收银可用', isUp: true, icon: Users, isCurrency: false },
    { label: '低库存SKU', value: 14, trend: '待补货', isUp: false, icon: Package, isCurrency: false },
  ];

  return (
    <div className="space-y-4 sm:space-y-6 lg:space-y-8 pb-12">
      <div className="ui-card bg-white rounded-[24px] sm:rounded-[32px] p-5 sm:p-6 border border-slate-200 shadow-sm space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          <h3 className="font-black text-slate-900 text-base sm:text-lg">收银 / 交班 / 日结 / 月结</h3>
          <span className={`px-2.5 py-1 rounded-full text-xs font-black ${ops.activeShift ? 'bg-emerald-50 text-emerald-600' : 'bg-slate-100 text-slate-500'}`}>
            {ops.activeShift ? `当班：${ops.activeShift.cashierName}` : '未开始收银班次'}
          </span>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <div className="bg-slate-50 rounded-xl p-3 text-xs text-slate-600">当班单数：{ops.activeShift?.salesCount || 0}</div>
          <div className="bg-slate-50 rounded-xl p-3 text-xs text-slate-600">当班金额：{formatVT(ops.activeShift?.salesAmount || 0)}</div>
          <div className="bg-slate-50 rounded-xl p-3 text-xs text-slate-600">最近日结：{ops.dayClosures[0]?.businessDate || '无'}</div>
          <div className="bg-slate-50 rounded-xl p-3 text-xs text-slate-600">最近月结：{latestMonth?.businessMonth || '无'}</div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-2">
          {!ops.activeShift ? (
            <>
              <select
                value={startCashier}
                onChange={(e) => setStartCashier(e.target.value)}
                className="bg-slate-50 border border-slate-200 rounded-lg px-3 py-2.5 text-xs outline-none"
              >
                {cashiers.map((c) => (
                  <option key={c.id} value={c.name}>{c.name}</option>
                ))}
              </select>
              <button
                onClick={() => userAccount?.id && setOps(startPosShift(userAccount.id, startCashier || userAccount.name))}
                className="ui-btn ui-btn-primary px-4 py-2.5 rounded-lg text-xs"
              >
                开始收银
              </button>
            </>
          ) : (
            <>
              <select
                value={handoverTo}
                onChange={(e) => setHandoverTo(e.target.value)}
                className="bg-slate-50 border border-slate-200 rounded-lg px-3 py-2.5 text-xs outline-none"
              >
                <option value="">选择接班员工</option>
                {cashiers
                  .filter((c) => c.name !== ops.activeShift?.cashierName)
                  .map((c) => (
                    <option key={c.id} value={c.name}>{c.name}</option>
                  ))}
              </select>
              <button
                onClick={() => userAccount?.id && canHandover && setOps(handoverPosShift(userAccount.id, handoverTo.trim()))}
                className="ui-btn ui-btn-secondary px-4 py-2.5 rounded-lg text-xs"
                disabled={!canHandover}
              >
                交班
              </button>
            </>
          )}

          <button
            onClick={() => userAccount?.id && setOps(closePosDay(userAccount.id, ops.activeShift?.cashierName || userAccount.name))}
            className="ui-btn px-4 py-2.5 rounded-lg text-xs bg-emerald-500 text-white hover:bg-emerald-600"
            disabled={!ops.activeShift}
          >
            日结
          </button>
          <button
            onClick={() => userAccount?.id && setOps(closePosMonth(userAccount.id, ops.activeShift?.cashierName || userAccount.name))}
            className="ui-btn px-4 py-2.5 rounded-lg text-xs bg-indigo-500 text-white hover:bg-indigo-600"
          >
            月结
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4 sm:gap-6">
        {stats.map((stat, i) => (
          <div key={i} className="ui-card bg-white p-4 sm:p-6 rounded-3xl border border-slate-200 shadow-sm hover:shadow-md transition-all">
            <div className="flex items-center justify-between mb-4">
              <div className="p-3 bg-slate-50 text-slate-500 rounded-2xl">
                <stat.icon size={22} />
              </div>
              <div className={`flex items-center gap-1 text-[10px] font-black uppercase px-2 py-1 rounded-lg ${stat.isUp ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-rose-600'}`}>
                {stat.isUp ? <ArrowUpRight size={10} /> : <ArrowDownRight size={10} />}
                {stat.trend}
              </div>
            </div>
            <div className="space-y-1">
              <span className="text-xs font-black text-slate-400 uppercase tracking-widest">{stat.label}</span>
              <div className="text-2xl font-black text-slate-900">{stat.isCurrency ? formatVT(stat.value as number) : stat.value}</div>
            </div>
          </div>
        ))}
      </div>

      <div className="ui-card bg-white rounded-[24px] sm:rounded-[32px] p-5 sm:p-8 border border-slate-200 shadow-sm">
        <h3 className="font-black text-slate-900 mb-4">{t('recentActivity')}</h3>
        <p className="text-sm text-slate-500">收银、交班、日结和月结已打通。收银在 POS 完成，交班/结算在仪表盘执行。</p>
      </div>
    </div>
  );
};

export default DashboardPage;
