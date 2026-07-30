import React, { useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, Alert } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useTheme } from '@/src/contexts/ThemeContext';
import { Badge, Button, Card, EmptyState, Input } from '@/src/components/UI';

export default function CustomersModalContent({ customers, onCreate, onUpdate, onDelete }: any) {
  const { theme } = useTheme();
  const [editing, setEditing] = useState<any>(null);
  const [form, setForm] = useState({ name: '', phone: '', email: '', address: '', membership: 'regular' as any });

  const reset = () => { setEditing(null); setForm({ name: '', phone: '', email: '', address: '', membership: 'regular' }); };

  const save = async () => {
    if (!form.name.trim()) return Alert.alert('Missing', 'Name required');
    try {
      if (editing) await onUpdate(editing.id, form);
      else await onCreate(form);
      reset();
    } catch (e: any) { Alert.alert('Error', e?.message || 'Failed'); }
  };

  return (
    <ScrollView contentContainerStyle={{ padding: 16 }}>
      <Card style={{ marginBottom: 12 }}>
        <Text style={{ fontSize: 14, fontWeight: '700', color: theme.colors.text, marginBottom: 8 }}>{editing ? 'Edit Customer' : 'New Customer'}</Text>
        <Input label="Name *" value={form.name} onChangeText={(v) => setForm({ ...form, name: v })} icon="person" testID="customer-name-input" />
        <Input label="Phone" value={form.phone} onChangeText={(v) => setForm({ ...form, phone: v })} icon="phone" keyboardType="phone-pad" />
        <Input label="Email" value={form.email} onChangeText={(v) => setForm({ ...form, email: v })} icon="email" keyboardType="email-address" autoCapitalize="none" />
        <Input label="Address" value={form.address} onChangeText={(v) => setForm({ ...form, address: v })} icon="place" multiline />
        <Text style={{ fontSize: 13, fontWeight: '600', color: theme.colors.text, marginBottom: 6 }}>Membership</Text>
        <View style={{ flexDirection: 'row', gap: 8, marginBottom: 12 }}>
          {(['regular', 'silver', 'gold'] as const).map((m) => (
            <TouchableOpacity key={m} onPress={() => setForm({ ...form, membership: m })} style={{ flex: 1, paddingVertical: 10, borderRadius: 10, backgroundColor: form.membership === m ? theme.colors.primary : theme.colors.cardMuted, alignItems: 'center' }}>
              <Text style={{ color: form.membership === m ? '#FFF' : theme.colors.text, fontWeight: '700', fontSize: 12, textTransform: 'capitalize' }}>{m}</Text>
            </TouchableOpacity>
          ))}
        </View>
        <View style={{ flexDirection: 'row', gap: 8 }}>
          {editing && <Button title="Cancel" variant="secondary" onPress={reset} />}
          <View style={{ flex: 1 }} />
          <Button title={editing ? 'Update' : 'Add Customer'} onPress={save} icon={editing ? 'check' : 'add'} testID="save-customer-button" />
        </View>
      </Card>
      {customers.length === 0 ? <EmptyState icon="people" title="No customers yet" subtitle="Add customers for membership tracking" /> :
        customers.map((c: any) => (
          <Card key={c.id} style={{ marginBottom: 8 }}>
            <View style={{ flexDirection: 'row', alignItems: 'flex-start' }}>
              <View style={{ flex: 1 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                  <Text style={{ fontSize: 15, fontWeight: '700', color: theme.colors.text }}>{c.name}</Text>
                  <Badge label={(c.membership || 'regular').toUpperCase()} tone={c.membership === 'gold' ? 'warning' : c.membership === 'silver' ? 'primary' : 'default'} />
                </View>
                {c.phone ? <Text style={{ fontSize: 12, color: theme.colors.textSecondary, marginTop: 4 }}>📞 {c.phone}</Text> : null}
                {c.email ? <Text style={{ fontSize: 12, color: theme.colors.textSecondary, marginTop: 2 }}>✉️ {c.email}</Text> : null}
              </View>
              <TouchableOpacity onPress={() => { setEditing(c); setForm({ name: c.name, phone: c.phone || '', email: c.email || '', address: c.address || '', membership: c.membership || 'regular' }); }}>
                <MaterialIcons name="edit" size={20} color={theme.colors.primary} />
              </TouchableOpacity>
              <TouchableOpacity onPress={() => Alert.alert('Delete?', c.name, [{ text: 'Cancel', style: 'cancel' }, { text: 'Delete', style: 'destructive', onPress: () => onDelete(c.id) }])} style={{ marginLeft: 8 }}>
                <MaterialIcons name="delete-outline" size={20} color={theme.colors.error} />
              </TouchableOpacity>
            </View>
          </Card>
        ))}
    </ScrollView>
  );
}
