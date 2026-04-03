import React from 'react';
import { Users, Truck, Box, Wallet, Settings } from 'lucide-react';

type ViewTarget = 'customer-mgmt' | 'supplier-mgmt' | 'warehouse-mgmt' | 'finance-board';

const ManagementMenuPage: React.FC<{ onNavigate: (view: ViewTarget) => void }> = ({ onNavigate }) => {
  const cards: Array<{ id: ViewTarget; title: string; desc: string; icon: React.ReactNode }> = [
    { id: 'customer-mgmt', title: '客户管理', desc: '管理门店客户档案与信用额度', icon: <Users size={20} /> },
    { id: 'supplier-mgmt', title: '供应商管理', desc: '管理供货商、到货与评分', icon: <Truck size={20} /> },
    { id: 'warehouse-mgmt', title: '库存管理', desc: '查看库存、预警和库位', icon: <Box size={20} /> },
    { id: 'finance-board', title: '财务看板', desc: '查看应收应付与利润', icon: <Wallet size={20} /> },
  ];

  return (
    <div className="space-y-4 sm:space-y-6 pb-12">
      <div className="ui-card bg-white rounded-3xl border border-slate-200 p-5 sm:p-8 shadow-sm">
        <h2 className="text-xl sm:text-2xl font-black text-slate-900 flex items-center gap-3">
          <Settings className="text-sky-500" /> 管理菜单
        </h2>
        <p className="mt-2 text-slate-500 text-sm">进入不同管理模块进行日常运营。</p>
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
