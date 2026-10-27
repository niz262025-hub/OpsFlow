import React from 'react';
import { Linking, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';

export default function SubscriptionPage() {
  const router = useRouter();
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#F8FAFC', justifyContent: 'center', padding: 24 }}>
      <View style={{ width: '100%', maxWidth: 520, alignSelf: 'center', gap: 14 }}>
        <Text style={{ fontSize: 26, fontWeight: '800', color: '#0F172A' }}>Manage access in MYOPS</Text>
        <Text style={{ fontSize: 15, lineHeight: 22, color: '#475569' }}>Your MYOPS package controls access to OpsFlow and the other apps.</Text>
        <TouchableOpacity onPress={() => { void Linking.openURL('https://www.myops.com.my/'); }} style={{ backgroundColor: '#2563EB', borderRadius: 12, padding: 14, alignItems: 'center' }}>
          <Text style={{ color: '#FFFFFF', fontWeight: '700' }}>Continue to MYOPS</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={() => router.back()} style={{ padding: 12, alignItems: 'center' }}>
          <Text style={{ color: '#2563EB', fontWeight: '700' }}>Back to OpsFlow</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}
