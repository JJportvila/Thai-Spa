export type EmployeeRole = '店长' | '收银员' | '仓管员' | '运营';
export type EmployeeStatus = '启用' | '停用';

export interface EmployeeAccount {
  id: string;
  name: string;
  phone: string;
  role: EmployeeRole;
  status: EmployeeStatus;
  lastLogin: string;
}

const KEY_PREFIX = 'stretpos.employees.';
const getKey = (accountId: string) => `${KEY_PREFIX}${accountId}`;

const seedEmployees = (): EmployeeAccount[] => [
  { id: 'EMP-001', name: 'Lina T.', phone: '+678 55101', role: '店长', status: '启用', lastLogin: '2026-04-03 17:30' },
  { id: 'EMP-002', name: 'Mark N.', phone: '+678 55102', role: '收银员', status: '启用', lastLogin: '2026-04-03 16:44' },
  { id: 'EMP-003', name: 'Amy K.', phone: '+678 55103', role: '仓管员', status: '停用', lastLogin: '2026-04-02 19:10' },
];

export const getEmployeeAccounts = (accountId: string): EmployeeAccount[] => {
  if (!accountId) return seedEmployees();
  try {
    const raw = localStorage.getItem(getKey(accountId));
    if (!raw) {
      const seed = seedEmployees();
      localStorage.setItem(getKey(accountId), JSON.stringify(seed));
      return seed;
    }
    const parsed = JSON.parse(raw) as EmployeeAccount[];
    return Array.isArray(parsed) ? parsed : seedEmployees();
  } catch {
    return seedEmployees();
  }
};

export const setEmployeeAccounts = (accountId: string, employees: EmployeeAccount[]) => {
  if (!accountId) return;
  try {
    localStorage.setItem(getKey(accountId), JSON.stringify(employees));
  } catch {}
};

export const getCashierCandidates = (accountId: string) =>
  getEmployeeAccounts(accountId).filter((e) => e.status === '启用' && (e.role === '收银员' || e.role === '店长'));
