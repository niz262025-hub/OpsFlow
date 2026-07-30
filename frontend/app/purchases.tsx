import React, { useMemo, useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, Modal, Alert, KeyboardAvoidingView, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { MaterialIcons } from '@expo/vector-icons';
import { useTheme } from '@/src/contexts/ThemeContext';
import { useData, PurchaseItem } from '@/src/contexts/DataContext';
import { formatMYR } from '@/src/utils/currency';
import { Badge, Button, Card, EmptyState, Header, Input, Screen, SearchBar } from '@/src/components/UI';
import { generatePurchaseOrderPDF } from '@/src/utils/exports/pdf';

export default function Purchases() {
  const { theme } = useTheme();
  const router = useRouter();
  const { products, suppliers, purchases, createPurchase, company } = useData();
  const [modal, setModal] = useState(false);
  const [supplierId, setSupplierId] = useState<string | null>(null);
  const [items, setItems] = useState<PurchaseItem[]>([]);
  const [q, setQ] = useState('');
  const [discount, setDiscount] = useState('0');
  const [tax, setTax] = useState('0');
  const [processing, setProcessing] = useState(false);

  const filtered = q.trim() ? products.filter((p) => p.name.toLowerCase().includes(q.toLowerCase()) || p.sku.toLowerCase().includes(q.toLowerCase())) : products;

  const addItem = (p: any) => {
    setItems((c) => {
      const exist = c.find((i) => i.productId === p.id);
      if (exist) return c.map((i) => i.productId === p.id ? { ...i, quantity: i.quantity + 1, total: (i.quantity + 1) * i.costPrice } : i);
      return [...c, { productId: p.id, productName: p.name, sku: p.sku, quantity: 1, costPrice: p.costPrice || 0, total: p.costPrice || 0 }];
    });
  };
  const changeQty = (id: string, delta: number) => setItems((c) => c.flatMap((i) => {
    if (i.productId !== id) return [i];
    const q = i.quantity + delta; if (q <= 0) return [];
    return [{ ...i, quantity: q, total: q * i.costPrice }];
  }));
  const changeCost = (id: string, val: string) => setItems((c) => c.map((i) => i.productId === id ? { ...i, costPrice: parseFloat(val) || 0, total: i.quantity * (parseFloat(val) || 0) } : i));

  const subtotal = useMemo(() => items.reduce((s, i) => s + i.total, 0), [items]);
  const total = Math.max(0, subtotal - (parseFloat(discount) || 0) + (parseFloat(tax) || 0));

  const submit = async () => {
    if (items.length === 0) return Alert.alert('Empty', 'Add at least one product');
    setProcessing(true);
    try {
      const sup = suppliers.find((s) => s.id === supplierId);
      await createPurchase({ items, supplierId: sup?.id, supplierName: sup?.name, discount: parseFloat(discount) || 0, tax: parseFloat(tax) || 0 });
      Alert.alert('Success', 'Purchase recorded. Stock updated.');
      setItems([]); setDiscount('0'); setTax('0'); setSupplierId(null); setModal(false);
    } catch (e: any) { Alert.alert('Failed', e?.message || 'Could not save'); }
    finally { setProcessing(false); }
  };

  return (
    <Screen>
      <SafeAreaView style={{ flex: 1 }} edges={['top', 'bottom']}>
        <Header title="Purchases" onBack={() => router.back()} right={<TouchableOpacity onPress={() => setModal(true)} style={{ width: 40, height: 40, borderRadius: 10, backgroundColor: theme.colors.primary, alignItems: 'center', justifyContent: 'center' }} testID="new-purchase-button"><MaterialIcons name="add" size={22} color="#FFF" /></TouchableOpacity>} />
        <ScrollView contentContainerStyle={{ padding: 16 }}>
          {purchases.length === 0 ? (
            <EmptyState icon="local-shipping" title="No purchases yet" subtitle="Record purchases to increase inventory" actionLabel="New Purchase" onAction={() => setModal(true)} />
          ) : purchases.map((p) => (
            <TouchableOpacity key={p.id} onPress={() => generatePurchaseOrderPDF(p, company).catch((e) => Alert.alert('Error', e?.message))}>
              <Card style={{ marginBottom: 8 }}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                  <View style={{ flex: 1 }}>
                    <Text style={{ fontSize: 14, fontWeight: '700', color: theme.colors.text }}>{p.purchaseNumber}</Text>
                    <Text style={{ fontSize: 12, color: theme.colors.textSecondary, marginTop: 2 }}>{p.supplierName || 'No supplier'} • {p.items.length} items</Text>
                  </View>
                  <View style={{ alignItems: 'flex-end' }}>
                    <Text style={{ fontSize: 15, fontWeight: '800', color: theme.colors.primary }}>{formatMYR(p.total)}</Text>
                    <Text style={{ fontSize: 10, color: theme.colors.textSecondary, marginTop: 2 }}>Tap for PDF</Text>
                  </View>
                </View>
              </Card>
            </TouchableOpacity>
          ))}
        </ScrollView>

        <Modal visible={modal} transparent animationType="slide" onRequestClose={() => setModal(false)}>
          <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1, backgroundColor: theme.colors.overlay, justifyContent: 'flex-end' }}>
            <View style={{ backgroundColor: theme.colors.background, borderTopLeftRadius: 24, borderTopRightRadius: 24, height: '92%' }}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 20 }}>
                <Text style={{ fontSize: 20, fontWeight: '800', color: theme.colors.text }}>New Purchase</Text>
                <TouchableOpacity onPress={() => setModal(false)}><MaterialIcons name="close" size={26} color={theme.colors.text} /></TouchableOpacity>
              </View>
              <ScrollView contentContainerStyle={{ padding: 20, paddingTop: 0 }}>
                <Text style={{ fontSize: 13, fontWeight: '700', color: theme.colors.text, marginBottom: 8 }}>Supplier</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, marginBottom: 16 }}>
                  <TouchableOpacity onPress={() => setSupplierId(null)} style={[styles.chip, { backgroundColor: !supplierId ? theme.colors.primary : theme.colors.cardMuted }]}>
                    <Text style={{ color: !supplierId ? '#FFF' : theme.colors.text, fontWeight: '600', fontSize: 13 }}>Direct</Text>
                  </TouchableOpacity>
                  {suppliers.map((s) => (
                    <TouchableOpacity key={s.id} onPress={() => setSupplierId(s.id)} style={[styles.chip, { backgroundColor: supplierId === s.id ? theme.colors.primary : theme.colors.cardMuted }]}>
                      <Text style={{ color: supplierId === s.id ? '#FFF' : theme.colors.text, fontWeight: '600', fontSize: 13 }}>{s.name}</Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>

                <SearchBar value={q} onChangeText={setQ} placeholder="Add products to purchase..." />
                <View style={{ height: 8 }} />
                {q.trim() && filtered.slice(0, 5).map((p) => (
                  <TouchableOpacity key={p.id} onPress={() => { addItem(p); setQ(''); }} style={[styles.searchItem, { backgroundColor: theme.colors.card, borderColor: theme.colors.border }]}>
                    <MaterialIcons name="add-circle" size={20} color={theme.colors.primary} />
                    <View style={{ flex: 1, marginLeft: 10 }}>
                      <Text style={{ fontSize: 14, fontWeight: '600', color: theme.colors.text }}>{p.name}</Text>
                      <Text style={{ fontSize: 11, color: theme.colors.textSecondary }}>{p.sku} • Stock: {p.stock}</Text>
                    </View>
                    <Text style={{ fontSize: 13, fontWeight: '700', color: theme.colors.text }}>{formatMYR(p.costPrice || 0)}</Text>
                  </TouchableOpacity>
                ))}

                {items.length > 0 && (
                  <>
                    <Text style={{ fontSize: 13, fontWeight: '700', color: theme.colors.text, marginTop: 16, marginBottom: 8 }}>Items ({items.length})</Text>
                    {items.map((i) => (
                      <Card key={i.productId} style={{ marginBottom: 8 }}>
                        <Text style={{ fontSize: 14, fontWeight: '600', color: theme.colors.text }}>{i.productName}</Text>
                        <Text style={{ fontSize: 11, color: theme.colors.textSecondary, marginTop: 2 }}>{i.sku}</Text>
                        <View style={{ flexDirection: 'row', gap: 8, marginTop: 10, alignItems: 'center' }}>
                          <TouchableOpacity onPress={() => changeQty(i.productId, -1)} style={styles.qtyBtn}><MaterialIcons name="remove" size={16} color={theme.colors.primary} /></TouchableOpacity>
                          <Text style={{ fontSize: 15, fontWeight: '700', color: theme.colors.text, minWidth: 30, textAlign: 'center' }}>{i.quantity}</Text>
                          <TouchableOpacity onPress={() => changeQty(i.productId, 1)} style={styles.qtyBtn}><MaterialIcons name="add" size={16} color={theme.colors.primary} /></TouchableOpacity>
                          <View style={{ flex: 1, marginLeft: 8 }}>
                            <Input value={String(i.costPrice)} onChangeText={(v) => changeCost(i.productId, v)} placeholder="Cost" keyboardType="decimal-pad" prefix="RM" />
                          </View>
                          <Text style={{ fontSize: 15, fontWeight: '800', color: theme.colors.primary, minWidth: 80, textAlign: 'right' }}>{formatMYR(i.total)}</Text>
                        </View>
                      </Card>
                    ))}
                    <View style={{ flexDirection: 'row', gap: 10 }}>
                      <View style={{ flex: 1 }}><Input label="Discount" value={discount} onChangeText={setDiscount} keyboardType="decimal-pad" prefix="RM" /></View>
                      <View style={{ flex: 1 }}><Input label="Tax" value={tax} onChangeText={setTax} keyboardType="decimal-pad" prefix="RM" /></View>
                    </View>
                    <Card style={{ marginBottom: 16, backgroundColor: theme.colors.primaryLight }}>
                      <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                        <Text style={{ fontWeight: '800', color: theme.colors.primary, fontSize: 16 }}>Grand Total</Text>
                        <Text style={{ fontWeight: '800', color: theme.colors.primary, fontSize: 20 }}>{formatMYR(total)}</Text>
                      </View>
                    </Card>
                    <Button title="Receive Stock & Save" onPress={submit} loading={processing} fullWidth size="lg" icon="check-circle" testID="save-purchase-button" />
                  </>
                )}
                <View style={{ height: 40 }} />
              </ScrollView>
            </View>
          </KeyboardAvoidingView>
        </Modal>
      </SafeAreaView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  chip: { paddingHorizontal: 14, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  searchItem: { flexDirection: 'row', alignItems: 'center', padding: 12, borderRadius: 12, borderWidth: 1, marginBottom: 6 },
  qtyBtn: { width: 30, height: 30, borderRadius: 8, backgroundColor: '#DBEAFE', alignItems: 'center', justifyContent: 'center' },
});
