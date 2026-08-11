import React, { useMemo, useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { useData } from '@/src/contexts/DataContext';
import { BizFlowButton, BizFlowDashboardShell, BizFlowKpiCard, BizFlowSectionCard, BizFlowStatusChip, BizFlowTable } from '@/src/components/designSystem';
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

export default function CustomerPurchase() {
  const router = useRouter();
  const { purchaseOrders, suppliers } = useData();
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<'All' | 'Draft' | 'Sent' | 'Partially Received' | 'Fully Received' | 'Closed'>('All');

  const filteredOrders = useMemo(() => {
    return purchaseOrders.filter((order) => {
      const matchesText = `${order.orderNumber} ${order.supplierName ?? ''}`.toLowerCase().includes(search.toLowerCase());
      const matchesFilter = filter === 'All' || order.status === filter;
      return matchesText && matchesFilter;
    }).sort((a, b) => Number(b.total || 0) - Number(a.total || 0));
  }, [filter, purchaseOrders, search]);

  const totals = useMemo(() => ({
    open: purchaseOrders.filter((order) => order.status !== 'Fully Received' && order.status !== 'Closed').length,
    received: purchaseOrders.filter((order) => order.status === 'Fully Received').length,
    spend: purchaseOrders.reduce((sum, order) => sum + (order.total || 0), 0),
  }), [purchaseOrders]);

  return (
    <BizFlowDashboardShell
      sidebarItems={modules}
      activeKey="purchase"
      onNavigate={(item) => (item.path === '/app' ? router.replace('/app' as never) : router.push(item.path as never))}
      title="Purchase"
      subtitle="Vendor orders and incoming stock"
      searchValue={search}
      onSearchChange={setSearch}
      profileName="Procurement"
      profileRole="Operations"
      avatarLabel="P"
    >
      <View style={styles.content}>
        <View style={styles.kpiGrid}>
          <BizFlowKpiCard label="Open orders" value={`${totals.open}`} detail="Awaiting fulfilment" />
          <BizFlowKpiCard label="Fully received" value={`${totals.received}`} detail="Completed deliveries" tone="success" />
          <BizFlowKpiCard label="Supplier count" value={`${suppliers.length}`} detail="Active vendors" />
          <BizFlowKpiCard label="Spend" value={formatMYR(totals.spend)} detail="Purchase value" tone="warning" />
        </View>

        <BizFlowSectionCard title="Order control" subtitle="Filter and review replenishment flow" action={<BizFlowButton title="Open suppliers" variant="secondary" onPress={() => router.push('/app/setup' as never)} />}>
          <View style={styles.filterRow}>
            {(['All', 'Draft', 'Sent', 'Partially Received', 'Fully Received', 'Closed'] as const).map((option) => (
              <BizFlowButton key={option} title={option} variant={filter === option ? 'primary' : 'secondary'} onPress={() => setFilter(option)} />
            ))}
          </View>
          <BizFlowTable columns={[{ key: 'order', label: 'Order' }, { key: 'supplier', label: 'Supplier' }, { key: 'status', label: 'Status' }, { key: 'amount', label: 'Amount' }]} rows={filteredOrders.map((order) => ({ order: order.orderNumber, supplier: order.supplierName || '—', status: <BizFlowStatusChip label={order.status} tone={order.status === 'Fully Received' ? 'success' : order.status === 'Closed' ? 'neutral' : 'warning'} />, amount: formatMYR(order.total) }))} />
        </BizFlowSectionCard>
      </View>
    </BizFlowDashboardShell>
  );
}

const styles = StyleSheet.create({
  content: { gap: 16 },
  kpiGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  filterRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 12 },
});
