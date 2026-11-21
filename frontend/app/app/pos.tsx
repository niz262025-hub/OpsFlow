import React, { useMemo, useRef, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, TextInput } from 'react-native';
import { useRouter } from 'expo-router';
import { useData, type Sale } from '@/src/contexts/DataContext';
import { BizFlowButton, BizFlowDashboardShell, BizFlowKpiCard, BizFlowSectionCard, BizFlowStatusChip, BizFlowTable } from '@/src/components/designSystem';
import { formatMYR } from '@/src/utils/currency';

const modules = [
  { key: 'dashboard', label: 'Dashboard', icon: 'dashboard' as const, path: '/app' },
  { key: 'pos', label: 'POS', icon: 'point-of-sale' as const, path: '/app/pos' },
  { key: 'purchase', label: 'Purchase', icon: 'shopping-cart' as const, path: '/app/purchase' },
  { key: 'inventory', label: 'Inventory', icon: 'inventory-2' as const, path: '/app/inventory' },
  { key: 'layout', label: 'Layout', icon: 'view-quilt' as const, path: '/app/layout' },
  { key: 'finance', label: 'Finance', icon: 'account-balance-wallet' as const, path: '/app/finance' },
  { key: 'reports', label: 'Reports', icon: 'bar-chart' as const, path: '/app/reports' },
  { key: 'setup', label: 'Setup', icon: 'settings' as const, path: '/app/setup' },
];

export default function CustomerPos() {
  const router = useRouter();
  const { products, sales, createSale, refundSale } = useData();
  const busyRef = useRef(false);
  const [busy, setBusy] = useState(false);
  const [refundReason, setRefundReason] = useState('');
  const [search, setSearch] = useState('');
  const [cart, setCart] = useState<Record<string, { product: any; quantity: number }>>({});
  const [paymentMethod, setPaymentMethod] = useState<'Cash' | 'QR' | 'Bank Transfer'>('Cash');
  const [statusMessage, setStatusMessage] = useState('');
  const [completedSale, setCompletedSale] = useState<Sale | null>(null);

  const activeProducts = useMemo(() => products.filter((product) => product.status === 'active'), [products]);
  const filteredProducts = useMemo(() => activeProducts.filter((product) => `${product.name} ${product.sku}`.toLowerCase().includes(search.toLowerCase())), [activeProducts, search]);
  const cartItems = Object.values(cart);
  const subtotal = cartItems.reduce((sum, item) => sum + item.product.sellingPrice * item.quantity, 0);
  const tax = subtotal * 0.06;
  const total = subtotal + tax;

  const addToCart = (product: any) => {
    if (busyRef.current) return;
    setCart((current) => {
      const existing = current[product.id];
      return { ...current, [product.id]: { product, quantity: (existing?.quantity || 0) + 1 } };
    });
    setStatusMessage(`${product.name} added to the cart.`);
  };

  const removeItem = (productId: string) => {
    setCart((current) => {
      const next = { ...current };
      delete next[productId];
      return next;
    });
  };

  const handleCheckout = async () => {
    if (!cartItems.length) {
      setStatusMessage('Add at least one product before checkout.');
      return;
    }
    if (busyRef.current) return;
    busyRef.current = true; setBusy(true);
    try {
      const sale = await createSale({
        items: cartItems.map((item) => ({ productId: item.product.id, productName: item.product.name, sku: item.product.sku, quantity: item.quantity, unitPrice: item.product.sellingPrice, costPrice: item.product.costPrice, total: item.product.sellingPrice * item.quantity })),
        discount: 0,
        tax,
        paymentMethod,
      });
      setCompletedSale(sale);
      setCart({});
      setStatusMessage(`Checkout complete via ${paymentMethod}.`);
    } catch (error) {
      setStatusMessage(error instanceof Error ? error.message : 'Checkout failed. Please try again.');
    } finally { busyRef.current = false; setBusy(false); }
  };

  const handleRefund = async (sale: Sale) => {
    if (busyRef.current) return;
    busyRef.current = true; setBusy(true);
    try {
      const reference = await refundSale(sale.id, refundReason);
      setCompletedSale({ ...sale, status: 'REFUNDED', refundReference: reference });
      setRefundReason('');
      setStatusMessage(`Refund recorded: ${reference}. Stock and ledger reversed.`);
    } catch (error) {
      setStatusMessage(error instanceof Error ? error.message : 'Refund could not be recorded.');
    } finally { busyRef.current = false; setBusy(false); }
  };

  return (
    <BizFlowDashboardShell
      sidebarItems={modules}
      activeKey="pos"
      onNavigate={(item) => (item.path === '/app' ? router.replace('/app' as never) : router.push(item.path as never))}
      title="POS"
      subtitle="Fast checkout, real-time stock awareness"
      searchValue={search}
      onSearchChange={setSearch}
      profileName="Merchant"
      profileRole="Sales"
      avatarLabel="M"
    >
      <View style={styles.content}>
        <View style={styles.kpiGrid}>
          <BizFlowKpiCard label="Products ready" value={`${activeProducts.length}`} detail="Available for sale" />
          <BizFlowKpiCard label="Cart subtotal" value={formatMYR(subtotal)} detail="Before tax" />
          <BizFlowKpiCard label="Tax" value={formatMYR(tax)} detail="Included in checkout" tone="warning" />
          <BizFlowKpiCard label="Estimated total" value={formatMYR(total)} detail="Ready for payment" tone="success" />
        </View>

        <View style={styles.grid}>
          <BizFlowSectionCard title="Product grid" subtitle="Tap an item to add it to the cart" style={styles.card}>
            <View style={styles.productGrid}>
              {filteredProducts.map((product) => (
                <TouchableOpacity key={product.id} style={styles.productTile} onPress={() => addToCart(product)}>
                  <Text style={styles.productName}>{product.name}</Text>
                  <Text style={styles.productMeta}>{product.sku}</Text>
                  <Text style={styles.productPrice}>{formatMYR(product.sellingPrice)}</Text>
                  <Text style={styles.productStock}>Stock: {product.stock}</Text>
                </TouchableOpacity>
              ))}
              {filteredProducts.length === 0 && <Text style={styles.emptyText}>No products match your search.</Text>}
            </View>
          </BizFlowSectionCard>

          <BizFlowSectionCard title="Cart & checkout" subtitle="Payment ready" style={styles.card}>
            <View style={styles.cartSummary}>
              <BizFlowTable columns={[{ key: 'item', label: 'Item' }, { key: 'qty', label: 'Qty' }, { key: 'amount', label: 'Amount' }]} rows={cartItems.map((item) => ({ item: item.product.name, qty: `${item.quantity}`, amount: formatMYR(item.product.sellingPrice * item.quantity) }))} />
              <View style={styles.paymentRow}>
                {(['Cash', 'QR', 'Bank Transfer'] as const).map((method) => (
                  <BizFlowButton key={method} title={method} variant={paymentMethod === method ? 'primary' : 'secondary'} onPress={() => setPaymentMethod(method)} />
                ))}
              </View>
              <View style={styles.summaryRow}><Text style={styles.summaryLabel}>Subtotal</Text><Text style={styles.summaryValue}>{formatMYR(subtotal)}</Text></View>
              <View style={styles.summaryRow}><Text style={styles.summaryLabel}>Tax</Text><Text style={styles.summaryValue}>{formatMYR(tax)}</Text></View>
              <View style={styles.summaryRow}><Text style={styles.summaryLabel}>Total</Text><Text style={styles.summaryValue}>{formatMYR(total)}</Text></View>
              {statusMessage ? <Text style={styles.statusText}>{statusMessage}</Text> : null}
              <View style={styles.actionsRow}>
                <BizFlowButton disabled={busy} title={busy ? "Saving…" : "Checkout"} onPress={handleCheckout} />
                <BizFlowButton disabled={busy} title="Clear cart" variant="secondary" onPress={() => setCart({})} />
              </View>
            </View>
          </BizFlowSectionCard>
        </View>

        <BizFlowSectionCard title="Sales & refunds" subtitle="Full returns only. Return the customer's payment separately before recording a refund." style={styles.fullCard}>
          <TextInput accessibilityLabel="Refund reason" placeholder="Refund reason" value={refundReason} onChangeText={setRefundReason} maxLength={200} style={styles.refundInput} />
          <BizFlowTable columns={[{ key: 'reference', label: 'Receipt' }, { key: 'amount', label: 'Total' }, { key: 'action', label: 'Refund' }]} rows={sales.slice(0, 20).map(sale => ({ reference: sale.saleNumber, amount: formatMYR(sale.total), action: sale.status === 'REFUNDED' ? <BizFlowStatusChip label="Refunded" tone="warning" /> : <BizFlowButton title={`Record refund ${sale.saleNumber}`} disabled={busy} variant="secondary" onPress={() => handleRefund(sale)} /> }))} />
        </BizFlowSectionCard>

        <BizFlowSectionCard title="Receipt preview" subtitle="Sales and stock updates are saved to your company" style={styles.fullCard}>
          <View style={styles.receiptCard}>
            <Text style={styles.receiptTitle}>OpsFlow Receipt</Text>
            {completedSale ? <>
              <Text style={styles.receiptBody}>Reference: {completedSale.saleNumber}</Text>
              <Text style={styles.receiptBody}>Paid via {completedSale.paymentMethod}</Text>
              {completedSale.items.map((item) => <Text key={item.productId} style={styles.receiptBody}>{item.productName} × {item.quantity}: {formatMYR(item.total)}</Text>)}
              <Text style={styles.receiptBody}>Subtotal: {formatMYR(completedSale.subtotal)}</Text>
              <Text style={styles.receiptBody}>Tax: {formatMYR(completedSale.tax)}</Text>
              <Text style={styles.receiptBody}>Total paid: {formatMYR(completedSale.total)}</Text>
              <BizFlowStatusChip label={completedSale.status === 'REFUNDED' ? 'Refunded' : 'Payment complete'} tone={completedSale.status === 'REFUNDED' ? 'warning' : 'success'} />
            </> : <>
              <Text style={styles.receiptBody}>Order prepared for {paymentMethod}</Text>
              <Text style={styles.receiptBody}>Items: {cartItems.length || 0}</Text>
              <Text style={styles.receiptBody}>Total due: {formatMYR(total)}</Text>
              <BizFlowStatusChip label={cartItems.length ? 'Order preview' : 'Awaiting order'} tone={cartItems.length ? 'success' : 'warning'} />
            </>}
          </View>
        </BizFlowSectionCard>
      </View>
    </BizFlowDashboardShell>
  );
}

const styles = StyleSheet.create({
  content: { gap: 16 },
  refundInput: { borderWidth: 1, borderColor: '#E2E8F0', borderRadius: 10, padding: 12, marginBottom: 12, color: '#0F172A' },
  kpiGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 16 },
  card: { flex: 1, minWidth: 320 },
  fullCard: { minWidth: 280 },
  productGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  productTile: { width: '48%', padding: 12, borderRadius: 14, borderWidth: 1, borderColor: '#E2E8F0', backgroundColor: '#F8FAFC' },
  productName: { fontSize: 14, fontWeight: '700', color: '#0F172A', fontFamily: 'Inter' },
  productMeta: { fontSize: 12, color: '#64748B', marginTop: 4, fontFamily: 'Inter' },
  productPrice: { fontSize: 14, fontWeight: '700', color: '#2563EB', marginTop: 8, fontFamily: 'Inter' },
  productStock: { fontSize: 12, color: '#64748B', marginTop: 4, fontFamily: 'Inter' },
  cartSummary: { gap: 12 },
  paymentRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  summaryRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  summaryLabel: { fontSize: 13, color: '#64748B', fontFamily: 'Inter' },
  summaryValue: { fontSize: 13, fontWeight: '700', color: '#0F172A', fontFamily: 'Inter' },
  statusText: { fontSize: 13, color: '#2563EB', fontFamily: 'Inter' },
  actionsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  receiptCard: { borderRadius: 16, padding: 16, backgroundColor: '#F8FAFC', borderWidth: 1, borderColor: '#E2E8F0' },
  receiptTitle: { fontSize: 16, fontWeight: '700', color: '#0F172A', fontFamily: 'Inter' },
  receiptBody: { fontSize: 13, color: '#64748B', marginTop: 6, fontFamily: 'Inter' },
  emptyText: { fontSize: 13, color: '#64748B', fontFamily: 'Inter' },
});
