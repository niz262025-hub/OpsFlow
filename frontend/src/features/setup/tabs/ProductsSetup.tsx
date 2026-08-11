import React, { useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, Alert } from 'react-native';
import { useTheme } from '@/src/contexts/ThemeContext';
import { useData, Product } from '@/src/contexts/DataContext';
import { Button, DataTable, EmptyState, SearchBar } from '@/src/components/UI';
import { ProductFormModal, ProductFormData } from '@/src/features/setup/components/ProductFormModal';

export function ProductsSetup() {
  const { theme } = useTheme();
  const { products, categories, suppliers, createProduct, updateProduct, deleteProduct } = useData();
  const [modal, setModal] = useState(false);
  const [editing, setEditing] = useState<Product | null>(null);
  const [search, setSearch] = useState('');

  const visibleProducts = products.filter((p) => {
    if (p.status === 'archived') return false;
    const term = search.trim().toLowerCase();
    if (!term) return true;
    return [p.name, p.sku, p.categoryName, p.supplierName].filter(Boolean).some((value) => String(value).toLowerCase().includes(term));
  });

  return (
    <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 40 }} showsVerticalScrollIndicator>
      <Button title="Add Product" onPress={() => { setEditing(null); setModal(true); }} icon="add" fullWidth testID="setup-add-product-button" />
      <View style={{ height: 12 }} />
      <SearchBar value={search} onChangeText={setSearch} placeholder="Search table..." testID="setup-table-search" />
      <View style={{ height: 12 }} />

      {visibleProducts.length === 0 ? (
        <EmptyState icon="inventory-2" title="No products" subtitle="Create products for sales and purchases" />
      ) : (
        <DataTable
          rows={visibleProducts}
          selectable
          onBulkDelete={async (ids) => {
            await Promise.all(ids.map((id) => deleteProduct(id)));
          }}
          exportFileName="setup-products"
          columns={[
            {
              key: 'name',
              title: 'Product',
              sortValue: (row) => row.name,
              render: (row) => (
                <TouchableOpacity
                  onPress={() => { setEditing(row); setModal(true); }}
                  testID="setup-edit-product-button"
                  accessibilityRole="button"
                  accessibilityLabel={`Edit product ${row.name}`}
                >
                  <Text style={{ fontSize: 13, fontWeight: '700', color: theme.colors.text }}>{row.name}</Text>
                  <Text style={{ fontSize: 11, color: theme.colors.textSecondary, marginTop: 2 }}>SKU {row.sku}</Text>
                </TouchableOpacity>
              ),
            },
            {
              key: 'category',
              title: 'Category',
              width: 140,
              sortValue: (row) => row.categoryName || '',
              render: (row) => <Text style={{ fontSize: 12, color: theme.colors.textSecondary }}>{row.categoryName || 'Uncategorized'}</Text>,
            },
            {
              key: 'supplier',
              title: 'Supplier',
              width: 160,
              sortValue: (row) => row.supplierName || '',
              render: (row) => <Text style={{ fontSize: 12, color: theme.colors.textSecondary }}>{row.supplierName || '-'}</Text>,
            },
            {
              key: 'price',
              title: 'Selling Price',
              width: 140,
              sortValue: (row) => row.sellingPrice,
              render: (row) => <Text style={{ fontSize: 13, fontWeight: '800', color: theme.colors.primary }}>RM {row.sellingPrice.toFixed(2)}</Text>,
            },
            {
              key: 'minStock',
              title: 'Minimum Stock',
              width: 140,
              sortValue: (row) => row.minStock,
              render: (row) => <Text style={{ fontSize: 12, color: theme.colors.textSecondary }}>{row.minStock}</Text>,
            },
          ]}
        />
      )}

      {modal && (
        <ProductFormModal
          product={editing}
          categories={categories}
          suppliers={suppliers}
          onClose={() => setModal(false)}
          onSave={async (data: ProductFormData) => {
            try {
              if (editing) await updateProduct(editing.id, data);
              else await createProduct(data);
              setModal(false);
              setSearch('');
            } catch (e: unknown) {
              const message = e instanceof Error ? e.message : 'Could not save product';
              Alert.alert('Save failed', message);
              throw e;
            }
          }}
        />
      )}
    </ScrollView>
  );
}
