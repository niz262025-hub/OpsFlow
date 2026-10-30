import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { router } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { useAuth } from '@/src/contexts/AuthContext';

export default function CompanyOnboarding() {
  const { user, profile, loading, onboardingRequired, completeOnboarding, logout } = useAuth();
  const [companyName, setCompanyName] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  useEffect(() => {
    if (loading) return;
    if (user && profile) router.replace('/app' as never);
    else if (!onboardingRequired) router.replace('/login' as never);
  }, [loading, user, profile, onboardingRequired]);
  const submit = async () => {
    if (busy) return;
    if (!companyName.trim() || !displayName.trim()) {
      setError('Sila isi nama anda dan nama syarikat.');
      return;
    }
    setBusy(true); setError('');
    try { await completeOnboarding(companyName, displayName); }
    catch (cause) { setError(cause instanceof Error ? cause.message : 'Syarikat tidak dapat disediakan. Cuba semula.'); }
    finally { setBusy(false); }
  };
  if (loading || !onboardingRequired) return <View style={styles.center}><ActivityIndicator color="#C026D3" /></View>;
  return <ScrollView contentContainerStyle={styles.page} keyboardShouldPersistTaps="handled">
    <View style={styles.card}>
      <Text style={styles.brand}>MYOPS · OpsFlow</Text>
      <Text style={styles.title}>Mulakan syarikat anda</Text>
      <Text style={styles.body}>Akses MYOPS anda telah disahkan. Sediakan syarikat untuk mula menggunakan OpsFlow dengan data kosong.</Text>
      <Text style={styles.label}>Nama anda</Text>
      <TextInput accessibilityLabel="Nama anda" style={styles.input} value={displayName} onChangeText={setDisplayName} maxLength={100} editable={!busy} autoComplete="name" />
      <Text style={styles.label}>Nama syarikat</Text>
      <TextInput accessibilityLabel="Nama syarikat" style={styles.input} value={companyName} onChangeText={setCompanyName} maxLength={200} editable={!busy} onSubmitEditing={() => { void submit(); }} />
      <Text style={styles.body}>Mata wang: MYR (RM) · Zon masa: Malaysia</Text>
      <Text style={styles.body}>Anda akan menjadi pentadbir syarikat ini. Tiada produk, jualan atau transaksi contoh akan ditambah.</Text>
      {!!error && <Text accessibilityRole="alert" style={styles.error}>{error}</Text>}
      <Pressable accessibilityRole="button" accessibilityLabel="Cipta syarikat dan buka OpsFlow" disabled={busy} onPress={() => { void submit(); }}>
        <LinearGradient colors={['#EC4899', '#F97316', '#A855F7']} style={styles.button}>
          {busy ? <ActivityIndicator color="#FFF" /> : <Text style={styles.buttonText}>Cipta syarikat & buka OpsFlow</Text>}
        </LinearGradient>
      </Pressable>
      <Pressable accessibilityRole="button" disabled={busy} onPress={() => { void logout(); }} style={styles.exit}><Text style={styles.exitText}>Log keluar</Text></Pressable>
    </View>
  </ScrollView>;
}
const styles = StyleSheet.create({
  page: { flexGrow: 1, justifyContent: 'center', alignItems: 'center', padding: 24, backgroundColor: '#FFF7ED' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#FFF7ED' },
  card: { width: '100%', maxWidth: 520, backgroundColor: '#FFF', borderRadius: 20, padding: 28, gap: 16 },
  brand: { color: '#A21CAF', fontWeight: '800', fontSize: 15 },
  title: { color: '#1F2937', fontWeight: '800', fontSize: 28 },
  body: { color: '#64748B', fontSize: 14, lineHeight: 22 },
  label: { color: '#334155', fontWeight: '600', fontSize: 14 },
  input: { borderWidth: 1, borderColor: '#CBD5E1', borderRadius: 10, padding: 12, color: '#0F172A', fontSize: 16 },
  button: { padding: 15, borderRadius: 10, alignItems: 'center' },
  buttonText: { color: '#FFF', fontSize: 15, fontWeight: '700' },
  error: { color: '#B91C1C', fontSize: 14, lineHeight: 21 },
  exit: { alignItems: 'center', padding: 8 },
  exitText: { color: '#64748B', fontWeight: '600' },
});
