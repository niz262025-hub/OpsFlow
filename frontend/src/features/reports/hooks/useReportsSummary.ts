import { useMemo } from 'react';
import { BankAccount, BankEntry, CashEntry, Expense, Product, Purchase, Sale } from '@/src/contexts/DataContext';
import { calculateReportsSummary } from '@/src/services/reportingService';

export function useReportsSummary(input: {
  sales: Sale[];
  purchases: Purchase[];
  products: Product[];
  expenses: Expense[];
  cashEntries: CashEntry[];
  bankEntries: BankEntry[];
  bankAccounts: BankAccount[];
}) {
  const { sales, purchases, products, expenses, cashEntries, bankEntries, bankAccounts } = input;
  return useMemo(
    () =>
      calculateReportsSummary({
        sales,
        purchases,
        products,
        expenses,
        cashEntries,
        bankEntries,
        bankAccounts,
      }),
    [sales, purchases, products, expenses, cashEntries, bankEntries, bankAccounts]
  );
}
