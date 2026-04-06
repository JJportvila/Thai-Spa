import React, { useEffect, useMemo, useState } from 'react';
import { KeyRound, ShieldCheck, ToggleLeft, ToggleRight, UserCog, UserPlus } from 'lucide-react';
import {
  EmployeeAccount,
  EmployeeRole,
  getEmployeeAccounts,
  getEmployeeAccountType,
  getEmployeeRoleOptions,
  setEmployeeAccounts,
  syncEmployeeAccounts,
} from '../lib/employeeStore';

const EmployeeAccountManagementPage: React.FC<{ accountId?: string }> = ({ accountId }) => {
  const resolvedAccountId = accountId || 'R-001';
  const accountType = getEmployeeAccountType(resolvedAccountId);
  const roleOptions = getEmployeeRoleOptions(resolvedAccountId);
  const [keyword, setKeyword] = useState('');
  const [accounts, setAccounts] = useState<EmployeeAccount[]>(() => getEmployeeAccounts(resolvedAccountId));
  const [newName, setNewName] = useState('');
  const [newPhone, setNewPhone] = useState('');
  const [newUsername, setNewUsername] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [newRole, setNewRole] = useState<EmployeeRole>(roleOptions[0]);

  useEffect(() => {
    void (async () => {
      setAccounts(await syncEmployeeAccounts(resolvedAccountId));
    })();
  }, [resolvedAccountId]);

  useEffect(() => {
    setNewRole(roleOptions[0]);
  }, [resolvedAccountId, roleOptions]);

  const filtered = useMemo(
    () =>
      accounts.filter(account => {
        const lowerKeyword = keyword.toLowerCase();
        return (
          account.name.toLowerCase().includes(lowerKeyword) ||
          account.phone.includes(keyword) ||
          account.id.toLowerCase().includes(lowerKeyword) ||
          account.username.toLowerCase().includes(lowerKeyword)
        );
      }),
    [accounts, keyword]
  );

  const addAccount = () => {
    if (!newName.trim() || !newPhone.trim() || !newUsername.trim() || !newPassword.trim()) return;
    const next = [
      {
        id: `EMP-${String(accounts.length + 1).padStart(3, '0')}`,
        name: newName.trim(),
        phone: newPhone.trim(),
        username: newUsername.trim().toLowerCase(),
        password: newPassword.trim(),
        role: newRole,
        status: '启用' as const,
        lastLogin: '未登录',
      },
      ...accounts,
    ];
    setAccounts(next);
    void setEmployeeAccounts(resolvedAccountId, next);
    setNewName('');
    setNewPhone('');
    setNewUsername('');
    setNewPassword('');
    setNewRole(roleOptions[0]);
  };

  const toggleStatus = (id: string) => {
    const next = accounts.map(account =>
      account.id === id
        ? { ...account, status: account.status === '启用' ? '停用' : '启用' }
        : account
    );
    setAccounts(next);
    void setEmployeeAccounts(resolvedAccountId, next);
  };

  const resetPassword = (id: string) => {
    const next = accounts.map(account =>
      account.id === id
        ? { ...account, password: `${resolvedAccountId.toLowerCase()}-${account.username}` }
        : account
    );
    setAccounts(next);
    void setEmployeeAccounts(resolvedAccountId, next);
  };

  const accountTitle =
    accountType === 'PLATFORM'
      ? '平台管理员账号'
      : accountType === 'WHOLESALER'
        ? '批发员工账号'
        : '零售员工账号';

  return (
    <div className="space-y-4 pb-12 sm:space-y-6">
      <div className="ui-card rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-8">
        <div className="flex flex-col justify-between gap-4 lg:flex-row lg:items-center">
          <div>
            <h2 className="flex items-center gap-2 text-xl font-black text-slate-900 sm:text-2xl">
              <UserCog className="text-[#1a237e]" /> 员工账号管理
            </h2>
            <p className="mt-2 text-sm text-slate-500">
              统一管理员工登录账号、密码、岗位权限和启停状态。
            </p>
            <div className="mt-3 inline-flex rounded-full bg-slate-100 px-3 py-1 text-xs font-black text-slate-700">
              当前类型：{accountTitle}
            </div>
          </div>
          <input
            value={keyword}
            onChange={e => setKeyword(e.target.value)}
            placeholder="搜索员工姓名、账号、手机号或 ID"
            className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm outline-none focus:border-[#dbe7ff] focus:ring-2 focus:ring-[#dbe7ff] lg:w-80"
          />
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:gap-6 xl:grid-cols-[minmax(0,1fr)_360px]">
        <div className="ui-card overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[900px]">
              <thead>
                <tr className="bg-slate-50 text-left text-[11px] uppercase tracking-widest text-slate-500">
                  <th className="px-6 py-4">员工</th>
                  <th className="px-4 py-4">登录账号</th>
                  <th className="px-4 py-4">岗位</th>
                  <th className="px-4 py-4">状态</th>
                  <th className="px-4 py-4">最近登录</th>
                  <th className="px-6 py-4 text-right">操作</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filtered.map(account => (
                  <tr key={account.id} className="hover:bg-slate-50/60">
                    <td className="px-6 py-4">
                      <div className="font-black text-slate-900">{account.name}</div>
                      <div className="text-xs text-slate-500">
                        {account.id} · {account.phone}
                      </div>
                    </td>
                    <td className="px-4 py-4">
                      <div className="font-black text-slate-800">{account.username}</div>
                      <div className="text-xs text-slate-500">密码：{account.password}</div>
                    </td>
                    <td className="px-4 py-4 text-sm text-slate-700">{account.role}</td>
                    <td className="px-4 py-4">
                      <span
                        className={`rounded-full px-2.5 py-1 text-xs font-black ${
                          account.status === '启用'
                            ? 'bg-[#1a237e] text-[#1a237e]'
                            : 'bg-slate-100 text-slate-500'
                        }`}
                      >
                        {account.status}
                      </span>
                    </td>
                    <td className="px-4 py-4 text-sm text-slate-600">{account.lastLogin}</td>
                    <td className="px-6 py-4">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => toggleStatus(account.id)}
                          className="ui-btn ui-btn-secondary flex items-center gap-1 rounded-lg px-3 py-2 text-xs"
                        >
                          {account.status === '启用' ? <ToggleRight size={14} /> : <ToggleLeft size={14} />}
                          {account.status === '启用' ? '停用' : '启用'}
                        </button>
                        <button
                          onClick={() => resetPassword(account.id)}
                          className="ui-btn ui-btn-primary flex items-center gap-1 rounded-lg px-3 py-2 text-xs"
                        >
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

        <div className="ui-panel space-y-4 rounded-3xl bg-slate-900 p-5 text-white sm:p-6">
          <h3 className="flex items-center gap-2 text-sm font-black uppercase tracking-widest">
            <UserPlus size={16} /> 新增员工账号
          </h3>
          <input
            value={newName}
            onChange={e => setNewName(e.target.value)}
            placeholder="员工姓名"
            className="w-full rounded-xl border border-white/15 bg-white/10 px-3 py-2.5 text-sm outline-none"
          />
          <input
            value={newPhone}
            onChange={e => setNewPhone(e.target.value)}
            placeholder="手机号"
            className="w-full rounded-xl border border-white/15 bg-white/10 px-3 py-2.5 text-sm outline-none"
          />
          <input
            value={newUsername}
            onChange={e => setNewUsername(e.target.value)}
            placeholder="登录账号"
            className="w-full rounded-xl border border-white/15 bg-white/10 px-3 py-2.5 text-sm outline-none"
          />
          <input
            value={newPassword}
            onChange={e => setNewPassword(e.target.value)}
            placeholder="登录密码"
            className="w-full rounded-xl border border-white/15 bg-white/10 px-3 py-2.5 text-sm outline-none"
          />
          <select
            value={newRole}
            onChange={e => setNewRole(e.target.value as EmployeeRole)}
            className="w-full rounded-xl border border-white/15 bg-white/10 px-3 py-2.5 text-sm outline-none"
          >
            {roleOptions.map(role => (
              <option key={role} value={role}>
                {role}
              </option>
            ))}
          </select>
          <button
            onClick={addAccount}
            className="ui-btn ui-btn-primary w-full rounded-xl py-3 text-sm"
          >
            创建员工账号
          </button>
          <div className="flex items-start gap-2 border-t border-white/10 pt-3 text-xs text-slate-300">
            <ShieldCheck size={14} className="mt-0.5 text-[#1a237e]" />
            {accountType === 'PLATFORM'
              ? '平台账号只保留管理员岗位。'
              : accountType === 'WHOLESALER'
                ? '批发商可为老板、店长、收银员、仓库管理员和司机分别创建独立登录账号。'
                : '零售商可为老板、店长和收银员分别创建独立登录账号。'}
          </div>
        </div>
      </div>
    </div>
  );
};

export default EmployeeAccountManagementPage;

