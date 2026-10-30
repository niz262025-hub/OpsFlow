import React, { useEffect } from 'react';
import { ActivityIndicator, Linking, Pressable, StyleSheet, Text, View } from 'react-native';
import { router } from 'expo-router';
import { useAuth } from '@/src/contexts/AuthContext';

export default function MyopsLaunchPage() {
  const { user, profile, loading, onboardingRequired } = useAuth();

  useEffect(() => {
    if (onboardingRequired) router.replace('/onboarding' as never);
    else if (user && profile) router.replace('/app' as never);
  }, [profile, user, onboardingRequired]);

  return (
    <View style={styles.page}>
      {user && profile ? (
        <>
          <ActivityIndicator size="large" color="#2563EB" />
          <Text style={styles.message}>Akses MYOPS disahkan. Membuka OpsFlow…</Text>
        </>
      ) : !loading && !onboardingRequired && (!user || !profile) ? (
        <>
          <Text style={styles.title}>OpsFlow tak dapat dibuka</Text>
          <Text style={styles.message}>Sesi MYOPS tiada atau pakej OpsFlow tidak aktif. Kembali ke MYOPS dan cuba buka OpsFlow semula.</Text>
          <Pressable style={styles.button} onPress={() => { void Linking.openURL('https://www.myops.com.my/'); }}>
            <Text style={styles.buttonText}>Kembali ke MYOPS</Text>
          </Pressable>
        </>
      ) : (
        <>
          <ActivityIndicator size="large" color="#2563EB" />
          <Text style={styles.message}>Sahkan akses MYOPS…</Text>
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24, gap: 16, backgroundColor: '#F8FAFC' },
  title: { color: '#0F172A', fontSize: 24, fontWeight: '800', textAlign: 'center' },
  message: { color: '#475569', fontSize: 15, lineHeight: 22, textAlign: 'center', maxWidth: 440 },
  button: { backgroundColor: '#2563EB', borderRadius: 10, paddingHorizontal: 18, paddingVertical: 13 },
  buttonText: { color: '#FFFFFF', fontWeight: '700' },
});
