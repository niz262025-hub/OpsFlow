import React, { useEffect, useMemo, useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, Modal, Alert, KeyboardAvoidingView, Platform, TextInput } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { MaterialIcons } from '@expo/vector-icons';
import { useTheme } from '@/src/contexts/ThemeContext';
import { useData, BankAccount, GoodsReceipt, Product, PurchaseOrder, PurchaseOrderItem, SupplierInvoiceItem } from '@/src/contexts/DataContext';
import { formatMYR } from '@/src/utils/currency';
import { Badge, Button, Card, EmptyState, Header, Input, Screen, SearchBar } from '@/src/components/UI';

type PurchaseModule = 'orders' | 'receipts' | 'invoices' | 'payments';

function safeParseDate(value: any): Date | null {
  if (!value) return null;
  if (typeof value === 'string' && value.trim() === '') return null;

  try {
    if (typeof value?.toDate === 'function') {
      const date = value.toDate();
      return Number.isNaN(date.getTime()) ? null : date;
    }

    const date = value instanceof Date ? value : new Date(value);
    return Number.isNaN(date.getTime()) ? null : date;
  } catch {
    return null;
  }
}

function safeFormatDate(value: any) {
  const date = safeParseDate(value);
  return date ? date.toLocaleDateString() : '-';
}

export default function Purchases() {
  const { theme } = useTheme();
  const router = useRouter();
  const {
    products,
    suppliers,
    purchaseOrders,
    goodsReceipts,
    supplierInvoices,
    payments,
    bankAccounts,
    createPurchaseOrder,
    deletePurchaseOrder,
    receiveGoods,
    createSupplierInvoice,
    createPayment,
  } = useData();
  const [module, setModule] = useState<PurchaseModule>('orders');
  const [orderModal, setOrderModal] = useState(false);
  const [receiptModal, setReceiptModal] = useState(false);
  const [invoiceModal, setInvoiceModal] = useState(false);
  const [paymentModal, setPaymentModal] = useState(false);

  const [orderSupplierId, setOrderSupplierId] = useState<string>('');
  const [orderStatus, setOrderStatus] = useState<PurchaseOrder['status']>('Draft');
  const [orderDeliveryDate, setOrderDeliveryDate] = useState('');
  const [orderNotes, setOrderNotes] = useState('');
  const [orderItems, setOrderItems] = useState<PurchaseOrderItem[]>([]);
  const [orderSearch, setOrderSearch] = useState('');
  const [orderSaving, setOrderSaving] = useState(false);

  const [receiptOrderId, setReceiptOrderId] = useState<string>('');
  const [receiptInvoiceNo, setReceiptInvoiceNo] = useState('');
  const [receiptDoNo, setReceiptDoNo] = useState('');
  const [receiptNotes, setReceiptNotes] = useState('');
  const [receiptItems, setReceiptItems] = useState<PurchaseOrderItem[]>([]);
  const [receiptSaving, setReceiptSaving] = useState(false);
  const [receiptError, setReceiptError] = useState<string | null>(null);
  const [receiptSuccess, setReceiptSuccess] = useState<string | null>(null);

  const [invoiceNumber, setInvoiceNumber] = useState('');
  const [invoiceSupplierId, setInvoiceSupplierId] = useState('');
  const [invoiceDate, setInvoiceDate] = useState('');
  const [invoiceDueDate, setInvoiceDueDate] = useState('');
  const [invoiceSubtotal, setInvoiceSubtotal] = useState('');
  const [invoiceTax, setInvoiceTax] = useState('');
  const [invoiceNotes, setInvoiceNotes] = useState('');
  const [invoiceGoodsReceiptId, setInvoiceGoodsReceiptId] = useState('');
  const [invoiceItems, setInvoiceItems] = useState<SupplierInvoiceItem[]>([]);
  const [invoiceSaving, setInvoiceSaving] = useState(false);

  const [paymentInvoiceId, setPaymentInvoiceId] = useState('');
  const [paymentAmount, setPaymentAmount] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<'cash' | 'bank'>('cash');
  const [paymentBankAccountId, setPaymentBankAccountId] = useState('');
  const [paymentReference, setPaymentReference] = useState('');
  const [paymentNotes, setPaymentNotes] = useState('');
  const [paymentSaving, setPaymentSaving] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');
  const [supplierFilter, setSupplierFilter] = useState('All');
  const [page, setPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(10);

  const filteredProducts = useMemo(() => {
    const term = orderSearch.trim().toLowerCase();
    if (!term) return products;
    return products.filter((product) => `${product.name} ${product.sku} ${product.barcode || ''}`.toLowerCase().includes(term));
  }, [products, orderSearch]);

  const orderStatuses = ['All', 'Draft', 'Sent', 'Partial', 'Received', 'Closed', 'Cancelled'];
  const invoiceStatuses = ['All', 'Unpaid', 'Partial', 'Paid', 'Overdue'];

  const normalizeStatus = (status?: string) => {
    if (!status) return 'Draft';
    if (status === 'Partially Received') return 'Partial';
    if (status === 'Fully Received') return 'Received';
    return status;
  };

  const matchesDateRange = (value?: any) => {
    const dateValue = safeParseDate(value);
    if (!dateValue) return true;

    const from = safeParseDate(fromDate);
    const to = safeParseDate(toDate);
    if (from && dateValue < from) return false;
    if (to && dateValue > to) return false;
    return true;
  };

  const filteredOrders = useMemo(() => purchaseOrders.filter((order) => {
    const haystack = `${order.orderNumber} ${order.supplierName || ''}`.toLowerCase();
    const matchesSearch = !searchTerm || haystack.includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'All' || normalizeStatus(order.status) === statusFilter;
    const matchesSupplier = supplierFilter === 'All' || order.supplierId === supplierFilter;
    return matchesSearch && matchesStatus && matchesSupplier && matchesDateRange(order.expectedDeliveryDate);
  }), [purchaseOrders, searchTerm, statusFilter, supplierFilter, fromDate, toDate]);

  const filteredReceipts = useMemo(() => goodsReceipts.filter((receipt) => {
    const haystack = `${receipt.receiptNumber} ${receipt.purchaseOrderId || ''} ${receipt.supplierName || ''} ${receipt.supplierInvoiceNumber || ''}`.toLowerCase();
    const matchesSearch = !searchTerm || haystack.includes(searchTerm.toLowerCase());
    const matchesSupplier = supplierFilter === 'All' || receipt.supplierId === supplierFilter;
    return matchesSearch && matchesSupplier && matchesDateRange(receipt.createdAt);
  }), [goodsReceipts, searchTerm, supplierFilter, fromDate, toDate]);

  const filteredInvoices = useMemo(() => supplierInvoices.filter((invoice) => {
    const haystack = `${invoice.invoiceNumber} ${invoice.supplierName || ''} ${invoice.purchaseOrderId || ''}`.toLowerCase();
    const matchesSearch = !searchTerm || haystack.includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'All' || invoice.status === statusFilter;
    const matchesSupplier = supplierFilter === 'All' || invoice.supplierId === supplierFilter;
    return matchesSearch && matchesStatus && matchesSupplier && matchesDateRange(invoice.invoiceDate);
  }), [supplierInvoices, searchTerm, statusFilter, supplierFilter, fromDate, toDate]);

  const filteredPayments = useMemo(() => payments.filter((payment) => {
    const invoice = supplierInvoices.find((entry) => entry.id === payment.invoiceId);
    const haystack = `${payment.reference || ''} ${invoice?.invoiceNumber || ''} ${invoice?.supplierName || ''}`.toLowerCase();
    const matchesSearch = !searchTerm || haystack.includes(searchTerm.toLowerCase());
    const matchesSupplier = supplierFilter === 'All' || invoice?.supplierId === supplierFilter;
    return matchesSearch && matchesSupplier && matchesDateRange(payment.createdAt);
  }), [payments, supplierInvoices, searchTerm, supplierFilter, fromDate, toDate]);

  const pageCount = (items: number) => Math.max(1, Math.ceil(items / rowsPerPage));
  const pagedOrders = useMemo(() => filteredOrders.slice((page - 1) * rowsPerPage, page * rowsPerPage), [filteredOrders, page, rowsPerPage]);
  const pagedReceipts = useMemo(() => filteredReceipts.slice((page - 1) * rowsPerPage, page * rowsPerPage), [filteredReceipts, page, rowsPerPage]);
  const pagedInvoices = useMemo(() => filteredInvoices.slice((page - 1) * rowsPerPage, page * rowsPerPage), [filteredInvoices, page, rowsPerPage]);
  const pagedPayments = useMemo(() => filteredPayments.slice((page - 1) * rowsPerPage, page * rowsPerPage), [filteredPayments, page, rowsPerPage]);

  useEffect(() => {
    setPage(1);
  }, [module, searchTerm, fromDate, toDate, statusFilter, supplierFilter, rowsPerPage]);

  const addOrderItem = (product: Product) => {
    setOrderItems((current) => {
      const existing = current.find((item) => item.productId === product.id);
      if (existing) return current;
      return [...current, { productId: product.id, productName: product.name, sku: product.sku, quantity: 1, unitCost: product.costPrice || 0, total: product.costPrice || 0, receivedQuantity: 0 }];
    });
    setOrderSearch('');
  };

  const updateOrderItem = (productId: string, patch: Partial<PurchaseOrderItem>) => {
    setOrderItems((current) => current.map((item) => (item.productId === productId ? { ...item, ...patch, total: (patch.quantity ?? item.quantity) * (patch.unitCost ?? item.unitCost) } : item)));
  };

  const resetOrderForm = () => {
    setOrderSupplierId('');
    setOrderStatus('Draft');
    setOrderDeliveryDate('');
    setOrderNotes('');
    setOrderItems([]);
    setOrderSearch('');
  };

  const resetReceiptForm = () => {
    setReceiptOrderId('');
    setReceiptInvoiceNo('');
    setReceiptDoNo('');
    setReceiptNotes('');
    setReceiptItems([]);
    setReceiptError(null);
    setReceiptSuccess(null);
  };

  const resetInvoiceForm = () => {
    setInvoiceNumber('');
    setInvoiceSupplierId('');
    setInvoiceDate('');
    setInvoiceDueDate('');
    setInvoiceSubtotal('');
    setInvoiceTax('');
    setInvoiceNotes('');
    setInvoiceGoodsReceiptId('');
    setInvoiceItems([]);
  };

  const resetPaymentForm = () => {
    setPaymentInvoiceId('');
    setPaymentAmount('');
    setPaymentMethod('cash');
    setPaymentBankAccountId('');
    setPaymentReference('');
    setPaymentNotes('');
  };

  const openReceiptModal = (order?: PurchaseOrder) => {
    setReceiptOrderId(order?.id || '');
    setReceiptItems((order?.items || []).map((item) => ({ ...item, receivedQuantity: 0, total: 0 })));
    setReceiptError(null);
    setReceiptSuccess(null);
    setReceiptModal(true);
  };

  const openInvoiceModal = (receipt?: GoodsReceipt) => {
    if (!receipt) {
      resetInvoiceForm();
      setInvoiceModal(true);
      return;
    }
    setInvoiceGoodsReceiptId(receipt.id);
    setInvoiceSupplierId(receipt.supplierId || '');
    setInvoiceNumber(receipt.supplierInvoiceNumber || '');
    setInvoiceItems((receipt.items || []).map((item) => ({
      productId: item.productId,
      productName: item.productName,
      sku: item.sku,
      quantity: item.receivedQuantity,
      unitCost: item.unitCost,
      total: item.total,
    })));
    setInvoiceSubtotal(String(receipt.totalAmount || 0));
    setInvoiceTax('0');
    setInvoiceNotes(`Linked to ${receipt.receiptNumber}`);
    setInvoiceModal(true);
  };

  const handleDeletePurchaseOrder = async (order: PurchaseOrder) => {
    const allowed = ['Draft', 'Sent'].includes(order.status);
    if (!allowed) {
      Alert.alert('Cannot delete', 'Only Draft or Sent purchase orders can be deleted.');
      return;
    }

    try {
      await deletePurchaseOrder(order.id);
      Alert.alert('Success', 'Purchase order deleted successfully.');
    } catch (error: any) {
      throw error;
      Alert.alert('Delete failed', error?.message || 'Could not delete purchase order');
    }
  };

  const submitOrder = async () => {
    if (!orderSupplierId) return Alert.alert('Supplier required', 'Choose a supplier before saving the purchase order.');
    if (orderItems.length === 0) return Alert.alert('No items', 'Add at least one product to the purchase order.');
    setOrderSaving(true);
    try {
      const supplier = suppliers.find((entry) => entry.id === orderSupplierId);
      await createPurchaseOrder({
        supplierId: supplier?.id,
        supplierName: supplier?.name,
        status: orderStatus,
        expectedDeliveryDate: orderDeliveryDate.trim() || undefined,
        notes: orderNotes.trim() || undefined,
        items: orderItems.map((item) => ({ productId: item.productId, productName: item.productName, sku: item.sku, quantity: item.quantity, unitCost: item.unitCost, total: item.total })),
      });
      setOrderModal(false);
      resetOrderForm();
      Alert.alert('Success', 'Purchase order saved. Inventory will only update after goods are received.');
    } catch (error: any) {
      Alert.alert('Failed', error?.message || 'Could not save purchase order');
    } finally {
      setOrderSaving(false);
    }
  };

  const submitReceipt = async () => {
    const selectedOrder = purchaseOrders.find((order) => order.id === receiptOrderId);
    if (!selectedOrder) {
      setReceiptError('Select a purchase order before saving.');
      return;
    }
    if (!selectedOrder.supplierId && !selectedOrder.supplierName) {
      setReceiptError('The selected purchase order must have a supplier before goods can be received.');
      return;
    }
    if (!receiptItems.length) {
      setReceiptError('Add at least one received item before saving.');
      return;
    }

    const hasPositiveQty = receiptItems.some((item) => Number(item.receivedQuantity || 0) > 0);
    if (!hasPositiveQty) {
      setReceiptError('Enter at least one received quantity greater than zero.');
      return;
    }

    const invalidItem = receiptItems.find((item) => Number(item.receivedQuantity || 0) > item.quantity);
    if (invalidItem) {
      setReceiptError(`Received quantity cannot exceed the ordered quantity for ${invalidItem.productName}.`);
      return;
    }

    setReceiptSaving(true);
    setReceiptError(null);
    setReceiptSuccess(null);
    try {
      await receiveGoods({
        purchaseOrderId: receiptOrderId,
        supplierInvoiceNumber: receiptInvoiceNo.trim(),
        deliveryOrderNumber: receiptDoNo.trim() || undefined,
        notes: receiptNotes.trim() || undefined,
        items: receiptItems.map((item) => ({
          productId: item.productId,
          productName: item.productName,
          sku: item.sku,
          orderedQuantity: item.quantity,
          receivedQuantity: Number(item.receivedQuantity || 0),
          unitCost: item.unitCost,
          total: Number(item.receivedQuantity || 0) * item.unitCost,
        })),
      });
      setReceiptSuccess('Goods receipt saved successfully. Inventory and stock movements were updated.');
      Alert.alert('Success', 'Goods received and inventory updated.');
    } catch (error: any) {
      const message = error?.message || 'Could not save goods receipt';
      setReceiptError(message);
      Alert.alert('Failed', message);
    } finally {
      setReceiptSaving(false);
    }
  };

  const submitInvoice = async () => {
    if (!invoiceNumber.trim()) return Alert.alert('Invoice number required', 'Enter the supplier invoice number.');
    if (!invoiceSupplierId) return Alert.alert('Supplier required', 'Choose a supplier for the invoice.');
    const subtotal = parseFloat(invoiceSubtotal) || 0;
    const tax = parseFloat(invoiceTax) || 0;
    const total = subtotal + tax;
    setInvoiceSaving(true);
    try {
      const supplier = suppliers.find((entry) => entry.id === invoiceSupplierId);
      await createSupplierInvoice({
        goodsReceiptId: invoiceGoodsReceiptId || undefined,
        supplierId: supplier?.id,
        supplierName: supplier?.name,
        invoiceNumber: invoiceNumber.trim(),
        invoiceDate: invoiceDate ? new Date(invoiceDate) : undefined,
        dueDate: invoiceDueDate ? new Date(invoiceDueDate) : undefined,
        subtotal,
        tax,
        total,
        items: invoiceItems,
        notes: invoiceNotes.trim() || undefined,
      });
      setInvoiceModal(false);
      resetInvoiceForm();
      Alert.alert('Success', 'Supplier invoice saved.');
    } catch (error: any) {
      Alert.alert('Failed', error?.message || 'Could not save supplier invoice');
    } finally {
      setInvoiceSaving(false);
    }
  };

  const submitPayment = async () => {
    if (!paymentInvoiceId) return Alert.alert('Invoice required', 'Choose a supplier invoice to pay.');
    const amount = parseFloat(paymentAmount) || 0;
    if (amount <= 0) return Alert.alert('Invalid amount', 'Payment amount must be greater than zero.');
    if (paymentMethod === 'bank' && !paymentBankAccountId) return Alert.alert('Bank account required', 'Choose a bank account for this payment.');
    setPaymentSaving(true);
    try {
      await createPayment({
        invoiceId: paymentInvoiceId,
        amount,
        paymentMethod,
        bankAccountId: paymentMethod === 'bank' ? paymentBankAccountId : undefined,
        reference: paymentReference.trim() || undefined,
        notes: paymentNotes.trim() || undefined,
      });
      setPaymentModal(false);
      resetPaymentForm();
      Alert.alert('Success', 'Payment recorded and invoice balance updated.');
    } catch (error: any) {
      Alert.alert('Failed', error?.message || 'Could not save payment');
    } finally {
      setPaymentSaving(false);
    }
  };

  return (
    <Screen>
      <SafeAreaView style={{ flex: 1 }} edges={['top', 'bottom']}>
        <Header title="Purchase" subtitle="Procurement" onBack={() => router.back()} right={<TouchableOpacity onPress={() => {
          if (module === 'orders') setOrderModal(true);
          else if (module === 'receipts') setReceiptModal(true);
          else if (module === 'invoices') setInvoiceModal(true);
          else setPaymentModal(true);
        }} style={{ width: 40, height: 40, borderRadius: 10, backgroundColor: theme.colors.primary, alignItems: 'center', justifyContent: 'center' }} testID="new-purchase-button"><MaterialIcons name="add" size={22} color="#FFF" /></TouchableOpacity>} />

        <View style={{ paddingHorizontal: 16, paddingTop: 12, paddingBottom: 8 }}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
            <TabChip label="Purchase Orders" active={module === 'orders'} onPress={() => setModule('orders')} />
            <TabChip label="Goods Receipt" active={module === 'receipts'} onPress={() => setModule('receipts')} />
            <TabChip label="Supplier Invoices" active={module === 'invoices'} onPress={() => setModule('invoices')} />
            <TabChip label="Payments" active={module === 'payments'} onPress={() => setModule('payments')} />
          </ScrollView>
        </View>

        <View style={{ paddingHorizontal: 16, paddingBottom: 10 }}>
          <View style={{ flexDirection: 'row', gap: 8, marginBottom: 8 }}>
            <View style={{ flex: 1 }}>
              <TextInput
                value={searchTerm}
                onChangeText={setSearchTerm}
                placeholder="Search PO, supplier, invoice…"
                style={[styles.searchInput, { color: theme.colors.text, borderColor: theme.colors.border, backgroundColor: theme.colors.background }]}
              />
            </View>
            <TouchableOpacity onPress={() => setPage(1)} style={[styles.filterButton, { backgroundColor: theme.colors.primary }]}> 
              <Text style={{ color: '#FFF', fontSize: 13, fontWeight: '700' }}>Filter</Text>
            </TouchableOpacity>
          </View>
          <View style={styles.filterGrid}>
            <View style={styles.filterField}>
              <Text style={styles.filterLabel}>From Date</Text>
              <TextInput value={fromDate} onChangeText={setFromDate} placeholder="YYYY-MM-DD" style={[styles.filterInput, { color: theme.colors.text, borderColor: theme.colors.border, backgroundColor: theme.colors.background }]} />
            </View>
            <View style={styles.filterField}>
              <Text style={styles.filterLabel}>To Date</Text>
              <TextInput value={toDate} onChangeText={setToDate} placeholder="YYYY-MM-DD" style={[styles.filterInput, { color: theme.colors.text, borderColor: theme.colors.border, backgroundColor: theme.colors.background }]} />
            </View>
            <View style={styles.filterField}>
              <Text style={styles.filterLabel}>Status</Text>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
                {(module === 'orders' ? orderStatuses : invoiceStatuses).map((value) => (
                  <TouchableOpacity key={value} onPress={() => setStatusFilter(value)} style={{ paddingHorizontal: 10, paddingVertical: 6, borderRadius: 999, backgroundColor: statusFilter === value ? theme.colors.primary : theme.colors.cardMuted }}>
                    <Text style={{ color: statusFilter === value ? '#FFF' : theme.colors.text, fontSize: 12, fontWeight: '700' }}>{value}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
            <View style={styles.filterField}>
              <Text style={styles.filterLabel}>Supplier</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 6 }}>
                <TouchableOpacity onPress={() => setSupplierFilter('All')} style={{ paddingHorizontal: 10, paddingVertical: 6, borderRadius: 999, backgroundColor: supplierFilter === 'All' ? theme.colors.primary : theme.colors.cardMuted }}>
                  <Text style={{ color: supplierFilter === 'All' ? '#FFF' : theme.colors.text, fontSize: 12, fontWeight: '700' }}>All</Text>
                </TouchableOpacity>
                {suppliers.map((supplier) => (
                  <TouchableOpacity key={supplier.id} onPress={() => setSupplierFilter(supplier.id)} style={{ paddingHorizontal: 10, paddingVertical: 6, borderRadius: 999, backgroundColor: supplierFilter === supplier.id ? theme.colors.primary : theme.colors.cardMuted }}>
                    <Text style={{ color: supplierFilter === supplier.id ? '#FFF' : theme.colors.text, fontSize: 12, fontWeight: '700' }}>{supplier.name}</Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>
          </View>
        </View>

        {module === 'orders' && (
          <View style={{ flex: 1, paddingHorizontal: 16, paddingBottom: 16 }}>
            <View style={styles.tableCard}>
              <View style={styles.tableHeader}>
                <Text style={[styles.tableHeaderCell, { flex: 1.1 }]}>PO No</Text>
                <Text style={[styles.tableHeaderCell, { flex: 1.2 }]}>Supplier</Text>
                <Text style={[styles.tableHeaderCell, { flex: 0.9 }]}>PO Date</Text>
                <Text style={[styles.tableHeaderCell, { flex: 1 }]}>Expected Delivery</Text>
                <Text style={[styles.tableHeaderCell, { flex: 0.8 }]}>Status</Text>
                <Text style={[styles.tableHeaderCell, { flex: 0.9, textAlign: 'right' }]}>Total</Text>
                <Text style={[styles.tableHeaderCell, { flex: 0.9, textAlign: 'right' }]}>Actions</Text>
              </View>
              {filteredOrders.length === 0 ? (
                <View style={styles.emptyTableRow}><Text style={{ color: theme.colors.textSecondary }}>No purchase orders match the current filters.</Text></View>
              ) : pagedOrders.map((order) => (
                <View key={order.id} style={styles.tableRow}>
                  <Text style={[styles.tableCell, { flex: 1.1, fontWeight: '700' }]}>{order.orderNumber}</Text>
                  <Text style={[styles.tableCell, { flex: 1.2 }]}>{order.supplierName || '—'}</Text>
                  <Text style={[styles.tableCell, { flex: 0.9 }]}>{safeFormatDate(order.createdAt)}</Text>
                  <Text style={[styles.tableCell, { flex: 1 }]}>{safeFormatDate(order.expectedDeliveryDate)}</Text>
                  <View style={{ flex: 0.8, alignItems: 'flex-start' }}>
                    <Badge label={normalizeStatus(order.status)} tone={order.status === 'Closed' || order.status === 'Fully Received' ? 'success' : 'default'} />
                  </View>
                  <Text style={[styles.tableCell, { flex: 0.9, textAlign: 'right', fontWeight: '700', color: theme.colors.primary }]}>{formatMYR(order.total)}</Text>
                  <View style={{ flex: 0.9, flexDirection: 'row', justifyContent: 'flex-end', gap: 6 }}>
                    <TouchableOpacity onPress={() => Alert.alert('Order', `${order.orderNumber}\n${order.supplierName || 'Supplier'}\n${formatMYR(order.total)}`)}><MaterialIcons name="visibility" size={18} color={theme.colors.primary} /></TouchableOpacity>
                    <TouchableOpacity onPress={() => Alert.alert('Edit', 'Edit flow is handled in the full purchase workflow.')}><MaterialIcons name="edit" size={18} color={theme.colors.primary} /></TouchableOpacity>
                    <TouchableOpacity onPress={() => void handleDeletePurchaseOrder(order)}><MaterialIcons name="delete" size={18} color="#DC2626" /></TouchableOpacity>
                  </View>
                </View>
              ))}
            </View>
            <View style={styles.footerBar}>
              <Text style={{ fontSize: 12, color: theme.colors.textSecondary }}>Showing {filteredOrders.length ? ((page - 1) * rowsPerPage) + 1 : 0} to {Math.min(page * rowsPerPage, filteredOrders.length)} of {filteredOrders.length} records</Text>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                  <Text style={{ fontSize: 12, color: theme.colors.textSecondary }}>Rows</Text>
                  {[10, 25, 50].map((size) => (
                    <TouchableOpacity key={size} onPress={() => setRowsPerPage(size)} style={{ paddingHorizontal: 8, paddingVertical: 4, borderRadius: 999, backgroundColor: rowsPerPage === size ? theme.colors.primary : theme.colors.cardMuted }}>
                      <Text style={{ color: rowsPerPage === size ? '#FFF' : theme.colors.text, fontSize: 12, fontWeight: '700' }}>{size}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
                <TouchableOpacity disabled={page === 1} onPress={() => setPage((value) => Math.max(1, value - 1))} style={[styles.paginationButton, page === 1 && styles.paginationButtonDisabled]}><MaterialIcons name="chevron-left" size={18} color={page === 1 ? theme.colors.textSecondary : theme.colors.primary} /></TouchableOpacity>
                <TouchableOpacity disabled={page >= pageCount(filteredOrders.length)} onPress={() => setPage((value) => Math.min(pageCount(filteredOrders.length), value + 1))} style={[styles.paginationButton, page >= pageCount(filteredOrders.length) && styles.paginationButtonDisabled]}><MaterialIcons name="chevron-right" size={18} color={page >= pageCount(filteredOrders.length) ? theme.colors.textSecondary : theme.colors.primary} /></TouchableOpacity>
              </View>
            </View>
          </View>
        )}

        {module === 'receipts' && (
          <View style={{ flex: 1, paddingHorizontal: 16, paddingBottom: 16 }}>
            <View style={styles.tableCard}>
              <View style={styles.tableHeader}>
                <Text style={[styles.tableHeaderCell, { flex: 1.1 }]}>GR No</Text>
                <Text style={[styles.tableHeaderCell, { flex: 0.9 }]}>PO No</Text>
                <Text style={[styles.tableHeaderCell, { flex: 1.1 }]}>Supplier</Text>
                <Text style={[styles.tableHeaderCell, { flex: 1 }]}>Invoice No</Text>
                <Text style={[styles.tableHeaderCell, { flex: 0.9 }]}>Receipt Date</Text>
                <Text style={[styles.tableHeaderCell, { flex: 0.8 }]}>Status</Text>
                <Text style={[styles.tableHeaderCell, { flex: 0.8, textAlign: 'right' }]}>Total</Text>
                <Text style={[styles.tableHeaderCell, { flex: 0.8, textAlign: 'right' }]}>Actions</Text>
              </View>
              {filteredReceipts.length === 0 ? <View style={styles.emptyTableRow}><Text style={{ color: theme.colors.textSecondary }}>No goods receipts found.</Text></View> : pagedReceipts.map((receipt) => (
                <View key={receipt.id} style={styles.tableRow}>
                  <Text style={[styles.tableCell, { flex: 1.1, fontWeight: '700' }]}>{receipt.receiptNumber}</Text>
                  <Text style={[styles.tableCell, { flex: 0.9 }]}>{receipt.purchaseOrderId || '—'}</Text>
                  <Text style={[styles.tableCell, { flex: 1.1 }]}>{receipt.supplierName || '—'}</Text>
                  <Text style={[styles.tableCell, { flex: 1 }]}>{receipt.supplierInvoiceNumber || '—'}</Text>
                  <Text style={[styles.tableCell, { flex: 0.9 }]}>{safeFormatDate(receipt.createdAt)}</Text>
                  <View style={{ flex: 0.8, alignItems: 'flex-start' }}><Badge label="Received" tone="success" /></View>
                  <Text style={[styles.tableCell, { flex: 0.8, textAlign: 'right', fontWeight: '700', color: theme.colors.primary }]}>{formatMYR(receipt.totalAmount)}</Text>
                  <View style={{ flex: 0.8, flexDirection: 'row', justifyContent: 'flex-end', gap: 6 }}>
                    <TouchableOpacity onPress={() => openInvoiceModal(receipt)}><MaterialIcons name="visibility" size={18} color={theme.colors.primary} /></TouchableOpacity>
                    <TouchableOpacity onPress={() => openInvoiceModal(receipt)}><MaterialIcons name="edit" size={18} color={theme.colors.primary} /></TouchableOpacity>
                  </View>
                </View>
              ))}
            </View>
            <View style={styles.footerBar}>
              <Text style={{ fontSize: 12, color: theme.colors.textSecondary }}>Showing {filteredReceipts.length ? ((page - 1) * rowsPerPage) + 1 : 0} to {Math.min(page * rowsPerPage, filteredReceipts.length)} of {filteredReceipts.length} records</Text>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <TouchableOpacity disabled={page === 1} onPress={() => setPage((value) => Math.max(1, value - 1))} style={[styles.paginationButton, page === 1 && styles.paginationButtonDisabled]}><MaterialIcons name="chevron-left" size={18} color={page === 1 ? theme.colors.textSecondary : theme.colors.primary} /></TouchableOpacity>
                <TouchableOpacity disabled={page >= pageCount(filteredReceipts.length)} onPress={() => setPage((value) => Math.min(pageCount(filteredReceipts.length), value + 1))} style={[styles.paginationButton, page >= pageCount(filteredReceipts.length) && styles.paginationButtonDisabled]}><MaterialIcons name="chevron-right" size={18} color={page >= pageCount(filteredReceipts.length) ? theme.colors.textSecondary : theme.colors.primary} /></TouchableOpacity>
              </View>
            </View>
          </View>
        )}

        {module === 'invoices' && (
          <View style={{ flex: 1, paddingHorizontal: 16, paddingBottom: 16 }}>
            <View style={styles.tableCard}>
              <View style={styles.tableHeader}>
                <Text style={[styles.tableHeaderCell, { flex: 1.1 }]}>Invoice No</Text>
                <Text style={[styles.tableHeaderCell, { flex: 1.1 }]}>Supplier</Text>
                <Text style={[styles.tableHeaderCell, { flex: 0.9 }]}>PO No</Text>
                <Text style={[styles.tableHeaderCell, { flex: 0.9 }]}>Invoice Date</Text>
                <Text style={[styles.tableHeaderCell, { flex: 0.9 }]}>Due Date</Text>
                <Text style={[styles.tableHeaderCell, { flex: 0.8, textAlign: 'right' }]}>Amount</Text>
                <Text style={[styles.tableHeaderCell, { flex: 0.8 }]}>Status</Text>
                <Text style={[styles.tableHeaderCell, { flex: 0.8, textAlign: 'right' }]}>Actions</Text>
              </View>
              {filteredInvoices.length === 0 ? <View style={styles.emptyTableRow}><Text style={{ color: theme.colors.textSecondary }}>No supplier invoices match the current filters.</Text></View> : pagedInvoices.map((invoice) => (
                <View key={invoice.id} style={styles.tableRow}>
                  <Text style={[styles.tableCell, { flex: 1.1, fontWeight: '700' }]}>{invoice.invoiceNumber}</Text>
                  <Text style={[styles.tableCell, { flex: 1.1 }]}>{invoice.supplierName || '—'}</Text>
                  <Text style={[styles.tableCell, { flex: 0.9 }]}>{invoice.purchaseOrderId || '—'}</Text>
                  <Text style={[styles.tableCell, { flex: 0.9 }]}>{safeFormatDate(invoice.invoiceDate)}</Text>
                  <Text style={[styles.tableCell, { flex: 0.9 }]}>{safeFormatDate(invoice.dueDate)}</Text>
                  <Text style={[styles.tableCell, { flex: 0.8, textAlign: 'right', fontWeight: '700', color: theme.colors.primary }]}>{formatMYR(invoice.total)}</Text>
                  <View style={{ flex: 0.8, alignItems: 'flex-start' }}><Badge label={invoice.status} tone={invoice.status === 'Paid' ? 'success' : invoice.status === 'Overdue' ? 'default' : 'default'} /></View>
                  <View style={{ flex: 0.8, flexDirection: 'row', justifyContent: 'flex-end', gap: 6 }}>
                    <TouchableOpacity onPress={() => Alert.alert('Invoice', `${invoice.invoiceNumber}\n${invoice.supplierName || 'Supplier'}`)}><MaterialIcons name="visibility" size={18} color={theme.colors.primary} /></TouchableOpacity>
                    <TouchableOpacity onPress={() => openInvoiceModal(goodsReceipts.find((receipt) => receipt.id === invoice.goodsReceiptId))}><MaterialIcons name="edit" size={18} color={theme.colors.primary} /></TouchableOpacity>
                  </View>
                </View>
              ))}
            </View>
            <View style={styles.footerBar}>
              <Text style={{ fontSize: 12, color: theme.colors.textSecondary }}>Showing {filteredInvoices.length ? ((page - 1) * rowsPerPage) + 1 : 0} to {Math.min(page * rowsPerPage, filteredInvoices.length)} of {filteredInvoices.length} records</Text>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <TouchableOpacity disabled={page === 1} onPress={() => setPage((value) => Math.max(1, value - 1))} style={[styles.paginationButton, page === 1 && styles.paginationButtonDisabled]}><MaterialIcons name="chevron-left" size={18} color={page === 1 ? theme.colors.textSecondary : theme.colors.primary} /></TouchableOpacity>
                <TouchableOpacity disabled={page >= pageCount(filteredInvoices.length)} onPress={() => setPage((value) => Math.min(pageCount(filteredInvoices.length), value + 1))} style={[styles.paginationButton, page >= pageCount(filteredInvoices.length) && styles.paginationButtonDisabled]}><MaterialIcons name="chevron-right" size={18} color={page >= pageCount(filteredInvoices.length) ? theme.colors.textSecondary : theme.colors.primary} /></TouchableOpacity>
              </View>
            </View>
          </View>
        )}

        {module === 'payments' && (
          <View style={{ flex: 1, paddingHorizontal: 16, paddingBottom: 16 }}>
            <View style={styles.tableCard}>
              <View style={styles.tableHeader}>
                <Text style={[styles.tableHeaderCell, { flex: 1.1 }]}>Payment No</Text>
                <Text style={[styles.tableHeaderCell, { flex: 1.1 }]}>Supplier</Text>
                <Text style={[styles.tableHeaderCell, { flex: 0.9 }]}>Invoice No</Text>
                <Text style={[styles.tableHeaderCell, { flex: 0.9 }]}>Payment Date</Text>
                <Text style={[styles.tableHeaderCell, { flex: 0.9 }]}>Payment Method</Text>
                <Text style={[styles.tableHeaderCell, { flex: 0.8, textAlign: 'right' }]}>Amount</Text>
                <Text style={[styles.tableHeaderCell, { flex: 0.8 }]}>Status</Text>
              </View>
              {filteredPayments.length === 0 ? <View style={styles.emptyTableRow}><Text style={{ color: theme.colors.textSecondary }}>No payments found.</Text></View> : pagedPayments.map((payment) => {
                const invoice = supplierInvoices.find((entry) => entry.id === payment.invoiceId);
                return (
                  <View key={payment.id} style={styles.tableRow}>
                    <Text style={[styles.tableCell, { flex: 1.1, fontWeight: '700' }]}>{payment.reference || 'PAYMENT'}</Text>
                    <Text style={[styles.tableCell, { flex: 1.1 }]}>{invoice?.supplierName || '—'}</Text>
                    <Text style={[styles.tableCell, { flex: 0.9 }]}>{invoice?.invoiceNumber || '—'}</Text>
                    <Text style={[styles.tableCell, { flex: 0.9 }]}>{safeFormatDate(payment.createdAt)}</Text>
                    <Text style={[styles.tableCell, { flex: 0.9 }]}>{payment.paymentMethod === 'bank' ? 'Bank' : 'Cash'}</Text>
                    <Text style={[styles.tableCell, { flex: 0.8, textAlign: 'right', fontWeight: '700', color: theme.colors.primary }]}>{formatMYR(payment.amount)}</Text>
                    <View style={{ flex: 0.8, alignItems: 'flex-start' }}><Badge label="Recorded" tone="success" /></View>
                  </View>
                );
              })}
            </View>
            <View style={styles.footerBar}>
              <Text style={{ fontSize: 12, color: theme.colors.textSecondary }}>Showing {filteredPayments.length ? ((page - 1) * rowsPerPage) + 1 : 0} to {Math.min(page * rowsPerPage, filteredPayments.length)} of {filteredPayments.length} records</Text>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <TouchableOpacity disabled={page === 1} onPress={() => setPage((value) => Math.max(1, value - 1))} style={[styles.paginationButton, page === 1 && styles.paginationButtonDisabled]}><MaterialIcons name="chevron-left" size={18} color={page === 1 ? theme.colors.textSecondary : theme.colors.primary} /></TouchableOpacity>
                <TouchableOpacity disabled={page >= pageCount(filteredPayments.length)} onPress={() => setPage((value) => Math.min(pageCount(filteredPayments.length), value + 1))} style={[styles.paginationButton, page >= pageCount(filteredPayments.length) && styles.paginationButtonDisabled]}><MaterialIcons name="chevron-right" size={18} color={page >= pageCount(filteredPayments.length) ? theme.colors.textSecondary : theme.colors.primary} /></TouchableOpacity>
              </View>
            </View>
          </View>
        )}

        <Modal visible={orderModal} transparent animationType="slide" onRequestClose={() => setOrderModal(false)}>
          <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1, backgroundColor: theme.colors.overlay, justifyContent: 'flex-end' }}>
            <View style={{ backgroundColor: theme.colors.background, borderTopLeftRadius: 24, borderTopRightRadius: 24, maxHeight: '92%' }}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 20 }}>
                <Text style={{ fontSize: 20, fontWeight: '800', color: theme.colors.text }}>Create Purchase Order</Text>
                <TouchableOpacity onPress={() => setOrderModal(false)}><MaterialIcons name="close" size={26} color={theme.colors.text} /></TouchableOpacity>
              </View>
              <ScrollView contentContainerStyle={{ padding: 20, paddingTop: 0, paddingBottom: 40 }} showsVerticalScrollIndicator>
                <Text style={{ fontSize: 13, fontWeight: '700', color: theme.colors.text, marginBottom: 8 }}>Supplier</Text>
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 12 }}>
                  {suppliers.map((supplier) => (
                    <TouchableOpacity key={supplier.id} onPress={() => setOrderSupplierId(supplier.id)} style={{ paddingHorizontal: 12, paddingVertical: 8, borderRadius: 999, backgroundColor: orderSupplierId === supplier.id ? theme.colors.primary : theme.colors.cardMuted }}>
                      <Text style={{ color: orderSupplierId === supplier.id ? '#FFF' : theme.colors.text, fontWeight: '600', fontSize: 12 }}>{supplier.name}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
                <Input label="Expected Delivery Date" value={orderDeliveryDate} onChangeText={setOrderDeliveryDate} placeholder="YYYY-MM-DD" />
                <Text style={{ fontSize: 13, fontWeight: '700', color: theme.colors.text, marginBottom: 8 }}>Status</Text>
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 12 }}>
                  {(['Draft', 'Sent', 'Partially Received', 'Fully Received', 'Closed'] as PurchaseOrder['status'][]).map((status) => (
                    <TouchableOpacity key={status} onPress={() => setOrderStatus(status)} style={{ paddingHorizontal: 12, paddingVertical: 8, borderRadius: 999, backgroundColor: orderStatus === status ? theme.colors.primary : theme.colors.cardMuted }}>
                      <Text style={{ color: orderStatus === status ? '#FFF' : theme.colors.text, fontWeight: '600', fontSize: 12 }}>{status}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
                <SearchBar value={orderSearch} onChangeText={setOrderSearch} placeholder="Search products" />
                {orderSearch.trim() && filteredProducts.slice(0, 8).map((product) => (
                  <TouchableOpacity key={product.id} onPress={() => addOrderItem(product)} style={[styles.searchItem, { backgroundColor: theme.colors.card, borderColor: theme.colors.border }]}> 
                    <View style={{ flex: 1 }}>
                      <Text style={{ fontSize: 14, fontWeight: '600', color: theme.colors.text }}>{product.name}</Text>
                      <Text style={{ fontSize: 11, color: theme.colors.textSecondary }}>{product.sku}</Text>
                    </View>
                    <MaterialIcons name="add" size={18} color={theme.colors.primary} />
                  </TouchableOpacity>
                ))}
                {orderItems.length > 0 && orderItems.map((item) => (
                  <Card key={item.productId} style={{ marginBottom: 8 }}>
                    <Text style={{ fontSize: 14, fontWeight: '700', color: theme.colors.text }}>{item.productName}</Text>
                    <View style={{ flexDirection: 'row', gap: 8, marginTop: 8 }}>
                      <View style={{ flex: 1 }}><Input label="Qty" value={String(item.quantity)} onChangeText={(value) => updateOrderItem(item.productId, { quantity: Number(value) || 0 })} keyboardType="number-pad" /></View>
                      <View style={{ flex: 1 }}><Input label="Unit Cost" value={String(item.unitCost)} onChangeText={(value) => updateOrderItem(item.productId, { unitCost: Number(value) || 0 })} keyboardType="decimal-pad" prefix="RM" /></View>
                    </View>
                  </Card>
                ))}
                <Input label="Notes" value={orderNotes} onChangeText={setOrderNotes} multiline placeholder="Optional" />
                <Button title="Save Purchase Order" onPress={submitOrder} loading={orderSaving} fullWidth icon="check" />
              </ScrollView>
            </View>
          </KeyboardAvoidingView>
        </Modal>

        <Modal visible={receiptModal} transparent animationType="slide" onRequestClose={() => setReceiptModal(false)}>
          <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1, backgroundColor: theme.colors.overlay, justifyContent: 'flex-end' }}>
            <View style={{ backgroundColor: theme.colors.background, borderTopLeftRadius: 24, borderTopRightRadius: 24, maxHeight: '92%' }}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 20 }}>
                <Text style={{ fontSize: 20, fontWeight: '800', color: theme.colors.text }}>Goods Receipt</Text>
                <TouchableOpacity onPress={() => setReceiptModal(false)}><MaterialIcons name="close" size={26} color={theme.colors.text} /></TouchableOpacity>
              </View>
              <ScrollView contentContainerStyle={{ padding: 20, paddingTop: 0, paddingBottom: 40 }} showsVerticalScrollIndicator>
                <Text style={{ fontSize: 13, fontWeight: '700', color: theme.colors.text, marginBottom: 8 }}>Purchase Order</Text>
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 12 }}>
                  {purchaseOrders.map((order) => (
                    <TouchableOpacity key={order.id} onPress={() => { setReceiptOrderId(order.id); setReceiptItems(order.items.map((item) => ({ ...item, receivedQuantity: 0, total: 0 }))); }} style={{ paddingHorizontal: 12, paddingVertical: 8, borderRadius: 999, backgroundColor: receiptOrderId === order.id ? theme.colors.primary : theme.colors.cardMuted }}>
                      <Text style={{ color: receiptOrderId === order.id ? '#FFF' : theme.colors.text, fontWeight: '600', fontSize: 12 }}>{order.orderNumber}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
                <Input label="Supplier Invoice No." value={receiptInvoiceNo} onChangeText={setReceiptInvoiceNo} placeholder="Optional" />
                <Input label="Delivery Order No." value={receiptDoNo} onChangeText={setReceiptDoNo} placeholder="Optional" />
                {receiptItems.map((item) => (
                  <Card key={item.productId} style={{ marginBottom: 8 }}>
                    <Text style={{ fontSize: 14, fontWeight: '700', color: theme.colors.text }}>{item.productName}</Text>
                    <Text style={{ fontSize: 12, color: theme.colors.textSecondary, marginTop: 2 }}>Ordered: {item.quantity}</Text>
                    <View style={{ marginTop: 8 }}>
                      <Input label="Received Quantity" value={String(item.receivedQuantity || 0)} onChangeText={(value) => setReceiptItems((current) => current.map((entry) => entry.productId === item.productId ? { ...entry, receivedQuantity: Number(value) || 0 } : entry))} keyboardType="number-pad" />
                    </View>
                  </Card>
                ))}
                <Input label="Notes" value={receiptNotes} onChangeText={setReceiptNotes} multiline placeholder="Optional" />
                {receiptError ? <Text style={styles.feedbackError}>{receiptError}</Text> : null}
                {receiptSuccess ? <Text style={styles.feedbackSuccess}>{receiptSuccess}</Text> : null}
                <Button title="Save Goods Receipt" onPress={() => { void submitReceipt(); }} loading={receiptSaving} fullWidth icon="check" />
              </ScrollView>
            </View>
          </KeyboardAvoidingView>
        </Modal>

        <Modal visible={invoiceModal} transparent animationType="slide" onRequestClose={() => setInvoiceModal(false)}>
          <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1, backgroundColor: theme.colors.overlay, justifyContent: 'flex-end' }}>
            <View style={{ backgroundColor: theme.colors.background, borderTopLeftRadius: 24, borderTopRightRadius: 24, maxHeight: '92%' }}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 20 }}>
                <Text style={{ fontSize: 20, fontWeight: '800', color: theme.colors.text }}>Supplier Invoice</Text>
                <TouchableOpacity onPress={() => setInvoiceModal(false)}><MaterialIcons name="close" size={26} color={theme.colors.text} /></TouchableOpacity>
              </View>
              <ScrollView contentContainerStyle={{ padding: 20, paddingTop: 0, paddingBottom: 40 }} showsVerticalScrollIndicator>
                <Text style={{ fontSize: 13, fontWeight: '700', color: theme.colors.text, marginBottom: 8 }}>Supplier</Text>
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 12 }}>
                  {suppliers.map((supplier) => (
                    <TouchableOpacity key={supplier.id} onPress={() => setInvoiceSupplierId(supplier.id)} style={{ paddingHorizontal: 12, paddingVertical: 8, borderRadius: 999, backgroundColor: invoiceSupplierId === supplier.id ? theme.colors.primary : theme.colors.cardMuted }}>
                      <Text style={{ color: invoiceSupplierId === supplier.id ? '#FFF' : theme.colors.text, fontWeight: '600', fontSize: 12 }}>{supplier.name}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
                {invoiceGoodsReceiptId ? <Card style={{ marginBottom: 12 }}><Text style={{ fontSize: 12, color: theme.colors.textSecondary }}>Linked to goods receipt</Text><Text style={{ fontSize: 14, fontWeight: '700', color: theme.colors.text, marginTop: 4 }}>{goodsReceipts.find((receipt) => receipt.id === invoiceGoodsReceiptId)?.receiptNumber || 'Goods receipt'}</Text></Card> : null}
                <Input label="Invoice Number" value={invoiceNumber} onChangeText={setInvoiceNumber} placeholder="INV-1001" />
                <Input label="Invoice Date" value={invoiceDate} onChangeText={setInvoiceDate} placeholder="YYYY-MM-DD" />
                <Input label="Due Date" value={invoiceDueDate} onChangeText={setInvoiceDueDate} placeholder="YYYY-MM-DD" />
                <Input label="Subtotal" value={invoiceSubtotal} onChangeText={setInvoiceSubtotal} placeholder="0.00" keyboardType="decimal-pad" prefix="RM" />
                <Input label="Tax" value={invoiceTax} onChangeText={setInvoiceTax} placeholder="0.00" keyboardType="decimal-pad" prefix="RM" />
                {invoiceItems.length > 0 && (
                  <Card style={{ marginBottom: 12 }}>
                    <Text style={{ fontSize: 13, fontWeight: '700', color: theme.colors.text, marginBottom: 8 }}>Received Items</Text>
                    {invoiceItems.map((item) => (
                      <View key={`${item.productId || item.productName}-${item.sku}`} style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 }}>
                        <Text style={{ fontSize: 12, color: theme.colors.textSecondary, flex: 1 }}>{item.productName || item.sku || 'Item'}</Text>
                        <Text style={{ fontSize: 12, color: theme.colors.text, fontWeight: '700' }}>{item.quantity || 0} × {formatMYR(item.unitCost || 0)}</Text>
                      </View>
                    ))}
                  </Card>
                )}
                <Input label="Notes" value={invoiceNotes} onChangeText={setInvoiceNotes} multiline placeholder="Optional" />
                <Button title="Save Invoice" onPress={submitInvoice} loading={invoiceSaving} fullWidth icon="check" />
              </ScrollView>
            </View>
          </KeyboardAvoidingView>
        </Modal>

        <Modal visible={paymentModal} transparent animationType="slide" onRequestClose={() => setPaymentModal(false)}>
          <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1, backgroundColor: theme.colors.overlay, justifyContent: 'flex-end' }}>
            <View style={{ backgroundColor: theme.colors.background, borderTopLeftRadius: 24, borderTopRightRadius: 24, maxHeight: '92%' }}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 20 }}>
                <Text style={{ fontSize: 20, fontWeight: '800', color: theme.colors.text }}>Record Payment</Text>
                <TouchableOpacity onPress={() => setPaymentModal(false)}><MaterialIcons name="close" size={26} color={theme.colors.text} /></TouchableOpacity>
              </View>
              <ScrollView contentContainerStyle={{ padding: 20, paddingTop: 0, paddingBottom: 40 }} showsVerticalScrollIndicator>
                <Text style={{ fontSize: 13, fontWeight: '700', color: theme.colors.text, marginBottom: 8 }}>Invoice</Text>
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 12 }}>
                  {supplierInvoices.map((invoice) => (
                    <TouchableOpacity key={invoice.id} onPress={() => { setPaymentInvoiceId(invoice.id); setPaymentAmount(String(invoice.outstandingBalance || invoice.total)); }} style={{ paddingHorizontal: 12, paddingVertical: 8, borderRadius: 999, backgroundColor: paymentInvoiceId === invoice.id ? theme.colors.primary : theme.colors.cardMuted }}>
                      <Text style={{ color: paymentInvoiceId === invoice.id ? '#FFF' : theme.colors.text, fontWeight: '600', fontSize: 12 }}>{invoice.invoiceNumber}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
                <Input label="Amount" value={paymentAmount} onChangeText={setPaymentAmount} placeholder="0.00" keyboardType="decimal-pad" prefix="RM" />
                <Text style={{ fontSize: 13, fontWeight: '700', color: theme.colors.text, marginBottom: 8 }}>Payment Method</Text>
                <View style={{ flexDirection: 'row', gap: 8, marginBottom: 12 }}>
                  <TouchableOpacity onPress={() => setPaymentMethod('cash')} style={{ flex: 1, paddingVertical: 10, borderRadius: 999, backgroundColor: paymentMethod === 'cash' ? theme.colors.primary : theme.colors.cardMuted, alignItems: 'center' }}>
                    <Text style={{ color: paymentMethod === 'cash' ? '#FFF' : theme.colors.text, fontWeight: '700' }}>Cash</Text>
                  </TouchableOpacity>
                  <TouchableOpacity onPress={() => setPaymentMethod('bank')} style={{ flex: 1, paddingVertical: 10, borderRadius: 999, backgroundColor: paymentMethod === 'bank' ? theme.colors.primary : theme.colors.cardMuted, alignItems: 'center' }}>
                    <Text style={{ color: paymentMethod === 'bank' ? '#FFF' : theme.colors.text, fontWeight: '700' }}>Bank</Text>
                  </TouchableOpacity>
                </View>
                {paymentMethod === 'bank' && (
                  <View style={{ marginBottom: 12 }}>
                    <Text style={{ fontSize: 13, fontWeight: '700', color: theme.colors.text, marginBottom: 8 }}>Bank Account</Text>
                    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                      {bankAccounts.map((account: BankAccount) => (
                        <TouchableOpacity key={account.id} onPress={() => setPaymentBankAccountId(account.id)} style={{ paddingHorizontal: 12, paddingVertical: 8, borderRadius: 999, backgroundColor: paymentBankAccountId === account.id ? theme.colors.primary : theme.colors.cardMuted }}>
                          <Text style={{ color: paymentBankAccountId === account.id ? '#FFF' : theme.colors.text, fontWeight: '600', fontSize: 12 }}>{account.bankName}</Text>
                        </TouchableOpacity>
                      ))}
                    </View>
                  </View>
                )}
                <Input label="Reference" value={paymentReference} onChangeText={setPaymentReference} placeholder="Optional" />
                <Input label="Notes" value={paymentNotes} onChangeText={setPaymentNotes} multiline placeholder="Optional" />
                <Button title="Save Payment" onPress={submitPayment} loading={paymentSaving} fullWidth icon="check" />
              </ScrollView>
            </View>
          </KeyboardAvoidingView>
        </Modal>
      </SafeAreaView>
    </Screen>
  );
}

function TabChip({ label, active, onPress }: { label: string; active: boolean; onPress: () => void }) {
  const { theme } = useTheme();
  return (
    <TouchableOpacity onPress={onPress} style={{ paddingHorizontal: 14, height: 36, borderRadius: 18, backgroundColor: active ? theme.colors.primary : theme.colors.cardMuted, alignItems: 'center', justifyContent: 'center' }}>
      <Text style={{ color: active ? '#FFF' : theme.colors.text, fontSize: 13, fontWeight: '700' }}>{label}</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  searchItem: { flexDirection: 'row', alignItems: 'center', padding: 12, borderRadius: 12, borderWidth: 1, marginBottom: 6 },
  searchInput: {
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
  },
  filterButton: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  filterGrid: {
    gap: 10,
  },
  filterField: {
    gap: 6,
  },
  filterLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: '#64748B',
  },
  filterInput: {
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 8,
    fontSize: 13,
  },
  tableCard: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 16,
    overflow: 'hidden',
    backgroundColor: '#FFFFFF',
  },
  tableHeader: {
    flexDirection: 'row',
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: '#EFF6FF',
    borderBottomWidth: 1,
    borderBottomColor: '#DBEAFE',
  },
  tableHeaderCell: {
    fontSize: 11,
    fontWeight: '800',
    color: '#2563EB',
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },
  tableRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  tableCell: {
    fontSize: 12,
    color: '#0F172A',
  },
  emptyTableRow: {
    padding: 20,
    alignItems: 'center',
  },
  footerBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 10,
    gap: 8,
  },
  paginationButton: {
    width: 34,
    height: 34,
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#EFF6FF',
  },
  paginationButtonDisabled: {
    opacity: 0.5,
  },
  feedbackError: {
    marginBottom: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 10,
    backgroundColor: '#FEE2E2',
    color: '#B91C1C',
    fontSize: 12,
    fontWeight: '600',
  },
  feedbackSuccess: {
    marginBottom: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 10,
    backgroundColor: '#D1FAE5',
    color: '#047857',
    fontSize: 12,
    fontWeight: '600',
  },
});
