import { getCachedSharedState, loadSharedState, saveSharedState } from './sharedStateStore';

export type EmployeeRole =
  | '\u7ba1\u7406\u5458'
  | '\u8001\u677f'
  | '\u5e97\u957f'
  | '\u6536\u94f6\u5458'
  | '\u4ed3\u5e93\u7ba1\u7406\u5458'
  | '\u53f8\u673a';

export type EmployeeStatus = '\u542f\u7528' | '\u505c\u7528';
export type EmployeeAccountType = 'PLATFORM' | 'WHOLESALER' | 'RETAILER';

export interface EmployeeAccount {
  id: string;
  username: string;
  password: string;
  name: string;
  phone: string;
  role: EmployeeRole;
  status: EmployeeStatus;
  lastLogin: string;
}

const EMPLOYEE_STATE_KEY = 'employee_accounts';

const ROLE_LEGACY_MAP: Record<string, EmployeeRole> = {
  '\u7ba1\u7406\u5458': '\u7ba1\u7406\u5458',
  '\u8001\u677f': '\u8001\u677f',
  '\u5e97\u957f': '\u5e97\u957f',
  '\u6536\u94f6\u5458': '\u6536\u94f6\u5458',
  '\u4ed3\u5e93\u7ba1\u7406\u5458': '\u4ed3\u5e93\u7ba1\u7406\u5458',
  '\u53f8\u673a': '\u53f8\u673a',
  '\u7ec3\u53f8\u7ef4\u5b89': '\u7ba1\u7406\u5458',
  '\u8001\u677f': '\u8001\u677f',
  '\u5e97\u957f': '\u5e97\u957f',
  '\u6536\u94f6\u5458': '\u6536\u94f6\u5458',
  '\u4ed3\u5e93\u7ba1\u7406\u5458': '\u4ed3\u5e93\u7ba1\u7406\u5458',
  '\u53f8\u673a': '\u53f8\u673a',
};

const STATUS_LEGACY_MAP: Record<string, EmployeeStatus> = {
  '\u542f\u7528': '\u542f\u7528',
  '\u505c\u7528': '\u505c\u7528',
  '\u5f00\u542f': '\u542f\u7528',
  '\u5173\u95ed': '\u505c\u7528',
};

const normalizeRole = (value?: string | null): EmployeeRole => {
  const key = String(value || '').trim();
  return ROLE_LEGACY_MAP[key] || '\u6536\u94f6\u5458';
};

const normalizeStatus = (value?: string | null): EmployeeStatus => {
  const key = String(value || '').trim();
  return STATUS_LEGACY_MAP[key] || '\u542f\u7528';
};

export const getEmployeeAccountType = (accountId: string): EmployeeAccountType => {
  const normalized = String(accountId || '').toUpperCase();
  if (normalized.startsWith('P-')) return 'PLATFORM';
  if (normalized.startsWith('W-')) return 'WHOLESALER';
  return 'RETAILER';
};

export const getEmployeeRoleOptions = (accountId: string): EmployeeRole[] => {
  const type = getEmployeeAccountType(accountId);
  if (type === 'PLATFORM') return ['\u7ba1\u7406\u5458'];
  if (type === 'WHOLESALER') return ['\u8001\u677f', '\u5e97\u957f', '\u6536\u94f6\u5458', '\u4ed3\u5e93\u7ba1\u7406\u5458', '\u53f8\u673a'];
  return ['\u8001\u677f', '\u5e97\u957f', '\u6536\u94f6\u5458'];
};

const buildSeedPassword = (accountId: string, username: string) =>
  `${String(accountId || '').toLowerCase()}-${username}`.replace(/[^a-z0-9-]/g, '');

const seedEmployees = (accountId: string): EmployeeAccount[] => {
  const type = getEmployeeAccountType(accountId);

  if (type === 'PLATFORM') {
    return [
      {
        id: 'EMP-001',
        username: 'admin',
        password: buildSeedPassword(accountId, 'admin'),
        name: '\u5e73\u53f0\u7ba1\u7406\u5458',
        phone: '+678 55001',
        role: '\u7ba1\u7406\u5458',
        status: '\u542f\u7528',
        lastLogin: '2026-04-03 17:30',
      },
    ];
  }

  if (type === 'WHOLESALER') {
    return [
      {
        id: 'EMP-001',
        username: 'boss',
        password: buildSeedPassword(accountId, 'boss'),
        name: '\u6279\u53d1\u8001\u677f',
        phone: '+678 55101',
        role: '\u8001\u677f',
        status: '\u542f\u7528',
        lastLogin: '2026-04-03 17:30',
      },
      {
        id: 'EMP-002',
        username: 'manager',
        password: buildSeedPassword(accountId, 'manager'),
        name: '\u6279\u53d1\u5e97\u957f',
        phone: '+678 55102',
        role: '\u5e97\u957f',
        status: '\u542f\u7528',
        lastLogin: '2026-04-03 16:44',
      },
      {
        id: 'EMP-003',
        username: 'cashier',
        password: buildSeedPassword(accountId, 'cashier'),
        name: '\u6279\u53d1\u6536\u94f6\u5458',
        phone: '+678 55103',
        role: '\u6536\u94f6\u5458',
        status: '\u542f\u7528',
        lastLogin: '2026-04-03 09:10',
      },
      {
        id: 'EMP-004',
        username: 'warehouse',
        password: buildSeedPassword(accountId, 'warehouse'),
        name: '\u4ed3\u5e93\u7ba1\u7406\u5458',
        phone: '+678 55104',
        role: '\u4ed3\u5e93\u7ba1\u7406\u5458',
        status: '\u542f\u7528',
        lastLogin: '2026-04-02 19:10',
      },
      {
        id: 'EMP-005',
        username: 'driver',
        password: buildSeedPassword(accountId, 'driver'),
        name: '\u914d\u9001\u53f8\u673a',
        phone: '+678 55105',
        role: '\u53f8\u673a',
        status: '\u542f\u7528',
        lastLogin: '2026-04-02 08:20',
      },
    ];
  }

  return [
    {
      id: 'EMP-001',
      username: 'boss',
      password: buildSeedPassword(accountId, 'boss'),
      name: '\u96f6\u552e\u8001\u677f',
      phone: '+678 55201',
      role: '\u8001\u677f',
      status: '\u542f\u7528',
      lastLogin: '2026-04-03 17:30',
    },
    {
      id: 'EMP-002',
      username: 'manager',
      password: buildSeedPassword(accountId, 'manager'),
      name: '\u96f6\u552e\u5e97\u957f',
      phone: '+678 55202',
      role: '\u5e97\u957f',
      status: '\u542f\u7528',
      lastLogin: '2026-04-03 16:44',
    },
    {
      id: 'EMP-003',
      username: 'cashier',
      password: buildSeedPassword(accountId, 'cashier'),
      name: '\u96f6\u552e\u6536\u94f6\u5458',
      phone: '+678 55203',
      role: '\u6536\u94f6\u5458',
      status: '\u542f\u7528',
      lastLogin: '2026-04-02 19:10',
    },
  ];
};

const normalizeEmployees = (accountId: string, employees: EmployeeAccount[]) => {
  const seeded = seedEmployees(accountId);
  return employees.map((employee) => {
    const seed = seeded.find((item) => item.id === employee.id || item.username === employee.username);
    return {
      ...seed,
      ...employee,
      role: normalizeRole(employee.role || seed?.role),
      status: normalizeStatus(employee.status || seed?.status),
      username: employee.username || seed?.username || employee.id.toLowerCase(),
      password:
        employee.password ||
        seed?.password ||
        buildSeedPassword(accountId, employee.username || employee.id.toLowerCase()),
    } as EmployeeAccount;
  });
};

export const getEmployeeAccounts = (accountId: string): EmployeeAccount[] => {
  const resolved = accountId || 'R-001';
  return normalizeEmployees(
    resolved,
    getCachedSharedState(resolved, EMPLOYEE_STATE_KEY, seedEmployees(resolved))
  );
};

export const syncEmployeeAccounts = async (accountId: string): Promise<EmployeeAccount[]> => {
  const resolved = accountId || 'R-001';
  const local = getEmployeeAccounts(resolved);
  const synced = await loadSharedState(resolved, EMPLOYEE_STATE_KEY, local);
  if (synced.length > 0) {
    const normalized = normalizeEmployees(resolved, synced);
    await saveSharedState(resolved, EMPLOYEE_STATE_KEY, normalized);
    return normalized;
  }
  const seeded = seedEmployees(resolved);
  await saveSharedState(resolved, EMPLOYEE_STATE_KEY, seeded);
  return seeded;
};

export const setEmployeeAccounts = async (accountId: string, employees: EmployeeAccount[]) => {
  if (!accountId) return;
  await saveSharedState(accountId, EMPLOYEE_STATE_KEY, normalizeEmployees(accountId, employees));
};

export const getCashierCandidates = (accountId: string) =>
  getEmployeeAccounts(accountId).filter(
    (employee) => employee.status === '\u542f\u7528' && (employee.role === '\u6536\u94f6\u5458' || employee.role === '\u5e97\u957f')
  );

export const authenticateEmployeeAccount = (
  accountId: string,
  username: string,
  password: string,
  role?: EmployeeRole
) => {
  const normalizedUsername = username.trim().toLowerCase();
  const normalizedPassword = password.trim();
  if (!normalizedUsername || !normalizedPassword) return null;

  return (
    getEmployeeAccounts(accountId).find(
      (employee) =>
        employee.status === '\u542f\u7528' &&
        employee.username.toLowerCase() === normalizedUsername &&
        employee.password === normalizedPassword &&
        (!role || employee.role === role)
    ) || null
  );
};
