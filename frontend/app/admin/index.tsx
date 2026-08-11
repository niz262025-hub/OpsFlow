import React, { useState } from 'react';
import { Alert, StyleSheet, Text, TextInput, View } from 'react-native';
import { useRouter } from 'expo-router';
import { storage } from '@/src/utils/storage';
import { BizFlowButton, BizFlowDashboardShell, BizFlowSectionCard } from '@/src/components/designSystem';

const modules = [
  { key: 'overview', label: 'Overview', icon: 'dashboard' as const, path: '/admin/dashboard' },
  { key: 'companies', label: 'Companies', icon: 'business' as const, path: '/admin/companies' },
  { key: 'subscriptions', label: 'Subscriptions', icon: 'credit-card' as const, path: '/admin/subscriptions' },
  { key: 'payments', label: 'Payments', icon: 'payments' as const, path: '/admin/payments' },
];

export default function AdminLoginRoute() {
  const router = useRouter();
  const [email, setEmail] = useState('superadmin@bizflow.my');
  const [password, setPassword] = useState('BizFlow2026!');
  const [loading, setLoading] = useState(false);

  const handleAdminLogin = async () => {
    setLoading(true);
    try {
      if (email === 'superadmin@bizflow.my' && password === 'BizFlow2026!') {
        await storage.setItem('auth:admin-token', 'demo-admin-token');
        router.replace('/admin/dashboard');
        return;
      }
      throw new Error('Invalid admin credentials');
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Login failed';
      Alert.alert('Admin login failed', message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <BizFlowDashboardShell
      sidebarItems={modules}
      activeKey="overview"
      onNavigate={(item) => router.push(item.path as never)}
      title="Admin Access"
      subtitle="Secure command center"
      profileName="Super Admin"
      profileRole="Operations"
      avatarLabel="A"
    >
      <View style={styles.container}>
        <BizFlowSectionCard style={styles.card}>
          <Text style={styles.title}>Admin Access</Text>
          <Text style={styles.subtitle}>Secure the control center for your enterprise rollout.</Text>
          <TextInput style={styles.input} placeholder="Admin email" autoCapitalize="none" value={email} onChangeText={setEmail} placeholderTextColor="#94A3B8" />
          <TextInput style={styles.input} placeholder="Password" secureTextEntry value={password} onChangeText={setPassword} placeholderTextColor="#94A3B8" />
          <BizFlowButton title={loading ? 'Signing in…' : 'Open admin dashboard'} onPress={handleAdminLogin} fullWidth />
        </BizFlowSectionCard>
      </View>
    </BizFlowDashboardShell>
  );
}

const styles = StyleSheet.create({
  container: { paddingVertical: 8 },
  card: { borderRadius: 24, padding: 24, maxWidth: 520 },
  title: { fontSize: 28, fontWeight: '800', color: '#0F172A', fontFamily: 'Inter' },
  subtitle: { fontSize: 14, color: '#475569', marginBottom: 16, fontFamily: 'Inter' },
  input: { borderWidth: 1, borderColor: '#E5E7EB', borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12, backgroundColor: '#FFFFFF', marginBottom: 12, color: '#0F172A', fontFamily: 'Inter' },
});
