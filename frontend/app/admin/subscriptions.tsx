import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

export default function AdminSubscriptions() {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Subscriptions</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#F8FAFC' },
  title: { fontSize: 24, fontWeight: '800', color: '#0F172A' },
});
