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

export default function CustomerInventory() {
  const router = useRouter();
  const { products, stockMovements, adjustStock } = useData();
  const [search, setSearch] = useState('');

  const filteredProducts = useMemo(() => products.filter((product) => `${product.name} ${product.sku}`.toLowerCase().includes(search.toLowerCase())).sort((a, b) => a.stock - b.stock), [products, search]);
  const lowStockItems = useMemo(() => products.filter((product) => product.stock <= (product.minStock || 10)), [products]);
  const stockValue = useMemo(() => products.reduce((sum, product) => sum + (product.stock || 0) * (product.costPrice || 0), 0), [products]);

  const restock = async (product: any) => {
    try {
      await adjustStock(product.id, (product.stock || 0) + 1, 'Restocked from merchant inventory');
    } catch (error) { }
  };

  return (
    <BizFlowDashboardShell
      sidebarItems={modules}
      activeKey="inventory"
      onNavigate={(item) => (item.path === '/app' ? router.replace('/app' as never) : router.push(item.path as never))}
      title="Inventory"
      subtitle="Stock health, movements, and alerts"
      searchValue={search}
      onSearchChange={setSearch}
      profileName="Warehouse"
      profileRole="Inventory"
      avatarLabel="I"
    >
      <View style={styles.content}>
        <View style={styles.kpiGrid}>
          <BizFlowKpiCard label="Tracked products" value={`${products.length}`} detail="In the current catalog" />
          <BizFlowKpiCard label="Low stock alerts" value={`${lowStockItems.length}`} detail="Need replenishment" tone="warning" />
          <BizFlowKpiCard label="Stock value" value={formatMYR(stockValue)} detail="At cost" />
          <BizFlowKpiCard label="Movements" value={`${stockMovements.length}`} detail="Latest adjustments" tone="success" />
        </View>

        <View style={styles.grid}>
          <BizFlowSectionCard title="Stock overview" subtitle="Current quantities" style={styles.card}>
            <BizFlowTable columns={[{ key: 'product', label: 'Product' }, { key: 'stock', label: 'Stock' }, { key: 'status', label: 'Status' }, { key: 'action', label: 'Action' }]} rows={filteredProducts.map((product) => ({ product: product.name, stock: `${product.stock}`, status: <BizFlowStatusChip label={product.stock <= (product.minStock || 10) ? 'Low' : 'Healthy'} tone={product.stock <= (product.minStock || 10) ? 'warning' : 'success'} />, action: <BizFlowButton title="Restock" variant="secondary" onPress={() => restock(product)} /> }))} />
          </BizFlowSectionCard>
          <BizFlowSectionCard title="Low stock alerts" subtitle="Prioritize replenishment" style={styles.card}>
            <View style={styles.listWrap}>
              {lowStockItems.map((product) => (
                <View key={product.id} style={styles.listItem}>
                  <Text style={styles.listTitle}>{product.name}</Text>
                  <Text style={styles.listSubtitle}>Stock {product.stock} • Min {product.minStock}</Text>
                </View>
              ))}
              {lowStockItems.length === 0 && <Text style={styles.emptyText}>All stock is healthy.</Text>}
            </View>
          </BizFlowSectionCard>
        </View>

        <BizFlowSectionCard title="Stock movements" subtitle="Audit trail from the connected backend" style={styles.fullCard}>
          <BizFlowTable columns={[{ key: 'product', label: 'Product' }, { key: 'type', label: 'Type' }, { key: 'quantity', label: 'Quantity' }]} rows={stockMovements.slice(0, 6).map((movement) => ({ product: movement.productName, type: movement.type, quantity: `${movement.quantity}` }))} />
        </BizFlowSectionCard>
      </View>
    </BizFlowDashboardShell>
  );
}

const styles = StyleSheet.create({
  content: { gap: 16 },
  kpiGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 16 },
  card: { flex: 1, minWidth: 320 },
  fullCard: { minWidth: 280 },
  listWrap: { gap: 10 },
  listItem: { paddingVertical: 8, borderBottomWidth: 1, borderColor: '#E2E8F0' },
  listTitle: { fontSize: 13, fontWeight: '700', color: '#0F172A', fontFamily: 'Inter' },
  listSubtitle: { fontSize: 12, color: '#64748B', marginTop: 2, fontFamily: 'Inter' },
  emptyText: { fontSize: 13, color: '#64748B', fontFamily: 'Inter' },
});
