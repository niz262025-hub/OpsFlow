type DatedSale = { total: number; createdAt?: unknown };
type CashRow = { type: string; amount: number };
const localDay = (date: Date) => new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Kuala_Lumpur', year: 'numeric', month: '2-digit', day: '2-digit' }).format(date);

function dateOf(value: unknown): Date | null {
  let date: Date;
  if (value instanceof Date) date = value;
  else if (value && typeof value === 'object' && 'toDate' in value && typeof value.toDate === 'function') date = value.toDate();
  else if (typeof value === 'string' || typeof value === 'number') date = new Date(value);
  else return null;
  return Number.isFinite(date.getTime()) ? date : null;
}

export function salesByDay(sales: DatedSale[], now = new Date()) {
  const today = localDay(now);
  const anchor = new Date(`${today}T12:00:00+08:00`);
  const days = Array.from({ length: 7 }, (_, index) => localDay(new Date(anchor.getTime() - (6 - index) * 86400000)));
  const cents = days.map(() => 0);
  for (const sale of sales) {
    const date = dateOf(sale.createdAt);
    if (!date || !Number.isFinite(sale.total)) continue;
    const index = days.indexOf(localDay(date));
    if (index >= 0) cents[index] += Math.round(sale.total * 100);
  }
  return { values: cents.map(value => value / 100), labels: days.map(day => day.slice(5)), today: cents[6] / 100 };
}

export function cashLedgerBalance(entries: CashRow[]) {
  return entries.reduce((sum, entry) => {
    if (!Number.isFinite(entry.amount)) return sum;
    const cents = Math.round(entry.amount * 100);
    if (['opening', 'in', 'transfer_in', 'capital'].includes(entry.type)) return sum + cents;
    if (['out', 'transfer_out', 'expense'].includes(entry.type)) return sum - cents;
    return sum;
  }, 0) / 100;
}
