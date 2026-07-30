// Excel export using SheetJS (xlsx) + expo-file-system + expo-sharing.
// Output files are .xlsx and open cleanly in Microsoft Excel, Numbers, and Google Sheets.
//
// Usage:
//   import { exportSalesXlsx, exportProductsXlsx } from '@/src/utils/exports/excel';
//   await exportSalesXlsx(sales, 'sales-2026-06');

import * as XLSX from 'xlsx';
import * as Sharing from 'expo-sharing';
import { Platform } from 'react-native';
import type { Sale, Purchase, Expense, Product, Customer, Supplier, StockMovement } from '@/src/contexts/DataContext';

const dateOf = (ts: any): string => {
  const d = ts?.toDate?.() || (ts instanceof Date ? ts : null);
  return d ? d.toLocaleString('en-MY', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : '';
};

const num = (n: number) => Number((n || 0).toFixed(2));

const sanitize = (name: string) => name.replace(/[^a-zA-Z0-9._-]/g, '_');

async function writeAndShare(wb: XLSX.WorkBook, filename: string): Promise<string | null> {
  const safe = sanitize(filename);

  if (Platform.OS === 'web') {
    // Direct browser download via SheetJS
    XLSX.writeFile(wb, `${safe}.xlsx`, { bookType: 'xlsx' });
    return null;
  }

  // Write base64 through expo-file-system, then hand off to system share sheet
  const b64 = XLSX.write(wb, { type: 'base64', bookType: 'xlsx' });
  const FS: any = await import('expo-file-system/legacy');
  const dir = (FS as any).documentDirectory || (FS as any).cacheDirectory;
  const uri = `${dir}${safe}.xlsx`;
  await FS.writeAsStringAsync(uri, b64, { encoding: FS.EncodingType.Base64 });
  if (await Sharing.isAvailableAsync()) {
    await Sharing.shareAsync(uri, {
      mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      dialogTitle: filename,
      UTI: 'org.openxmlformats.spreadsheetml.sheet',
    });
  }
  return uri;
}

function autoSize(ws: XLSX.WorkSheet, rows: any[][]) {
  const cols: any[] = [];
  const headerCount = rows[0]?.length || 0;
  for (let c = 0; c < headerCount; c++) {
    let max = 10;
    for (const r of rows) {
      const v = r[c];
      if (v == null) continue;
      const len = String(v).length + 2;
      if (len > max) max = Math.min(len, 40);
    }
    cols.push({ wch: max });
  }
  (ws as any)['!cols'] = cols;
}

function toSheet(rows: any[][], sheetName = 'Sheet1') {
  const wb = XLSX.utils.book_new();
  const ws = XLSX.utils.aoa_to_sheet(rows);
  autoSize(ws, rows);
  XLSX.utils.book_append_sheet(wb, ws, sheetName);
  return wb;
}

// ================= SALES =================
export async function exportSalesXlsx(sales: Sale[], filename = 'sales'): Promise<string | null> {
  const header = ['Date', 'Sale Number', 'Customer', 'Items', 'Payment', 'Subtotal', 'Discount', 'Tax', 'Total', 'Cashier'];
  const rows: any[][] = [header];
  let totalRevenue = 0;
  for (const s of sales) {
    rows.push([
      dateOf(s.createdAt),
      s.saleNumber,
      s.customerName || 'Walk-in',
      s.items.reduce((n, i) => n + i.quantity, 0),
      s.paymentMethod,
      num(s.subtotal),
      num(s.discount),
      num(s.tax),
      num(s.total),
      s.cashier || '',
    ]);
    totalRevenue += s.total;
  }
  rows.push([]);
  rows.push(['', '', '', '', 'TOTAL REVENUE', '', '', '', num(totalRevenue), '']);
  return writeAndShare(toSheet(rows, 'Sales'), filename);
}

// ================= SALES (LINE-ITEM DETAIL) =================
export async function exportSalesDetailXlsx(sales: Sale[], filename = 'sales-detail'): Promise<string | null> {
  const header = ['Date', 'Sale Number', 'Customer', 'Product', 'SKU', 'Quantity', 'Unit Price', 'Cost Price', 'Line Total', 'Profit', 'Payment'];
  const rows: any[][] = [header];
  for (const s of sales) {
    for (const i of s.items) {
      const profit = (i.unitPrice - i.costPrice) * i.quantity;
      rows.push([
        dateOf(s.createdAt),
        s.saleNumber,
        s.customerName || 'Walk-in',
        i.productName,
        i.sku,
        i.quantity,
        num(i.unitPrice),
        num(i.costPrice),
        num(i.total),
        num(profit),
        s.paymentMethod,
      ]);
    }
  }
  return writeAndShare(toSheet(rows, 'Sales Detail'), filename);
}

// ================= PURCHASES =================
export async function exportPurchasesXlsx(purchases: Purchase[], filename = 'purchases'): Promise<string | null> {
  const header = ['Date', 'Purchase Number', 'Supplier', 'Items', 'Subtotal', 'Discount', 'Tax', 'Total'];
  const rows: any[][] = [header];
  let totalCost = 0;
  for (const p of purchases) {
    rows.push([
      dateOf(p.createdAt),
      p.purchaseNumber,
      p.supplierName || 'Direct',
      p.items.reduce((n, i) => n + i.quantity, 0),
      num(p.subtotal),
      num(p.discount),
      num(p.tax),
      num(p.total),
    ]);
    totalCost += p.total;
  }
  rows.push([]);
  rows.push(['', '', '', '', '', '', 'TOTAL', num(totalCost)]);
  return writeAndShare(toSheet(rows, 'Purchases'), filename);
}

// ================= EXPENSES =================
export async function exportExpensesXlsx(expenses: Expense[], filename = 'expenses'): Promise<string | null> {
  const header = ['Date', 'Category', 'Description', 'Amount'];
  const rows: any[][] = [header];
  let total = 0;
  for (const e of expenses) {
    rows.push([dateOf(e.date), e.category, e.description || '', num(e.amount)]);
    total += e.amount;
  }
  rows.push([]);
  rows.push(['', '', 'TOTAL', num(total)]);
  return writeAndShare(toSheet(rows, 'Expenses'), filename);
}

// ================= PRODUCTS =================
export async function exportProductsXlsx(products: Product[], filename = 'products'): Promise<string | null> {
  const header = ['SKU', 'Name', 'Barcode', 'Category', 'Brand', 'Supplier', 'Cost Price', 'Selling Price', 'Margin %', 'Stock', 'Min Stock', 'Unit', 'Stock Value', 'Status'];
  const rows: any[][] = [header];
  let stockValue = 0;
  for (const p of products) {
    const margin = p.sellingPrice > 0 ? ((p.sellingPrice - (p.costPrice || 0)) / p.sellingPrice) * 100 : 0;
    const value = (p.stock || 0) * (p.costPrice || 0);
    stockValue += value;
    rows.push([
      p.sku, p.name, p.barcode || '', p.categoryName || '', p.brand || '', p.supplierName || '',
      num(p.costPrice || 0), num(p.sellingPrice), num(margin), p.stock, p.minStock, p.unit, num(value), p.status,
    ]);
  }
  rows.push([]);
  rows.push(['', '', '', '', '', '', '', '', '', '', '', 'TOTAL VALUE', num(stockValue), '']);
  return writeAndShare(toSheet(rows, 'Products'), filename);
}

// ================= CUSTOMERS =================
export async function exportCustomersXlsx(customers: Customer[], filename = 'customers'): Promise<string | null> {
  const header = ['Name', 'Phone', 'Email', 'Address', 'Membership'];
  const rows: any[][] = [header];
  for (const c of customers) rows.push([c.name, c.phone || '', c.email || '', c.address || '', c.membership || 'regular']);
  return writeAndShare(toSheet(rows, 'Customers'), filename);
}

// ================= SUPPLIERS =================
export async function exportSuppliersXlsx(suppliers: Supplier[], filename = 'suppliers'): Promise<string | null> {
  const header = ['Name', 'Contact Person', 'Phone', 'Email', 'Address'];
  const rows: any[][] = [header];
  for (const s of suppliers) rows.push([s.name, s.pic || '', s.phone || '', s.email || '', s.address || '']);
  return writeAndShare(toSheet(rows, 'Suppliers'), filename);
}

// ================= STOCK MOVEMENTS =================
export async function exportMovementsXlsx(mov: StockMovement[], filename = 'stock-movements'): Promise<string | null> {
  const header = ['Date', 'Product', 'Type', 'Quantity', 'Stock After', 'Reference', 'Note'];
  const rows: any[][] = [header];
  for (const m of mov) rows.push([dateOf(m.createdAt), m.productName, m.type, m.quantity, m.stockAfter, m.referenceId || '', m.note || '']);
  return writeAndShare(toSheet(rows, 'Movements'), filename);
}

// ================= FULL FINANCIAL WORKBOOK =================
export async function exportFinancialWorkbook(input: {
  sales: Sale[];
  purchases: Purchase[];
  expenses: Expense[];
  products: Product[];
  rangeLabel: string;
}): Promise<string | null> {
  const { sales, purchases, expenses, products, rangeLabel } = input;
  const wb = XLSX.utils.book_new();

  // Summary
  const revenue = sales.reduce((s, x) => s + x.total, 0);
  const cogs = sales.reduce((s, x) => s + x.items.reduce((c, i) => c + i.costPrice * i.quantity, 0), 0);
  const grossProfit = revenue - cogs;
  const purchaseTotal = purchases.reduce((s, x) => s + x.total, 0);
  const expenseTotal = expenses.reduce((s, x) => s + x.amount, 0);
  const netProfit = grossProfit - expenseTotal;
  const summary = [
    ['BizFlow Pro Financial Report', ''],
    ['Period', rangeLabel],
    ['Generated', new Date().toLocaleString('en-MY')],
    [],
    ['Metric', 'Amount (MYR)'],
    ['Revenue', num(revenue)],
    ['COGS', num(cogs)],
    ['Gross Profit', num(grossProfit)],
    ['Expenses', num(expenseTotal)],
    ['Net Profit', num(netProfit)],
    ['Purchases (Cash Out)', num(purchaseTotal)],
    ['Net Cash Flow', num(revenue - purchaseTotal - expenseTotal)],
  ];
  const wsS = XLSX.utils.aoa_to_sheet(summary);
  autoSize(wsS, summary);
  XLSX.utils.book_append_sheet(wb, wsS, 'Summary');

  // Sales
  const salesRows: any[][] = [['Date', 'Sale Number', 'Customer', 'Items', 'Payment', 'Subtotal', 'Discount', 'Tax', 'Total']];
  for (const s of sales) salesRows.push([dateOf(s.createdAt), s.saleNumber, s.customerName || 'Walk-in', s.items.reduce((n, i) => n + i.quantity, 0), s.paymentMethod, num(s.subtotal), num(s.discount), num(s.tax), num(s.total)]);
  const wsSa = XLSX.utils.aoa_to_sheet(salesRows);
  autoSize(wsSa, salesRows);
  XLSX.utils.book_append_sheet(wb, wsSa, 'Sales');

  // Purchases
  const purRows: any[][] = [['Date', 'Purchase Number', 'Supplier', 'Items', 'Total']];
  for (const p of purchases) purRows.push([dateOf(p.createdAt), p.purchaseNumber, p.supplierName || 'Direct', p.items.reduce((n, i) => n + i.quantity, 0), num(p.total)]);
  const wsP = XLSX.utils.aoa_to_sheet(purRows);
  autoSize(wsP, purRows);
  XLSX.utils.book_append_sheet(wb, wsP, 'Purchases');

  // Expenses
  const expRows: any[][] = [['Date', 'Category', 'Description', 'Amount']];
  for (const e of expenses) expRows.push([dateOf(e.date), e.category, e.description || '', num(e.amount)]);
  const wsE = XLSX.utils.aoa_to_sheet(expRows);
  autoSize(wsE, expRows);
  XLSX.utils.book_append_sheet(wb, wsE, 'Expenses');

  // Inventory
  const prodRows: any[][] = [['SKU', 'Name', 'Stock', 'Min Stock', 'Cost', 'Price', 'Stock Value', 'Status']];
  for (const p of products) prodRows.push([p.sku, p.name, p.stock, p.minStock, num(p.costPrice || 0), num(p.sellingPrice), num((p.stock || 0) * (p.costPrice || 0)), p.status]);
  const wsPr = XLSX.utils.aoa_to_sheet(prodRows);
  autoSize(wsPr, prodRows);
  XLSX.utils.book_append_sheet(wb, wsPr, 'Inventory');

  return writeAndShare(wb, `Financial-${rangeLabel}`);
}
