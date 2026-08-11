import React, { useEffect, useState } from 'react';
import { Alert, ScrollView, Text, View } from 'react-native';
import { Picker } from '@react-native-picker/picker';
import { Category, Product, Supplier } from '@/src/contexts/DataContext';
import { AppModal, Button, Input } from '@/src/components/UI';
import { SetupChip } from '@/src/features/setup/components/SetupChip';

export type ProductFormData = Omit<Product, 'id' | 'companyId' | 'createdAt'>;

export function ProductFormModal({ product, categories, suppliers, onClose, onSave }: {
  product: Product | null;
  categories: Category[];
  suppliers: Supplier[];
  onClose: () => void;
  onSave: (data: ProductFormData) => Promise<void>;
}) {
  const [name, setName] = useState(product?.name || '');
  const [sku, setSku] = useState(product?.sku || '');
  const [barcode, setBarcode] = useState(product?.barcode || '');
  const [categoryId, setCategoryId] = useState(product?.categoryId || categories[0]?.id || '');
  const [supplierId, setSupplierId] = useState(product?.supplierId || '');
  const [sellingPrice, setSellingPrice] = useState(product ? String(product.sellingPrice) : '');
  const [minStock, setMinStock] = useState(product ? String(product.minStock) : '10');
  const [unit, setUnit] = useState(product?.unit ? String(product.unit).toUpperCase() : 'PCS');
  const [description, setDescription] = useState(product?.description || '');
  const unitOptions = ['PCS', 'BOX', 'PACK', 'KG', 'GRAM', 'LITER', 'METER', 'ROLL', 'SET', 'PAIR'];
  const [imageUrl, setImageUrl] = useState(product?.imageUrl || '');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (categories.length === 0) {
      setCategoryId('');
      return;
    }

    if (!categoryId) {
      setCategoryId(categories[0].id);
      return;
    }

    const exists = categories.some((x) => x.id === categoryId);
    if (!exists) {
      setCategoryId(categories[0].id);
    }
  }, [categories, categoryId]);

  const cat = categories.find((x) => x.id === categoryId);
  const sup = suppliers.find((x) => x.id === supplierId);

  const submit = async () => {
    if (!name.trim() || !sku.trim()) {
      Alert.alert('Missing fields', 'Product name and SKU are required');
      return;
    }
    const sp = parseFloat(sellingPrice);
    const ms = parseInt(minStock, 10);
    if (Number.isNaN(sp) || sp < 0) {
      Alert.alert('Invalid selling price', 'Selling price is required');
      return;
    }
    if (Number.isNaN(ms) || ms < 0) {
      Alert.alert('Invalid minimum stock', 'Minimum stock must be 0 or greater');
      return;
    }

    try {
      setSaving(true);
      await onSave({
        name: name.trim(),
        sku: sku.trim(),
        barcode: barcode.trim() || undefined,
        categoryId: cat?.id,
        categoryName: cat?.name,
        supplierId: sup?.id,
        supplierName: sup?.name,
        sellingPrice: sp,
        minStock: ms,
        unit: unit.trim() || 'pcs',
        description: description.trim() || undefined,
        imageUrl: imageUrl.trim() || undefined,
        costPrice: product?.costPrice || 0,
        stock: product?.stock || 0,
        status: product?.status || 'active',
      });
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : 'Could not save product';
      Alert.alert('Save failed', message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <AppModal
      visible
      title={product ? 'Edit Product' : 'New Product'}
      subtitle="Product master"
      onClose={onClose}
      footer={(
        <View style={{ flexDirection: 'row', gap: 8 }}>
          <View style={{ flex: 1 }}><Button title="Cancel" variant="secondary" onPress={onClose} fullWidth testID="modal-cancel-button" /></View>
          <View style={{ flex: 1 }}><Button title={product ? 'Update' : 'Create'} onPress={submit} loading={saving} icon="check" fullWidth testID="setup-save-product-button" /></View>
        </View>
      )}
      testID="product-modal"
    >
      <Input label="Product Name" value={name} onChangeText={setName} testID="product-name-input" accessibilityLabel="Product Name" autoFocus />
      <Input label="SKU" value={sku} onChangeText={setSku} autoCapitalize="characters" testID="product-sku-input" accessibilityLabel="SKU" />
      <Input label="Barcode" value={barcode} onChangeText={setBarcode} keyboardType="numeric" testID="product-barcode-input" accessibilityLabel="Barcode" />

      <Text style={{ fontSize: 13, fontWeight: '600', marginBottom: 6 }}>Category</Text>
      {categories.length === 0 ? (
        <View style={{ borderWidth: 1, borderColor: '#D1D5DB', borderRadius: 8, padding: 12, marginBottom: 12 }}>
          <Text style={{ color: '#6B7280', fontSize: 12 }}>No categories available. Create a category first.</Text>
        </View>
      ) : (
        <View style={{ borderWidth: 1, borderColor: '#D1D5DB', borderRadius: 8, paddingHorizontal: 8, marginBottom: 12 }}>
          <Picker
            selectedValue={categoryId}
            onValueChange={(value) => setCategoryId(String(value))}
            style={{ color: '#111827' }}
          >
            {categories.map((c) => (
              <Picker.Item key={c.id} label={c.name} value={c.id} />
            ))}
          </Picker>
        </View>
      )}

      <Text style={{ fontSize: 13, fontWeight: '600', marginBottom: 6 }}>Supplier</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, marginBottom: 12 }}>
        <SetupChip label="None" active={!supplierId} onPress={() => setSupplierId('')} />
        {suppliers.map((s) => <SetupChip key={s.id} label={s.name} active={supplierId === s.id} onPress={() => setSupplierId(s.id)} />)}
      </ScrollView>

      <Input label="Selling Price" value={sellingPrice} onChangeText={setSellingPrice} keyboardType="decimal-pad" prefix="RM" testID="product-selling-price-input" accessibilityLabel="Selling Price" />
      <Input label="Minimum Stock" value={minStock} onChangeText={setMinStock} keyboardType="number-pad" testID="product-min-stock-input" accessibilityLabel="Minimum Stock" />
      <View style={{ marginBottom: 12 }}>
        <Text style={{ fontSize: 13, fontWeight: '600', marginBottom: 6 }}>Unit</Text>
        <View style={{ borderWidth: 1, borderColor: '#D1D5DB', borderRadius: 8, paddingHorizontal: 8 }}>
          <Picker
            selectedValue={unit}
            onValueChange={(value) => setUnit(String(value))}
            style={{ color: '#111827' }}
          >
            {unitOptions.map((option) => (
              <Picker.Item key={option} label={option} value={option} />
            ))}
          </Picker>
        </View>
      </View>
      <Input label="Description" value={description} onChangeText={setDescription} multiline testID="product-description-input" accessibilityLabel="Description" />
      <Input label="Image" value={imageUrl} onChangeText={setImageUrl} placeholder="Image URL" testID="product-image-input" accessibilityLabel="Image" />
    </AppModal>
  );
}
