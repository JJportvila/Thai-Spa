import React, { useEffect, useMemo, useState } from 'react';
import { CalendarDays, ChevronLeft, ChevronRight, Download, Printer, SlidersHorizontal } from 'lucide-react';
import { formatVT } from '../lib/utils';
import { ReceiptRecord, syncReceiptRecords } from '../lib/receiptStore';

interface FinanceBoardPageProps {
  accountId?: string;
}

const FinanceBoardPage: React.FC<FinanceBoardPageProps> = ({ accountId }) => {
  const [records, setRecords] = useState<ReceiptRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [headerNow, setHeaderNow] = useState(() => new Date());

  useEffect(() => {
    const timer = window.setInterval(() => setHeaderNow(new Date()), 30000);
    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    let cancelled = false;
    const run = async () => {
      if (!accountId) {
        setRecords([]);
        return;
      }
      setLoading(true);
      try {
        const rows = await syncReceiptRecords(accountId);
        if (!cancelled) setRecords(Array.isArray(rows) ? rows : []);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    void run();
    const onFocus = () => void run();
    window.addEventListener('focus', onFocus);
    return () => {
      cancelled = true;
      window.removeEventListener('focus', onFocus);
    };
  }, [accountId]);

  const paymentLabel = (method: ReceiptRecord['paymentMethod']) => {
    if (method === 'CASH') return '现金';
    if (method === 'CARD') return '刷卡';
    if (method === 'CHECK') return '支票支付';
    return '电子支付';
  };

  const report = useMemo(() => {
    const sales = records.filter((r) => r.kind === 'SALE' && r.status !== 'VOID');
    const refunds = records.filter((r) => r.kind === 'REFUND' || r.status === 'REFUNDED');
    const salesAmount = sales.reduce((sum, r) => sum + Math.max(0, Number(r.total || 0)), 0);
    const refundAmount = refunds.reduce((sum, r) => sum + Math.abs(Number(r.total || 0)), 0);
    const netSales = Math.max(0, salesAmount - refundAmount);
    const vat = Math.round(netSales * (0.15 / 1.15));
    const netProfit = Math.round(netSales * 0.18);
    const orders = sales.length;
    const avg = orders > 0 ? Math.round(netSales / orders) : 0;
    return { salesAmount, refundAmount, netSales, vat, netProfit, orders, avg, sales };
  }, [records]);

  const summaryCards = [
    {
      title: '总销售额',
      sub: '含税总额',
      value: `${Math.round(report.netSales).toLocaleString()} VT`,
      delta: `退货 ${Math.round(report.refundAmount).toLocaleString()} VT`,
      deltaColor: 'text-slate-500',
    },
    {
      title: '净利润',
      sub: 'PROFIT',
      value: `${Math.round(report.netProfit).toLocaleString()} VT`,
      delta: '按毛利率估算',
      deltaColor: 'text-[#1a237e]',
    },
    {
      title: '订单数量',
      sub: 'TRANSACTIONS',
      value: report.orders.toLocaleString(),
      delta: loading ? '同步中…' : '实时同步',
      deltaColor: 'text-slate-500',
    },
    {
      title: '客单均值',
      sub: 'AVERAGE',
      value: `${Math.round(report.avg).toLocaleString()} VT`,
      delta: '按有效订单计算',
      deltaColor: 'text-slate-500',
    },
  ];

  const last7 = useMemo(() => {
    const days = Array.from({ length: 7 }, (_, i) => {
      const d = new Date();
      d.setHours(0, 0, 0, 0);
      d.setDate(d.getDate() - (6 - i));
      return d;
    });
    return days.map((d) => {
      const key = d.toISOString().slice(0, 10);
      return report.sales
        .filter((r) => String(r.printedAt || '').slice(0, 10) === key)
        .reduce((sum, r) => sum + Math.max(0, Number(r.total || 0)), 0);
    });
  }, [report.sales]);

  const trendPoints = useMemo(() => {
    const max = Math.max(1, ...last7);
    const min = Math.min(...last7);
    return last7
      .map((v, i) => {
        const x = 10 + i * 80;
        const ratio = max === min ? 0.5 : (v - min) / (max - min);
        const y = Math.round(116 - ratio * 90);
        return `${x},${y}`;
      })
      .join(' ');
  }, [last7]);

  const topCategories = useMemo(() => {
    const map = new Map<string, number>();
    for (const row of report.sales) {
      for (const item of row.items || []) {
        const title = String(item.title || '').toLowerCase();
        const key = /beer|cola|water|juice|drink|饮料|啤酒|饮品/.test(title)
          ? '饮料'
          : /coffee|kava|ginger|chocolate|咖啡|巧克力|姜/.test(title)
            ? '本地特产'
            : /bread|pie|cake|bakery|面包|蛋糕|烘焙/.test(title)
              ? '烘焙'
              : '其他';
        map.set(key, (map.get(key) || 0) + Math.max(1, Number(item.quantity || 1)));
      }
    }
    const entries = Array.from(map.entries()).sort((a, b) => b[1] - a[1]);
    const total = Math.max(1, entries.reduce((sum, [, v]) => sum + v, 0));
    const picked = entries.slice(0, 4).map(([name, qty]) => ({ name, value: Math.max(1, Math.round((qty / total) * 100)) }));
    if (picked.length === 0) {
      return [
        { name: '饮料', value: 45 },
        { name: '烘焙', value: 28 },
        { name: '杂货', value: 18 },
        { name: '其他', value: 9 },
      ];
    }
    return picked;
  }, [report.sales]);

  const transactions = useMemo(() => {
    return records
      .slice()
      .sort((a, b) => new Date(b.printedAt || 0).getTime() - new Date(a.printedAt || 0).getTime())
      .slice(0, 8)
      .map((r) => ({
        date: new Date(r.printedAt || Date.now()).toLocaleString('zh-CN', {
          month: '2-digit',
          day: '2-digit',
          hour: '2-digit',
          minute: '2-digit',
        }),
        order: r.receiptNo || '-',
        items: (r.items || []).slice(0, 2).map((i) => `${i.title} x${i.quantity}`).join('，') || '暂无商品明细',
        payment: paymentLabel(r.paymentMethod),
        total: Math.round(Math.abs(Number(r.total || 0))),
        status: r.kind === 'REFUND' || r.status === 'REFUNDED' ? '已退货' : '成功',
      }));
  }, [records]);

  return (
    <div className="w-full min-h-full bg-[#f4f6fb]">
      <div className="mx-auto max-w-[1360px] px-4 sm:px-6 py-5 space-y-4">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
          <div>
            <h1 className="text-[38px] font-extrabold leading-none text-slate-900">财务决策台</h1>
            <p className="mt-2 text-sm text-slate-500">统一查看营业表现、利润趋势、退货数据与门店交易明细。</p>
            <p className="mt-2 text-xs font-medium text-slate-400">
              UTC+11 Port Vila · {headerNow.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })} · {accountId || 'R-001'}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <button className="ui-btn ui-btn-secondary h-11 px-4">
              <Download size={16} />
              导出 CSV
            </button>
            <button className="ui-btn ui-btn-primary h-11 px-4">
              <Printer size={16} />
              打印报表
            </button>
          </div>
        </div>

        <div className="grid grid-cols-12 gap-4">
          <div className="col-span-12 xl:col-span-3 ui-card p-4">
            <div className="flex items-center justify-between text-sm font-semibold text-slate-700">
              <span>选择日期</span>
              <div className="inline-flex items-center gap-2 text-slate-400">
                <ChevronLeft size={16} />
                <ChevronRight size={16} />
              </div>
            </div>
            <div className="mt-3 h-12 rounded-xl border border-slate-200 bg-white px-3 flex items-center justify-between text-slate-700">
              <span>2023 年 10 月</span>
              <CalendarDays size={16} className="text-[#24308f]" />
            </div>
            <div className="mt-3 grid grid-cols-3 gap-2">
              <button className="h-9 rounded-lg bg-[#24308f] text-white text-xs font-semibold">日</button>
              <button className="h-9 rounded-lg bg-slate-100 text-slate-600 text-xs font-semibold">周</button>
              <button className="h-9 rounded-lg bg-slate-100 text-slate-600 text-xs font-semibold">月</button>
            </div>
            <div className="mt-4 rounded-xl bg-[#f7f9ff] border border-slate-100 p-3 text-xs text-slate-500 leading-6">
              这里可以继续接入门店结算周期、税率区间与月份对比。
            </div>
          </div>

          {summaryCards.map((card) => (
            <div key={card.title} className="col-span-12 sm:col-span-6 xl:col-span-2 ui-card p-4">
              <div className="text-[11px] font-bold tracking-wide text-slate-400">{card.title}</div>
              <div className="text-[11px] font-bold tracking-wide text-slate-400">{card.sub}</div>
              <div className="mt-2 text-[32px] leading-none font-extrabold text-slate-900">{card.value}</div>
              <div className={`mt-2 text-xs font-semibold ${card.deltaColor}`}>{card.delta}</div>
            </div>
          ))}
        </div>

        <div className="grid grid-cols-12 gap-4">
          <div className="col-span-12 xl:col-span-8 ui-card p-4">
            <div className="flex items-center justify-between gap-3">
              <h3 className="text-xl font-bold text-slate-900">销售趋势</h3>
              <span className="px-2.5 h-7 inline-flex items-center rounded-lg bg-slate-100 text-xs font-semibold text-slate-500">
                最近 7 天
              </span>
            </div>
            <div className="mt-4 h-[240px] rounded-xl border border-slate-100 bg-white relative overflow-hidden">
              <svg viewBox="0 0 500 140" className="absolute inset-0 h-full w-full">
                <polyline fill="none" stroke="#24308f" strokeWidth="3" points={trendPoints} strokeLinecap="round" />
                <circle cx="405" cy="44" r="4" fill="#24308f" />
              </svg>
              <div className="absolute bottom-3 left-5 right-5 grid grid-cols-7 text-[11px] text-slate-400 font-semibold">
                <span>周一</span>
                <span>周二</span>
                <span>周三</span>
                <span>周四</span>
                <span>周五</span>
                <span>周六</span>
                <span>周日</span>
              </div>
            </div>
          </div>

          <div className="col-span-12 xl:col-span-4 ui-card p-4">
            <h3 className="text-xl font-bold text-slate-900">热门分类</h3>
            <div className="mt-5 space-y-4">
              {topCategories.map((item) => (
                <div key={item.name}>
                  <div className="flex items-center justify-between text-sm font-semibold text-slate-700">
                    <span>{item.name}</span>
                    <span>{item.value}%</span>
                  </div>
                  <div className="mt-2 h-2 rounded-full bg-slate-100 overflow-hidden">
                    <div className="h-full rounded-full bg-[#24308f]" style={{ width: `${item.value}%` }} />
                  </div>
                </div>
              ))}
            </div>
            <div className="mt-8 rounded-xl bg-[#f7f9ff] border border-slate-100 p-3 text-sm text-slate-500">
              <span className="font-semibold text-[#24308f]">热销单品：</span>
              {transactions[0]?.items?.split('，')[0] || '暂无数据'}
            </div>
          </div>
        </div>

        <div className="ui-card p-4">
          <div className="flex items-center justify-between gap-3">
            <h3 className="text-xl font-bold text-slate-900">详细交易</h3>
            <button className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 h-9 text-sm font-semibold text-slate-500">
              <SlidersHorizontal size={16} />
              筛选
            </button>
          </div>

          <div className="mt-4 overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead className="text-slate-400">
                <tr className="border-b border-slate-100">
                  <th className="py-3 text-left font-semibold">日期</th>
                  <th className="py-3 text-left font-semibold">单号</th>
                  <th className="py-3 text-left font-semibold">商品</th>
                  <th className="py-3 text-left font-semibold">支付方式</th>
                  <th className="py-3 text-right font-semibold">金额</th>
                  <th className="py-3 text-right font-semibold">状态</th>
                </tr>
              </thead>
              <tbody>
                {transactions.map((row) => (
                  <tr key={row.order} className="border-b border-slate-50">
                    <td className="px-4 py-3 text-slate-600">{row.date}</td>
                    <td className="px-4 py-3 font-semibold text-slate-900">{row.order}</td>
                    <td className="px-4 py-3 text-slate-600">{row.items}</td>
                    <td className="px-4 py-3 text-slate-600">{row.payment}</td>
                    <td className="px-4 py-3 text-right font-semibold text-slate-900">{formatVT(row.total)}</td>
                    <td className="px-4 py-3 text-right">
                      <span
                        className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold ${
                          row.status === '已退货' ? 'bg-[#1a237e] text-[#1a237e]' : 'bg-[#1a237e] text-[#1a237e]'
                        }`}
                      >
                        {row.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="mt-4 text-xs text-slate-400">共显示 {transactions.length} 条交易记录</div>
        </div>

        <div className="flex justify-between pb-6 text-xs text-slate-400">
          <span>Vanuatu Cloud POS System © 2026</span>
          <span>支持 / 帮助 · 隐私 / 条款</span>
        </div>
      </div>
    </div>
  );
};

export default FinanceBoardPage;

