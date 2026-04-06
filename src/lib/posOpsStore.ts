import { getCachedSharedState, loadSharedState, saveSharedState } from './sharedStateStore';

export type PosPaymentMethod = 'CASH' | 'CARD' | 'STRET_PAY' | 'CHECK';

export interface PosSaleRecord {
  id: string;
  amount: number;
  paymentMethod: PosPaymentMethod;
  itemCount: number;
  createdAt: string;
}

export interface PosHandoverRecord {
  at: string;
  from: string;
  to: string;
  note?: string;
}

export interface PosShiftSession {
  id: string;
  cashierName: string;
  startedAt: string;
  endedAt?: string;
  status: 'OPEN' | 'CLOSED';
  salesCount: number;
  salesAmount: number;
  handovers: PosHandoverRecord[];
}

export interface PosDayClosure {
  id: string;
  businessDate: string;
  closedAt: string;
  operator: string;
  salesCount: number;
  salesAmount: number;
  paymentBreakdown: Record<PosPaymentMethod, number>;
}

export interface PosMonthClosure {
  id: string;
  businessMonth: string;
  closedAt: string;
  operator: string;
  salesCount: number;
  salesAmount: number;
  paymentBreakdown: Record<PosPaymentMethod, number>;
}

export interface PosOpsState {
  activeShift: PosShiftSession | null;
  shifts: PosShiftSession[];
  sales: PosSaleRecord[];
  dayClosures: PosDayClosure[];
  monthClosures: PosMonthClosure[];
}

const POS_OPS_STATE_KEY = 'pos_ops_state';

const emptyState = (): PosOpsState => ({
  activeShift: null,
  shifts: [],
  sales: [],
  dayClosures: [],
  monthClosures: [],
});

const getBusinessDate = (iso: string) => new Date(iso).toISOString().slice(0, 10);
const getBusinessMonth = (iso: string) => new Date(iso).toISOString().slice(0, 7);

export const getPosOpsState = (accountId: string): PosOpsState => {
  if (!accountId) return emptyState();
  const parsed = getCachedSharedState(accountId, POS_OPS_STATE_KEY, emptyState()) as PosOpsState;
  if (!parsed || typeof parsed !== 'object') return emptyState();
  return {
    activeShift: parsed.activeShift || null,
    shifts: parsed.shifts || [],
    sales: parsed.sales || [],
    dayClosures: parsed.dayClosures || [],
    monthClosures: parsed.monthClosures || [],
  };
};

const setPosOpsState = (accountId: string, state: PosOpsState) => {
  if (!accountId) return;
  void saveSharedState(accountId, POS_OPS_STATE_KEY, state);
};

export const syncPosOpsState = async (accountId: string): Promise<PosOpsState> => {
  if (!accountId) return emptyState();
  const local = getPosOpsState(accountId);
  const synced = await loadSharedState(accountId, POS_OPS_STATE_KEY, local);
  return {
    activeShift: synced.activeShift || null,
    shifts: synced.shifts || [],
    sales: synced.sales || [],
    dayClosures: synced.dayClosures || [],
    monthClosures: synced.monthClosures || [],
  };
};

export const startPosShift = (accountId: string, cashierName: string) => {
  const state = getPosOpsState(accountId);
  if (state.activeShift) return state;
  const shift: PosShiftSession = {
    id: `SHIFT-${Date.now()}`,
    cashierName: cashierName || accountId,
    startedAt: new Date().toISOString(),
    status: 'OPEN',
    salesCount: 0,
    salesAmount: 0,
    handovers: [],
  };
  const next = { ...state, activeShift: shift, shifts: [shift, ...state.shifts] };
  setPosOpsState(accountId, next);
  return next;
};

export const handoverPosShift = (accountId: string, toCashier: string, note?: string) => {
  const state = getPosOpsState(accountId);
  if (!state.activeShift || !toCashier.trim()) return state;
  const handover: PosHandoverRecord = {
    at: new Date().toISOString(),
    from: state.activeShift.cashierName,
    to: toCashier.trim(),
    note,
  };
  const updatedActive: PosShiftSession = {
    ...state.activeShift,
    cashierName: toCashier.trim(),
    handovers: [handover, ...state.activeShift.handovers],
  };
  const next = {
    ...state,
    activeShift: updatedActive,
    shifts: state.shifts.map((s) => (s.id === updatedActive.id ? updatedActive : s)),
  };
  setPosOpsState(accountId, next);
  return next;
};

export const recordPosSale = (accountId: string, sale: Omit<PosSaleRecord, 'id' | 'createdAt'>) => {
  const state = getPosOpsState(accountId);
  const now = new Date().toISOString();
  const entry: PosSaleRecord = {
    id: `SALE-${Date.now()}`,
    createdAt: now,
    ...sale,
  };

  let activeShift = state.activeShift;
  if (activeShift) {
    activeShift = {
      ...activeShift,
      salesCount: activeShift.salesCount + 1,
      salesAmount: activeShift.salesAmount + sale.amount,
    };
  }

  const next = {
    ...state,
    activeShift,
    shifts: activeShift ? state.shifts.map((s) => (s.id === activeShift!.id ? activeShift! : s)) : state.shifts,
    sales: [entry, ...state.sales].slice(0, 500),
  };
  setPosOpsState(accountId, next);
  return next;
};

export const closePosDay = (accountId: string, operator: string) => {
  const state = getPosOpsState(accountId);
  const now = new Date().toISOString();
  const date = getBusinessDate(now);

  const daySales = state.sales.filter((s) => getBusinessDate(s.createdAt) === date);
  const paymentBreakdown: Record<PosPaymentMethod, number> = {
    CASH: 0,
    CARD: 0,
    STRET_PAY: 0,
    CHECK: 0,
  };
  for (const s of daySales) paymentBreakdown[s.paymentMethod] += s.amount;

  const closure: PosDayClosure = {
    id: `CLOSE-${Date.now()}`,
    businessDate: date,
    closedAt: now,
    operator,
    salesCount: daySales.length,
    salesAmount: daySales.reduce((sum, s) => sum + s.amount, 0),
    paymentBreakdown,
  };

  const closedShift = state.activeShift
    ? { ...state.activeShift, status: 'CLOSED' as const, endedAt: now }
    : null;

  const next = {
    ...state,
    activeShift: null,
    shifts: closedShift ? state.shifts.map((s) => (s.id === closedShift.id ? closedShift : s)) : state.shifts,
    dayClosures: [closure, ...state.dayClosures].slice(0, 120),
  };
  setPosOpsState(accountId, next);
  return next;
};

export const closePosMonth = (accountId: string, operator: string) => {
  const state = getPosOpsState(accountId);
  const now = new Date().toISOString();
  const month = getBusinessMonth(now);

  const monthSales = state.sales.filter((s) => getBusinessMonth(s.createdAt) === month);
  const paymentBreakdown: Record<PosPaymentMethod, number> = {
    CASH: 0,
    CARD: 0,
    STRET_PAY: 0,
    CHECK: 0,
  };
  for (const s of monthSales) paymentBreakdown[s.paymentMethod] += s.amount;

  const closure: PosMonthClosure = {
    id: `MCLOSE-${Date.now()}`,
    businessMonth: month,
    closedAt: now,
    operator,
    salesCount: monthSales.length,
    salesAmount: monthSales.reduce((sum, s) => sum + s.amount, 0),
    paymentBreakdown,
  };

  const next = {
    ...state,
    monthClosures: [closure, ...state.monthClosures].slice(0, 36),
  };
  setPosOpsState(accountId, next);
  return next;
};
