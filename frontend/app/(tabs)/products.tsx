import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
  Modal,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useData, Product } from '@/src/contexts/DataContext';
import { theme } from '@/src/constants/theme';
import { MaterialIcons } from '@expo/vector-icons';
import Animated, { FadeInDown } from 'react-native-reanimated';

export default function Products() {
  const {
    products,
    categories,
    createProduct,
    updateProduct,
    deleteProduct,
    createCategory,
  } = useData();
  const [searchQuery, setSearchQuery] = useState('');
  const [modalVisible, setModalVisible] = useState(false);
  const [categoryModalVisible, setCategoryModalVisible] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [saving, setSaving] = useState(false);

  // Form states
  const [formName, setFormName] = useState('');
  const [formSku, setFormSku] = useState('');
  const [formBarcode, setFormBarcode] = useState('');
  const [formCategory, setFormCategory] = useState('');
  const [formSellingPrice, setFormSellingPrice] = useState('');
  const [formCostPrice, setFormCostPrice] = useState('');
  const [formStock, setFormStock] = useState('');
  const [formLowStockAlert, setFormLowStockAlert] = useState('');
  const [newCategoryName, setNewCategoryName] = useState('');

  const loading = false;

  const openAddModal = () => {
    setEditingProduct(null);
    setFormName('');
    setFormSku('');
    setFormBarcode('');
    setFormCategory(categories[0]?.id || '');
    setFormSellingPrice('');
    setFormCostPrice('');
    setFormStock('');
    setFormLowStockAlert('');
    setModalVisible(true);
  };

  const openEditModal = (product: Product) => {
    setEditingProduct(product);
    setFormName(product.name);
    setFormSku(product.sku);
    setFormBarcode(product.barcode || '');
    setFormCategory(product.category_id);
    setFormSellingPrice(product.selling_price.toString());
    setFormCostPrice(product.cost_price.toString());
    setFormStock(product.stock_quantity.toString());
    setFormLowStockAlert(product.low_stock_alert?.toString() || '');
    setModalVisible(true);
  };

  const handleSaveProduct = async () => {
    if (!formName.trim() || !formSku.trim() || !formCategory || !formSellingPrice || formStock === '') {
      Alert.alert('Error', 'Please fill in all required fields (Name, SKU, Category, Selling Price, Stock)');
      return;
    }

    const sellingPrice = parseFloat(formSellingPrice);
    const costPrice = formCostPrice ? parseFloat(formCostPrice) : 0;
    const stock = parseInt(formStock, 10);
    const lowStockAlert = formLowStockAlert ? parseInt(formLowStockAlert, 10) : null;

    if (isNaN(sellingPrice) || sellingPrice <= 0) {
      Alert.alert('Error', 'Please enter a valid selling price');
      return;
    }

    if (formCostPrice && (isNaN(costPrice) || costPrice < 0)) {
      Alert.alert('Error', 'Please enter a valid cost price');
      return;
    }

    if (isNaN(stock) || stock < 0) {
      Alert.alert('Error', 'Please enter a valid stock quantity');
      return;
    }

    if (formLowStockAlert && (lowStockAlert === null || isNaN(lowStockAlert) || lowStockAlert < 0)) {
      Alert.alert('Error', 'Please enter a valid low stock alert');
      return;
    }

    setSaving(true);
    try {
      const body: any = {
        name: formName.trim(),
        sku: formSku.trim(),
        barcode: formBarcode.trim(),
        category_id: formCategory,
        selling_price: sellingPrice,
        cost_price: costPrice,
        stock_quantity: stock,
      };

      if (lowStockAlert !== null) {
        body.low_stock_alert = lowStockAlert;
      }

      if (editingProduct) {
        await updateProduct(editingProduct.id, body);
      } else {
        await createProduct(body);
      }

      Alert.alert('Success', `Product ${editingProduct ? 'updated' : 'created'} successfully`);
      setModalVisible(false);
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to save product');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteProduct = (product: Product) => {
    Alert.alert(
      'Delete Product',
      `Are you sure you want to delete "${product.name}"?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteProduct(product.id);
              Alert.alert('Success', 'Product deleted successfully');
            } catch (error: any) {
              Alert.alert('Error', error.message || 'Failed to delete product');
            }
          },
        },
      ]
    );
  };

  const handleAddCategory = async () => {
    if (!newCategoryName.trim()) {
      Alert.alert('Error', 'Please enter a category name');
      return;
    }

    try {
      const newCat = await createCategory(newCategoryName.trim());
      setNewCategoryName('');
      setCategoryModalVisible(false);
      setFormCategory(newCat.id);
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to add category');
    }
  };

  const filteredProducts = searchQuery
    ? products.filter(
        (p) =>
          p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
          p.sku.toLowerCase().includes(searchQuery.toLowerCase()) ||
          (p.barcode && p.barcode.toLowerCase().includes(searchQuery.toLowerCase()))
      )
    : products;

  const isLowStock = (product: Product) => {
    return product.stock_quantity <= (product.low_stock_alert || 10);
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
        <View>
          <Text style={styles.headerTitle}>Products</Text>
          <Text style={styles.headerSubtitle}>{products.length} items in inventory</Text>
        </View>
        <TouchableOpacity
          style={styles.addButton}
          onPress={openAddModal}
          testID="add-product-button"
        >
          <MaterialIcons name="add" size={26} color={theme.colors.white} />
        </TouchableOpacity>
      </View>

      {/* Search Bar */}
      <View style={styles.searchContainer}>
        <MaterialIcons name="search" size={20} color={theme.colors.textSecondary} />
        <TextInput
          style={styles.searchInput}
          placeholder="Search by name, SKU or barcode"
          value={searchQuery}
          onChangeText={setSearchQuery}
          placeholderTextColor={theme.colors.textSecondary}
          testID="product-search-input"
        />
        {searchQuery.length > 0 && (
          <TouchableOpacity onPress={() => setSearchQuery('')}>
            <MaterialIcons name="close" size={20} color={theme.colors.textSecondary} />
          </TouchableOpacity>
        )}
      </View>

      {/* Products List */}
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {filteredProducts.length === 0 ? (
          <View style={styles.emptyState}>
            <MaterialIcons name="inventory-2" size={64} color={theme.colors.textSecondary} />
            <Text style={styles.emptyTitle}>
              {searchQuery ? 'No products found' : 'No products yet'}
            </Text>
            <Text style={styles.emptySubtitle}>
              {searchQuery
                ? 'Try a different search term'
                : 'Add your first product to get started'}
            </Text>
            {!searchQuery && (
              <TouchableOpacity style={styles.emptyButton} onPress={openAddModal}>
                <MaterialIcons name="add" size={20} color={theme.colors.white} />
                <Text style={styles.emptyButtonText}>Add Product</Text>
              </TouchableOpacity>
            )}
          </View>
        ) : (
          filteredProducts.map((product, index) => (
            <Animated.View
              key={product.id}
              entering={FadeInDown.delay(index * 50).duration(300)}
              style={styles.productCard}
            >
              <View style={styles.productHeader}>
                <View style={styles.productInfo}>
                  <Text style={styles.productName}>{product.name}</Text>
                  <View style={styles.productMeta}>
                    <View style={styles.metaItem}>
                      <MaterialIcons name="tag" size={12} color={theme.colors.textSecondary} />
                      <Text style={styles.metaText}>{product.sku}</Text>
                    </View>
                    {product.barcode ? (
                      <View style={styles.metaItem}>
                        <MaterialIcons name="qr-code-2" size={12} color={theme.colors.textSecondary} />
                        <Text style={styles.metaText}>{product.barcode}</Text>
                      </View>
                    ) : null}
                  </View>
                  <View style={styles.categoryBadge}>
                    <Text style={styles.categoryText}>{product.category_name}</Text>
                  </View>
                </View>
                <View style={styles.productActions}>
                  <TouchableOpacity
                    onPress={() => openEditModal(product)}
                    style={styles.actionIconBtn}
                    testID={`edit-product-${product.id}`}
                  >
                    <MaterialIcons name="edit" size={18} color={theme.colors.primary} />
                  </TouchableOpacity>
                  <TouchableOpacity
                    onPress={() => handleDeleteProduct(product)}
                    style={styles.actionIconBtn}
                    testID={`delete-product-${product.id}`}
                  >
                    <MaterialIcons name="delete-outline" size={18} color={theme.colors.error} />
                  </TouchableOpacity>
                </View>
              </View>

              <View style={styles.productDetails}>
                <View style={styles.detailItem}>
                  <Text style={styles.detailLabel}>Sell Price</Text>
                  <Text style={styles.detailValue}>RM {product.selling_price.toFixed(2)}</Text>
                </View>
                <View style={styles.detailDivider} />
                <View style={styles.detailItem}>
                  <Text style={styles.detailLabel}>Cost</Text>
                  <Text style={styles.detailValueSecondary}>
                    RM {product.cost_price?.toFixed(2) || '0.00'}
                  </Text>
                </View>
                <View style={styles.detailDivider} />
                <View style={styles.detailItem}>
                  <Text style={styles.detailLabel}>Stock</Text>
                  <View style={styles.stockContainer}>
                    <Text
                      style={[styles.detailValue, isLowStock(product) && styles.lowStockText]}
                    >
                      {product.stock_quantity}
                    </Text>
                    {isLowStock(product) && (
                      <MaterialIcons name="warning" size={14} color={theme.colors.warning} />
                    )}
                  </View>
                </View>
              </View>

              {isLowStock(product) && (
                <View style={styles.lowStockBanner}>
                  <MaterialIcons name="info" size={14} color={theme.colors.warning} />
                  <Text style={styles.lowStockBannerText}>
                    Low stock alert (below {product.low_stock_alert})
                  </Text>
                </View>
              )}
            </Animated.View>
          ))
        )}

        <View style={styles.bottomSpacing} />
      </ScrollView>

      {/* Add/Edit Product Modal */}
      <Modal visible={modalVisible} animationType="slide" transparent={true}>
        <KeyboardAvoidingView
          style={styles.modalOverlay}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
          <View style={styles.modalContent}>
            <View style={styles.modalHandle} />
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>
                {editingProduct ? 'Edit Product' : 'Add New Product'}
              </Text>
              <TouchableOpacity onPress={() => setModalVisible(false)} style={styles.closeButton}>
                <MaterialIcons name="close" size={22} color={theme.colors.text} />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalForm} showsVerticalScrollIndicator={false}>
              {/* Product Name */}
              <Text style={styles.label}>Product Name *</Text>
              <TextInput
                style={styles.input}
                value={formName}
                onChangeText={setFormName}
                placeholder="e.g. Wireless Mouse"
                placeholderTextColor={theme.colors.textSecondary}
                testID="product-name-input"
              />

              {/* SKU and Barcode Row */}
              <View style={styles.row}>
                <View style={styles.halfInput}>
                  <Text style={styles.label}>SKU *</Text>
                  <TextInput
                    style={styles.input}
                    value={formSku}
                    onChangeText={setFormSku}
                    placeholder="e.g. ELEC001"
                    placeholderTextColor={theme.colors.textSecondary}
                    autoCapitalize="characters"
                    testID="product-sku-input"
                  />
                </View>
                <View style={styles.halfInput}>
                  <Text style={styles.label}>Barcode</Text>
                  <View style={styles.barcodeInputContainer}>
                    <TextInput
                      style={styles.barcodeInput}
                      value={formBarcode}
                      onChangeText={setFormBarcode}
                      placeholder="Optional"
                      placeholderTextColor={theme.colors.textSecondary}
                      keyboardType="numeric"
                      testID="product-barcode-input"
                    />
                    <MaterialIcons name="qr-code-scanner" size={20} color={theme.colors.textSecondary} />
                  </View>
                </View>
              </View>

              {/* Category */}
              <View style={styles.labelRow}>
                <Text style={styles.label}>Category *</Text>
                <TouchableOpacity
                  onPress={() => setCategoryModalVisible(true)}
                  style={styles.addCategoryChip}
                >
                  <MaterialIcons name="add" size={14} color={theme.colors.primary} />
                  <Text style={styles.addCategoryChipText}>Add</Text>
                </TouchableOpacity>
              </View>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.categoryScroll}
                style={styles.categoryScrollWrapper}
              >
                {categories.map((cat) => (
                  <TouchableOpacity
                    key={cat.id}
                    style={[
                      styles.categoryChip,
                      formCategory === cat.id && styles.categoryChipSelected,
                    ]}
                    onPress={() => setFormCategory(cat.id)}
                  >
                    <Text
                      style={[
                        styles.categoryChipText,
                        formCategory === cat.id && styles.categoryChipTextSelected,
                      ]}
                    >
                      {cat.name}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>

              {/* Selling Price and Cost Price */}
              <View style={styles.row}>
                <View style={styles.halfInput}>
                  <Text style={styles.label}>Selling Price *</Text>
                  <View style={styles.currencyInput}>
                    <Text style={styles.currencyPrefix}>RM</Text>
                    <TextInput
                      style={styles.currencyField}
                      value={formSellingPrice}
                      onChangeText={setFormSellingPrice}
                      placeholder="0.00"
                      keyboardType="decimal-pad"
                      placeholderTextColor={theme.colors.textSecondary}
                      testID="product-selling-price-input"
                    />
                  </View>
                </View>
                <View style={styles.halfInput}>
                  <Text style={styles.label}>Cost Price</Text>
                  <View style={styles.currencyInput}>
                    <Text style={styles.currencyPrefix}>RM</Text>
                    <TextInput
                      style={styles.currencyField}
                      value={formCostPrice}
                      onChangeText={setFormCostPrice}
                      placeholder="0.00"
                      keyboardType="decimal-pad"
                      placeholderTextColor={theme.colors.textSecondary}
                      testID="product-cost-price-input"
                    />
                  </View>
                </View>
              </View>

              {/* Profit Margin Preview */}
              {formSellingPrice && formCostPrice && parseFloat(formSellingPrice) > 0 && parseFloat(formCostPrice) >= 0 && (
                <View style={styles.marginPreview}>
                  <MaterialIcons name="trending-up" size={16} color={theme.colors.success} />
                  <Text style={styles.marginText}>
                    Profit: RM {(parseFloat(formSellingPrice) - parseFloat(formCostPrice)).toFixed(2)}
                    {' • '}
                    Margin: {(((parseFloat(formSellingPrice) - parseFloat(formCostPrice)) / parseFloat(formSellingPrice)) * 100).toFixed(1)}%
                  </Text>
                </View>
              )}

              {/* Current Stock and Low Stock Alert */}
              <View style={styles.row}>
                <View style={styles.halfInput}>
                  <Text style={styles.label}>Current Stock *</Text>
                  <TextInput
                    style={styles.input}
                    value={formStock}
                    onChangeText={setFormStock}
                    placeholder="0"
                    keyboardType="number-pad"
                    placeholderTextColor={theme.colors.textSecondary}
                    testID="product-stock-input"
                  />
                </View>
                <View style={styles.halfInput}>
                  <Text style={styles.label}>Low Stock Alert</Text>
                  <TextInput
                    style={styles.input}
                    value={formLowStockAlert}
                    onChangeText={setFormLowStockAlert}
                    placeholder="Default"
                    keyboardType="number-pad"
                    placeholderTextColor={theme.colors.textSecondary}
                    testID="product-low-stock-alert-input"
                  />
                </View>
              </View>
              <Text style={styles.helperText}>
                Alert triggers when stock falls to or below this value. Leave empty to use default.
              </Text>

              <TouchableOpacity
                style={[styles.saveButton, saving && styles.buttonDisabled]}
                onPress={handleSaveProduct}
                disabled={saving}
                testID="save-product-button"
              >
                {saving ? (
                  <ActivityIndicator color={theme.colors.white} />
                ) : (
                  <>
                    <MaterialIcons
                      name={editingProduct ? 'check' : 'add'}
                      size={20}
                      color={theme.colors.white}
                    />
                    <Text style={styles.saveButtonText}>
                      {editingProduct ? 'Update Product' : 'Add Product'}
                    </Text>
                  </>
                )}
              </TouchableOpacity>

              <View style={styles.modalBottomSpacing} />
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* Add Category Modal */}
      <Modal visible={categoryModalVisible} animationType="fade" transparent={true}>
        <View style={styles.centerModalOverlay}>
          <View style={styles.smallModalContent}>
            <Text style={styles.modalTitle}>New Category</Text>
            <TextInput
              style={styles.input}
              value={newCategoryName}
              onChangeText={setNewCategoryName}
              placeholder="e.g. Beverages"
              placeholderTextColor={theme.colors.textSecondary}
              testID="new-category-input"
              autoFocus
            />
            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={styles.cancelButton}
                onPress={() => {
                  setCategoryModalVisible(false);
                  setNewCategoryName('');
                }}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.confirmButton}
                onPress={handleAddCategory}
                testID="confirm-add-category"
              >
                <Text style={styles.confirmButtonText}>Add</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  centerContent: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: theme.colors.white,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: theme.colors.text,
  },
  headerSubtitle: {
    fontSize: 12,
    color: theme.colors.textSecondary,
    marginTop: 2,
  },
  addButton: {
    backgroundColor: theme.colors.primary,
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: theme.colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.white,
    marginHorizontal: 16,
    marginTop: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: theme.colors.border,
    gap: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 15,
    color: theme.colors.text,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 80,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: theme.colors.text,
    marginTop: 16,
  },
  emptySubtitle: {
    fontSize: 14,
    color: theme.colors.textSecondary,
    marginTop: 4,
    marginBottom: 24,
  },
  emptyButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.primary,
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 14,
    gap: 6,
  },
  emptyButtonText: {
    color: theme.colors.white,
    fontSize: 14,
    fontWeight: '600',
  },
  productCard: {
    backgroundColor: theme.colors.white,
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
  },
  productHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 14,
  },
  productInfo: {
    flex: 1,
  },
  productName: {
    fontSize: 16,
    fontWeight: '600',
    color: theme.colors.text,
    marginBottom: 6,
  },
  productMeta: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 8,
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
  },
  metaText: {
    fontSize: 11,
    color: theme.colors.textSecondary,
  },
  categoryBadge: {
    backgroundColor: theme.colors.primaryLight,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 10,
    alignSelf: 'flex-start',
  },
  categoryText: {
    fontSize: 11,
    color: theme.colors.primary,
    fontWeight: '600',
  },
  productActions: {
    flexDirection: 'row',
    gap: 6,
  },
  actionIconBtn: {
    width: 34,
    height: 34,
    borderRadius: 10,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  productDetails: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: theme.colors.border,
  },
  detailItem: {
    flex: 1,
    alignItems: 'center',
  },
  detailLabel: {
    fontSize: 11,
    color: theme.colors.textSecondary,
    marginBottom: 4,
    textTransform: 'uppercase',
    letterSpacing: 0.3,
  },
  detailValue: {
    fontSize: 16,
    fontWeight: '700',
    color: theme.colors.text,
  },
  detailValueSecondary: {
    fontSize: 15,
    fontWeight: '600',
    color: theme.colors.textSecondary,
  },
  detailDivider: {
    width: 1,
    height: 30,
    backgroundColor: theme.colors.border,
  },
  stockContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  lowStockText: {
    color: theme.colors.warning,
  },
  lowStockBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 10,
    padding: 8,
    backgroundColor: '#FEF3C7',
    borderRadius: 8,
    gap: 6,
  },
  lowStockBannerText: {
    fontSize: 11,
    color: '#92400E',
    fontWeight: '500',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  centerModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
  },
  modalContent: {
    backgroundColor: theme.colors.white,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingTop: 8,
    maxHeight: '92%',
  },
  modalHandle: {
    width: 40,
    height: 4,
    backgroundColor: theme.colors.border,
    borderRadius: 2,
    alignSelf: 'center',
    marginBottom: 8,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 12,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: theme.colors.text,
  },
  closeButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalForm: {
    paddingHorizontal: 20,
  },
  label: {
    fontSize: 13,
    fontWeight: '600',
    color: theme.colors.text,
    marginBottom: 8,
    marginTop: 12,
  },
  labelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 12,
    marginBottom: 8,
  },
  addCategoryChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    backgroundColor: theme.colors.primaryLight,
    borderRadius: 10,
    gap: 2,
  },
  addCategoryChipText: {
    fontSize: 11,
    color: theme.colors.primary,
    fontWeight: '600',
  },
  input: {
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
    color: theme.colors.text,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  row: {
    flexDirection: 'row',
    gap: 10,
  },
  halfInput: {
    flex: 1,
  },
  barcodeInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: theme.colors.border,
    gap: 8,
  },
  barcodeInput: {
    flex: 1,
    fontSize: 15,
    color: theme.colors.text,
  },
  currencyInput: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  currencyPrefix: {
    fontSize: 13,
    fontWeight: '600',
    color: theme.colors.textSecondary,
    marginRight: 8,
  },
  currencyField: {
    flex: 1,
    fontSize: 15,
    color: theme.colors.text,
  },
  marginPreview: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 10,
    padding: 10,
    backgroundColor: '#ECFDF5',
    borderRadius: 10,
    gap: 6,
  },
  marginText: {
    fontSize: 12,
    color: theme.colors.success,
    fontWeight: '500',
    flex: 1,
  },
  helperText: {
    fontSize: 11,
    color: theme.colors.textSecondary,
    marginTop: 6,
    marginLeft: 4,
  },
  categoryScrollWrapper: {
    marginBottom: 4,
  },
  categoryScroll: {
    gap: 8,
    paddingVertical: 4,
  },
  categoryChip: {
    flexShrink: 0,
    backgroundColor: '#F8FAFC',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: theme.colors.border,
    height: 36,
    justifyContent: 'center',
  },
  categoryChipSelected: {
    backgroundColor: theme.colors.primary,
    borderColor: theme.colors.primary,
  },
  categoryChipText: {
    fontSize: 13,
    color: theme.colors.text,
    fontWeight: '500',
  },
  categoryChipTextSelected: {
    color: theme.colors.white,
    fontWeight: '600',
  },
  saveButton: {
    flexDirection: 'row',
    backgroundColor: theme.colors.primary,
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 24,
    gap: 8,
    shadowColor: theme.colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  buttonDisabled: {
    opacity: 0.7,
  },
  saveButtonText: {
    color: theme.colors.white,
    fontSize: 16,
    fontWeight: '600',
  },
  modalBottomSpacing: {
    height: 40,
  },
  bottomSpacing: {
    height: 20,
  },
  smallModalContent: {
    backgroundColor: theme.colors.white,
    margin: 20,
    padding: 20,
    borderRadius: 20,
  },
  modalButtons: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 16,
  },
  cancelButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: theme.colors.border,
    alignItems: 'center',
  },
  cancelButtonText: {
    color: theme.colors.text,
    fontSize: 14,
    fontWeight: '600',
  },
  confirmButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    backgroundColor: theme.colors.primary,
    alignItems: 'center',
  },
  confirmButtonText: {
    color: theme.colors.white,
    fontSize: 14,
    fontWeight: '600',
  },
});
