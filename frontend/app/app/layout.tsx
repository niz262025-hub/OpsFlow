import { useLocale } from '@/src/contexts/LocaleContext';
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

export default function MerchantLayoutPage() {
  const { tx } = useLocale();
  const router = useRouter();
  const { categories, products } = useData();
  const [search, setSearch] = useState('');

  const filteredCategories = useMemo(() => categories.filter((category) => category.name.toLowerCase().includes(search.toLowerCase())), [categories, search]);
  const categoryRows = filteredCategories.map((category) => ({
    name: category.name,
    products: `${products.filter((product) => product.categoryId === category.id).length}`,
    status: <BizFlowStatusChip label={tx("Ready")} tone="success" />,
  }));

  return (
    <BizFlowDashboardShell
      sidebarItems={modules}
      activeKey="layout"
      onNavigate={(item) => (item.path === '/app' ? router.replace('/app' as never) : router.push(item.path as never))}
      title={tx("Layout")}
      subtitle={tx("Store arrangement and product placement")}
      searchValue={search}
      onSearchChange={setSearch}
      profileName="Layout"
      profileRole="Merchandising"
      avatarLabel="L"
    >
      <View style={styles.content}>
        <View style={styles.kpiGrid}>
          <BizFlowKpiCard label={tx("Categories")} value={`${categories.length}`} detail={tx("Configured sections")} />
          <BizFlowKpiCard label={tx("Products")} value={`${products.length}`} detail={tx("Assigned to layout")} />
          <BizFlowKpiCard label={tx("Display zones")} value="4" detail={tx("High-value areas")} tone="warning" />
        </View>

        <BizFlowSectionCard title={tx("Category arrangement")} subtitle={tx("Arrange merchandise by store zones")} action={<BizFlowButton title={tx("Open setup")} variant="secondary" onPress={() => router.push('/app/setup' as never)} />}>
          <BizFlowTable columns={[{ key: 'name', label: 'Category' }, { key: 'products', label: 'Products' }, { key: 'status', label: 'Status' }]} rows={categoryRows} />
        </BizFlowSectionCard>
      </View>
    </BizFlowDashboardShell>
  );
}

const styles = StyleSheet.create({
  content: { gap: 16 },
  kpiGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
});
