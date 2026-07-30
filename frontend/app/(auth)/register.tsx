import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, KeyboardAvoidingView, Platform, ScrollView, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '@/src/contexts/AuthContext';
import { useTheme } from '@/src/contexts/ThemeContext';
import { Button, Input } from '@/src/components/UI';
import Animated, { FadeInDown, FadeInUp } from 'react-native-reanimated';

export default function Register() {
  const { theme } = useTheme();
  const { register } = useAuth();
  const router = useRouter();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [errors, setErrors] = useState<any>({});
  const [loading, setLoading] = useState(false);

  const validate = () => {
    const e: any = {};
    if (!name.trim()) e.name = 'Full name is required';
    if (!email.trim()) e.email = 'Email is required';
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) e.email = 'Invalid email';
    if (!password) e.password = 'Password is required';
    else if (password.length < 6) e.password = 'At least 6 characters';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleRegister = async () => {
    if (!validate()) return;
    setLoading(true);
    try {
      await register(email, password, name.trim());
    } catch (err: any) {
      const code = err?.code || '';
      let msg = err?.message || 'Registration failed';
      if (code === 'auth/email-already-in-use') msg = 'Email already registered. Try signing in.';
      else if (code === 'auth/weak-password') msg = 'Password too weak (min 6 characters).';
      Alert.alert('Registration Failed', msg);
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
            <Text style={[styles.title, { color: theme.colors.text }]}>Create Account</Text>
            <Text style={[styles.subtitle, { color: theme.colors.textSecondary }]}>Start managing your business today</Text>
          </Animated.View>

          <Animated.View entering={FadeInUp.delay(200).duration(500)}>
            <Input label="Full Name" value={name} onChangeText={(v) => { setName(v); if (errors.name) setErrors({ ...errors, name: undefined }); }}
              placeholder="Your name" icon="person" error={errors.name} testID="register-name-input" />
            <Input label="Email" value={email} onChangeText={(v) => { setEmail(v); if (errors.email) setErrors({ ...errors, email: undefined }); }}
              placeholder="you@company.com" icon="email" keyboardType="email-address" autoCapitalize="none" error={errors.email} testID="register-email-input" />
            <Input label="Password" value={password} onChangeText={(v) => { setPassword(v); if (errors.password) setErrors({ ...errors, password: undefined }); }}
              placeholder="At least 6 characters" icon="lock" secureTextEntry error={errors.password} testID="register-password-input" />
            <Button title="Create Account" onPress={handleRegister} loading={loading} fullWidth size="lg" icon="check" testID="register-submit-button" />
            <View style={styles.footer}>
              <Text style={{ color: theme.colors.textSecondary, fontSize: 14 }}>Already have an account? </Text>
              <TouchableOpacity onPress={() => router.back()}>
                <Text style={{ color: theme.colors.primary, fontWeight: '700', fontSize: 14 }}>Sign In</Text>
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
  header: { alignItems: 'center', marginBottom: 24 },
  logo: { width: 64, height: 64, borderRadius: 18, alignItems: 'center', justifyContent: 'center', marginBottom: 12, shadowColor: '#2563EB', shadowOpacity: 0.3, shadowRadius: 12, shadowOffset: { width: 0, height: 6 }, elevation: 8 },
  logoText: { fontSize: 34, fontWeight: '900', color: '#FFFFFF' },
  appName: { fontSize: 16, fontWeight: '700', marginBottom: 18 },
  title: { fontSize: 26, fontWeight: '800' },
  subtitle: { fontSize: 13, marginTop: 6 },
  footer: { flexDirection: 'row', justifyContent: 'center', marginTop: 24 },
});
