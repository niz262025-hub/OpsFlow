export const formatMYR = (n: number) => {
  if (isNaN(n)) return 'RM 0.00';
  return `RM ${n.toLocaleString('en-MY', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
};

export const formatNumber = (n: number) => n.toLocaleString('en-MY');

export const parseCurrency = (s: string) => {
  const v = parseFloat(s.replace(/[^\d.-]/g, ''));
  return isNaN(v) ? 0 : v;
};
