import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, KeyboardAvoidingView, Platform, ScrollView, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '@/src/contexts/AuthContext';
import { useTheme } from '@/src/contexts/ThemeContext';
import { Button, Input } from '@/src/components/UI';
import Animated, { FadeInDown, FadeInUp } from 'react-native-reanimated';

export default function Login() {
  const { theme } = useTheme();
  const { login } = useAuth();
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [errors, setErrors] = useState<{ email?: string; password?: string }>({});
  const [loading, setLoading] = useState(false);

  const validate = () => {
    const e: any = {};
    if (!email.trim()) e.email = 'Email is required';
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) e.email = 'Invalid email';
    if (!password) e.password = 'Password is required';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleLogin = async () => {
    if (!validate()) return;
    setLoading(true);
    try {
      await login(email, password);
      // navigation handled by root layout observing auth state
    } catch (err: any) {
      const code = err?.code || '';
      let msg = err?.message || 'Login failed';
      if (code === 'auth/invalid-credential' || code === 'auth/wrong-password' || code === 'auth/user-not-found') msg = 'Invalid email or password';
      else if (code === 'auth/too-many-requests') msg = 'Too many attempts. Try again later.';
      Alert.alert('Login Failed', msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: theme.colors.background }} edges={['top']}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
          <Animated.View entering={FadeInDown.duration(500)} style={styles.header}>
            <View style={[styles.logo, { backgroundColor: theme.colors.primary }]}>
              <Text style={styles.logoText}>B</Text>
            </View>
            <Text style={[styles.appName, { color: theme.colors.primary }]}>BizFlow Pro</Text>
            <Text style={[styles.title, { color: theme.colors.text }]}>Welcome Back</Text>
            <Text style={[styles.subtitle, { color: theme.colors.textSecondary }]}>Sign in to continue managing your business</Text>
          </Animated.View>

          <Animated.View entering={FadeInUp.delay(200).duration(500)}>
            <Input
              label="Email"
              value={email}
              onChangeText={(v) => { setEmail(v); if (errors.email) setErrors({ ...errors, email: undefined }); }}
              placeholder="you@company.com"
              icon="email"
              keyboardType="email-address"
              autoCapitalize="none"
              error={errors.email}
              testID="login-email-input"
            />
            <Input
              label="Password"
              value={password}
              onChangeText={(v) => { setPassword(v); if (errors.password) setErrors({ ...errors, password: undefined }); }}
              placeholder="Your password"
              icon="lock"
              secureTextEntry
              error={errors.password}
              testID="login-password-input"
            />
            <TouchableOpacity onPress={() => router.push('/(auth)/forgot-password')} style={{ alignSelf: 'flex-end', marginBottom: 20 }}>
              <Text style={{ color: theme.colors.primary, fontWeight: '600', fontSize: 13 }}>Forgot password?</Text>
            </TouchableOpacity>
            <Button title="Sign In" onPress={handleLogin} loading={loading} fullWidth size="lg" icon="login" testID="login-submit-button" />
            <View style={styles.footer}>
              <Text style={{ color: theme.colors.textSecondary, fontSize: 14 }}>Don't have an account? </Text>
              <TouchableOpacity onPress={() => router.push('/(auth)/register')} testID="go-to-register-button">
                <Text style={{ color: theme.colors.primary, fontWeight: '700', fontSize: 14 }}>Create Account</Text>
              </TouchableOpacity>
            </View>
          </Animated.View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  scroll: { flexGrow: 1, padding: 28, justifyContent: 'center' },
  header: { alignItems: 'center', marginBottom: 32 },
  logo: { width: 72, height: 72, borderRadius: 20, alignItems: 'center', justifyContent: 'center', marginBottom: 16, shadowColor: '#2563EB', shadowOpacity: 0.3, shadowRadius: 12, shadowOffset: { width: 0, height: 6 }, elevation: 8 },
  logoText: { fontSize: 40, fontWeight: '900', color: '#FFFFFF' },
  appName: { fontSize: 18, fontWeight: '700', marginBottom: 20 },
  title: { fontSize: 28, fontWeight: '800' },
  subtitle: { fontSize: 14, marginTop: 6, textAlign: 'center' },
  footer: { flexDirection: 'row', justifyContent: 'center', marginTop: 24 },
});
