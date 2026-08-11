import React, { useMemo, useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { useData } from '@/src/contexts/DataContext';
import { BizFlowButton, BizFlowDashboardShell, BizFlowKpiCard, BizFlowSectionCard, BizFlowStatusChip, BizFlowTable } from '@/src/components/designSystem';

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

export default function CustomerSetup() {
  const router = useRouter();
  const { company, categories, suppliers, team } = useData();
  const [search, setSearch] = useState('');

  const filteredCategories = useMemo(() => categories.filter((category) => category.name.toLowerCase().includes(search.toLowerCase())), [categories, search]);
  const filteredSuppliers = useMemo(() => suppliers.filter((supplier) => `${supplier.name} ${supplier.email ?? ''}`.toLowerCase().includes(search.toLowerCase())).slice(0, 6), [suppliers, search]);

  return (
    <BizFlowDashboardShell
      sidebarItems={modules}
      activeKey="setup"
      onNavigate={(item) => (item.path === '/app' ? router.replace('/app' as never) : router.push(item.path as never))}
      title="Setup"
      subtitle="Store configuration and merchant operations"
      searchValue={search}
      onSearchChange={setSearch}
      profileName="Setup"
      profileRole="Configuration"
      avatarLabel="S"
    >
      <View style={styles.content}>
        <View style={styles.kpiGrid}>
          <BizFlowKpiCard label="Company" value={company?.name || 'BizFlow'} detail="Active workspace" />
          <BizFlowKpiCard label="Categories" value={`${categories.length}`} detail="Product groups" />
          <BizFlowKpiCard label="Suppliers" value={`${suppliers.length}`} detail="Vendor network" tone="success" />
          <BizFlowKpiCard label="Team" value={`${team.length}`} detail="Active collaborators" tone="warning" />
        </View>

        <View style={styles.grid}>
          <BizFlowSectionCard title="Categories" subtitle="Catalog organization" style={styles.card}>
            <BizFlowTable columns={[{ key: 'name', label: 'Name' }, { key: 'status', label: 'Status' }]} rows={filteredCategories.map((category) => ({ name: category.name, status: <BizFlowStatusChip label="Active" tone="success" /> }))} />
          </BizFlowSectionCard>
          <BizFlowSectionCard title="Suppliers" subtitle="Vendor contacts" style={styles.card}>
            <BizFlowTable columns={[{ key: 'name', label: 'Name' }, { key: 'email', label: 'Email' }]} rows={filteredSuppliers.map((supplier) => ({ name: supplier.name, email: supplier.email || '—' }))} />
          </BizFlowSectionCard>
        </View>

        <BizFlowSectionCard title="Configuration actions" subtitle="Keep the merchant experience aligned" action={<BizFlowButton title="Review layout" variant="secondary" onPress={() => router.push('/app/layout' as never)} />}>
          <Text style={styles.body}>The setup workspace now mirrors the same design system, navigation, component styling, and merchant-ready workflows as the rest of the BizFlow experience.</Text>
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
  body: { fontSize: 13, color: '#64748B', fontFamily: 'Inter', lineHeight: 20 },
});
