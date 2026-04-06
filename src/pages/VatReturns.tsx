import React, { useEffect, useMemo, useState } from 'react';
import { CalendarDays, CheckCircle2, Download, FileDown, Plus, Printer, Save } from 'lucide-react';
import { VAT_RATE } from '../lib/constants';
import { getProcurementOrders } from '../lib/procurementStore';
import { ReceiptRecord, syncReceiptRecords } from '../lib/receiptStore';
import { loadSharedState, saveSharedState } from '../lib/sharedStateStore';

interface VatReturnsPageProps {
  accountId?: string;
}

type LedgerType = '收入' | '支出' | '进口';

type LedgerRow = {
  date: string;
  type: LedgerType;
  description: string;
  vatBase: number;
  vatAmount: number;
};

type VatDraft = {
  tin: string;
  periodFrom: string;
  periodTo: string;
  customRows: LedgerRow[];
  box6: number;
  box9: number;
  box14: number;
  box18: number;
};

type VatSubmissionRecord = {
  id: string;
  accountId: string;
  submittedAt: string;
  tin: string;
  periodFrom: string;
  periodTo: string;
  summary: {
    box10VatCollected: number;
    box15VatPaid: number;
    box16Diff: number;
    box17PeriodPayment: number;
    box18: number;
    box19TotalPayment: number;
    isRefund: boolean;
  };
  rows: LedgerRow[];
};

const VAT_DRAFT_STATE_KEY = 'vat_returns_draft';
const VAT_SUBMISSIONS_STATE_KEY = 'vat_returns_submissions';

const formatAmount = (n: number) => Math.round(Math.max(0, n)).toLocaleString();
const todayDate = () => new Date().toISOString().slice(0, 10);
const monthStart = () => {
  const d = new Date();
  return new Date(d.getFullYear(), d.getMonth(), 1).toISOString().slice(0, 10);
};
const monthEnd = () => {
  const d = new Date();
  return new Date(d.getFullYear(), d.getMonth() + 1, 0).toISOString().slice(0, 10);
};

const buildPresetExpenseRows = (dateBase = new Date()): LedgerRow[] => {
  const y = dateBase.getFullYear();
  const m = dateBase.getMonth();
  const asDate = (d: number) => new Date(y, m, d).toISOString().slice(0, 10);
  return [
    { date: asDate(5), type: '支出', description: '门店房租发票', vatBase: 120000, vatAmount: Math.round(120000 * VAT_RATE) },
    { date: asDate(8), type: '支出', description: '门店电费账单', vatBase: 42000, vatAmount: Math.round(42000 * VAT_RATE) },
    { date: asDate(12), type: '进口', description: '海关货柜税费单', vatBase: 185000, vatAmount: Math.round(185000 * VAT_RATE) },
    { date: asDate(15), type: '支出', description: '供应商进货发票', vatBase: 265000, vatAmount: Math.round(265000 * VAT_RATE) },
  ];
};

const buildCsv = (rows: LedgerRow[], summary: ReturnType<typeof useVatSummary>, tin: string, periodFrom: string, periodTo: string) => {
  const esc = (v: string | number) => {
    const text = String(v ?? '');
    return /[",\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
  };
  return [
    ['增值税申报单'],
    ['税号', tin],
    ['期间开始', periodFrom],
    ['期间结束', periodTo],
    ['第10栏 总销项税', summary.box10VatCollected],
    ['第15栏 总进项税', summary.box15VatPaid],
    ['第16栏 差额', summary.box16Diff],
    ['第17栏 应缴 VAT', summary.box17PeriodPayment],
    ['第18栏 预缴 VAT', summary.box18],
    ['第19栏 总应缴 VAT', summary.box19TotalPayment],
    ['状态', summary.isRefund ? '可退税' : '应补税'],
    [],
    ['日期', '类型', '说明', '税基', '增值税'],
    ...rows.map((r) => [r.date, r.type, r.description, r.vatBase, r.vatAmount]),
  ]
    .map((row) => row.map(esc).join(','))
    .join('\n');
};

const useVatSummary = (params: {
  records: ReceiptRecord[];
  allRows: LedgerRow[];
  box6: number;
  box9: number;
  box14: number;
  box18: number;
}) => {
  const { records, allRows, box6, box9, box14, box18 } = params;
  const salesGrossRaw = records.filter((r) => r.kind === 'SALE').reduce((sum, r) => sum + Math.max(0, Number(r.total || 0)), 0);
  const salesGross = Math.round(salesGrossRaw);
  const box7TaxableSales = Math.max(0, salesGross - Math.max(0, box6));
  const box8VatOnSales = Math.round(box7TaxableSales / 7.6667);
  const box10VatCollected = Math.max(0, box8VatOnSales + Math.max(0, box9));
  const purchaseBase = allRows.filter((r) => r.type !== '收入').reduce((sum, r) => sum + r.vatBase, 0);
  const box11Purchases = Math.round(purchaseBase);
  const box12VatOnPurchases = Math.round(box11Purchases / 7.6667);
  const box13ImportVat = Math.round(allRows.filter((r) => r.type === '进口').reduce((sum, r) => sum + r.vatAmount, 0));
  const box15VatPaid = Math.max(0, box12VatOnPurchases + box13ImportVat + Math.max(0, box14));
  const box16Diff = Math.abs(box10VatCollected - box15VatPaid);
  const isRefund = box15VatPaid > box10VatCollected;
  const box17PeriodPayment = isRefund ? 0 : box16Diff;
  const box19TotalPayment = box17PeriodPayment + Math.max(0, box18);
  return {
    salesGross,
    box6,
    box7TaxableSales,
    box8VatOnSales,
    box9,
    box10VatCollected,
    box11Purchases,
    box12VatOnPurchases,
    box13ImportVat,
    box14,
    box15VatPaid,
    box16Diff,
    isRefund,
    box17PeriodPayment,
    box18,
    box19TotalPayment,
  };
};

const VatReturnsPage: React.FC<VatReturnsPageProps> = ({ accountId }) => {
  const scopedAccountId = accountId || 'R-001';
  const [records, setRecords] = useState<ReceiptRecord[]>([]);
  const [autoRows, setAutoRows] = useState<LedgerRow[]>([]);
  const [customRows, setCustomRows] = useState<LedgerRow[]>([]);
  const [tin, setTin] = useState('123-456-789');
  const [periodFrom, setPeriodFrom] = useState(monthStart());
  const [periodTo, setPeriodTo] = useState(monthEnd());
  const [draftTip, setDraftTip] = useState('');
  const [newDate, setNewDate] = useState(todayDate());
  const [newType, setNewType] = useState<LedgerType>('收入');
  const [newDesc, setNewDesc] = useState('');
  const [newBase, setNewBase] = useState('');
  const [submissions, setSubmissions] = useState<VatSubmissionRecord[]>([]);
  const [box6, setBox6] = useState(0);
  const [box9, setBox9] = useState(0);
  const [box14, setBox14] = useState(0);
  const [box18, setBox18] = useState(0);

  useEffect(() => {
    let cancelled = false;
    const run = async () => {
      const [receiptRows, procurementOrders] = await Promise.all([syncReceiptRecords(scopedAccountId), getProcurementOrders()]);
      if (cancelled) return;
      const safeReceipts = Array.isArray(receiptRows) ? receiptRows : [];
      setRecords(safeReceipts);

      const purchaseRows: LedgerRow[] = procurementOrders
        .filter((o) => o.retailerAccountId === scopedAccountId)
        .slice(0, 8)
        .map((o) => {
          const base = (o.totalQuantity || 0) * 1200;
          return {
            date: new Date(o.updatedAt || Date.now()).toISOString().slice(0, 10),
            type: o.deliveryMode === 'SHIPMENT' ? '进口' : '支出',
            description: o.deliveryMode === 'SHIPMENT' ? `到港入库 ${o.id}` : `仓库采购 ${o.id}`,
            vatBase: Math.round(base),
            vatAmount: Math.round(base * VAT_RATE),
          };
        });

      const saleRows: LedgerRow[] = safeReceipts
        .filter((r) => r.kind === 'SALE')
        .slice(0, 12)
        .map((r) => {
          const total = Math.max(0, Number(r.total || 0));
          return {
            date: new Date(r.printedAt || Date.now()).toISOString().slice(0, 10),
            type: '收入',
            description: `POS 销售 ${r.receiptNo || ''}`.trim(),
            vatBase: Math.round(total / (1 + VAT_RATE)),
            vatAmount: Math.round(total - total / (1 + VAT_RATE)),
          };
        });

      const presetRows = buildPresetExpenseRows(new Date());
      setAutoRows([...saleRows, ...purchaseRows, ...presetRows].slice(0, 30));

      try {
        const draft = await loadSharedState<VatDraft | null>(scopedAccountId, VAT_DRAFT_STATE_KEY, null);
        if (draft) {
          if (draft.tin) setTin(draft.tin);
          if (draft.periodFrom) setPeriodFrom(draft.periodFrom);
          if (draft.periodTo) setPeriodTo(draft.periodTo);
          if (Array.isArray(draft.customRows)) setCustomRows(draft.customRows);
          if (typeof draft.box6 === 'number') setBox6(draft.box6);
          if (typeof draft.box9 === 'number') setBox9(draft.box9);
          if (typeof draft.box14 === 'number') setBox14(draft.box14);
          if (typeof draft.box18 === 'number') setBox18(draft.box18);
        }
        const savedSubmissions = await loadSharedState<VatSubmissionRecord[]>(scopedAccountId, VAT_SUBMISSIONS_STATE_KEY, []);
        if (Array.isArray(savedSubmissions)) setSubmissions(savedSubmissions);
      } catch {}
    };
    void run();
    const onFocus = () => void run();
    window.addEventListener('focus', onFocus);
    return () => {
      cancelled = true;
      window.removeEventListener('focus', onFocus);
    };
  }, [scopedAccountId]);

  const allRows = useMemo(() => [...customRows, ...autoRows], [customRows, autoRows]);
  const vatSummary = useVatSummary({ records, allRows, box6, box9, box14, box18 });

  const handleSaveDraft = () => {
    const payload: VatDraft = { tin, periodFrom, periodTo, customRows, box6, box9, box14, box18 };
    void saveSharedState(scopedAccountId, VAT_DRAFT_STATE_KEY, payload);
    setDraftTip(`草稿已保存（${new Date().toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })}）`);
    window.setTimeout(() => setDraftTip(''), 2200);
  };

  const handleAddRow = () => {
    const base = Math.max(0, Number(newBase || 0));
    if (!newDesc.trim() || base <= 0) return;
    const row: LedgerRow = {
      date: newDate || todayDate(),
      type: newType,
      description: newDesc.trim(),
      vatBase: Math.round(base),
      vatAmount: Math.round(base * VAT_RATE),
    };
    setCustomRows((prev) => [row, ...prev]);
    setNewDesc('');
    setNewBase('');
  };

  const downloadCsv = () => {
    const csv = buildCsv(allRows, vatSummary, tin, periodFrom, periodTo);
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `vat-return-${periodFrom}-to-${periodTo}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleSubmitReturn = async () => {
    const record: VatSubmissionRecord = {
      id: `VAT-${Date.now()}`,
      accountId: scopedAccountId,
      submittedAt: new Date().toISOString(),
      tin,
      periodFrom,
      periodTo,
      summary: {
        box10VatCollected: vatSummary.box10VatCollected,
        box15VatPaid: vatSummary.box15VatPaid,
        box16Diff: vatSummary.box16Diff,
        box17PeriodPayment: vatSummary.box17PeriodPayment,
        box18: vatSummary.box18,
        box19TotalPayment: vatSummary.box19TotalPayment,
        isRefund: vatSummary.isRefund,
      },
      rows: allRows,
    };
    const next = [record, ...submissions].slice(0, 100);
    setSubmissions(next);
    await saveSharedState(scopedAccountId, VAT_SUBMISSIONS_STATE_KEY, next);
    downloadCsv();
    setDraftTip('申报已提交并导出 CSV 留档');
    window.setTimeout(() => setDraftTip(''), 2400);
  };

  return (
    <div className="space-y-4 sm:space-y-6 pb-8">
      <div className="ui-card bg-white rounded-3xl border border-slate-200 p-6 shadow-sm flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
        <div>
          <div className="flex items-center gap-3">
            <FileDown size={22} className="text-[#1a237e]" />
            <div>
              <div className="text-2xl font-black text-slate-900">增值税申报</div>
              <div className="text-xs text-slate-500 mt-1">按期间汇总销售、采购、进口与调整项，支持草稿、提交与留档导出。</div>
            </div>
          </div>
          {draftTip && <div className="mt-3 text-sm font-black text-[#1a237e]">{draftTip}</div>}
        </div>
        <div className="flex flex-wrap gap-2">
          <button onClick={handleSaveDraft} className="ui-btn h-10 rounded-xl bg-white border border-slate-200 px-4 text-sm font-black text-slate-700 inline-flex items-center gap-2">
            <Save size={16} /> 保存草稿
          </button>
          <button onClick={downloadCsv} className="ui-btn h-10 rounded-xl bg-white border border-slate-200 px-4 text-sm font-black text-slate-700 inline-flex items-center gap-2">
            <Download size={16} /> 导出 CSV
          </button>
          <button onClick={handleSubmitReturn} className="ui-btn h-10 rounded-xl bg-[#1a237e] px-4 text-sm font-black text-white inline-flex items-center gap-2">
            <Printer size={16} /> 提交申报
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {[
          { label: '销售含税总额', value: vatSummary.salesGross },
          { label: '总销项税', value: vatSummary.box10VatCollected },
          { label: '总进项税', value: vatSummary.box15VatPaid },
          { label: '申报差额', value: vatSummary.box16Diff },
        ].map((item) => (
          <div key={item.label} className="ui-card bg-white rounded-3xl border border-slate-200 p-5 shadow-sm">
            <div className="text-xs font-black text-slate-500 tracking-widest">{item.label}</div>
            <div className="mt-2 text-2xl font-black text-[#1a237e]">VT {formatAmount(item.value)}</div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="ui-card bg-white rounded-2xl border border-slate-200 p-4">
              <div className="text-xs font-black text-slate-500 tracking-widest">税号 TIN</div>
              <input value={tin} onChange={(e) => setTin(e.target.value)} className="mt-2 w-full h-10 rounded-lg border border-slate-200 px-3 text-sm font-black" />
            </div>
            <div className="ui-card bg-white rounded-2xl border border-slate-200 p-4">
              <div className="text-xs font-black text-slate-500 tracking-widest">期间开始</div>
              <label className="mt-2 h-10 rounded-lg border border-slate-200 px-3 inline-flex items-center gap-2 w-full bg-white">
                <CalendarDays size={16} />
                <input type="date" value={periodFrom} onChange={(e) => setPeriodFrom(e.target.value)} className="w-full bg-transparent outline-none font-black text-slate-900" />
              </label>
            </div>
            <div className="ui-card bg-white rounded-2xl border border-slate-200 p-4">
              <div className="text-xs font-black text-slate-500 tracking-widest">期间结束</div>
              <label className="mt-2 h-10 rounded-lg border border-slate-200 px-3 inline-flex items-center gap-2 w-full bg-white">
                <CalendarDays size={16} />
                <input type="date" value={periodTo} onChange={(e) => setPeriodTo(e.target.value)} className="w-full bg-transparent outline-none font-black text-slate-900" />
              </label>
            </div>
            <div className="ui-card bg-white rounded-2xl border border-slate-200 p-4">
              <div className="text-xs font-black text-slate-500 tracking-widest">申报状态</div>
              <div className="mt-2 text-sm font-black text-slate-900">{vatSummary.isRefund ? '可退税' : '应补税'}</div>
              <div className="text-xs text-slate-500 mt-1">第16栏：VT {formatAmount(vatSummary.box16Diff)}</div>
            </div>
          </div>

          <div className="ui-card bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="px-5 py-4 border-b border-slate-100 bg-slate-50">
              <h3 className="text-lg font-black text-slate-900">增值税计算表</h3>
            </div>
            <div className="p-4 space-y-3 text-sm">
              <div className="rounded-xl border border-slate-100 bg-slate-50 p-3 space-y-2">
                <div className="text-xs font-black text-[#24308f]">销项税</div>
                <div className="grid grid-cols-[80px_minmax(0,1fr)_150px] items-center gap-2">
                  <span className="text-slate-500">第5栏</span><span>总销售和收入（含税）</span><b className="text-right">VT {formatAmount(vatSummary.salesGross)}</b>
                  <span className="text-slate-500">第6栏</span><span>零税率销售</span><input value={box6} onChange={(e) => setBox6(Math.max(0, Number(e.target.value || 0)))} type="number" className="h-8 rounded border border-slate-200 px-2 text-right font-bold" />
                  <span className="text-slate-500">第7栏</span><span>应税销售</span><b className="text-right">VT {formatAmount(vatSummary.box7TaxableSales)}</b>
                  <span className="text-slate-500">第8栏</span><span>销项税</span><b className="text-right">VT {formatAmount(vatSummary.box8VatOnSales)}</b>
                  <span className="text-slate-500">第9栏</span><span>销项税调整</span><input value={box9} onChange={(e) => setBox9(Math.max(0, Number(e.target.value || 0)))} type="number" className="h-8 rounded border border-slate-200 px-2 text-right font-bold" />
                  <span className="text-slate-500">第10栏</span><span>总销项税</span><b className="text-right text-[#19217b]">VT {formatAmount(vatSummary.box10VatCollected)}</b>
                </div>
              </div>

              <div className="rounded-xl border border-slate-100 bg-slate-50 p-3 space-y-2">
                <div className="text-xs font-black text-[#24308f]">进项税</div>
                <div className="grid grid-cols-[80px_minmax(0,1fr)_150px] items-center gap-2">
                  <span className="text-slate-500">第11栏</span><span>业务采购和支出（含税，不含进口）</span><b className="text-right">VT {formatAmount(vatSummary.box11Purchases)}</b>
                  <span className="text-slate-500">第12栏</span><span>进项税</span><b className="text-right">VT {formatAmount(vatSummary.box12VatOnPurchases)}</b>
                  <span className="text-slate-500">第13栏</span><span>进口已缴增值税（海关）</span><b className="text-right">VT {formatAmount(vatSummary.box13ImportVat)}</b>
                  <span className="text-slate-500">第14栏</span><span>进项税调整</span><input value={box14} onChange={(e) => setBox14(Math.max(0, Number(e.target.value || 0)))} type="number" className="h-8 rounded border border-slate-200 px-2 text-right font-bold" />
                  <span className="text-slate-500">第15栏</span><span>总进项税</span><b className="text-right text-[#19217b]">VT {formatAmount(vatSummary.box15VatPaid)}</b>
                </div>
              </div>

              <div className="rounded-xl border border-slate-200 bg-white p-3">
                <div className="grid grid-cols-[80px_minmax(0,1fr)_150px] items-center gap-2">
                  <span className="text-slate-500">第16栏</span>
                  <span>{vatSummary.isRefund ? '应退税额' : '应补税额'}</span>
                  <b className="text-right text-[#19217b]">VT {formatAmount(vatSummary.box16Diff)}</b>
                  <span className="text-slate-500">第17栏</span>
                  <span>本期应缴 VAT</span>
                  <b className="text-right">VT {formatAmount(vatSummary.box17PeriodPayment)}</b>
                  <span className="text-slate-500">第18栏</span>
                  <span>预缴 VAT</span>
                  <input value={box18} onChange={(e) => setBox18(Math.max(0, Number(e.target.value || 0)))} type="number" className="h-8 rounded border border-slate-200 px-2 text-right font-bold" />
                  <span className="text-slate-500">第19栏</span>
                  <span>总应缴 VAT</span>
                  <b className="text-right">VT {formatAmount(vatSummary.box19TotalPayment)}</b>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="ui-card bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="px-5 py-4 border-b border-slate-100 bg-slate-50 flex items-center justify-between gap-3">
            <div>
              <h3 className="text-lg font-black text-slate-900">来源台账</h3>
              <p className="text-xs text-slate-500 mt-1">可编辑申报期间内的收入、支出和进口记录</p>
            </div>
            <button onClick={handleAddRow} className="ui-btn h-10 rounded-xl bg-[#1a237e] px-4 text-sm font-black text-white inline-flex items-center gap-2">
              <Plus size={14} /> 新增记录
            </button>
          </div>
          <div className="p-3 border-b border-slate-100 grid grid-cols-1 md:grid-cols-[140px_100px_minmax(0,1fr)_120px] gap-2">
            <input type="date" value={newDate} onChange={(e) => setNewDate(e.target.value)} className="h-9 rounded-lg border border-slate-200 px-2 text-sm" />
            <select value={newType} onChange={(e) => setNewType(e.target.value as LedgerType)} className="h-9 rounded-lg border border-slate-200 px-2 text-sm bg-white">
              <option value="收入">收入</option>
              <option value="支出">支出</option>
              <option value="进口">进口</option>
            </select>
            <input value={newDesc} onChange={(e) => setNewDesc(e.target.value)} placeholder="事项说明" className="h-9 rounded-lg border border-slate-200 px-2 text-sm" />
            <input value={newBase} onChange={(e) => setNewBase(e.target.value)} placeholder="税基金额" type="number" className="h-9 rounded-lg border border-slate-200 px-2 text-sm" />
          </div>
          <div className="overflow-auto max-h-[560px]">
            <table className="w-full text-left border-collapse">
              <thead className="bg-slate-50 border-b border-slate-200 sticky top-0">
                <tr>
                  <th className="px-4 py-3 text-xs font-black text-slate-500">日期</th>
                  <th className="px-4 py-3 text-xs font-black text-slate-500">类型</th>
                  <th className="px-4 py-3 text-xs font-black text-slate-500">说明</th>
                  <th className="px-4 py-3 text-xs font-black text-slate-500 text-right">税基</th>
                  <th className="px-4 py-3 text-xs font-black text-slate-500 text-right">增值税</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {allRows.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-4 py-8 text-center text-sm text-slate-500">暂无台账数据</td>
                  </tr>
                ) : (
                  allRows.map((row, idx) => (
                    <tr key={`${row.date}-${row.description}-${idx}`}>
                      <td className="px-4 py-3 text-sm text-slate-700">{row.date}</td>
                      <td className="px-4 py-3">
                        <span className="inline-flex px-2 py-1 rounded-full text-[11px] font-black bg-[#eef4ff] text-[#1a237e]">{row.type}</span>
                      </td>
                      <td className="px-4 py-3 text-sm text-slate-700">{row.description}</td>
                      <td className="px-4 py-3 text-sm text-right font-bold text-slate-800">VT {formatAmount(row.vatBase)}</td>
                      <td className="px-4 py-3 text-sm text-right font-black text-[#19217b]">VT {formatAmount(row.vatAmount)}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <div className="ui-card bg-white rounded-3xl border border-slate-200 p-5 shadow-sm space-y-2">
        <div className="flex items-center gap-2 text-[#1a237e] font-black"><CheckCircle2 size={18} /> 最近申报记录</div>
        {submissions.length === 0 ? (
          <div className="text-sm text-slate-500">暂无提交记录。</div>
        ) : (
          <div className="space-y-2">
            {submissions.slice(0, 5).map((item) => (
              <div key={item.id} className="rounded-2xl border border-slate-200 p-3 text-sm">
                <div className="flex items-center justify-between gap-2">
                  <span className="font-black text-slate-900">{item.periodFrom} ~ {item.periodTo}</span>
                  <span className="text-xs text-slate-500">{new Date(item.submittedAt).toLocaleString('zh-CN')}</span>
                </div>
                <div className="mt-1 text-xs text-slate-500">税号：{item.tin}</div>
                <div className="mt-2 text-xs text-slate-700">
                  {item.summary.isRefund ? '可退税' : '应补税'} · 第16栏 VT {formatAmount(item.summary.box16Diff)}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default VatReturnsPage;
