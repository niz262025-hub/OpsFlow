import React from 'react';
import { Linking, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';

export default function RegisterRoute() {
  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        <Text style={styles.title}>Create your account through MYOPS</Text>
        <Text style={styles.subtitle}>Create your MYOPS account and choose the package that includes OpsFlow.</Text>
        <TouchableOpacity style={styles.button} onPress={() => { void Linking.openURL('https://www.myops.com.my/'); }}>
          <Text style={styles.buttonText}>Continue to MYOPS</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.link} onPress={() => router.replace('/')}>
          <Text style={styles.linkText}>Back to OpsFlow</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#F8FAFC' },
  container: { flex: 1, justifyContent: 'center', padding: 24, gap: 12, maxWidth: 520, width: '100%', alignSelf: 'center' },
  title: { fontSize: 28, fontWeight: '800', color: '#0F172A' },
  subtitle: { fontSize: 15, color: '#475569', marginBottom: 8, lineHeight: 22 },
  button: { backgroundColor: '#0F172A', borderRadius: 12, paddingVertical: 14, alignItems: 'center', marginTop: 8 },
  buttonText: { color: '#FFFFFF', fontWeight: '700' },
  link: { alignItems: 'center', marginTop: 8 },
  linkText: { color: '#2563EB', fontWeight: '700' },
});
