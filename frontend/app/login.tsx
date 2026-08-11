import React, { useState } from 'react';
import { Alert, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useAuth } from '@/src/contexts/AuthContext';

export default function LoginRoute() {
  const router = useRouter();
  const { login } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleLogin = async () => {
    setLoading(true);
    try {
      await login(email, password, '', true);
      router.replace('/app');
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Login failed';
      Alert.alert('Login failed', message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        <Text style={styles.title}>Customer Login</Text>
        <Text style={styles.subtitle}>Sign in to reach your dashboard.</Text>
        <TextInput style={styles.input} placeholder="Email" autoCapitalize="none" value={email} onChangeText={setEmail} />
        <TextInput style={styles.input} placeholder="Password" secureTextEntry value={password} onChangeText={setPassword} />
        <TouchableOpacity style={styles.button} onPress={handleLogin} disabled={loading}>
          <Text style={styles.buttonText}>{loading ? 'Signing in…' : 'Login'}</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.link} onPress={() => router.push('/register')}>
          <Text style={styles.linkText}>Create a new account</Text>
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
  button: { backgroundColor: '#2563EB', borderRadius: 12, paddingVertical: 14, alignItems: 'center', marginTop: 8 },
  buttonText: { color: '#FFFFFF', fontWeight: '700' },
  link: { alignItems: 'center', marginTop: 8 },
  linkText: { color: '#2563EB', fontWeight: '700' },
});
