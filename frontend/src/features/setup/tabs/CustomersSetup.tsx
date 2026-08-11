import React, { useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, Alert } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useTheme } from '@/src/contexts/ThemeContext';
import { useData, Customer } from '@/src/contexts/DataContext';
import { AppModal, Badge, Button, DataTable, EmptyState, Input, SearchBar } from '@/src/components/UI';
import { SetupChip } from '@/src/features/setup/components/SetupChip';

export function CustomersSetup() {
  const { theme } = useTheme();
  const { customers, createCustomer, updateCustomer, deleteCustomer } = useData();
  const [modal, setModal] = useState(false);
  const [editing, setEditing] = useState<Customer | null>(null);
  const [form, setForm] = useState({ name: '', phone: '', email: '', address: '', membership: 'regular' as 'regular' | 'silver' | 'gold' });
  const [search, setSearch] = useState('');

  const open = (customer?: Customer) => {
    setEditing(customer || null);
    setForm({
      name: customer?.name || '',
      phone: customer?.phone || '',
      email: customer?.email || '',
      address: customer?.address || '',
      membership: customer?.membership || 'regular',
    });
    setModal(true);
  };

  const save = async () => {
    if (!form.name.trim()) {
      Alert.alert('Missing name', 'Customer name is required');
      return;
    }
    try {
      if (editing) await updateCustomer(editing.id, form);
      else await createCustomer(form);
      setModal(false);
      setEditing(null);
      setForm({ name: '', phone: '', email: '', address: '', membership: 'regular' });
      setSearch('');
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : 'Could not save customer';
      Alert.alert('Save failed', message);
    }
  };

  const visibleCustomers = customers.filter((customer) => {
    const term = search.trim().toLowerCase();
    if (!term) return true;
    return [customer.name, customer.phone, customer.email].filter(Boolean).some((value) => String(value).toLowerCase().includes(term));
  });

  return (
    <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 40 }} showsVerticalScrollIndicator>
      <Button title="Add Customer" onPress={() => open()} icon="add" fullWidth testID="setup-add-customer-button" />
      <View style={{ height: 12 }} />
      <SearchBar value={search} onChangeText={setSearch} placeholder="Search table..." testID="setup-table-search" />
      <View style={{ height: 12 }} />

      {visibleCustomers.length === 0 ? (
        <EmptyState icon="person-add" title="No customers" subtitle="Create customer profiles for POS checkout" />
      ) : (
        <DataTable
          rows={visibleCustomers}
          exportFileName="setup-customers"
          columns={[
            { key: 'name', title: 'Customer', sortValue: (row) => row.name, render: (row) => <Text style={{ fontSize: 13, fontWeight: '700', color: theme.colors.text }}>{row.name}</Text> },
            { key: 'phone', title: 'Phone', width: 150, sortValue: (row) => row.phone || '', render: (row) => <Text style={{ fontSize: 12, color: theme.colors.textSecondary }}>{row.phone || '-'}</Text> },
            { key: 'membership', title: 'Membership', width: 130, sortValue: (row) => row.membership || 'regular', render: (row) => <Badge label={String(row.membership || 'regular').toUpperCase()} tone="primary" /> },
            {
              key: 'actions',
              title: 'Actions',
              width: 120,
              render: (row) => (
                <View style={{ flexDirection: 'row', gap: 8 }}>
                  <TouchableOpacity
                    onPress={() => open(row)}
                    testID="setup-edit-customer-button"
                    accessibilityRole="button"
                    accessibilityLabel={`Edit customer ${row.name}`}
                  >
                    <MaterialIcons name="edit" size={18} color={theme.colors.primary} />
                  </TouchableOpacity>
                  <TouchableOpacity
                    onPress={() => deleteCustomer(row.id)}
                    testID="setup-delete-customer-button"
                    accessibilityRole="button"
                    accessibilityLabel={`Delete customer ${row.name}`}
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
        title={editing ? 'Edit Customer' : 'Add Customer'}
        onClose={() => setModal(false)}
        footer={(
          <View style={{ flexDirection: 'row', gap: 8 }}>
            <View style={{ flex: 1 }}><Button title="Cancel" variant="secondary" onPress={() => setModal(false)} fullWidth testID="modal-cancel-button" /></View>
            <View style={{ flex: 1 }}><Button title="Save" onPress={save} icon="check" fullWidth testID="setup-save-customer-button" /></View>
          </View>
        )}
        testID="customer-modal"
      >
        <Input label="Customer Name" value={form.name} onChangeText={(v) => setForm({ ...form, name: v })} testID="customer-name-input" accessibilityLabel="Customer Name" autoFocus />
        <Input label="Phone" value={form.phone} onChangeText={(v) => setForm({ ...form, phone: v })} testID="customer-phone-input" accessibilityLabel="Phone" />
        <Input label="Email" value={form.email} onChangeText={(v) => setForm({ ...form, email: v })} keyboardType="email-address" autoCapitalize="none" testID="customer-email-input" accessibilityLabel="Email" />
        <Input label="Address" value={form.address} onChangeText={(v) => setForm({ ...form, address: v })} multiline testID="customer-address-input" accessibilityLabel="Address" />
        <Text style={{ fontSize: 13, fontWeight: '600', marginBottom: 6 }}>Membership</Text>
        <View style={{ flexDirection: 'row', gap: 8 }}>
          <SetupChip label="Regular" active={form.membership === 'regular'} onPress={() => setForm({ ...form, membership: 'regular' })} />
          <SetupChip label="Silver" active={form.membership === 'silver'} onPress={() => setForm({ ...form, membership: 'silver' })} />
          <SetupChip label="Gold" active={form.membership === 'gold'} onPress={() => setForm({ ...form, membership: 'gold' })} />
        </View>
      </AppModal>
    </ScrollView>
  );
}
