import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Modal,
  Alert,
  ActivityIndicator,
  TextInput,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '@/src/contexts/AuthContext';
import { theme } from '@/src/constants/theme';
import { MaterialIcons } from '@expo/vector-icons';

const API_URL = process.env.EXPO_PUBLIC_BACKEND_URL;

interface Product {
  id: string;
  name: string;
  sku: string;
  category_name: string;
  selling_price: number;
  stock_quantity: number;
}

interface Sale {
  id: string;
  product_name: string;
  quantity: number;
  unit_price: number;
  total_price: number;
  payment_method: string;
  created_at: string;
}

export default function Sales() {
  const { token } = useAuth();
  const [sales, setSales] = useState<Sale[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalVisible, setModalVisible] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [quantity, setQuantity] = useState('1');
  const [paymentMethod, setPaymentMethod] = useState<'Cash' | 'QR'>('Cash');
  const [searchQuery, setSearchQuery] = useState('');
  const [processing, setProcessing] = useState(false);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [salesRes, productsRes] = await Promise.all([
        fetch(`${API_URL}/api/sales`, {
          headers: { Authorization: `Bearer ${token}` },
        }),
        fetch(`${API_URL}/api/products`, {
          headers: { Authorization: `Bearer ${token}` },
        }),
      ]);

      if (salesRes.ok && productsRes.ok) {
        const salesData = await salesRes.json();
        const productsData = await productsRes.json();
        setSales(salesData);
        setProducts(productsData);
      }
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  const openNewSaleModal = () => {
    setSelectedProduct(null);
    setQuantity('1');
    setPaymentMethod('Cash');
    setSearchQuery('');
    setModalVisible(true);
  };

  const selectProduct = (product: Product) => {
    setSelectedProduct(product);
    setSearchQuery('');
  };

  const calculateTotal = () => {
    if (!selectedProduct) return 0;
    const qty = parseInt(quantity, 10);
    return selectedProduct.selling_price * (isNaN(qty) ? 0 : qty);
  };

  const handleCreateSale = async () => {
    if (!selectedProduct) {
      Alert.alert('Error', 'Please select a product');
      return;
    }

    const qty = parseInt(quantity, 10);
    if (isNaN(qty) || qty <= 0) {
      Alert.alert('Error', 'Please enter a valid quantity');
      return;
    }

    if (qty > selectedProduct.stock_quantity) {
      Alert.alert('Error', `Only ${selectedProduct.stock_quantity} units available in stock`);
      return;
    }

    setProcessing(true);
    try {
      const response = await fetch(`${API_URL}/api/sales`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          product_id: selectedProduct.id,
          quantity: qty,
          payment_method: paymentMethod,
        }),
      });

      if (response.ok) {
        Alert.alert('Success', 'Sale completed successfully!');
        setModalVisible(false);
        fetchData();
      } else {
        const error = await response.json();
        Alert.alert('Error', error.detail || 'Failed to create sale');
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to create sale');
    } finally {
      setProcessing(false);
    }
  };

  const filteredProducts = searchQuery
    ? products.filter(
        (p) =>
          p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
          p.sku.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : products;

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-MY', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  if (loading) {
    return (
      <SafeAreaView style={[styles.container, styles.centerContent]}>
        <ActivityIndicator size="large" color={theme.colors.primary} />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Sales</Text>
        <TouchableOpacity style={styles.addButton} onPress={openNewSaleModal}>
          <MaterialIcons name="add" size={24} color={theme.colors.white} />
        </TouchableOpacity>
      </View>

      {/* Sales List */}
      <ScrollView style={styles.scrollView}>
        {sales.length === 0 ? (
          <View style={styles.emptyState}>
            <MaterialIcons name="shopping-cart" size={64} color={theme.colors.textSecondary} />
            <Text style={styles.emptyText}>No sales yet</Text>
            <TouchableOpacity style={styles.emptyButton} onPress={openNewSaleModal}>
              <Text style={styles.emptyButtonText}>Create Your First Sale</Text>
            </TouchableOpacity>
          </View>
        ) : (
          sales.map((sale) => (
            <View key={sale.id} style={styles.saleCard}>
              <View style={styles.saleHeader}>
                <View style={styles.saleInfo}>
                  <Text style={styles.productName}>{sale.product_name}</Text>
                  <Text style={styles.saleDate}>{formatDate(sale.created_at)}</Text>
                </View>
                <View style={styles.paymentBadge}>
                  <MaterialIcons
                    name={sale.payment_method === 'Cash' ? 'payments' : 'qr-code'}
                    size={16}
                    color={theme.colors.primary}
                  />
                  <Text style={styles.paymentText}>{sale.payment_method}</Text>
                </View>
              </View>
              <View style={styles.saleDetails}>
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Quantity</Text>
                  <Text style={styles.detailValue}>{sale.quantity}</Text>
                </View>
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Unit Price</Text>
                  <Text style={styles.detailValue}>RM {sale.unit_price.toFixed(2)}</Text>
                </View>
                <View style={[styles.detailRow, styles.totalRow]}>
                  <Text style={styles.totalLabel}>Total</Text>
                  <Text style={styles.totalValue}>RM {sale.total_price.toFixed(2)}</Text>
                </View>
              </View>
            </View>
          ))
        )}
      </ScrollView>

      {/* New Sale Modal */}
      <Modal visible={modalVisible} animationType="slide" transparent={true}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>New Sale</Text>
              <TouchableOpacity onPress={() => setModalVisible(false)}>
                <MaterialIcons name="close" size={24} color={theme.colors.text} />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalForm}>
              {/* Product Selection */}
              <Text style={styles.label}>Select Product</Text>
              
              {selectedProduct ? (
                <View style={styles.selectedProductCard}>
                  <View style={styles.selectedProductInfo}>
                    <Text style={styles.selectedProductName}>{selectedProduct.name}</Text>
                    <Text style={styles.selectedProductSku}>SKU: {selectedProduct.sku}</Text>
                    <Text style={styles.selectedProductPrice}>
                      RM {selectedProduct.selling_price.toFixed(2)}
                    </Text>
                    <Text style={styles.stockInfo}>
                      Stock: {selectedProduct.stock_quantity} units
                    </Text>
                  </View>
                  <TouchableOpacity onPress={() => setSelectedProduct(null)}>
                    <MaterialIcons name="cancel" size={24} color={theme.colors.error} />
                  </TouchableOpacity>
                </View>
              ) : (
                <>
                  <View style={styles.searchContainer}>
                    <MaterialIcons name="search" size={20} color={theme.colors.textSecondary} />
                    <TextInput
                      style={styles.searchInput}
                      placeholder="Search products..."
                      value={searchQuery}
                      onChangeText={setSearchQuery}
                      placeholderTextColor={theme.colors.textSecondary}
                    />
                  </View>

                  <View style={styles.productList}>
                    {filteredProducts.length === 0 ? (
                      <Text style={styles.noProductsText}>No products found</Text>
                    ) : (
                      filteredProducts.map((product) => (
                        <TouchableOpacity
                          key={product.id}
                          style={styles.productItem}
                          onPress={() => selectProduct(product)}
                        >
                          <View style={styles.productItemInfo}>
                            <Text style={styles.productItemName}>{product.name}</Text>
                            <Text style={styles.productItemSku}>{product.sku}</Text>
                          </View>
                          <View style={styles.productItemRight}>
                            <Text style={styles.productItemPrice}>
                              RM {product.selling_price.toFixed(2)}
                            </Text>
                            <Text style={styles.productItemStock}>
                              Stock: {product.stock_quantity}
                            </Text>
                          </View>
                        </TouchableOpacity>
                      ))
                    )}
                  </View>
                </>
              )}

              {/* Quantity */}
              {selectedProduct && (
                <>
                  <Text style={styles.label}>Quantity</Text>
                  <TextInput
                    style={styles.input}
                    value={quantity}
                    onChangeText={setQuantity}
                    keyboardType="number-pad"
                    placeholder="1"
                    placeholderTextColor={theme.colors.textSecondary}
                  />

                  {/* Payment Method */}
                  <Text style={styles.label}>Payment Method</Text>
                  <View style={styles.paymentMethods}>
                    <TouchableOpacity
                      style={[
                        styles.paymentMethod,
                        paymentMethod === 'Cash' && styles.paymentMethodSelected,
                      ]}
                      onPress={() => setPaymentMethod('Cash')}
                    >
                      <MaterialIcons
                        name="payments"
                        size={24}
                        color={paymentMethod === 'Cash' ? theme.colors.white : theme.colors.primary}
                      />
                      <Text
                        style={[
                          styles.paymentMethodText,
                          paymentMethod === 'Cash' && styles.paymentMethodTextSelected,
                        ]}
                      >
                        Cash
                      </Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={[
                        styles.paymentMethod,
                        paymentMethod === 'QR' && styles.paymentMethodSelected,
                      ]}
                      onPress={() => setPaymentMethod('QR')}
                    >
                      <MaterialIcons
                        name="qr-code"
                        size={24}
                        color={paymentMethod === 'QR' ? theme.colors.white : theme.colors.primary}
                      />
                      <Text
                        style={[
                          styles.paymentMethodText,
                          paymentMethod === 'QR' && styles.paymentMethodTextSelected,
                        ]}
                      >
                        QR Payment
                      </Text>
                    </TouchableOpacity>
                  </View>

                  {/* Total */}
                  <View style={styles.totalContainer}>
                    <Text style={styles.totalLabelLarge}>Total Amount</Text>
                    <Text style={styles.totalAmountLarge}>RM {calculateTotal().toFixed(2)}</Text>
                  </View>

                  {/* Complete Sale Button */}
                  <TouchableOpacity
                    style={styles.completeButton}
                    onPress={handleCreateSale}
                    disabled={processing}
                  >
                    {processing ? (
                      <ActivityIndicator color={theme.colors.white} />
                    ) : (
                      <Text style={styles.completeButtonText}>Complete Sale</Text>
                    )}
                  </TouchableOpacity>
                </>
              )}
            </ScrollView>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.secondary,
  },
  centerContent: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    backgroundColor: theme.colors.white,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: theme.colors.text,
  },
  addButton: {
    backgroundColor: theme.colors.primary,
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scrollView: {
    flex: 1,
    padding: 16,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
  },
  emptyText: {
    fontSize: 16,
    color: theme.colors.textSecondary,
    marginTop: 16,
    marginBottom: 24,
  },
  emptyButton: {
    backgroundColor: theme.colors.primary,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: theme.borderRadius.md,
  },
  emptyButtonText: {
    color: theme.colors.white,
    fontSize: 14,
    fontWeight: '600',
  },
  saleCard: {
    backgroundColor: theme.colors.white,
    borderRadius: theme.borderRadius.md,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  saleHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  saleInfo: {
    flex: 1,
  },
  productName: {
    fontSize: 16,
    fontWeight: '600',
    color: theme.colors.text,
    marginBottom: 4,
  },
  saleDate: {
    fontSize: 12,
    color: theme.colors.textSecondary,
  },
  paymentBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.primaryLight,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 12,
    gap: 4,
  },
  paymentText: {
    fontSize: 11,
    color: theme.colors.primary,
    fontWeight: '600',
  },
  saleDetails: {
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: theme.colors.border,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  detailLabel: {
    fontSize: 14,
    color: theme.colors.textSecondary,
  },
  detailValue: {
    fontSize: 14,
    fontWeight: '500',
    color: theme.colors.text,
  },
  totalRow: {
    marginTop: 4,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: theme.colors.border,
  },
  totalLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: theme.colors.text,
  },
  totalValue: {
    fontSize: 18,
    fontWeight: 'bold',
    color: theme.colors.primary,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: theme.colors.white,
    borderTopLeftRadius: theme.borderRadius.xl,
    borderTopRightRadius: theme.borderRadius.xl,
    paddingTop: 20,
    height: '90%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    marginBottom: 20,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: theme.colors.text,
  },
  modalForm: {
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: theme.colors.text,
    marginBottom: 8,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.card,
    borderRadius: theme.borderRadius.md,
    paddingHorizontal: 16,
    paddingVertical: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  searchInput: {
    flex: 1,
    marginLeft: 8,
    fontSize: 16,
    color: theme.colors.text,
  },
  productList: {
    maxHeight: 300,
    marginBottom: 16,
  },
  noProductsText: {
    textAlign: 'center',
    color: theme.colors.textSecondary,
    paddingVertical: 20,
  },
  productItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    padding: 12,
    backgroundColor: theme.colors.card,
    borderRadius: theme.borderRadius.md,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  productItemInfo: {
    flex: 1,
  },
  productItemName: {
    fontSize: 14,
    fontWeight: '600',
    color: theme.colors.text,
  },
  productItemSku: {
    fontSize: 12,
    color: theme.colors.textSecondary,
    marginTop: 2,
  },
  productItemRight: {
    alignItems: 'flex-end',
  },
  productItemPrice: {
    fontSize: 14,
    fontWeight: '600',
    color: theme.colors.primary,
  },
  productItemStock: {
    fontSize: 11,
    color: theme.colors.textSecondary,
    marginTop: 2,
  },
  selectedProductCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    backgroundColor: theme.colors.primaryLight,
    borderRadius: theme.borderRadius.md,
    marginBottom: 16,
  },
  selectedProductInfo: {
    flex: 1,
  },
  selectedProductName: {
    fontSize: 16,
    fontWeight: '600',
    color: theme.colors.text,
  },
  selectedProductSku: {
    fontSize: 12,
    color: theme.colors.textSecondary,
    marginTop: 2,
  },
  selectedProductPrice: {
    fontSize: 18,
    fontWeight: 'bold',
    color: theme.colors.primary,
    marginTop: 8,
  },
  stockInfo: {
    fontSize: 12,
    color: theme.colors.textSecondary,
    marginTop: 4,
  },
  input: {
    backgroundColor: theme.colors.card,
    borderRadius: theme.borderRadius.md,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
    color: theme.colors.text,
    borderWidth: 1,
    borderColor: theme.colors.border,
    marginBottom: 16,
  },
  paymentMethods: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 24,
  },
  paymentMethod: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    backgroundColor: theme.colors.card,
    borderRadius: theme.borderRadius.md,
    borderWidth: 2,
    borderColor: theme.colors.border,
    gap: 8,
  },
  paymentMethodSelected: {
    backgroundColor: theme.colors.primary,
    borderColor: theme.colors.primary,
  },
  paymentMethodText: {
    fontSize: 14,
    fontWeight: '600',
    color: theme.colors.text,
  },
  paymentMethodTextSelected: {
    color: theme.colors.white,
  },
  totalContainer: {
    backgroundColor: theme.colors.card,
    padding: 20,
    borderRadius: theme.borderRadius.md,
    alignItems: 'center',
    marginBottom: 24,
  },
  totalLabelLarge: {
    fontSize: 14,
    color: theme.colors.textSecondary,
    marginBottom: 8,
  },
  totalAmountLarge: {
    fontSize: 32,
    fontWeight: 'bold',
    color: theme.colors.primary,
  },
  completeButton: {
    backgroundColor: theme.colors.success,
    borderRadius: theme.borderRadius.md,
    paddingVertical: 16,
    alignItems: 'center',
    marginBottom: 32,
  },
  completeButtonText: {
    color: theme.colors.white,
    fontSize: 16,
    fontWeight: '600',
  },
});
