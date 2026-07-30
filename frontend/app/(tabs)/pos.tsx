import React, { useMemo, useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, Modal, Alert, KeyboardAvoidingView, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { useTheme } from '@/src/contexts/ThemeContext';
import { useData, Product, SaleItem } from '@/src/contexts/DataContext';
import { formatMYR } from '@/src/utils/currency';
import { Badge, Button, Card, EmptyState, Header, Input, Screen, SearchBar } from '@/src/components/UI';
import { generateInvoicePDF, generateReceiptPDF } from '@/src/utils/exports/pdf';
import { BarcodeScannerModal } from '@/src/components/BarcodeScanner';

export default function POS() {
  const { theme } = useTheme();
  const { products, customers, createSale, sales, company } = useData();
  const [q, setQ] = useState('');
  const [cart, setCart] = useState<SaleItem[]>([]);
  const [discount, setDiscount] = useState('0');
  const [tax, setTax] = useState('0');
  const [payment, setPayment] = useState<'Cash' | 'QR' | 'Transfer'>('Cash');
  const [customerId, setCustomerId] = useState<string | null>(null);
  const [processing, setProcessing] = useState(false);
  const [receiptModal, setReceiptModal] = useState<any>(null);
  const [historyModal, setHistoryModal] = useState(false);
  const [scannerOpen, setScannerOpen] = useState(false);

  const handleScan = (code: string) => {
    setScannerOpen(false);
    const found = products.find((p) => p.barcode === code || p.sku.toLowerCase() === code.toLowerCase());
    if (found) {
      if (found.stock <= 0) Alert.alert('Out of Stock', `${found.name} is out of stock`);
      else addToCart(found);
    } else {
      Alert.alert('Not Found', `No product matches barcode "${code}"`);
    }
  };

  const active = products.filter((p) => p.status !== 'archived' && p.stock > 0);
  const filtered = q.trim()
    ? active.filter((p) => {
        const s = q.toLowerCase();
        return p.name.toLowerCase().includes(s) || p.sku.toLowerCase().includes(s) || (p.barcode || '').includes(s);
      })
    : active;

  const addToCart = (p: Product) => {
    setCart((c) => {
      const existing = c.find((i) => i.productId === p.id);
      if (existing) {
        if (existing.quantity + 1 > p.stock) { Alert.alert('Stock limit', `Only ${p.stock} available`); return c; }
        return c.map((i) => i.productId === p.id ? { ...i, quantity: i.quantity + 1, total: (i.quantity + 1) * i.unitPrice } : i);
      }
      return [...c, { productId: p.id, productName: p.name, sku: p.sku, quantity: 1, unitPrice: p.sellingPrice, costPrice: p.costPrice || 0, total: p.sellingPrice }];
    });
  };
  const changeQty = (id: string, delta: number) => {
    const product = products.find((p) => p.id === id);
    setCart((c) => c.flatMap((i) => {
      if (i.productId !== id) return [i];
      const newQty = i.quantity + delta;
      if (newQty <= 0) return [];
      if (product && newQty > product.stock) { Alert.alert('Stock limit', `Only ${product.stock} available`); return [i]; }
      return [{ ...i, quantity: newQty, total: newQty * i.unitPrice }];
    }));
  };

  const subtotal = useMemo(() => cart.reduce((s, i) => s + i.total, 0), [cart]);
  const discountVal = parseFloat(discount) || 0;
  const taxVal = parseFloat(tax) || 0;
  const total = Math.max(0, subtotal - discountVal + taxVal);

  const complete = async () => {
    if (cart.length === 0) return;
    setProcessing(true);
    try {
      const customer = customers.find((c) => c.id === customerId);
      const sale = await createSale({
        items: cart,
        customerId: customer?.id,
        customerName: customer?.name,
        discount: discountVal,
        tax: taxVal,
        paymentMethod: payment,
      });
      setReceiptModal({ ...sale, customerName: customer?.name });
      setCart([]); setDiscount('0'); setTax('0'); setCustomerId(null);
    } catch (e: any) {
      Alert.alert('Sale Failed', e?.message || 'Could not complete sale');
    } finally { setProcessing(false); }
  };

  return (
    <Screen>
      <SafeAreaView style={{ flex: 1 }} edges={['top']}>
        <Header title="POS" subtitle={`${cart.length} item${cart.length !== 1 ? 's' : ''} in cart`}
          right={
            <View style={{ flexDirection: 'row', gap: 4 }}>
              <TouchableOpacity onPress={() => setScannerOpen(true)} style={{ padding: 6 }} testID="pos-scan-button"><MaterialIcons name="qr-code-scanner" size={24} color={theme.colors.text} /></TouchableOpacity>
              <TouchableOpacity onPress={() => setHistoryModal(true)} style={{ padding: 6 }}><MaterialIcons name="history" size={24} color={theme.colors.text} /></TouchableOpacity>
            </View>
          } />

        <BarcodeScannerModal visible={scannerOpen} onClose={() => setScannerOpen(false)} onScanned={handleScan} title="Scan Product" />

        <View style={{ padding: 16 }}>
          <SearchBar value={q} onChangeText={setQ} placeholder="Search or scan barcode" testID="pos-search-input" />
        </View>

        <ScrollView contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 20 }} showsVerticalScrollIndicator={false}>
          {filtered.length === 0 ? (
            <EmptyState icon="inventory-2" title="No products available" subtitle={q ? 'Try a different search' : 'Add products in Inventory tab first'} />
          ) : (
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10 }}>
              {filtered.slice(0, 30).map((p, i) => (
                <Animated.View key={p.id} entering={FadeInDown.delay(i * 20).duration(250)} style={{ width: '48%' }}>
                  <TouchableOpacity onPress={() => addToCart(p)} testID={`pos-product-${p.sku}`}>
                    <Card style={{ padding: 12 }}>
                      <Text style={{ fontSize: 13, fontWeight: '700', color: theme.colors.text }} numberOfLines={1}>{p.name}</Text>
                      <Text style={{ fontSize: 11, color: theme.colors.textSecondary, marginTop: 2 }} numberOfLines={1}>{p.sku}</Text>
                      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 8 }}>
                        <Text style={{ fontSize: 15, fontWeight: '800', color: theme.colors.primary }}>{formatMYR(p.sellingPrice)}</Text>
                        <Badge label={`${p.stock}`} tone={p.stock <= (p.minStock || 10) ? 'warning' : 'success'} />
                      </View>
                    </Card>
                  </TouchableOpacity>
                </Animated.View>
              ))}
            </View>
          )}
        </ScrollView>

        {cart.length > 0 && (
          <View style={[styles.cartBar, { backgroundColor: theme.colors.surface, borderTopColor: theme.colors.border }]}>
            <View style={{ flex: 1 }}>
              <Text style={{ color: theme.colors.textSecondary, fontSize: 11 }}>Total</Text>
              <Text style={{ color: theme.colors.primary, fontSize: 22, fontWeight: '800' }}>{formatMYR(total)}</Text>
            </View>
            <Button title={`View Cart (${cart.length})`} onPress={() => setReceiptModal('cart')} icon="shopping-cart" testID="pos-view-cart-button" />
          </View>
        )}

        {/* Cart / Checkout Modal */}
        <Modal visible={receiptModal === 'cart'} transparent animationType="slide" onRequestClose={() => setReceiptModal(null)}>
          <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1, backgroundColor: theme.colors.overlay, justifyContent: 'flex-end' }}>
            <View style={{ backgroundColor: theme.colors.background, borderTopLeftRadius: 24, borderTopRightRadius: 24, maxHeight: '92%' }}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 20 }}>
                <Text style={{ fontSize: 20, fontWeight: '800', color: theme.colors.text }}>Checkout</Text>
                <TouchableOpacity onPress={() => setReceiptModal(null)}><MaterialIcons name="close" size={26} color={theme.colors.text} /></TouchableOpacity>
              </View>
              <ScrollView contentContainerStyle={{ padding: 20, paddingTop: 0 }} showsVerticalScrollIndicator={false}>
                {cart.map((i) => (
                  <Card key={i.productId} style={{ marginBottom: 8 }}>
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                      <View style={{ flex: 1 }}>
                        <Text style={{ fontSize: 14, fontWeight: '600', color: theme.colors.text }}>{i.productName}</Text>
                        <Text style={{ fontSize: 12, color: theme.colors.textSecondary, marginTop: 2 }}>{formatMYR(i.unitPrice)} each</Text>
                      </View>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                        <TouchableOpacity onPress={() => changeQty(i.productId, -1)} style={styles.qtyBtn}><MaterialIcons name="remove" size={18} color={theme.colors.primary} /></TouchableOpacity>
                        <Text style={{ fontSize: 15, fontWeight: '700', color: theme.colors.text, minWidth: 24, textAlign: 'center' }}>{i.quantity}</Text>
                        <TouchableOpacity onPress={() => changeQty(i.productId, 1)} style={styles.qtyBtn}><MaterialIcons name="add" size={18} color={theme.colors.primary} /></TouchableOpacity>
                      </View>
                      <Text style={{ fontSize: 15, fontWeight: '800', color: theme.colors.primary, marginLeft: 12, minWidth: 80, textAlign: 'right' }}>{formatMYR(i.total)}</Text>
                    </View>
                  </Card>
                ))}

                {customers.length > 0 && (
                  <>
                    <Text style={{ fontSize: 13, fontWeight: '600', color: theme.colors.text, marginTop: 8, marginBottom: 6 }}>Customer</Text>
                    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, marginBottom: 12 }}>
                      <TouchableOpacity onPress={() => setCustomerId(null)} style={[styles.chip, { backgroundColor: !customerId ? theme.colors.primary : theme.colors.cardMuted }]}>
                        <Text style={{ color: !customerId ? '#FFF' : theme.colors.text, fontWeight: '600', fontSize: 13 }}>Walk-in</Text>
                      </TouchableOpacity>
                      {customers.map((c) => (
                        <TouchableOpacity key={c.id} onPress={() => setCustomerId(c.id)} style={[styles.chip, { backgroundColor: customerId === c.id ? theme.colors.primary : theme.colors.cardMuted }]}>
                          <Text style={{ color: customerId === c.id ? '#FFF' : theme.colors.text, fontWeight: '600', fontSize: 13 }}>{c.name}</Text>
                        </TouchableOpacity>
                      ))}
                    </ScrollView>
                  </>
                )}

                <View style={{ flexDirection: 'row', gap: 10 }}>
                  <View style={{ flex: 1 }}><Input label="Discount" value={discount} onChangeText={setDiscount} placeholder="0.00" keyboardType="decimal-pad" prefix="RM" /></View>
                  <View style={{ flex: 1 }}><Input label="Tax" value={tax} onChangeText={setTax} placeholder="0.00" keyboardType="decimal-pad" prefix="RM" /></View>
                </View>

                <Text style={{ fontSize: 13, fontWeight: '600', color: theme.colors.text, marginBottom: 6 }}>Payment Method</Text>
                <View style={{ flexDirection: 'row', gap: 8, marginBottom: 16 }}>
                  {(['Cash', 'QR', 'Transfer'] as const).map((m) => (
                    <TouchableOpacity key={m} onPress={() => setPayment(m)} style={{ flex: 1, padding: 14, borderRadius: 12, backgroundColor: payment === m ? theme.colors.primary : theme.colors.cardMuted, alignItems: 'center' }}>
                      <MaterialIcons name={m === 'Cash' ? 'payments' : m === 'QR' ? 'qr-code' : 'account-balance'} size={22} color={payment === m ? '#FFF' : theme.colors.text} />
                      <Text style={{ marginTop: 4, fontWeight: '600', color: payment === m ? '#FFF' : theme.colors.text, fontSize: 12 }}>{m}</Text>
                    </TouchableOpacity>
                  ))}
                </View>

                <Card style={{ marginBottom: 16, backgroundColor: theme.colors.primaryLight }}>
                  <Row label="Subtotal" value={formatMYR(subtotal)} />
                  <Row label="Discount" value={`- ${formatMYR(discountVal)}`} />
                  <Row label="Tax" value={`+ ${formatMYR(taxVal)}`} />
                  <View style={{ height: 1, backgroundColor: theme.colors.primary + '30', marginVertical: 8 }} />
                  <Row label="TOTAL" value={formatMYR(total)} bold color={theme.colors.primary} big />
                </Card>

                <Button title="Complete Sale" onPress={complete} loading={processing} fullWidth size="lg" icon="check-circle" testID="pos-complete-sale-button" />
                <View style={{ height: 40 }} />
              </ScrollView>
            </View>
          </KeyboardAvoidingView>
        </Modal>

        {/* Receipt Modal */}
        {receiptModal && receiptModal !== 'cart' && (
          <Modal visible transparent animationType="fade" onRequestClose={() => setReceiptModal(null)}>
            <View style={{ flex: 1, backgroundColor: theme.colors.overlay, justifyContent: 'center', padding: 24 }}>
              <Card style={{ padding: 24 }}>
                <View style={{ alignItems: 'center', marginBottom: 16 }}>
                  <View style={{ width: 64, height: 64, borderRadius: 32, backgroundColor: theme.colors.successLight, alignItems: 'center', justifyContent: 'center' }}>
                    <MaterialIcons name="check-circle" size={40} color={theme.colors.success} />
                  </View>
                  <Text style={{ fontSize: 20, fontWeight: '800', color: theme.colors.text, marginTop: 12 }}>Sale Complete</Text>
                  <Text style={{ fontSize: 13, color: theme.colors.textSecondary, marginTop: 4 }}>{receiptModal.saleNumber}</Text>
                </View>
                {receiptModal.items.map((i: SaleItem) => (
                  <View key={i.productId} style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 }}>
                    <Text style={{ fontSize: 13, color: theme.colors.text, flex: 1 }} numberOfLines={1}>{i.productName} × {i.quantity}</Text>
                    <Text style={{ fontSize: 13, color: theme.colors.text }}>{formatMYR(i.total)}</Text>
                  </View>
                ))}
                <View style={{ height: 1, backgroundColor: theme.colors.border, marginVertical: 12 }} />
                <Row label="Total" value={formatMYR(receiptModal.total)} bold big color={theme.colors.primary} />
                <Row label="Payment" value={receiptModal.paymentMethod} />
                {receiptModal.customerName && <Row label="Customer" value={receiptModal.customerName} />}
                <View style={{ flexDirection: 'row', gap: 8, marginTop: 16 }}>
                  <Button title="Receipt" variant="secondary" fullWidth icon="receipt" onPress={() => generateReceiptPDF(receiptModal, company).catch((e) => Alert.alert('Error', e?.message))} testID="pos-share-receipt-button" />
                  <Button title="Invoice PDF" fullWidth icon="picture-as-pdf" onPress={() => generateInvoicePDF(receiptModal, company).catch((e) => Alert.alert('Error', e?.message))} testID="pos-share-invoice-button" />
                </View>
                <Button title="Done" onPress={() => setReceiptModal(null)} variant="ghost" fullWidth style={{ marginTop: 8 }} />
              </Card>
            </View>
          </Modal>
        )}

        {/* History Modal */}
        <Modal visible={historyModal} transparent animationType="slide" onRequestClose={() => setHistoryModal(false)}>
          <View style={{ flex: 1, backgroundColor: theme.colors.overlay, justifyContent: 'flex-end' }}>
            <View style={{ backgroundColor: theme.colors.background, borderTopLeftRadius: 24, borderTopRightRadius: 24, maxHeight: '90%' }}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 20 }}>
                <Text style={{ fontSize: 20, fontWeight: '800', color: theme.colors.text }}>Sales History</Text>
                <TouchableOpacity onPress={() => setHistoryModal(false)}><MaterialIcons name="close" size={26} color={theme.colors.text} /></TouchableOpacity>
              </View>
              <ScrollView contentContainerStyle={{ padding: 20, paddingTop: 0 }}>
                {sales.length === 0 ? <EmptyState icon="receipt-long" title="No sales yet" /> :
                  sales.slice(0, 100).map((s) => (
                    <TouchableOpacity key={s.id} onPress={() => {
                      Alert.alert(s.saleNumber, 'Reprint or share this sale?', [
                        { text: 'Cancel', style: 'cancel' },
                        { text: 'Receipt', onPress: () => generateReceiptPDF(s, company).catch((e) => Alert.alert('Error', e?.message)) },
                        { text: 'Invoice PDF', onPress: () => generateInvoicePDF(s, company).catch((e) => Alert.alert('Error', e?.message)) },
                      ]);
                    }}>
                      <Card style={{ marginBottom: 8 }}>
                        <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                          <View style={{ flex: 1 }}>
                            <Text style={{ fontSize: 14, fontWeight: '700', color: theme.colors.text }}>{s.saleNumber}</Text>
                            <Text style={{ fontSize: 11, color: theme.colors.textSecondary, marginTop: 2 }}>{s.items.length} items • {s.paymentMethod} {s.customerName ? `• ${s.customerName}` : ''}</Text>
                          </View>
                          <Text style={{ fontSize: 15, fontWeight: '800', color: theme.colors.primary }}>{formatMYR(s.total)}</Text>
                        </View>
                      </Card>
                    </TouchableOpacity>
                  ))}
              </ScrollView>
            </View>
          </View>
        </Modal>
      </SafeAreaView>
    </Screen>
  );
}

function Row({ label, value, bold, big, color }: any) {
  const { theme } = useTheme();
  return (
    <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 }}>
      <Text style={{ fontSize: big ? 15 : 13, color: color || theme.colors.textSecondary, fontWeight: bold ? '700' : '500' }}>{label}</Text>
      <Text style={{ fontSize: big ? 18 : 13, color: color || theme.colors.text, fontWeight: bold ? '800' : '600' }}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  cartBar: { flexDirection: 'row', alignItems: 'center', padding: 16, borderTopWidth: 1, gap: 12 },
  qtyBtn: { width: 32, height: 32, borderRadius: 8, backgroundColor: '#DBEAFE', alignItems: 'center', justifyContent: 'center' },
  chip: { paddingHorizontal: 14, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
});
