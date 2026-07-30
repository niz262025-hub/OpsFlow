import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, KeyboardAvoidingView, Platform, ScrollView, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '@/src/contexts/AuthContext';
import { useTheme } from '@/src/contexts/ThemeContext';
import { Button, Input } from '@/src/components/UI';
import { MaterialIcons } from '@expo/vector-icons';

export default function ForgotPassword() {
  const { theme } = useTheme();
  const { forgotPassword } = useAuth();
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  const handleSubmit = async () => {
    if (!email.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      Alert.alert('Invalid email', 'Please enter a valid email address');
      return;
    }
    setLoading(true);
    try {
      await forgotPassword(email);
      setSent(true);
    } catch (err: any) {
      Alert.alert('Error', err?.message || 'Could not send reset email');
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: theme.colors.background }} edges={['top']}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
          <TouchableOpacity onPress={() => router.back()} style={styles.back}>
            <MaterialIcons name="arrow-back" size={26} color={theme.colors.text} />
          </TouchableOpacity>
          <View style={styles.iconWrap}>
            <View style={[styles.iconCircle, { backgroundColor: theme.colors.primaryLight }]}>
              <MaterialIcons name={sent ? 'mark-email-read' : 'lock-reset'} size={40} color={theme.colors.primary} />
            </View>
          </View>
          <Text style={[styles.title, { color: theme.colors.text }]}>{sent ? 'Check Your Email' : 'Forgot Password?'}</Text>
          <Text style={[styles.subtitle, { color: theme.colors.textSecondary }]}>
            {sent ? `We've sent a password reset link to ${email}. Check your inbox.` : 'Enter your email and we\'ll send you a reset link'}
          </Text>
          {!sent ? (
            <>
              <Input value={email} onChangeText={setEmail} placeholder="you@company.com" icon="email" keyboardType="email-address" autoCapitalize="none" testID="forgot-email-input" />
              <Button title="Send Reset Link" onPress={handleSubmit} loading={loading} fullWidth size="lg" icon="send" testID="forgot-submit-button" />
            </>
          ) : (
            <Button title="Back to Login" onPress={() => router.replace('/(auth)/login')} fullWidth size="lg" icon="arrow-back" />
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  scroll: { flexGrow: 1, padding: 28 },
  back: { alignSelf: 'flex-start', padding: 4, marginBottom: 32 },
  iconWrap: { alignItems: 'center', marginBottom: 24 },
  iconCircle: { width: 88, height: 88, borderRadius: 44, alignItems: 'center', justifyContent: 'center' },
  title: { fontSize: 28, fontWeight: '800', textAlign: 'center', marginBottom: 8 },
  subtitle: { fontSize: 14, textAlign: 'center', marginBottom: 32, lineHeight: 20 },
});
