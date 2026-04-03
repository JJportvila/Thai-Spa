import React, { useEffect, useMemo, useState } from 'react';
import { UserPlus, ShieldCheck, KeyRound, UserCog, ToggleLeft, ToggleRight } from 'lucide-react';
import { EmployeeAccount, EmployeeRole, getEmployeeAccounts, setEmployeeAccounts } from '../lib/employeeStore';

const EmployeeAccountManagementPage: React.FC<{ accountId?: string }> = ({ accountId }) => {
  const [keyword, setKeyword] = useState('');
  const [accounts, setAccounts] = useState<EmployeeAccount[]>(() => getEmployeeAccounts(accountId || 'R-001'));
  const [newName, setNewName] = useState('');
  const [newPhone, setNewPhone] = useState('');
  const [newRole, setNewRole] = useState<EmployeeRole>('收银员');

  useEffect(() => {
    setAccounts(getEmployeeAccounts(accountId || 'R-001'));
  }, [accountId]);

  const filtered = useMemo(
    () =>
      accounts.filter(
        (a) =>
          a.name.toLowerCase().includes(keyword.toLowerCase()) ||
          a.phone.includes(keyword) ||
          a.id.toLowerCase().includes(keyword.toLowerCase())
      ),
    [accounts, keyword]
  );

  const addAccount = () => {
    if (!newName.trim() || !newPhone.trim()) return;
    const next = [
      {
        id: `EMP-${String(accounts.length + 1).padStart(3, '0')}`,
        name: newName.trim(),
        phone: newPhone.trim(),
        role: newRole,
        status: '启用',
        lastLogin: '首次登录',
      },
      ...accounts,
    ];
    setAccounts(next);
    if (accountId) setEmployeeAccounts(accountId, next);
    setNewName('');
    setNewPhone('');
    setNewRole('收银员');
  };

  const toggleStatus = (id: string) => {
    const next = accounts.map((a) => (a.id === id ? { ...a, status: a.status === '启用' ? '停用' : '启用' } : a));
    setAccounts(next);
    if (accountId) setEmployeeAccounts(accountId, next);
  };

  return (
    <div className="space-y-4 sm:space-y-6 pb-12">
      <div className="ui-card bg-white rounded-3xl border border-slate-200 p-5 sm:p-8 shadow-sm">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div>
            <h2 className="text-xl sm:text-2xl font-black text-slate-900 flex items-center gap-2">
              <UserCog className="text-sky-500" /> 员工账号管理
            </h2>
            <p className="mt-2 text-sm text-slate-500">为门店配置员工账号、角色权限与登录状态。</p>
          </div>
          <input
            value={keyword}
            onChange={(e) => setKeyword(e.target.value)}
            placeholder="搜索员工姓名/手机号/账号ID"
            className="w-full lg:w-80 bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500"
          />
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-[minmax(0,1fr)_340px] gap-4 sm:gap-6">
        <div className="ui-card bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[760px]">
              <thead>
                <tr className="bg-slate-50 text-left text-[11px] text-slate-500 uppercase tracking-widest">
                  <th className="px-6 py-4">员工</th>
                  <th className="px-4 py-4">角色</th>
                  <th className="px-4 py-4">状态</th>
                  <th className="px-4 py-4">最近登录</th>
                  <th className="px-6 py-4 text-right">操作</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filtered.map((a) => (
                  <tr key={a.id} className="hover:bg-slate-50/60">
                    <td className="px-6 py-4">
                      <div className="font-black text-slate-900">{a.name}</div>
                      <div className="text-xs text-slate-500">{a.id} · {a.phone}</div>
                    </td>
                    <td className="px-4 py-4 text-sm text-slate-700">{a.role}</td>
                    <td className="px-4 py-4">
                      <span className={`px-2.5 py-1 rounded-full text-xs font-black ${a.status === '启用' ? 'bg-emerald-50 text-emerald-600' : 'bg-slate-100 text-slate-500'}`}>
                        {a.status}
                      </span>
                    </td>
                    <td className="px-4 py-4 text-sm text-slate-600">{a.lastLogin}</td>
                    <td className="px-6 py-4">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => toggleStatus(a.id)}
                          className="ui-btn ui-btn-secondary px-3 py-2 rounded-lg text-xs flex items-center gap-1"
                        >
                          {a.status === '启用' ? <ToggleRight size={14} /> : <ToggleLeft size={14} />}
                          {a.status === '启用' ? '停用' : '启用'}
                        </button>
                        <button className="ui-btn ui-btn-primary px-3 py-2 rounded-lg text-xs flex items-center gap-1">
                          <KeyRound size={14} /> 重置密码
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="ui-panel bg-slate-900 rounded-3xl p-5 sm:p-6 text-white space-y-4">
          <h3 className="font-black text-sm uppercase tracking-widest flex items-center gap-2">
            <UserPlus size={16} /> 新建员工账号
          </h3>
          <input
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            placeholder="员工姓名"
            className="w-full bg-white/10 border border-white/15 rounded-xl px-3 py-2.5 text-sm outline-none"
          />
          <input
            value={newPhone}
            onChange={(e) => setNewPhone(e.target.value)}
            placeholder="手机号"
            className="w-full bg-white/10 border border-white/15 rounded-xl px-3 py-2.5 text-sm outline-none"
          />
          <select
            value={newRole}
            onChange={(e) => setNewRole(e.target.value as EmployeeRole)}
            className="w-full bg-white/10 border border-white/15 rounded-xl px-3 py-2.5 text-sm outline-none"
          >
            <option>店长</option>
            <option>收银员</option>
            <option>仓管员</option>
            <option>运营</option>
          </select>
          <button onClick={addAccount} className="ui-btn ui-btn-primary w-full py-3 rounded-xl text-sm">
            保存账号
          </button>
          <div className="pt-3 border-t border-white/10 text-xs text-slate-300 flex items-start gap-2">
            <ShieldCheck size={14} className="mt-0.5 text-emerald-400" />
            员工仅可访问已分配的模块；建议为店长开启全部权限。
          </div>
        </div>
      </div>
    </div>
  );
};

export default EmployeeAccountManagementPage;
