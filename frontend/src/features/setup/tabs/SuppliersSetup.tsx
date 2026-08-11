import React, { useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, Alert } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useTheme } from '@/src/contexts/ThemeContext';
import { useData, Supplier } from '@/src/contexts/DataContext';
import { AppModal, Button, DataTable, EmptyState, Input, SearchBar } from '@/src/components/UI';

export function SuppliersSetup() {
  const { theme } = useTheme();
  const { suppliers, createSupplier, updateSupplier, deleteSupplier } = useData();
  const [modal, setModal] = useState(false);
  const [editing, setEditing] = useState<Supplier | null>(null);
  const [form, setForm] = useState({ name: '', pic: '', phone: '', email: '', address: '' });
  const [search, setSearch] = useState('');

  const open = (supplier?: Supplier) => {
    setEditing(supplier || null);
    setForm({
      name: supplier?.name || '',
      pic: supplier?.pic || '',
      phone: supplier?.phone || '',
      email: supplier?.email || '',
      address: supplier?.address || '',
    });
    setModal(true);
  };

  const save = async () => {
    if (!form.name.trim()) {
      Alert.alert('Missing name', 'Supplier name is required');
      return;
    }
    try {
      if (editing) await updateSupplier(editing.id, form);
      else await createSupplier(form);
      setModal(false);
      setEditing(null);
      setForm({ name: '', pic: '', phone: '', email: '', address: '' });
      setSearch('');
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : 'Could not save supplier';
      Alert.alert('Save failed', message);
    }
  };

  const visibleSuppliers = suppliers.filter((supplier) => {
    const term = search.trim().toLowerCase();
    if (!term) return true;
    return [supplier.name, supplier.pic, supplier.phone, supplier.email].filter(Boolean).some((value) => String(value).toLowerCase().includes(term));
  });

  return (
    <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 40 }} showsVerticalScrollIndicator>
      <Button title="Add Supplier" onPress={() => open()} icon="add" fullWidth testID="setup-add-supplier-button" />
      <View style={{ height: 12 }} />
      <SearchBar value={search} onChangeText={setSearch} placeholder="Search table..." testID="setup-table-search" />
      <View style={{ height: 12 }} />

      {visibleSuppliers.length === 0 ? (
        <EmptyState icon="local-shipping" title="No suppliers" subtitle="Create supplier records for purchasing" />
      ) : (
        <DataTable
          rows={visibleSuppliers}
          exportFileName="setup-suppliers"
          columns={[
            { key: 'name', title: 'Supplier', sortValue: (row) => row.name, render: (row) => <Text style={{ fontSize: 13, fontWeight: '700', color: theme.colors.text }}>{row.name}</Text> },
            { key: 'pic', title: 'PIC', sortValue: (row) => row.pic || '', render: (row) => <Text style={{ fontSize: 12, color: theme.colors.textSecondary }}>{row.pic || '-'}</Text> },
            { key: 'phone', title: 'Phone', width: 160, sortValue: (row) => row.phone || '', render: (row) => <Text style={{ fontSize: 12, color: theme.colors.textSecondary }}>{row.phone || '-'}</Text> },
            {
              key: 'actions',
              title: 'Actions',
              width: 120,
              render: (row) => (
                <View style={{ flexDirection: 'row', gap: 8 }}>
                  <TouchableOpacity
                    onPress={() => open(row)}
                    testID="setup-edit-supplier-button"
                    accessibilityRole="button"
                    accessibilityLabel={`Edit supplier ${row.name}`}
                  >
                    <MaterialIcons name="edit" size={18} color={theme.colors.primary} />
                  </TouchableOpacity>
                  <TouchableOpacity
                    onPress={() => deleteSupplier(row.id)}
                    testID="setup-delete-supplier-button"
                    accessibilityRole="button"
                    accessibilityLabel={`Delete supplier ${row.name}`}
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
        title={editing ? 'Edit Supplier' : 'Add Supplier'}
        onClose={() => setModal(false)}
        footer={(
          <View style={{ flexDirection: 'row', gap: 8 }}>
            <View style={{ flex: 1 }}><Button title="Cancel" variant="secondary" onPress={() => setModal(false)} fullWidth testID="modal-cancel-button" /></View>
            <View style={{ flex: 1 }}><Button title="Save" onPress={save} icon="check" fullWidth testID="setup-save-supplier-button" /></View>
          </View>
        )}
        testID="supplier-modal"
      >
        <Input label="Supplier Name" value={form.name} onChangeText={(v) => setForm({ ...form, name: v })} testID="supplier-name-input" accessibilityLabel="Supplier Name" autoFocus />
        <Input label="Person in Charge" value={form.pic} onChangeText={(v) => setForm({ ...form, pic: v })} testID="supplier-pic-input" accessibilityLabel="Person in Charge" />
        <Input label="Phone" value={form.phone} onChangeText={(v) => setForm({ ...form, phone: v })} testID="supplier-phone-input" accessibilityLabel="Phone" />
        <Input label="Email" value={form.email} onChangeText={(v) => setForm({ ...form, email: v })} keyboardType="email-address" autoCapitalize="none" testID="supplier-email-input" accessibilityLabel="Email" />
        <Input label="Address" value={form.address} onChangeText={(v) => setForm({ ...form, address: v })} multiline testID="supplier-address-input" accessibilityLabel="Address" />
      </AppModal>
    </ScrollView>
  );
}
