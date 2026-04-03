import React, { useState } from 'react';
import {
  Search,
  Plus,
  MoreVertical,
  Package,
  Calendar,
  Download,
  ArrowUpRight,
  Truck,
  ShieldCheck,
  Globe
} from 'lucide-react';
import { formatVT } from '../lib/utils';
import { useTranslation } from 'react-i18next';

interface Supplier {
  id: string;
  name: string;
  contactPerson: string;
  email: string;
  phone: string;
  category: string;
  status: 'ACTIVE' | 'ON_HOLD' | 'INACTIVE';
  totalPurchased: number;
  lastDelivery: string;
  rating: number;
}

const mockSuppliers: Supplier[] = [
  { id: 'SUP-001', name: 'Vanuatu Beverages Ltd', contactPerson: 'John T.', email: 'sales@vanuatubev.vu', phone: '+678 22111', category: 'Beverages', status: 'ACTIVE', totalPurchased: 4500000, lastDelivery: '2024-03-20', rating: 4.8 },
  { id: 'SUP-002', name: 'Port Vila Fresh Produce', contactPerson: 'Mary S.', email: 'fresh@portvila.vu', phone: '+678 23445', category: 'Produce', status: 'ACTIVE', totalPurchased: 1200000, lastDelivery: '2024-03-21', rating: 4.5 },
  { id: 'SUP-003', name: 'Azure Pure Water', contactPerson: 'David L.', email: 'info@azure.vu', phone: '+678 25667', category: 'Beverages', status: 'ACTIVE', totalPurchased: 890000, lastDelivery: '2024-03-15', rating: 4.9 },
  { id: 'SUP-004', name: 'Pacific Staples Imports', contactPerson: 'Kevin W.', email: 'ops@pacstaples.vu', phone: '+678 27889', category: 'General Goods', status: 'ON_HOLD', totalPurchased: 2300000, lastDelivery: '2024-02-10', rating: 3.2 },
  { id: 'SUP-005', name: 'Santo Coffee Roasters', contactPerson: 'Elena R.', email: 'beans@santocoffee.vu', phone: '+678 33445', category: 'Beverages', status: 'ACTIVE', totalPurchased: 450000, lastDelivery: '2024-03-01', rating: 4.7 },
];

const SupplierManagement: React.FC = () => {
  const { t } = useTranslation();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedStatus, setSelectedStatus] = useState<'ALL' | 'ACTIVE' | 'ON_HOLD'>('ALL');
  const categoryMap: Record<string, string> = {
    Beverages: '饮料',
    Produce: '生鲜',
    'General Goods': '百货',
  };
  const statusMap: Record<'ALL' | 'ACTIVE' | 'ON_HOLD', string> = {
    ALL: '全部供应商',
    ACTIVE: '正常',
    ON_HOLD: '暂停',
  };
  const supplierStatusMap: Record<Supplier['status'], string> = {
    ACTIVE: '正常',
    ON_HOLD: '暂停',
    INACTIVE: '停用',
  };

  const filteredSuppliers = mockSuppliers.filter((s) => {
    const matchesSearch = s.name.toLowerCase().includes(searchQuery.toLowerCase()) || s.id.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = selectedStatus === 'ALL' || s.status === selectedStatus;
    return matchesSearch && matchesStatus;
  });

  return (
    <div className="w-full space-y-4 sm:space-y-6 lg:space-y-8 pb-20 font-['Inter']">
      <div className="ui-card bg-white rounded-[24px] sm:rounded-[32px] p-4 sm:p-6 lg:p-8 border border-slate-200 shadow-sm flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-4 sm:gap-6 lg:gap-8">
        <div className="flex items-center gap-5">
          <div className="w-14 h-14 bg-sky-600 rounded-2xl flex items-center justify-center text-white shadow-lg ring-4 ring-sky-50">
            <Truck size={28} />
          </div>
          <div>
            <h1 className="text-2xl font-['Manrope'] font-black uppercase text-slate-900 italic leading-none">供应商管理</h1>
            <div className="flex items-center gap-2 mt-1">
              <span className="text-[10px] font-black text-sky-500 uppercase tracking-[0.2em]">供应商网络</span>
              <span className="w-1 h-1 bg-slate-300 rounded-full" />
              <span className="text-[10px] font-black text-emerald-500 uppercase tracking-widest italic">瓦努阿图标准</span>
            </div>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 sm:gap-4 w-full lg:w-auto">
          <div className="relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
            <input
              type="text"
              placeholder={t('supplierEntry')}
              className="pl-12 pr-6 py-4 bg-slate-50 border-none rounded-2xl text-[11px] font-bold text-slate-900 focus:ring-2 focus:ring-sky-500 focus:bg-white transition-all outline-none w-full sm:w-72 lg:w-80 shadow-sm"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          <button className="ui-btn ui-btn-primary px-6 sm:px-8 py-4 rounded-2xl text-[11px] uppercase tracking-[0.2em] shadow-xl flex items-center justify-center gap-3">
            <Plus size={18} /> 新建供应商
          </button>
        </div>
      </div>

      <div className="grid grid-cols-12 gap-4 sm:gap-6 lg:gap-8 items-start">
        <div className="col-span-12 xl:col-span-8 space-y-4 sm:space-y-6">
          <div className="flex items-center gap-4 no-scrollbar overflow-x-auto pb-2">
            {(['ALL', 'ACTIVE', 'ON_HOLD'] as const).map((status) => (
              <button
                key={status}
                onClick={() => setSelectedStatus(status)}
                className={`px-6 sm:px-8 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all whitespace-nowrap ${
                  selectedStatus === status
                    ? 'bg-sky-600 text-white shadow-xl shadow-sky-100'
                    : 'bg-white text-slate-400 border border-slate-100 hover:border-slate-300'
                }`}
              >
                {statusMap[status]}
              </button>
            ))}
          </div>

          <div className="ui-card bg-white rounded-[24px] sm:rounded-[40px] shadow-sm border border-slate-100 overflow-hidden ring-1 ring-slate-100">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[860px] text-left">
                <thead>
                  <tr className="border-b border-slate-50 text-[9px] font-black text-slate-400 uppercase tracking-widest bg-slate-50/50">
                    <th className="px-8 py-5">供应商</th>
                    <th className="px-4 py-5">类别</th>
                    <th className="px-4 py-5 text-center">状态</th>
                    <th className="px-4 py-5 text-right">累计采购</th>
                    <th className="px-4 py-5 text-center">评分</th>
                    <th className="px-8 py-5" />
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {filteredSuppliers.map((supplier) => (
                    <tr key={supplier.id} className="group hover:bg-slate-50/50 transition-all cursor-pointer">
                      <td className="px-8 py-6">
                        <div className="flex items-center gap-4">
                          <div className="w-12 h-12 rounded-xl bg-sky-50 flex items-center justify-center text-sky-600 font-black italic shadow-inner group-hover:bg-white transition-colors">
                            {supplier.name.slice(0, 2).toUpperCase()}
                          </div>
                          <div>
                            <div className="text-sm font-black text-slate-900 uppercase italic tracking-tight">{supplier.name}</div>
                            <div className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mt-1">ID: {supplier.id}</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-6">
                        <div className="flex items-center gap-2">
                          <Package size={12} className="text-slate-300" />
                          <span className="text-[10px] font-black text-slate-600 uppercase tracking-widest">{categoryMap[supplier.category] || supplier.category}</span>
                        </div>
                      </td>
                      <td className="px-4 py-6 text-center">
                        <span className={`inline-flex px-2.5 py-1 rounded-full text-[9px] font-black tracking-widest ${
                          supplier.status === 'ACTIVE'
                            ? 'bg-emerald-50 text-emerald-600'
                            : supplier.status === 'ON_HOLD'
                              ? 'bg-amber-50 text-amber-600'
                              : 'bg-slate-100 text-slate-500'
                        }`}>
                          {supplierStatusMap[supplier.status]}
                        </span>
                      </td>
                      <td className="px-4 py-6 text-right">
                        <div className="text-xs font-black text-slate-900 italic">{formatVT(supplier.totalPurchased)}</div>
                        <div className="text-[9px] font-bold text-slate-400 uppercase flex items-center justify-end gap-1 mt-1">最近到货：{supplier.lastDelivery}</div>
                      </td>
                      <td className="px-4 py-6 text-center">
                        <div className="flex items-center justify-center gap-1">
                          <ShieldCheck size={14} className={supplier.rating > 4 ? 'text-emerald-500' : 'text-amber-500'} />
                          <span className="text-xs font-black text-slate-700">{supplier.rating}</span>
                        </div>
                      </td>
                      <td className="px-8 py-6 text-right">
                        <button className="p-2 text-slate-300 hover:text-sky-600 hover:bg-white rounded-xl transition-all">
                          <MoreVertical size={18} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        <div className="col-span-12 xl:col-span-4 space-y-4 sm:space-y-6">
          <div className="ui-panel bg-slate-900 p-5 sm:p-8 lg:p-10 rounded-[28px] sm:rounded-[48px] shadow-2xl text-white relative overflow-hidden ring-4 ring-slate-100">
            <div className="absolute inset-0 opacity-[0.03] pointer-events-none" style={{ backgroundImage: 'radial-gradient(circle at 2px 2px, white 1px, transparent 0)', backgroundSize: '16px 16px' }} />
            <div className="relative z-10 space-y-8">
              <div>
                <p className="text-[10px] font-black text-sky-400 uppercase tracking-[0.3em] mb-2 italic">供应链总值</p>
                <h2 className="text-4xl font-['Manrope'] font-black text-white italic tracking-tighter leading-none">VUV 15.2M</h2>
                <p className="text-[10px] font-bold text-slate-400 uppercase mt-2 tracking-widest leading-none">FY24 累计采购额</p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="bg-white/5 border border-white/10 rounded-3xl p-6 hover:bg-white/10 transition-all cursor-pointer group">
                  <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest mb-1">活跃合作方</p>
                  <div className="flex items-center justify-between">
                    <span className="text-2xl font-black italic">42</span>
                    <Globe size={16} className="text-sky-400 rotate-12" />
                  </div>
                </div>
                <div className="bg-white/5 border border-white/10 rounded-3xl p-6 hover:bg-white/10 transition-all cursor-pointer group">
                  <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest mb-1">履约率</p>
                  <div className="flex items-center justify-between">
                    <span className="text-2xl font-black italic">92%</span>
                    <ArrowUpRight size={16} className="text-emerald-400" />
                  </div>
                </div>
              </div>

              <button className="w-full py-5 bg-sky-500 text-white font-black text-xs uppercase tracking-[0.2em] rounded-2xl shadow-xl hover:bg-sky-400 transition-all flex items-center justify-center gap-3">
                <Download size={18} /> 导出采购报表
              </button>
            </div>
          </div>

          <div className="ui-card bg-white p-5 sm:p-8 rounded-[24px] sm:rounded-[40px] shadow-sm border border-slate-100 space-y-5 sm:space-y-6">
            <h3 className="text-xs font-black text-slate-900 uppercase tracking-widest border-b border-slate-50 pb-4 flex items-center gap-2">
              <Calendar size={16} className="text-slate-400" /> 即将到货
            </h3>
            <div className="space-y-6">
              {[1, 2].map((i) => (
                <div key={i} className="flex items-center gap-4 border-l-4 border-sky-500 pl-4 py-1">
                  <div className="flex-1">
                    <p className="text-[10px] font-black text-slate-900 uppercase italic">Vanuatu Beverages</p>
                    <p className="text-[8px] font-bold text-slate-400 uppercase tracking-widest">预计到达：今天 14:00</p>
                  </div>
                  <span className="text-[8px] font-black text-sky-500 uppercase">追踪</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SupplierManagement;
