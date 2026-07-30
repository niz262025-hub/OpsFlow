import React, { useEffect } from 'react';
import { View, Text, StyleSheet, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import { useAuth } from '@/src/contexts/AuthContext';
import { useTheme } from '@/src/contexts/ThemeContext';
import { isFirebaseConfigured } from '@/src/firebase/config';
import Animated, { FadeIn, FadeInDown } from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';

export default function Index() {
  const { user, profile, loading, firebaseReady } = useAuth();
  const { theme } = useTheme();
  const router = useRouter();

  useEffect(() => {
    if (loading) return;
    if (!firebaseReady) return; // stay on splash showing "config needed"
    setTimeout(() => {
      if (!user) {
        router.replace('/(auth)/login');
      } else if (!profile?.companyId) {
        router.replace('/(setup)/company-setup');
      } else {
        router.replace('/(tabs)/dashboard');
      }
    }, 800);
  }, [loading, user, profile, firebaseReady]);

  return (
    <View style={{ flex: 1 }}>
      <LinearGradient colors={['#2563EB', '#1E40AF']} style={StyleSheet.absoluteFill} />
      <View style={styles.container}>
        <Animated.View entering={FadeIn.duration(500)} style={styles.logoWrap}>
          <View style={styles.logo}>
            <Text style={styles.logoText}>B</Text>
          </View>
        </Animated.View>
        <Animated.Text entering={FadeInDown.delay(200).duration(500)} style={styles.appName}>BizFlow Pro</Animated.Text>
        <Animated.Text entering={FadeInDown.delay(400).duration(500)} style={styles.tagline}>
          Business Management for Malaysian SMEs
        </Animated.Text>
        {!firebaseReady ? (
          <Animated.View entering={FadeInDown.delay(600).duration(500)} style={styles.configWarn}>
            <Text style={styles.configWarnTitle}>Firebase not configured</Text>
            <Text style={styles.configWarnBody}>
              Add your Firebase credentials to /app/frontend/.env (see .env.example) and restart Expo.
            </Text>
          </Animated.View>
        ) : (
          <ActivityIndicator size="small" color="#FFFFFF" style={{ marginTop: 30 }} />
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32 },
  logoWrap: { marginBottom: 24 },
  logo: {
    width: 96, height: 96, borderRadius: 24, backgroundColor: '#FFFFFF',
    alignItems: 'center', justifyContent: 'center',
    shadowColor: '#000', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.3, shadowRadius: 16, elevation: 12,
  },
  logoText: { fontSize: 52, fontWeight: '900', color: '#2563EB' },
  appName: { fontSize: 32, fontWeight: '800', color: '#FFFFFF', letterSpacing: -0.5 },
  tagline: { fontSize: 14, color: 'rgba(255,255,255,0.85)', marginTop: 6 },
  configWarn: { marginTop: 40, backgroundColor: 'rgba(255,255,255,0.15)', padding: 16, borderRadius: 14, borderWidth: 1, borderColor: 'rgba(255,255,255,0.3)' },
  configWarnTitle: { color: '#FFFFFF', fontWeight: '700', fontSize: 14, marginBottom: 4 },
  configWarnBody: { color: 'rgba(255,255,255,0.9)', fontSize: 12, lineHeight: 18, textAlign: 'center' },
});
