import React, { useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, Alert } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useTheme } from '@/src/contexts/ThemeContext';
import { useData, Category } from '@/src/contexts/DataContext';
import { AppModal, Button, DataTable, EmptyState, Input, SearchBar } from '@/src/components/UI';

export function CategoriesSetup() {
  const { theme } = useTheme();
  const { categories, products, createCategory, updateCategory, deleteCategory } = useData();
  const [modal, setModal] = useState(false);
  const [editing, setEditing] = useState<Category | null>(null);
  const [name, setName] = useState('');
  const [search, setSearch] = useState('');

  const open = (category?: Category) => {
    setEditing(category || null);
    setName(category?.name || '');
    setModal(true);
  };

  const save = async () => {
    if (!name.trim()) {
      Alert.alert('Missing name', 'Category name is required');
      return;
    }
    try {
      if (editing) await updateCategory(editing.id, { name: name.trim() });
      else await createCategory({ name: name.trim() });
      setModal(false);
      setName('');
      setEditing(null);
      setSearch('');
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : 'Could not save category';
      Alert.alert('Save failed', message);
    }
  };

  const visibleCategories = categories.filter((category) => {
    const term = search.trim().toLowerCase();
    if (!term) return true;
    return category.name.toLowerCase().includes(term);
  });

  return (
    <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 40 }} showsVerticalScrollIndicator>
      <Button title="Create Category" onPress={() => open()} icon="add" fullWidth testID="add-category-button" />
      <View style={{ height: 12 }} />
      <SearchBar value={search} onChangeText={setSearch} placeholder="Search table..." testID="setup-table-search" />
      <View style={{ height: 12 }} />

      {visibleCategories.length === 0 ? (
        <EmptyState icon="category" title="No categories" subtitle="Create category groups for products" />
      ) : (
        <DataTable
          rows={visibleCategories}
          exportFileName="setup-categories"
          columns={[
            { key: 'name', title: 'Category', sortValue: (row) => row.name, render: (row) => <Text style={{ fontSize: 13, fontWeight: '700', color: theme.colors.text }}>{row.name}</Text> },
            { key: 'count', title: 'Products', width: 120, sortValue: (row) => products.filter((p) => p.categoryId === row.id).length, render: (row) => <Text style={{ fontSize: 12, color: theme.colors.textSecondary }}>{products.filter((p) => p.categoryId === row.id).length}</Text> },
            {
              key: 'actions',
              title: 'Actions',
              width: 140,
              render: (row) => (
                <View style={{ flexDirection: 'row', gap: 8 }}>
                  <TouchableOpacity
                    onPress={() => open(row)}
                    testID="category-edit-button"
                    accessibilityRole="button"
                    accessibilityLabel={`Edit category ${row.name}`}
                  >
                    <MaterialIcons name="edit" size={18} color={theme.colors.primary} />
                  </TouchableOpacity>
                  <TouchableOpacity
                    onPress={async () => {
                      const used = products.filter((p) => p.categoryId === row.id).length;
                      if (used > 0) {
                        Alert.alert('Cannot delete', `${used} products are using this category`);
                        return;
                      }
                      try {
                        await deleteCategory(row.id);
                      } catch (e: unknown) {
                        const message = e instanceof Error ? e.message : 'Could not delete category';
                        Alert.alert('Delete failed', message);
                      }
                    }}
                    testID="category-delete-button"
                    accessibilityRole="button"
                    accessibilityLabel={`Delete category ${row.name}`}
                  >
                    <MaterialIcons name="delete-outline" size={18} color={theme.colors.error} />
                  </TouchableOpacity>
                </View>
              ),
            },
          ]}
        />
      )}

      <AppModal
        visible={modal}
        title={editing ? 'Edit Category' : 'Create Category'}
        onClose={() => setModal(false)}
        footer={(
          <View style={{ flexDirection: 'row', gap: 8 }}>
            <View style={{ flex: 1 }}><Button title="Cancel" variant="secondary" onPress={() => setModal(false)} fullWidth testID="modal-cancel-button" /></View>
            <View style={{ flex: 1 }}><Button title="Save" onPress={save} icon="check" fullWidth testID="save-category-button" /></View>
          </View>
        )}
        testID="category-modal"
      >
        <Input label="Category Name" value={name} onChangeText={setName} testID="category-name-input" accessibilityLabel="Category Name" autoFocus />
      </AppModal>
    </ScrollView>
  );
}
