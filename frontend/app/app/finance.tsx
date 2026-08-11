import React, { useMemo, useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { useData } from '@/src/contexts/DataContext';
import { BizFlowDashboardShell, BizFlowKpiCard, BizFlowSectionCard, BizFlowStatusChip, BizFlowTable } from '@/src/components/designSystem';
import { formatMYR } from '@/src/utils/currency';

const modules = [
  { key: 'dashboard', label: 'Dashboard', icon: 'dashboard' as const, path: '/app' },
  { key: 'pos', label: 'POS', icon: 'point-of-sale' as const, path: '/app/pos' },
  { key: 'purchase', label: 'Purchase', icon: 'shopping-cart' as const, path: '/app/purchase' },
  { key: 'inventory', label: 'Inventory', icon: 'inventory-2' as const, path: '/app/inventory' },
  { key: 'layout', label: 'Layout', icon: 'view-quilt' as const, path: '/app/layout' },
  { key: 'finance', label: 'Finance', icon: 'account-balance-wallet' as const, path: '/app/finance' },
  { key: 'reports', label: 'Reports', icon: 'bar-chart' as const, path: '/app/reports' },
  { key: 'setup', label: 'Setup', icon: 'settings' as const, path: '/app/setup' },
];

export default function CustomerFinance() {
  const router = useRouter();
  const { expenses, cashEntries, bankAccounts } = useData();
  const [search, setSearch] = useState('');

  const filteredExpenses = useMemo(() => expenses.filter((expense) => `${expense.description ?? ''} ${expense.category}`.toLowerCase().includes(search.toLowerCase())).slice(0, 8), [expenses, search]);
  const totals = useMemo(() => ({
    spend: expenses.reduce((sum, expense) => sum + (expense.amount || 0), 0),
    cash: cashEntries.reduce((sum, entry) => sum + (entry.amount || 0), 0),
    accounts: bankAccounts.length,
  }), [bankAccounts.length, cashEntries, expenses]);

  return (
    <BizFlowDashboardShell
      sidebarItems={modules}
      activeKey="finance"
      onNavigate={(item) => (item.path === '/app' ? router.replace('/app' as never) : router.push(item.path as never))}
      title="Finance"
      subtitle="Cash, expenses, and bank activity"
      searchValue={search}
      onSearchChange={setSearch}
      profileName="Finance"
      profileRole="Treasury"
      avatarLabel="F"
    >
      <View style={styles.content}>
        <View style={styles.kpiGrid}>
          <BizFlowKpiCard label="Expenses" value={formatMYR(totals.spend)} detail="Current month" />
          <BizFlowKpiCard label="Cash entries" value={`${cashEntries.length}`} detail="Ledger activity" />
          <BizFlowKpiCard label="Bank accounts" value={`${totals.accounts}`} detail="Connected accounts" tone="success" />
          <BizFlowKpiCard label="Cash flow" value={formatMYR(totals.cash)} detail="Net movement" tone="warning" />
        </View>

        <BizFlowSectionCard title="Expense ledger" subtitle="Recent transactions from Firebase">
          <BizFlowTable columns={[{ key: 'category', label: 'Category' }, { key: 'description', label: 'Description' }, { key: 'amount', label: 'Amount' }, { key: 'status', label: 'Status' }]} rows={filteredExpenses.map((expense) => ({ category: expense.category, description: expense.description || '—', amount: formatMYR(expense.amount), status: <BizFlowStatusChip label={expense.paymentSource || 'cash'} tone="success" /> }))} />
        </BizFlowSectionCard>
      </View>
    </BizFlowDashboardShell>
  );
}

const styles = StyleSheet.create({
  content: { gap: 16 },
  kpiGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
});
