import React, { useMemo, useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { useData } from '@/src/contexts/DataContext';
import { BizFlowChart, BizFlowDashboardShell, BizFlowKpiCard, BizFlowSectionCard, BizFlowStatusChip, BizFlowTable } from '@/src/components/designSystem';
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

export default function CustomerReports() {
  const router = useRouter();
  const { sales, purchases, products } = useData();
  const [search, setSearch] = useState('');

  const filteredSales = useMemo(() => sales.filter((sale) => `${sale.saleNumber} ${sale.customerName ?? ''}`.toLowerCase().includes(search.toLowerCase())).slice(0, 6), [sales, search]);
  const totals = useMemo(() => ({
    sales: sales.reduce((sum, sale) => sum + (sale.total || 0), 0),
    purchases: purchases.reduce((sum, purchase) => sum + (purchase.total || 0), 0),
    products: products.length,
  }), [products.length, purchases, sales]);

  return (
    <BizFlowDashboardShell
      sidebarItems={modules}
      activeKey="reports"
      onNavigate={(item) => (item.path === '/app' ? router.replace('/app' as never) : router.push(item.path as never))}
      title="Reports"
      subtitle="Business performance and trends"
      searchValue={search}
      onSearchChange={setSearch}
      profileName="Analyst"
      profileRole="Insights"
      avatarLabel="R"
    >
      <View style={styles.content}>
        <View style={styles.kpiGrid}>
          <BizFlowKpiCard label="Sales" value={formatMYR(totals.sales)} detail="Revenue tracked" />
          <BizFlowKpiCard label="Purchases" value={formatMYR(totals.purchases)} detail="Spend tracked" tone="warning" />
          <BizFlowKpiCard label="Products" value={`${totals.products}`} detail="Catalog coverage" tone="success" />
        </View>

        <View style={styles.grid}>
          <BizFlowSectionCard title="Sales trend" subtitle="Last seven days" style={styles.card}>
            <BizFlowChart data={[42, 55, 49, 68, 74, 81, 90]} labels={['M', 'T', 'W', 'T', 'F', 'S', 'S']} />
          </BizFlowSectionCard>
          <BizFlowSectionCard title="Recent sales" subtitle="Latest transactions" style={styles.card}>
            <BizFlowTable columns={[{ key: 'sale', label: 'Sale' }, { key: 'status', label: 'Status' }, { key: 'amount', label: 'Amount' }]} rows={filteredSales.map((sale) => ({ sale: sale.saleNumber, status: <BizFlowStatusChip label={sale.paymentMethod || 'Cash'} tone="success" />, amount: formatMYR(sale.total) }))} />
          </BizFlowSectionCard>
        </View>
      </View>
    </BizFlowDashboardShell>
  );
}

const styles = StyleSheet.create({
  content: { gap: 16 },
  kpiGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 16 },
  card: { flex: 1, minWidth: 320 },
});
