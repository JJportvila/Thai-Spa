import React, { useState } from 'react';
import { 
  Users, 
  Search, 
  Plus, 
  MoreVertical, 
  Mail, 
  Phone, 
  MapPin, 
  TrendingUp, 
  ChevronRight,
  Filter,
  Download,
  Building2,
  Calendar,
  CreditCard,
  History,
  ArrowUpRight,
  Star,
  X
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { formatVT } from '../lib/utils';
import { useTranslation } from 'react-i18next';

interface Customer {
  id: string;
  name: string;
  email: string;
  phone: string;
  address: string;
  status: 'ACTIVE' | 'INACTIVE' | 'PENDING';
  type: 'Wholesale' | 'Retail' | 'Corporate';
  totalSpent: number;
  lastOrder: string;
  loyaltyPoints: number;
  avatar?: string;
}

const mockCustomers: Customer[] = [
  { id: 'CUS-001', name: 'Island Resorts Group Ltd.', email: 'hq@islandresorts.vu', phone: '+678 22344', address: 'Port Vila, Efate', status: 'ACTIVE', type: 'Corporate', totalSpent: 1250000, lastOrder: '2024-03-20', loyaltyPoints: 4500 },
  { id: 'CUS-002', name: 'Coral Bay Supplies', email: 'orders@coralbay.vu', phone: '+678 24556', address: 'Luganville, Santo', status: 'ACTIVE', type: 'Wholesale', totalSpent: 890000, lastOrder: '2024-03-18', loyaltyPoints: 2100 },
  { id: 'CUS-003', name: 'Pacific Logistics & Trading', email: 'logistics@pacitrade.vu', phone: '+678 27889', address: 'Tanna Island', status: 'PENDING', type: 'Wholesale', totalSpent: 450000, lastOrder: '2024-03-15', loyaltyPoints: 1200 },
  { id: 'CUS-004', name: 'Sunrise Retailers', email: 'hello@sunrise.vu', phone: '+678 21122', address: 'Port Vila, Efate', status: 'ACTIVE', type: 'Retail', totalSpent: 320000, lastOrder: '2024-03-10', loyaltyPoints: 850 },
  { id: 'CUS-005', name: 'Blue Horizon Traders', email: 'blue@horizon.vu', phone: '+678 29900', address: 'Port Vila, Efate', status: 'INACTIVE', type: 'Wholesale', totalSpent: 15000, lastOrder: '2023-12-05', loyaltyPoints: 50 },
];

const CustomerManagement: React.FC = () => {
  const { t } = useTranslation();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTab, setSelectedTab] = useState<'ALL' | 'ACTIVE' | 'PENDING'>('ALL');
  const [showAddModal, setShowAddModal] = useState(false);

  const filteredCustomers = mockCustomers.filter(c => {
    const matchesSearch = c.name.toLowerCase().includes(searchQuery.toLowerCase()) || c.id.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesTab = selectedTab === 'ALL' || c.status === selectedTab;
    return matchesSearch && matchesTab;
  });

  return (
    <div className="w-full space-y-4 sm:space-y-6 lg:space-y-8 pb-20 font-['Inter']">
      {/* HEADER SECTION */}
      <div className="ui-card bg-white rounded-[24px] sm:rounded-[32px] p-4 sm:p-6 lg:p-8 border border-slate-200 shadow-sm flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-4 sm:gap-6 lg:gap-8">
        <div className="flex items-center gap-5">
          <div className="w-14 h-14 bg-[#0b193c] rounded-2xl flex items-center justify-center text-[#1a237e] shadow-lg ring-4 ring-[#dbe7ff]">
            <Users size={28} />
          </div>
          <div>
            <h1 className="text-2xl font-['Manrope'] font-black uppercase text-[#0b193c] italic leading-none">客户管理系统</h1>
            <div className="flex items-center gap-2 mt-1">
              <span className="text-[10px] font-black text-[#1a237e] uppercase tracking-[0.2em]">CRM MODULE</span>
              <span className="w-1 h-1 bg-slate-300 rounded-full"></span>
              <span className="text-[10px] font-black text-[#1a237e] uppercase tracking-widest italic">Maritime Ledger</span>
            </div>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 sm:gap-4 w-full lg:w-auto">
          <div className="relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" size={18} />
            <input 
              type="text" 
              placeholder="搜索客户名称或 ID..." 
              className="pl-12 pr-6 py-4 bg-slate-50 border-none rounded-2xl text-[11px] font-bold text-[#0b193c] focus:ring-2 focus:ring-[#dbe7ff] focus:bg-white transition-all outline-none w-full sm:w-72 lg:w-80 shadow-sm"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          <button 
            onClick={() => setShowAddModal(true)}
            className="px-6 sm:px-8 py-4 bg-[#0b193c] text-[#1a237e] rounded-2xl text-[11px] font-black uppercase tracking-[0.2em] shadow-xl hover:bg-[#1a237e] transition-all flex items-center justify-center gap-3 active:scale-95"
          >
            <Plus size={18} /> 新增客户
          </button>
        </div>
      </div>

      <div className="grid grid-cols-12 gap-4 sm:gap-6 lg:gap-8 items-start">
        {/* MAIN LIST AREA */}
        <div className="col-span-12 xl:col-span-8 space-y-4 sm:space-y-6">
          <div className="flex items-center gap-4 no-scrollbar overflow-x-auto pb-2">
            {(['ALL', 'ACTIVE', 'PENDING'] as const).map(tab => (
              <button
                key={tab}
                onClick={() => setSelectedTab(tab)}
                className={`px-6 sm:px-8 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all whitespace-nowrap ${
                  selectedTab === tab 
                  ? 'bg-[#0b193c] text-[#1a237e] shadow-xl shadow-slate-200' 
                  : 'bg-white text-slate-500 border border-slate-100 hover:border-slate-300'
                }`}
              >
                {tab === 'ALL' ? 'All Customers' : tab === 'ACTIVE' ? 'Active' : 'Pending'}
              </button>
            ))}
          </div>

          <div className="ui-card bg-white rounded-[24px] sm:rounded-[40px] shadow-sm border border-slate-100 overflow-hidden ring-1 ring-slate-100">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[760px] text-left">
                <thead>
                  <tr className="border-b border-slate-50 text-[9px] font-black text-slate-500 uppercase tracking-widest bg-slate-50/50">
                    <th className="px-8 py-5">客户详情</th>
                    <th className="px-4 py-5">业务类型</th>
                    <th className="px-4 py-5 text-right">累计成交额</th>
                    <th className="px-4 py-5 text-center">Status</th>
                    <th className="px-8 py-5"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {filteredCustomers.map((customer) => (
                    <tr key={customer.id} className="group hover:bg-slate-50/50 transition-all cursor-pointer">
                      <td className="px-8 py-6">
                        <div className="flex items-center gap-4">
                          <div className="w-12 h-12 rounded-xl bg-slate-100 flex items-center justify-center text-[#0b193c] font-black italic shadow-inner group-hover:bg-white transition-colors">
                            {customer.name.slice(0, 2).toUpperCase()}
                          </div>
                          <div>
                            <div className="text-sm font-black text-[#0b193c] uppercase italic tracking-tight">{customer.name}</div>
                            <div className="text-[9px] font-bold text-slate-500 uppercase tracking-widest mt-1">ID: {customer.id}</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-6">
                        <div className="flex items-center gap-2">
                          <Building2 size={12} className="text-slate-400" />
                          <span className="text-[10px] font-black text-slate-600 uppercase tracking-widest">{customer.type}</span>
                        </div>
                      </td>
                      <td className="px-4 py-6 text-right">
                        <div className="text-xs font-black text-[#0b193c] italic">{formatVT(customer.totalSpent)}</div>
                        <div className="text-[9px] font-bold text-[#1a237e] uppercase flex items-center justify-end gap-1 mt-1">
                          <TrendingUp size={10} /> +12% YoY
                        </div>
                      </td>
                      <td className="px-4 py-6 text-center">
                        <span className={`px-4 py-1.5 rounded-full text-[8px] font-black uppercase tracking-widest ${
                          customer.status === 'ACTIVE' ? 'bg-[#1a237e] text-[#1a237e]' :
                          customer.status === 'PENDING' ? 'bg-[#1a237e] text-[#1a237e]' :
                          'bg-slate-100 text-slate-500'
                        }`}>
                          {customer.status}
                        </span>
                      </td>
                      <td className="px-8 py-6 text-right">
                        <button className="p-2 text-slate-400 hover:text-[#0b193c] hover:bg-white rounded-xl transition-all"><MoreVertical size={18} /></button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {filteredCustomers.length === 0 && (
              <div className="py-24 text-center">
                 <Users className="mx-auto text-[#1a237e] mb-4" size={48} />
                 <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest italic">未找到匹配的客户记录</p>
              </div>
            )}
          </div>
        </div>

        {/* SIDEBAR DASHBOARD */}
        <div className="col-span-12 xl:col-span-4 space-y-4 sm:space-y-6">
          <div className="ui-panel bg-[#0b193c] p-5 sm:p-8 lg:p-10 rounded-[28px] sm:rounded-[48px] shadow-2xl text-[#1a237e] relative overflow-hidden ring-4 ring-slate-100">
             <div className="absolute inset-0 opacity-[0.03] pointer-events-none" style={{ backgroundImage: 'radial-gradient(circle at 2px 2px, white 1px, transparent 0)', backgroundSize: '16px 16px' }}></div>
             <div className="relative z-10 space-y-8">
                <div>
                   <p className="text-[10px] font-black text-[#1a237e] uppercase tracking-[0.3em] mb-2 italic">Global Performance</p>
                   <h2 className="text-4xl font-['Manrope'] font-black text-[#1a237e] italic tracking-tighter leading-none">VUV 4.5M</h2>
                   <p className="text-[10px] font-bold text-slate-500 uppercase mt-2 tracking-widest leading-none">Quarterly Wholese Volume</p>
                </div>

                <div className="grid grid-cols-2 gap-4">
                   <div className="bg-white/5 border border-white/10 rounded-3xl p-6 hover:bg-white/10 transition-all cursor-pointer group">
                      <p className="text-[8px] font-black text-slate-500 uppercase tracking-widest mb-1">Active Accounts</p>
                      <div className="flex items-center justify-between">
                         <span className="text-2xl font-black italic">84</span>
                         <ArrowUpRight size={16} className="text-[#1a237e] group-hover:translate-x-1 group-hover:-translate-y-1 transition-transform" />
                      </div>
                   </div>
                   <div className="bg-white/5 border border-white/10 rounded-3xl p-6 hover:bg-white/10 transition-all cursor-pointer group">
                      <p className="text-[8px] font-black text-slate-500 uppercase tracking-widest mb-1">Retention</p>
                      <div className="flex items-center justify-between">
                         <span className="text-2xl font-black italic">96%</span>
                         <Star size={16} className="text-[#1a237e]" />
                      </div>
                   </div>
                </div>

                <button className="w-full py-5 bg-[#1a237e] text-[#0b193c] font-black text-xs uppercase tracking-[0.2em] rounded-2xl shadow-xl hover:bg-[#1a237e] transition-all flex items-center justify-center gap-3 active:scale-95">
                  <Download size={18} /> 导出客户报表 (CSV)
                </button>
             </div>
          </div>

          <div className="ui-card bg-white p-5 sm:p-8 rounded-[24px] sm:rounded-[40px] shadow-sm border border-slate-100 space-y-5 sm:space-y-6">
             <h3 className="text-xs font-black text-[#0b193c] uppercase tracking-widest border-b border-slate-50 pb-4 flex items-center gap-2">
                <History size={16} className="text-slate-500" /> 近期活动
             </h3>
             <div className="space-y-6">
                {[1, 2, 3].map(i => (
                  <div key={i} className="flex items-center gap-4">
                    <div className="w-2 h-2 rounded-full bg-[#1a237e] shadow-[0_0_10px_rgba(36,48,143,0.5)]" />
                    <div className="flex-1">
                      <p className="text-[10px] font-black text-[#0b193c] uppercase italic truncate">Island Resorts Group</p>
                      <p className="text-[8px] font-bold text-slate-500 uppercase tracking-widest">New Order: VUV 45,000</p>
                    </div>
                    <span className="text-[8px] font-black text-slate-400 uppercase">2M AGO</span>
                    <ChevronRight size={14} className="text-slate-500" />
                  </div>
                ))}
             </div>
          </div>
        </div>
      </div>

      <AnimatePresence>
        {showAddModal && (
          <div className="fixed inset-0 z-[200] flex items-center justify-center p-3 sm:p-6 bg-[#0b1a3d]/80 backdrop-blur-md">
            <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }} 
              className="bg-white w-full max-w-2xl rounded-[24px] sm:rounded-[48px] overflow-hidden shadow-2xl relative flex flex-col border-[4px] border-white/20"
            >
              <div className="bg-[#0b193c] p-5 sm:p-8 lg:p-10 flex justify-between items-center text-[#1a237e] relative">
                <div className="absolute inset-0 opacity-10 pointer-events-none" style={{ backgroundImage: 'radial-gradient(circle at 2px 2px, white 1px, transparent 0)', backgroundSize: '24px 24px' }}></div>
                <div className="relative z-10">
                  <h3 className="text-2xl font-['Manrope'] font-black italic uppercase tracking-tighter flex items-center gap-4">
                    <Plus size={32} className="text-[#1a237e]" /> 新增客户档案
                  </h3>
                  <p className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-500 mt-1">Register new wholesaler or retail partner</p>
                </div>
                <button onClick={() => setShowAddModal(false)} className="p-4 hover:bg-white/10 rounded-full transition-all bg-white/5"><X size={28} /></button>
              </div>
              
              <div className="p-4 sm:p-6 lg:p-10 space-y-6 sm:space-y-8 bg-slate-50/50 overflow-y-auto max-h-[75vh]">
                 <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
                    <div className="space-y-2">
                       <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest px-1">公司/客户名称</label>
                       <input type="text" className="w-full bg-white border-2 border-slate-100 rounded-3xl px-6 py-4 text-sm font-bold text-[#0b193c] outline-none focus:border-[#dbe7ff] shadow-sm" placeholder="e.g. Switi Vanuatu Ltd." />
                    </div>
                    <div className="space-y-2">
                       <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest px-1">业务类型</label>
                       <select className="w-full bg-white border-2 border-slate-100 rounded-3xl px-6 py-4 text-sm font-bold text-[#0b193c] outline-none focus:border-[#dbe7ff] shadow-sm cursor-pointer appearance-none">
                          <option>批发客户</option>
                          <option>零售客户</option>
                          <option>企业客户</option>
                       </select>
                    </div>
                 </div>

                 <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
                    <div className="space-y-2">
                       <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest px-1">联系电话</label>
                       <div className="relative">
                          <Phone size={14} className="absolute left-6 top-1/2 -translate-y-1/2 text-slate-400" />
                          <input type="text" className="w-full bg-white border-2 border-slate-100 rounded-3xl pl-12 pr-6 py-4 text-sm font-bold text-[#0b193c] outline-none focus:border-[#dbe7ff] shadow-sm" placeholder="+678 ..." />
                       </div>
                    </div>
                    <div className="space-y-2">
                       <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest px-1">电子邮箱</label>
                       <div className="relative">
                          <Mail size={14} className="absolute left-6 top-1/2 -translate-y-1/2 text-slate-400" />
                          <input type="email" className="w-full bg-white border-2 border-slate-100 rounded-3xl pl-12 pr-6 py-4 text-sm font-bold text-[#0b193c] outline-none focus:border-[#dbe7ff] shadow-sm" placeholder="office@company.vu" />
                       </div>
                    </div>
                 </div>

                 <div className="space-y-2">
                    <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest px-1">经营地址</label>
                    <div className="relative">
                       <MapPin size={14} className="absolute left-6 top-1/2 -translate-y-1/2 text-slate-400" />
                       <input type="text" className="w-full bg-white border-2 border-slate-100 rounded-3xl pl-12 pr-6 py-4 text-sm font-bold text-[#0b193c] outline-none focus:border-[#dbe7ff] shadow-sm" placeholder="Shipping Address / Main Office" />
                    </div>
                 </div>
              </div>

              <div className="p-4 sm:p-6 lg:p-10 bg-white border-t border-slate-100 flex flex-col sm:flex-row gap-3 sm:gap-4">
                 <button onClick={() => setShowAddModal(false)} className="flex-1 py-4 sm:py-5 bg-slate-100 text-slate-500 rounded-2xl text-[11px] font-black uppercase tracking-[0.2em] hover:bg-slate-200 transition-all">取消</button>
                 <button className="ui-btn ui-btn-primary flex-1 py-4 sm:py-5 rounded-2xl text-[11px] uppercase tracking-[0.2em] shadow-xl shadow-slate-200 px-6 sm:px-10">保存客户档案</button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default CustomerManagement;






