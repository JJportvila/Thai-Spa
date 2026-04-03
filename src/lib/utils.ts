import { CURRENCY_SYMBOL } from './constants';

export const formatVT = (amount: number = 0) => {
  if (isNaN(amount)) return `0 ${CURRENCY_SYMBOL}`;
  return `${new Intl.NumberFormat('en-VU').format(Math.round(amount))} ${CURRENCY_SYMBOL}`;
};

export const formatTime = (date: Date | string | number) => {
  return new Intl.DateTimeFormat('en-VU', {
    timeZone: 'Pacific/Efate',
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).format(new Date(date));
};

export const calculateVAT = (amountWithVAT: number) => {
  const vatAmount = (amountWithVAT / 1.15) * 0.15;
  const subtotal = amountWithVAT - vatAmount;
  return { subtotal, vatAmount: Math.round(vatAmount) };
};

export const calculateVNPF = (grossSalary: number) => {
  const employeeContribution = grossSalary * 0.06;
  const employerContribution = grossSalary * 0.06;
  return { employeeContribution, employerContribution };
};
