import React, { useEffect, useState } from 'react';
import { Users, Truck, Box, Wallet, Settings, Receipt, QrCode } from 'lucide-react';
import { getAccountProgramSettings, patchAccountProgramSettings } from '../lib/accountScopedStore';
import {
  getDirtySharedStateSummary,
  getSharedSyncStatus,
  loadSharedState,
} from '../lib/sharedStateStore';

type ViewTarget =
  | 'merchant-mgmt'
  | 'employee-mgmt'
  | 'customer-mgmt'
  | 'supplier-mgmt'
  | 'warehouse-mgmt'
  | 'finance-board'
  | 'receipt-mgmt'
  | 'vat-returns';

const CAPTURE_JOBS_KEY = 'receipt_capture_jobs';

interface ManagementMenuPageProps {
  onNavigate: (view: ViewTarget) => void;
  accountId?: string;
}

const BUILTIN_CARDS: Array<{ id: ViewTarget; title: string; desc: string; icon: React.ReactNode; group: string }> = [
  { id: 'merchant-mgmt', title: '商户管理', desc: '开通零售商、批发商与独立入口', icon: <Settings size={20} />, group: '基础与权限' },
  { id: 'employee-mgmt', title: '员工账号管理', desc: '统一管理员工角色、权限与账号', icon: <Users size={20} />, group: '基础与权限' },
  { id: 'customer-mgmt', title: '客户管理', desc: '维护门店客户与信用档案', icon: <Truck size={20} />, group: '基础与权限' },
  { id: 'supplier-mgmt', title: '供应商管理', desc: '控制供应商档案、评分与交付', icon: <Box size={20} />, group: '基础与权限' },
  { id: 'warehouse-mgmt', title: '库存管理', desc: 'FEFO 库存、预警和调拨', icon: <Box size={20} />, group: '库存与物流' },
  { id: 'receipt-mgmt', title: '小票管理', desc: '查询小票与抓拍结果', icon: <Receipt size={20} />, group: '收银与票据' },
  { id: 'finance-board', title: '财务看板', desc: '应收、应付与利润趋势', icon: <Wallet size={20} />, group: '财务与税务' },
  { id: 'vat-returns', title: '增值税申报', desc: 'VAT 计算、申报与留档', icon: <Wallet size={20} />, group: '财务与税务' },
];

const ManagementMenuPage: React.FC<ManagementMenuPageProps> = ({ onNavigate, accountId }) => {
  const cards = BUILTIN_CARDS.filter((card) => (card.id === 'merchant-mgmt' ? accountId === 'P-001' : true));
  const cardGroups = Array.from(new Set(cards.map((card) => card.group)));
  const [receiptPaper, setReceiptPaper] = useState<'58MM' | '80MM'>('58MM');
  const [nearExpiryDays, setNearExpiryDays] = useState('30');
  const [nearExpiryPct, setNearExpiryPct] = useState('80');
  const [shippingCompanies, setShippingCompanies] = useState<string[]>(['瓦努阿图船运公司']);
  const [taxQrEnabled, setTaxQrEnabled] = useState(false);
  const [taxMerchantTin, setTaxMerchantTin] = useState('');
  const [taxBranchCode, setTaxBranchCode] = useState('');
  const [taxQrTemplate, setTaxQrTemplate] = useState(
    'https://tax.gov.vu/receipt/verify?tin={tin}&branch={branch}&receipt={receiptNo}&amount={amount}&time={datetime}'
  );
  const [saveHint, setSaveHint] = useState('');
  const [syncStatusText, setSyncStatusText] = useState('');
  const [dirtySyncSummary, setDirtySyncSummary] = useState<{ count: number; entries: Array<{ accountId: string; stateKey: string }> }>({
    count: 0,
    entries: [],
  });
  const [jobs, setJobs] = useState<Array<{ receiptNo: string; status: string; message?: string; updatedAt?: string }>>([]);

  useEffect(() => {
    if (!accountId) return;
    let mounted = true;
    (async () => {
      const settings = await getAccountProgramSettings(accountId);
      if (!mounted) return;
      if (settings.retailReceiptPaper === '58MM' || settings.retailReceiptPaper === '80MM') {
        setReceiptPaper(settings.retailReceiptPaper);
      }
      if (settings.retailNearExpiryDiscountDays) setNearExpiryDays(String(settings.retailNearExpiryDiscountDays));
      if (settings.retailNearExpiryDiscountPercent) setNearExpiryPct(String(settings.retailNearExpiryDiscountPercent));
      if (Array.isArray(settings.commonShippingCompanies) && settings.commonShippingCompanies.length > 0) {
        setShippingCompanies(settings.commonShippingCompanies.map(String));
      }
      setTaxQrEnabled(Boolean(settings.taxQrEnabled));
      setTaxMerchantTin(settings.taxMerchantTin || '');
      setTaxBranchCode(settings.taxBranchCode || '');
      setTaxQrTemplate(
        settings.taxQrTemplate ||
          'https://tax.gov.vu/receipt/verify?tin={tin}&branch={branch}&receipt={receiptNo}&amount={amount}&time={datetime}'
      );
    })();
    return () => {
      mounted = false;
    };
  }, [accountId]);

  useEffect(() => {
    const timer = window.setInterval(() => {
      const status = getSharedSyncStatus();
      const dirty = getDirtySharedStateSummary(accountId);
      setDirtySyncSummary(dirty);
      if (!status) {
        setSyncStatusText('');
        return;
      }
      setSyncStatusText(
        status.ok ? `云端同步正常：${status.stateKey}` : `云端同步失败：${status.stateKey} - ${status.message}`
      );
    }, 3000);
    return () => window.clearInterval(timer);
  }, [accountId]);

  useEffect(() => {
    if (!accountId) return;
    let mounted = true;
    const fetchJobs = async () => {
      const list = await loadSharedState(accountId, CAPTURE_JOBS_KEY, []);
      if (!mounted) return;
      setJobs(
        (Array.isArray(list) ? list : [])
          .slice(0, 5)
          .map((job) => ({
            receiptNo: job.receiptNo,
            status: job.status,
            message: job.message,
            updatedAt: job.updatedAt,
          }))
      );
    };
    fetchJobs();
    const timer = window.setInterval(fetchJobs, 5000);
    return () => {
      mounted = false;
      clearInterval(timer);
    };
  }, [accountId]);

  const handlePaperChange = (value: '58MM' | '80MM') => {
    setReceiptPaper(value);
    if (accountId) {
      patchAccountProgramSettings(accountId, { retailReceiptPaper: value });
    }
  };

  const saveExpiryConfig = () => {
    if (!accountId) return;
    patchAccountProgramSettings(accountId, {
      retailNearExpiryDiscountDays: Math.max(1, Number(nearExpiryDays || 30)),
      retailNearExpiryDiscountPercent: Math.max(1, Math.min(100, Number(nearExpiryPct || 80))),
      commonShippingCompanies: shippingCompanies.filter(Boolean),
    });
    setSaveHint('临期与船运设置已保存');
    window.setTimeout(() => setSaveHint(''), 1800);
  };

  const saveTaxConfig = () => {
    if (!accountId) return;
    patchAccountProgramSettings(accountId, {
      taxQrEnabled,
      taxQrTemplate,
      taxMerchantTin,
      taxBranchCode,
    });
    setSaveHint('税务配置已保存');
    window.setTimeout(() => setSaveHint(''), 1800);
  };

  return (
    <div className="space-y-4 sm:space-y-6 pb-8">
      <div className="ui-card bg-white rounded-3xl border border-slate-200 p-6 shadow-sm">
        <div className="flex items-center gap-4">
          <Settings className="text-[#1a237e]" size={22} />
          <div>
            <div className="text-xl font-black text-slate-900">后台设置</div>
            <div className="text-xs text-slate-500">摄像头参数请在本地 EXE 中配置，Web 仅同步状态。</div>
          </div>
        </div>
        {syncStatusText && (
          <div className="mt-4 rounded-2xl border border-[#dbe7ff] bg-[#1a237e] px-4 py-3 text-sm font-black text-[#1a237e]">
            {syncStatusText}
          </div>
        )}
        {dirtySyncSummary.count > 0 && (
          <div className="mt-3 flex flex-wrap gap-2 text-xs text-[#1a237e]">
            <span>未同步状态：{dirtySyncSummary.count} 项</span>
            {dirtySyncSummary.entries.map((entry) => (
              <span key={`${entry.accountId}-${entry.stateKey}`} className="rounded-full bg-[#1a237e] px-3 py-1 text-[#1a237e]">
                {entry.accountId} · {entry.stateKey}
              </span>
            ))}
          </div>
        )}
        {saveHint && <div className="mt-3 text-xs text-[#1a237e]">{saveHint}</div>}
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
        <div className="ui-card bg-white rounded-3xl border border-slate-200 p-5 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-sm font-black text-slate-900">小票纸宽</div>
              <div className="text-xs text-slate-500">小票打印尺寸</div>
            </div>
            <div className="flex gap-2">
              {(['58MM', '80MM'] as const).map((paper) => (
                <button
                  key={paper}
                  onClick={() => handlePaperChange(paper)}
                  className={`px-3 py-1 rounded-xl text-xs font-black transition-colors border ${
                    receiptPaper === paper ? 'bg-slate-900 text-white border-slate-900' : 'bg-slate-100 text-slate-600 border-slate-200'
                  }`}
                >
                  {paper}
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3 text-xs">
            <div>
              <label className="text-slate-500">临期天数</label>
              <input
                value={nearExpiryDays}
                onChange={(e) => setNearExpiryDays(e.target.value)}
                className="w-full h-10 rounded-xl border border-slate-200 px-2 text-sm"
              />
            </div>
            <div>
              <label className="text-slate-500">临促百分比</label>
              <input
                value={nearExpiryPct}
                onChange={(e) => setNearExpiryPct(e.target.value)}
                className="w-full h-10 rounded-xl border border-slate-200 px-2 text-sm"
              />
            </div>
          </div>

          <div>
            <label className="text-xs text-slate-500">常用船运公司</label>
            <div className="mt-2 space-y-2">
              {shippingCompanies.map((name, index) => (
                <input
                  key={index}
                  value={name}
                  onChange={(e) => setShippingCompanies((prev) => prev.map((item, idx) => (idx === index ? e.target.value : item)))}
                  className="w-full h-9 rounded-xl border border-slate-200 px-2 text-xs"
                />
              ))}
            </div>
            <button onClick={() => setShippingCompanies((prev) => [...prev, ''])} className="mt-2 text-xs text-slate-600">
              + 添加船运公司
            </button>
          </div>

          <button onClick={saveExpiryConfig} className="w-full rounded-xl bg-[#1a237e] py-2 text-xs font-black text-white">
            保存临期与船运设置
          </button>
        </div>

        <div className="ui-card bg-white rounded-3xl border border-slate-200 p-5 shadow-sm space-y-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-[#1a237e] text-[#1a237e] flex items-center justify-center">
              <QrCode size={18} />
            </div>
            <div>
              <div className="font-black text-slate-900">税务二维码</div>
              <div className="text-xs text-slate-500">税务配置依然通过 Web 面板同步</div>
            </div>
          </div>

          <label className="flex items-center justify-between text-sm">
            <span>启用税务二维码</span>
            <input type="checkbox" checked={taxQrEnabled} onChange={(e) => setTaxQrEnabled(e.target.checked)} />
          </label>

          <input
            value={taxMerchantTin}
            onChange={(e) => setTaxMerchantTin(e.target.value)}
            placeholder="税号 TIN"
            className="w-full h-10 rounded-xl border border-slate-200 px-3 text-sm"
          />
          <input
            value={taxBranchCode}
            onChange={(e) => setTaxBranchCode(e.target.value)}
            placeholder="分支编码"
            className="w-full h-10 rounded-xl border border-slate-200 px-3 text-sm"
          />
          <textarea
            value={taxQrTemplate}
            onChange={(e) => setTaxQrTemplate(e.target.value)}
            rows={3}
            className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
          />
          <button onClick={saveTaxConfig} className="w-full rounded-xl bg-[#1a237e] py-2 text-xs font-black text-white">
            保存税务设置
          </button>
        </div>
      </div>

      <div className="ui-card bg-white rounded-3xl border border-slate-200 p-5 shadow-sm space-y-4">
        <div className="text-sm font-black text-slate-900">本地 EXE 抓拍（参数仅在 EXE 中修改）</div>
        <p className="text-xs text-slate-500">
          所有 RTSP、令牌、心跳参数请在门店电脑上的 `StretPOS-Agent` 本地程序中配置。Web 端只负责下发 `/api/capture-task`，
          抓拍由 EXE 执行并回传结果。
        </p>
        <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-xs text-slate-700">
          你可以在 EXE 的配置页（`http://127.0.0.1:9195`）查看状态，必要时重启程序以应用新配置。
        </div>
        <div className="space-y-2 text-xs">
          <div className="font-black text-slate-700">最近抓拍任务</div>
          {jobs.length === 0 ? (
            <div className="text-slate-500">暂无任务。</div>
          ) : (
            jobs.map((job) => (
              <div key={job.receiptNo} className="flex justify-between rounded-xl border border-slate-100 bg-slate-50 px-3 py-2 text-[11px]">
                <span>{job.receiptNo}</span>
                <span className="text-[#1a237e]">{job.status}</span>
                <span>{job.message || '等待'}</span>
              </div>
            ))
          )}
        </div>
      </div>

      <div className="space-y-4">
        <div className="text-sm font-black text-slate-900">后台功能</div>
        {cardGroups.map((group) => (
          <div key={group} className="space-y-3">
            <div className="text-xs font-black uppercase tracking-widest text-slate-500">{group}</div>
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
              {cards
                .filter((card) => card.group === group)
                .map((card) => (
                  <button
                    key={card.id}
                    onClick={() => onNavigate(card.id)}
                    className="ui-card bg-white rounded-3xl border border-slate-200 p-5 text-left shadow-sm hover:border-[#dbe7ff]"
                  >
                    <div className="w-12 h-12 rounded-2xl bg-[#eef4ff] text-[#1a237e] flex items-center justify-center">{card.icon}</div>
                    <div className="mt-4 font-black text-slate-900">{card.title}</div>
                    <p className="mt-1 text-sm text-slate-500">{card.desc}</p>
                  </button>
                ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default ManagementMenuPage;

