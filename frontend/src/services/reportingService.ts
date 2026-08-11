import { BankAccount, BankEntry, CashEntry, Expense, Product, Purchase, Sale } from '@/src/contexts/DataContext';

export interface TopSellingRow {
  id: string;
  productName: string;
  qty: number;
  revenue: number;
}

export interface CustomerStatementRow {
  id: string;
  customer: string;
  salesCount: number;
  amount: number;
}

export interface SupplierStatementRow {
  id: string;
  supplier: string;
  purchasesCount: number;
  amount: number;
}

export interface ReportsSummary {
  totalSales: number;
  totalPurchases: number;
  totalExpenses: number;
  cogs: number;
  grossProfit: number;
  netProfit: number;
  inventoryValue: number;
  cashIn: number;
  cashOut: number;
  bankBalance: number;
  topSelling: TopSellingRow[];
  customerStatement: CustomerStatementRow[];
  supplierStatement: SupplierStatementRow[];
}

export function calculateReportsSummary(input: {
  sales: Sale[];
  purchases: Purchase[];
  products: Product[];
  expenses: Expense[];
  cashEntries: CashEntry[];
  bankEntries: BankEntry[];
  bankAccounts: BankAccount[];
}): ReportsSummary {
  const { sales, purchases, products, expenses, cashEntries, bankEntries, bankAccounts } = input;

  const totalSales = sales.reduce((s, x) => s + x.total, 0);
  const totalPurchases = purchases.reduce((s, x) => s + x.total, 0);
  const totalExpenses = expenses.reduce((s, x) => s + x.amount, 0);

  const cogs = sales.reduce((sum, sale) => {
    const one = sale.items.reduce((line, item) => line + item.quantity * (item.costPrice || 0), 0);
    return sum + one;
  }, 0);

  const grossProfit = totalSales - cogs;
  const netProfit = grossProfit - totalExpenses;

  const inventoryValue = products
    .filter((p) => p.status !== 'archived')
    .reduce((sum, p) => {
      const available = Math.max(0, (p.stock || 0) - (p.reservedStock || 0));
      const avgCost = p.avgCost ?? p.costPrice ?? 0;
      return sum + available * avgCost;
    }, 0);

  const cashIn = cashEntries
    .filter((e) => ['opening', 'in', 'transfer_in', 'capital'].includes(e.type))
    .reduce((sum, e) => sum + e.amount, 0);
  const cashOut = cashEntries
    .filter((e) => ['out', 'transfer_out', 'expense'].includes(e.type))
    .reduce((sum, e) => sum + e.amount, 0);

  const bankMap: Record<string, number> = {};
  for (const account of bankAccounts) bankMap[account.id] = account.openingBalance || 0;
  for (const entry of bankEntries) {
    const current = bankMap[entry.bankAccountId] || 0;
    if (['opening', 'deposit', 'capital'].includes(entry.type)) bankMap[entry.bankAccountId] = current + entry.amount;
    else bankMap[entry.bankAccountId] = current - entry.amount;
  }
  const bankBalance = Object.values(bankMap).reduce((s, v) => s + v, 0);

  const topMap: Record<string, TopSellingRow> = {};
  for (const sale of sales) {
    for (const item of sale.items) {
      if (!topMap[item.productId]) topMap[item.productId] = { id: item.productId, productName: item.productName, qty: 0, revenue: 0 };
      topMap[item.productId].qty += item.quantity;
      topMap[item.productId].revenue += item.total;
    }
  }

  const customerMap: Record<string, CustomerStatementRow> = {};
  for (const sale of sales) {
    const key = sale.customerId || sale.customerName || 'walk-in';
    const name = sale.customerName || 'Walk-in';
    if (!customerMap[key]) customerMap[key] = { id: key, customer: name, salesCount: 0, amount: 0 };
    customerMap[key].salesCount += 1;
    customerMap[key].amount += sale.total;
  }

  const supplierMap: Record<string, SupplierStatementRow> = {};
  for (const purchase of purchases) {
    const key = purchase.supplierId || purchase.supplierName || 'unknown';
    const name = purchase.supplierName || 'Unknown supplier';
    if (!supplierMap[key]) supplierMap[key] = { id: key, supplier: name, purchasesCount: 0, amount: 0 };
    supplierMap[key].purchasesCount += 1;
    supplierMap[key].amount += purchase.total;
  }

  return {
    totalSales,
    totalPurchases,
    totalExpenses,
    cogs,
    grossProfit,
    netProfit,
    inventoryValue,
    cashIn,
    cashOut,
    bankBalance,
    topSelling: Object.values(topMap).sort((a, b) => b.revenue - a.revenue),
    customerStatement: Object.values(customerMap).sort((a, b) => b.amount - a.amount),
    supplierStatement: Object.values(supplierMap).sort((a, b) => b.amount - a.amount),
  };
}
