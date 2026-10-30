import React, { useMemo, useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { useAuth } from '@/src/contexts/AuthContext';
import { useData } from '@/src/contexts/DataContext';
import { salesByDay, cashLedgerBalance } from '@/src/utils/dashboardTotals';
import { formatMYR } from '@/src/utils/currency';
import { BizFlowButton, BizFlowChart, BizFlowDashboardShell, BizFlowKpiCard, BizFlowSectionCard, BizFlowStatusChip, BizFlowTable } from '@/src/components/designSystem';

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

const quickActions = [
  { title: 'New Sale', icon: 'point-of-sale', path: '/app/pos' },
  { title: 'Purchase Order', icon: 'shopping-cart', path: '/app/purchase' },
  { title: 'Inventory', icon: 'inventory-2', path: '/app/inventory' },
  { title: 'Finance', icon: 'account-balance-wallet', path: '/app/finance' },
];

export default function CustomerDashboard() {
  const router = useRouter();
  const { profile } = useAuth();
  const { company, products, sales, purchaseOrders: orders, cashEntries } = useData();
  const [search, setSearch] = useState('');

  const stats = useMemo(() => {
    const salesTrend = salesByDay(sales);
    const todaySales = salesTrend.today;
    const purchaseOrders = orders.reduce((sum, purchase) => sum + (purchase.total || 0), 0);
    const lowStockItems = products.filter((product) => product.stock <= (product.minStock || 10));
    const cashBalance = cashLedgerBalance(cashEntries);

    return {
      todaySales,
      purchaseOrders,
      lowStockItems,
      cashBalance,
      salesTrend,
    };
  }, [cashEntries, products, orders, sales]);

  return (
    <BizFlowDashboardShell
      sidebarItems={modules}
      activeKey="dashboard"
      onNavigate={(item) => (item.path === '/app' ? router.replace('/app' as never) : router.push(item.path as never))}
      title="OpsFlow Dashboard"
      subtitle="Customer workspace"
      searchValue={search}
      onSearchChange={setSearch}
      profileName={profile?.displayName || company?.name || 'Business Owner'}
      profileRole={profile?.role || 'Member'}
      avatarLabel={(profile?.displayName || profile?.email || 'U').charAt(0).toUpperCase()}
    >
      <View style={styles.content}>
        <View style={styles.kpiGrid}>
          <BizFlowKpiCard label="Today Sales" value={formatMYR(stats.todaySales)} detail="Live from POS" />
          <BizFlowKpiCard label="Purchase Orders" value={formatMYR(stats.purchaseOrders)} detail="Purchase order value" />
          <BizFlowKpiCard label="Low Stock" value={`${stats.lowStockItems.length}`} detail="Items need restock" tone="warning" />
          <BizFlowKpiCard label="Cash Balance" value={formatMYR(stats.cashBalance)} detail="Cash ledger balance" tone="success" />
        </View>

        <View style={styles.grid}>
          <BizFlowSectionCard title="Sales chart" subtitle="Last 7 days" style={styles.card}>
            <BizFlowChart data={stats.salesTrend.values} labels={stats.salesTrend.labels} />
          </BizFlowSectionCard>

          <BizFlowSectionCard title="Inventory summary" subtitle={`${products.length} products tracked`} style={styles.card}>
            <View style={styles.summaryList}>
              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>Active stock</Text>
                <Text style={styles.summaryValue}>{products.reduce((sum, item) => sum + (item.stock || 0), 0)}</Text>
              </View>
              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>Low stock alerts</Text>
                <Text style={styles.summaryValue}>{stats.lowStockItems.length}</Text>
              </View>
              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>Warehouse value</Text>
                <Text style={styles.summaryValue}>{formatMYR(products.reduce((sum, item) => sum + (item.stock || 0) * (item.costPrice || 0), 0))}</Text>
              </View>
            </View>
          </BizFlowSectionCard>
        </View>

        <View style={styles.grid}>
          <BizFlowSectionCard title="Recent transactions" subtitle="Latest activity" style={styles.card}>
            <BizFlowTable columns={[{ key: 'ref', label: 'Reference' }, { key: 'status', label: 'Status' }, { key: 'amount', label: 'Amount' }]} rows={sales.slice(0, 3).map((sale) => ({ ref: sale.saleNumber || 'Sale', status: <BizFlowStatusChip label={sale.paymentMethod || 'Cash'} tone="success" />, amount: formatMYR(sale.total) }))} />
          </BizFlowSectionCard>

          <BizFlowSectionCard title="Low stock alerts" subtitle="Needs attention" style={styles.card}>
            <View style={styles.listWrap}>
              {stats.lowStockItems.slice(0, 3).map((product) => (
                <View key={product.id} style={styles.listItem}>
                  <View style={styles.listDot} />
                  <View style={{ flex: 1 }}>
                    <Text style={styles.listTitle}>{product.name}</Text>
                    <Text style={styles.listSubtitle}>Stock: {product.stock} • Min: {product.minStock}</Text>
                  </View>
                  <Text style={styles.listAmount}>{product.sku}</Text>
                </View>
              ))}
              {stats.lowStockItems.length === 0 && <Text style={styles.emptyText}>All stock is healthy.</Text>}
            </View>
          </BizFlowSectionCard>
        </View>

        <BizFlowSectionCard title="Quick actions" subtitle="Start fast" style={styles.fullCard}>
          <View style={styles.quickActionsRow}>
            {quickActions.map((action) => (
              <BizFlowButton key={action.title} title={action.title} variant="secondary" icon={action.icon as any} onPress={() => router.push(action.path as never)} />
            ))}
          </View>
        </BizFlowSectionCard>
      </View>
    </BizFlowDashboardShell>
  );
}

const styles = StyleSheet.create({
  content: { gap: 16 },
  kpiGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 16 },
  card: { flex: 1, minWidth: 280 },
  fullCard: { minWidth: 280 },
  summaryList: { gap: 10 },
  summaryRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  summaryLabel: { fontSize: 13, color: '#64748B', fontFamily: 'Inter' },
  summaryValue: { fontSize: 13, fontWeight: '700', color: '#0F172A', fontFamily: 'Inter' },
  listWrap: { gap: 10 },
  listItem: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 6 },
  listDot: { width: 10, height: 10, borderRadius: 5, backgroundColor: '#2563EB' },
  listTitle: { fontSize: 13, fontWeight: '700', color: '#0F172A', fontFamily: 'Inter' },
  listSubtitle: { fontSize: 12, color: '#64748B', marginTop: 2, fontFamily: 'Inter' },
  listAmount: { fontSize: 13, fontWeight: '700', color: '#0F172A', fontFamily: 'Inter' },
  emptyText: { fontSize: 13, color: '#64748B', fontFamily: 'Inter' },
  quickActionsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
});
