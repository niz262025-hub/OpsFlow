import React, { useMemo, useState } from 'react';
import { View, Text, TextInput, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { Picker } from '@react-native-picker/picker';
import { purchaseLines } from '@/src/utils/purchaseValidation';
import { useData, type PurchaseOrderItem } from '@/src/contexts/DataContext';
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

export default function CustomerPurchase() {
  const router = useRouter();
  const { purchaseOrders, suppliers, products, goodsReceipts, createPurchaseOrder, receiveGoods } = useData();
  const [search, setSearch] = useState('');
  const [supplierName, setSupplierName] = useState('');
  const [productId, setProductId] = useState('');
  const [quantity, setQuantity] = useState('1');
  const [unitCost, setUnitCost] = useState('0');
  const [orderItems, setOrderItems] = useState<Omit<PurchaseOrderItem, 'receivedQuantity'>[]>([]);
  const [selectedOrderId, setSelectedOrderId] = useState('');
  const [received, setReceived] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const selectedOrder = purchaseOrders.find(order => order.id === selectedOrderId);
  const addItem = () => {
    const product = products.find(row => row.id === productId);
    if (!product) { setMessage('Select a product. Add products in Inventory first.'); return; }
    try {
      if (!quantity.trim() || !unitCost.trim()) throw new Error('Enter quantity and unit cost.');
      setOrderItems(purchaseLines([...orderItems, { productId: product.id, productName: product.name, sku: product.sku, quantity: Number(quantity), unitCost: Number(unitCost), total: 0 }]));
      setMessage('Item added to the order.');
    } catch (error) { setMessage(error instanceof Error ? error.message : 'Could not add item.'); }
  };
  const saveOrder = async () => {
    if (busy) return;
    if (!supplierName.trim()) { setMessage('Enter a supplier name.'); return; }
    setBusy(true);
    try {
      const order = await createPurchaseOrder({ supplierName: supplierName.trim(), status: 'Sent', items: purchaseLines(orderItems) });
      setOrderItems([]); setSupplierName(''); setMessage(`Purchase order ${order.orderNumber} saved.`);
    } catch (error) { setMessage(error instanceof Error ? error.message : 'Could not save order.'); }
    finally { setBusy(false); }
  };
  const saveReceipt = async () => {
    if (busy || !selectedOrder) return;
    setBusy(true);
    try {
      const items = selectedOrder.items.filter(item => Number(received[item.productId] || 0) !== 0).map(item => ({ productId: item.productId, productName: item.productName, sku: item.sku, orderedQuantity: item.quantity, receivedQuantity: Number(received[item.productId]), unitCost: item.unitCost, total: Math.round(Number(received[item.productId]) * item.unitCost * 100) / 100 }));
      const receipt = await receiveGoods({ purchaseOrderId: selectedOrder.id, items });
      setSelectedOrderId(''); setReceived({}); setMessage(`Goods receipt ${receipt.receiptNumber} saved. Stock updates may take a few seconds to appear.`);
    } catch (error) { setMessage(error instanceof Error ? error.message : 'Could not receive goods.'); }
    finally { setBusy(false); }
  };
  const [filter, setFilter] = useState<'All' | 'Draft' | 'Sent' | 'Partially Received' | 'Fully Received' | 'Closed'>('All');

  const filteredOrders = useMemo(() => {
    return purchaseOrders.filter((order) => {
      const matchesText = `${order.orderNumber} ${order.supplierName ?? ''}`.toLowerCase().includes(search.toLowerCase());
      const matchesFilter = filter === 'All' || order.status === filter;
      return matchesText && matchesFilter;
    }).sort((a, b) => Number(b.total || 0) - Number(a.total || 0));
  }, [filter, purchaseOrders, search]);

  const totals = useMemo(() => ({
    open: purchaseOrders.filter((order) => order.status !== 'Fully Received' && order.status !== 'Closed').length,
    received: purchaseOrders.filter((order) => order.status === 'Fully Received').length,
    spend: purchaseOrders.reduce((sum, order) => sum + (order.total || 0), 0),
  }), [purchaseOrders]);

  return (
    <BizFlowDashboardShell
      sidebarItems={modules}
      activeKey="purchase"
      onNavigate={(item) => (item.path === '/app' ? router.replace('/app' as never) : router.push(item.path as never))}
      title="Purchase"
      subtitle="Vendor orders and incoming stock"
      searchValue={search}
      onSearchChange={setSearch}
      profileName="Procurement"
      profileRole="Operations"
      avatarLabel="P"
    >
      <View style={styles.content}>
        <View style={styles.kpiGrid}>
          <BizFlowKpiCard label="Open orders" value={`${totals.open}`} detail="Awaiting fulfilment" />
          <BizFlowKpiCard label="Fully received" value={`${totals.received}`} detail="Completed deliveries" tone="success" />
          <BizFlowKpiCard label="Supplier count" value={`${suppliers.length}`} detail="Active vendors" />
          <BizFlowKpiCard label="Spend" value={formatMYR(totals.spend)} detail="Purchase value" tone="warning" />
        </View>

        <BizFlowSectionCard title="Create purchase order" subtitle="Add products, confirm quantities and save the supplier order">
          <View style={styles.form}>
            <Text>Supplier name</Text>
            <TextInput accessibilityLabel="Supplier name" value={supplierName} onChangeText={setSupplierName} style={styles.input} />
            <Text>Product</Text>
            <Picker accessibilityLabel="Purchase product" selectedValue={productId} onValueChange={value => { setProductId(value); const product = products.find(row => row.id === value); if (product) setUnitCost(String(product.costPrice)); }}>
              <Picker.Item label="Select a product" value="" />
              {products.filter(product => product.status === 'active').map(product => <Picker.Item key={product.id} label={`${product.name} (${product.sku})`} value={product.id} />)}
            </Picker>
            <Text>Quantity</Text>
            <TextInput accessibilityLabel="Order quantity" value={quantity} onChangeText={setQuantity} keyboardType="decimal-pad" style={styles.input} />
            <Text>Unit cost (RM)</Text>
            <TextInput accessibilityLabel="Order unit cost" value={unitCost} onChangeText={setUnitCost} keyboardType="decimal-pad" style={styles.input} />
            <BizFlowButton title="Add order item" onPress={addItem} disabled={busy} variant="secondary" />
            {orderItems.map(item => <View key={item.productId} style={styles.itemRow}><Text>{item.productName} · {item.quantity} × {formatMYR(item.unitCost)} = {formatMYR(item.total)}</Text><BizFlowButton title={`Remove ${item.productName}`} variant="ghost" disabled={busy} onPress={() => setOrderItems(current => current.filter(row => row.productId !== item.productId))} /></View>)}
            <BizFlowButton title={busy ? 'Saving…' : 'Save purchase order'} disabled={busy || !orderItems.length} onPress={saveOrder} />
          </View>
        </BizFlowSectionCard>
        {!!message && <Text accessibilityRole="alert">{message}</Text>}
        {selectedOrder && <BizFlowSectionCard title={`Receive ${selectedOrder.orderNumber}`} subtitle="Enter quantities received now; zero leaves a line pending">
          <View style={styles.form}>
            {selectedOrder.items.filter(item => item.quantity > (item.receivedQuantity || 0)).map(item => <View key={item.productId}><Text>{item.productName} · outstanding {item.quantity - (item.receivedQuantity || 0)}</Text><TextInput accessibilityLabel={`Receive quantity ${item.productName}`} keyboardType="decimal-pad" style={styles.input} value={received[item.productId] || '0'} onChangeText={value => setReceived(current => ({ ...current, [item.productId]: value }))} /></View>)}
            <BizFlowButton title={busy ? 'Saving…' : 'Save goods receipt'} disabled={busy} onPress={saveReceipt} />
            <BizFlowButton title="Cancel receipt" disabled={busy} variant="secondary" onPress={() => setSelectedOrderId('')} />
          </View>
        </BizFlowSectionCard>}
        <BizFlowSectionCard title="Order control" subtitle="Filter and review replenishment flow" action={<BizFlowButton title="Open suppliers" variant="secondary" onPress={() => router.push('/app/setup' as never)} />}>
          <View style={styles.filterRow}>
            {(['All', 'Draft', 'Sent', 'Partially Received', 'Fully Received', 'Closed'] as const).map((option) => (
              <BizFlowButton key={option} title={option} variant={filter === option ? 'primary' : 'secondary'} onPress={() => setFilter(option)} />
            ))}
          </View>
          <BizFlowTable columns={[{ key: 'order', label: 'Order' }, { key: 'supplier', label: 'Supplier' }, { key: 'status', label: 'Status' }, { key: 'amount', label: 'Amount' }, { key: 'action', label: 'Action' }]} rows={filteredOrders.map((order) => ({ order: order.orderNumber, supplier: order.supplierName || '—', status: <BizFlowStatusChip label={order.status} tone={order.status === 'Fully Received' ? 'success' : order.status === 'Closed' ? 'neutral' : 'warning'} />, amount: formatMYR(order.total), action: !['Fully Received', 'Closed'].includes(order.status) ? <BizFlowButton title={`Receive ${order.orderNumber}`} disabled={busy} variant="secondary" onPress={() => { setSelectedOrderId(order.id); setReceived({}); setMessage(''); }} /> : 'Complete' }))} />
        </BizFlowSectionCard>
        <BizFlowSectionCard title="Goods receipts" subtitle="Saved stock receipt audit trail">
          <BizFlowTable columns={[{ key: 'receipt', label: 'Receipt' }, { key: 'amount', label: 'Value' }]} rows={goodsReceipts.map(receipt => ({ receipt: receipt.receiptNumber, amount: formatMYR(receipt.totalAmount) }))} />
        </BizFlowSectionCard>
      </View>
    </BizFlowDashboardShell>
  );
}

const styles = StyleSheet.create({
  form: { gap: 10 },
  input: { padding: 12, borderWidth: 1, borderColor: '#CBD5E1', borderRadius: 8, backgroundColor: '#FFFFFF', color: '#071B49' },
  itemRow: { gap: 6, paddingVertical: 8 },
  content: { gap: 16 },
  kpiGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  filterRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 12 },
});
