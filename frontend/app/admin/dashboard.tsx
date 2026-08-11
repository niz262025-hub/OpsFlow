import React, { useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { BizFlowChart, BizFlowDashboardShell, BizFlowKpiCard, BizFlowSectionCard, BizFlowStatusChip, BizFlowTable } from '@/src/components/designSystem';

const modules = [
  { key: 'overview', label: 'Overview', icon: 'dashboard' as const, path: '/admin/dashboard' },
  { key: 'companies', label: 'Companies', icon: 'business' as const, path: '/admin/companies' },
  { key: 'subscriptions', label: 'Subscriptions', icon: 'credit-card' as const, path: '/admin/subscriptions' },
  { key: 'payments', label: 'Payments', icon: 'payments' as const, path: '/admin/payments' },
];

const companies = [
  { name: 'Acme Retail', plan: 'Pro', status: 'Active', revenue: 'RM 48.2k' },
  { name: 'Northwind Studio', plan: 'Basic', status: 'Trial', revenue: 'RM 12.6k' },
  { name: 'Harbor Goods', plan: 'Pro', status: 'Pending', revenue: 'RM 22.0k' },
];

export default function AdminDashboard() {
  const router = useRouter();
  const [search, setSearch] = useState('');

  return (
    <BizFlowDashboardShell
      sidebarItems={modules}
      activeKey="overview"
      onNavigate={(item) => router.push(item.path as never)}
      title="Super Admin Center"
      subtitle="Enterprise command view"
      searchValue={search}
      onSearchChange={setSearch}
      profileName="Super Admin"
      profileRole="Operations"
      avatarLabel="A"
    >
      <View style={styles.content}>
        <View style={styles.kpiGrid}>
          <BizFlowKpiCard label="Active Companies" value="124" detail="+18% this month" />
          <BizFlowKpiCard label="Trial Accounts" value="31" detail="Need follow-up" tone="warning" />
          <BizFlowKpiCard label="Revenue" value="RM 84.2k" detail="Rolling 30 days" tone="success" />
          <BizFlowKpiCard label="Pending Payments" value="7" detail="3 overdue" tone="danger" />
        </View>

        <View style={styles.grid}>
          <BizFlowSectionCard title="Growth overview" subtitle="Customer adoption" style={styles.card}>
            <BizFlowChart data={[32, 45, 38, 57, 62, 74, 81]} labels={['M', 'T', 'W', 'T', 'F', 'S', 'S']} />
          </BizFlowSectionCard>
          <BizFlowSectionCard title="Recent accounts" subtitle="Managed in the last 24h" style={styles.card}>
            <BizFlowTable columns={[{ key: 'company', label: 'Company' }, { key: 'plan', label: 'Plan' }, { key: 'status', label: 'Status' }]} rows={companies.map((company) => ({ company: company.name, plan: company.plan, status: <BizFlowStatusChip label={company.status} tone={company.status === 'Active' ? 'success' : company.status === 'Trial' ? 'warning' : 'danger'} /> }))} />
          </BizFlowSectionCard>
        </View>

        <BizFlowSectionCard title="Operational snapshot" subtitle="Enterprise oversight" style={styles.fullCard}>
          <Text style={styles.body}>The admin experience now mirrors the customer workspace with the same layout, component styling, and visual system. That keeps onboarding, analytics, and navigation consistent for every role.</Text>
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
  body: { fontSize: 13, color: '#64748B', fontFamily: 'Inter', lineHeight: 20 },
});
