import React, { useEffect, useState } from 'react';
import { Users, Truck, Box, Wallet, Settings, Receipt, UserCog, QrCode } from 'lucide-react';
import { getAccountProgramSettings, patchAccountProgramSettings } from '../lib/accountScopedStore';

type ViewTarget = 'employee-mgmt' | 'customer-mgmt' | 'supplier-mgmt' | 'warehouse-mgmt' | 'finance-board';

interface ManagementMenuPageProps {
  onNavigate: (view: ViewTarget) => void;
  accountId?: string;
}

const ManagementMenuPage: React.FC<ManagementMenuPageProps> = ({ onNavigate, accountId }) => {
  const cards: Array<{ id: ViewTarget; title: string; desc: string; icon: React.ReactNode }> = [
    { id: 'employee-mgmt', title: '员工账号管理', desc: '管理员工账号、角色与启停状态', icon: <UserCog size={20} /> },
    { id: 'customer-mgmt', title: '客户管理', desc: '管理门店客户档案与信用额度', icon: <Users size={20} /> },
    { id: 'supplier-mgmt', title: '供应商管理', desc: '管理供应商、到货与评分', icon: <Truck size={20} /> },
    { id: 'warehouse-mgmt', title: '库存管理', desc: '查看库存、预警与库位', icon: <Box size={20} /> },
    { id: 'finance-board', title: '财务看板', desc: '查看应收应付与利润趋势', icon: <Wallet size={20} /> },
  ];

  const [receiptPaper, setReceiptPaper] = useState<'58MM' | '80MM'>('58MM');
  const [taxQrEnabled, setTaxQrEnabled] = useState(false);
  const [taxQrTemplate, setTaxQrTemplate] = useState(
    'https://tax.gov.vu/receipt/verify?tin={tin}&branch={branch}&receipt={receiptNo}&amount={amount}&time={datetime}'
  );
  const [taxMerchantTin, setTaxMerchantTin] = useState('');
  const [taxBranchCode, setTaxBranchCode] = useState('');

  useEffect(() => {
    if (!accountId) return;
    let mounted = true;
    (async () => {
      const settings = await getAccountProgramSettings(accountId);
      if (!mounted) return;
      if (settings.retailReceiptPaper === '58MM' || settings.retailReceiptPaper === '80MM') {
        setReceiptPaper(settings.retailReceiptPaper);
      }
      if (typeof settings.taxQrEnabled === 'boolean') setTaxQrEnabled(settings.taxQrEnabled);
      if (settings.taxQrTemplate) setTaxQrTemplate(settings.taxQrTemplate);
      if (settings.taxMerchantTin) setTaxMerchantTin(settings.taxMerchantTin);
      if (settings.taxBranchCode) setTaxBranchCode(settings.taxBranchCode);
    })();
    return () => {
      mounted = false;
    };
  }, [accountId]);

  const handlePaperChange = (value: '58MM' | '80MM') => {
    setReceiptPaper(value);
    if (accountId) {
      void patchAccountProgramSettings(accountId, { retailReceiptPaper: value });
    }
  };

  const saveTaxQrConfig = () => {
    if (!accountId) return;
    void patchAccountProgramSettings(accountId, {
      taxQrEnabled,
      taxQrTemplate,
      taxMerchantTin,
      taxBranchCode,
    });
  };

  return (
    <div className="space-y-4 sm:space-y-6 pb-12">
      <div className="ui-card bg-white rounded-3xl border border-slate-200 p-5 sm:p-8 shadow-sm">
        <h2 className="text-xl sm:text-2xl font-black text-slate-900 flex items-center gap-3">
          <Settings className="text-sky-500" /> 后台设置
        </h2>
        <p className="mt-2 text-slate-500 text-sm">在这里集中配置系统参数与后台管理模块。</p>
      </div>

      <div className="ui-card bg-white rounded-3xl border border-slate-200 p-5 sm:p-6 shadow-sm">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-2xl bg-sky-50 text-sky-600 flex items-center justify-center">
            <Receipt size={18} />
          </div>
          <div>
            <div className="font-black text-slate-900">收银小票纸宽设置</div>
            <div className="text-xs text-slate-500">后台配置后，前台打印自动按该格式输出。</div>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3 max-w-xs">
          {(['58MM', '80MM'] as const).map((paper) => (
            <button
              key={paper}
              onClick={() => handlePaperChange(paper)}
              className={`ui-btn px-4 py-3 rounded-xl text-sm font-black border ${
                receiptPaper === paper
                  ? 'bg-sky-500 text-white border-sky-500'
                  : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
              }`}
            >
              {paper}
            </button>
          ))}
        </div>
      </div>

      <div className="ui-card bg-white rounded-3xl border border-slate-200 p-5 sm:p-6 shadow-sm space-y-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-sky-50 text-sky-600 flex items-center justify-center">
            <QrCode size={18} />
          </div>
          <div>
            <div className="font-black text-slate-900">瓦努阿图税务二维码配置</div>
            <div className="text-xs text-slate-500">小票二维码将按此配置生成并用于税务验真。</div>
          </div>
        </div>

        <label className="flex items-center gap-2 text-sm font-bold text-slate-700">
          <input type="checkbox" checked={taxQrEnabled} onChange={(e) => setTaxQrEnabled(e.target.checked)} />
          启用税务二维码
        </label>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <input
            value={taxMerchantTin}
            onChange={(e) => setTaxMerchantTin(e.target.value)}
            placeholder="税号TIN"
            className="w-full h-10 rounded-xl border border-slate-200 px-3 text-sm outline-none focus:border-sky-500"
          />
          <input
            value={taxBranchCode}
            onChange={(e) => setTaxBranchCode(e.target.value)}
            placeholder="分支编码"
            className="w-full h-10 rounded-xl border border-slate-200 px-3 text-sm outline-none focus:border-sky-500"
          />
        </div>
        <textarea
          value={taxQrTemplate}
          onChange={(e) => setTaxQrTemplate(e.target.value)}
          rows={3}
          className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-sky-500"
          placeholder="税务验证URL模板"
        />
        <div className="text-xs text-slate-500">可用变量：{'{receiptNo}'} {'{amount}'} {'{datetime}'} {'{tin}'} {'{branch}'} {'{accountId}'}</div>
        <button onClick={saveTaxQrConfig} className="ui-btn px-4 py-2 rounded-xl bg-sky-500 text-white text-sm font-black">
          保存税务二维码配置
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
        {cards.map((card) => (
          <button
            key={card.id}
            onClick={() => onNavigate(card.id)}
            className="ui-card text-left bg-white rounded-3xl border border-slate-200 p-5 sm:p-6 shadow-sm hover:shadow-md hover:border-sky-200 transition-all"
          >
            <div className="w-11 h-11 rounded-2xl bg-sky-50 text-sky-600 flex items-center justify-center">{card.icon}</div>
            <h3 className="mt-4 font-black text-slate-900 text-lg">{card.title}</h3>
            <p className="mt-1 text-sm text-slate-500">{card.desc}</p>
          </button>
        ))}
      </div>
    </div>
  );
};

export default ManagementMenuPage;
