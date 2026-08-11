import React from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable } from 'react-native';
import { useRouter } from 'expo-router';

const sampleProducts = [
  { name: 'Silk Wrap Dress', sku: 'SWD-001', stock: 12, price: 129 },
  { name: 'Leather Tote', sku: 'LTO-002', stock: 5, price: 189 },
  { name: 'Ceramic Vase', sku: 'CVS-003', stock: 8, price: 89 },
];

const sampleSales = [
  { id: 'S-1001', customer: 'Nora Lim', total: 318, status: 'Paid' },
  { id: 'S-1002', customer: 'Aisha Rahman', total: 189, status: 'Pending' },
];

export default function DemoScreen() {
  const router = useRouter();

  return (
    <ScrollView style={styles.page} contentContainerStyle={styles.content}>
      <View style={styles.banner}>
        <Text style={styles.bannerTitle}>Live Demo Environment</Text>
        <Text style={styles.bannerText}>This read-only view showcases a boutique operations workspace with sample products, sales, and finance activity.</Text>
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Demo Company</Text>
        <Text style={styles.cardText}>Northwind Boutique • Trial Preview</Text>
        <Text style={styles.cardHint}>No edits are being saved in this demo.</Text>
        <Pressable style={styles.button} onPress={() => router.replace('/')}>
          <Text style={styles.buttonText}>Back to Landing Page</Text>
        </Pressable>
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Sample Products</Text>
        {sampleProducts.map((item) => (
          <View key={item.sku} style={styles.row}>
            <View style={{ flex: 1 }}>
              <Text style={styles.rowTitle}>{item.name}</Text>
              <Text style={styles.rowMeta}>{item.sku}</Text>
            </View>
            <Text style={styles.rowValue}>Stock: {item.stock}</Text>
            <Text style={styles.rowValue}>RM{item.price}</Text>
          </View>
        ))}
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Recent Sales</Text>
        {sampleSales.map((sale) => (
          <View key={sale.id} style={styles.row}>
            <View style={{ flex: 1 }}>
              <Text style={styles.rowTitle}>{sale.id}</Text>
              <Text style={styles.rowMeta}>{sale.customer}</Text>
            </View>
            <Text style={styles.rowValue}>RM{sale.total}</Text>
            <Text style={styles.rowValue}>{sale.status}</Text>
          </View>
        ))}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: '#F8FAFC' },
  content: { padding: 24, gap: 16 },
  banner: { backgroundColor: '#0F172A', borderRadius: 20, padding: 20 },
  bannerTitle: { color: '#FFFFFF', fontSize: 22, fontWeight: '800', marginBottom: 6 },
  bannerText: { color: '#CBD5E1', fontSize: 14, lineHeight: 22 },
  card: { backgroundColor: '#FFFFFF', borderRadius: 18, padding: 18, shadowColor: '#000', shadowOpacity: 0.06, shadowRadius: 10, shadowOffset: { width: 0, height: 4 } },
  cardTitle: { fontSize: 18, fontWeight: '800', color: '#0F172A', marginBottom: 8 },
  cardText: { fontSize: 15, color: '#334155', marginBottom: 4 },
  cardHint: { fontSize: 13, color: '#64748B', marginBottom: 12 },
  button: { alignSelf: 'flex-start', backgroundColor: '#2563EB', paddingHorizontal: 14, paddingVertical: 10, borderRadius: 999 },
  buttonText: { color: '#FFFFFF', fontWeight: '700' },
  row: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 8, borderTopWidth: 1, borderTopColor: '#E2E8F0' },
  rowTitle: { fontSize: 14, fontWeight: '700', color: '#0F172A' },
  rowMeta: { fontSize: 12, color: '#64748B' },
  rowValue: { fontSize: 12, color: '#334155', fontWeight: '600', marginLeft: 8 },
});
