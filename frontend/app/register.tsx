import React, { useState } from 'react';
import { Alert, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useAuth } from '@/src/contexts/AuthContext';

export default function RegisterRoute() {
  const router = useRouter();
  const { register } = useAuth();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [companyName, setCompanyName] = useState('');
  const [loading, setLoading] = useState(false);
  const [statusMessage, setStatusMessage] = useState('');

  const handleRegister = async () => {
    const trimmedName = name.trim();
    const trimmedEmail = email.trim();
    const trimmedCompanyName = companyName.trim();

    if (!trimmedName || !trimmedEmail || !password) {
      Alert.alert('Missing information', 'Please complete your name, email, and password.');
      return;
    }

    setLoading(true);
    setStatusMessage('');
    try {
      await register(trimmedEmail, password, trimmedName, trimmedCompanyName || 'My Business', setStatusMessage);
      router.replace('/app');
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Registration failed';
      setStatusMessage(message);
      Alert.alert('Registration failed', message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        <Text style={styles.title}>Create your account</Text>
        <Text style={styles.subtitle}>Start your free BizFlow workspace.</Text>
        <TextInput testID="register-name-input" style={styles.input} placeholder="Your name" value={name} onChangeText={setName} />
        <TextInput testID="register-business-name-input" style={styles.input} placeholder="Business name" value={companyName} onChangeText={setCompanyName} />
        <TextInput testID="register-email-input" style={styles.input} placeholder="Email" autoCapitalize="none" value={email} onChangeText={setEmail} />
        <TextInput testID="register-password-input" style={styles.input} placeholder="Password" secureTextEntry value={password} onChangeText={setPassword} />
        <TouchableOpacity testID="register-submit-button" style={[styles.button, loading && styles.buttonDisabled]} onPress={handleRegister} disabled={loading}>
          <Text style={styles.buttonText}>{loading ? 'Creating account…' : 'Register'}</Text>
        </TouchableOpacity>
        {statusMessage ? <Text style={styles.statusText}>{statusMessage}</Text> : null}
        <TouchableOpacity style={styles.link} onPress={() => router.push('/login')}>
          <Text style={styles.linkText}>Already have an account?</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#F8FAFC' },
  container: { flex: 1, justifyContent: 'center', padding: 24, gap: 12 },
  title: { fontSize: 28, fontWeight: '800', color: '#0F172A' },
  subtitle: { fontSize: 14, color: '#475569', marginBottom: 8 },
  input: { borderWidth: 1, borderColor: '#CBD5E1', borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12, backgroundColor: '#FFFFFF' },
  button: { backgroundColor: '#0F172A', borderRadius: 12, paddingVertical: 14, alignItems: 'center', marginTop: 8 },
  buttonDisabled: { opacity: 0.7 },
  buttonText: { color: '#FFFFFF', fontWeight: '700' },
  statusText: { fontSize: 13, color: '#334155', textAlign: 'center', marginTop: 4 },
  link: { alignItems: 'center', marginTop: 8 },
  linkText: { color: '#2563EB', fontWeight: '700' },
});
