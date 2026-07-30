import React, { useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, Alert, Modal, Switch } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { MaterialIcons } from '@expo/vector-icons';
import { useTheme } from '@/src/contexts/ThemeContext';
import { useAuth } from '@/src/contexts/AuthContext';
import { useData } from '@/src/contexts/DataContext';
import { usePermissions } from '@/src/hooks/usePermissions';
import { Badge, Button, Card, Header, Input, Screen } from '@/src/components/UI';

export default function Settings() {
  const { theme, mode, setMode } = useTheme();
  const { profile, logout, user } = useAuth();
  const { company, updateCompany, customers, suppliers, products, sales, purchases, expenses, createCustomer, updateCustomer, deleteCustomer, team, invites } = useData();
  const perms = usePermissions();
  const router = useRouter();
  const [companyEdit, setCompanyEdit] = useState(false);
  const [customersModal, setCustomersModal] = useState(false);

  const [form, setForm] = useState({
    name: company?.name || '',
    ssmNumber: company?.ssmNumber || '',
    ownerName: company?.ownerName || '',
    phone: company?.phone || '',
    email: company?.email || '',
    address: company?.address || '',
    lowStockThreshold: String(company?.lowStockThreshold ?? 10),
  });

  React.useEffect(() => {
    if (company) setForm({
      name: company.name, ssmNumber: company.ssmNumber || '', ownerName: company.ownerName || '',
      phone: company.phone || '', email: company.email || '', address: company.address || '',
      lowStockThreshold: String(company.lowStockThreshold ?? 10),
    });
  }, [company?.id]);

  const saveCompany = async () => {
    try {
      await updateCompany({
        name: form.name.trim(), ssmNumber: form.ssmNumber.trim() || undefined, ownerName: form.ownerName.trim() || undefined,
        phone: form.phone.trim() || undefined, email: form.email.trim() || undefined, address: form.address.trim() || undefined,
        lowStockThreshold: parseInt(form.lowStockThreshold, 10) || 10,
      });
      setCompanyEdit(false);
      Alert.alert('Saved', 'Company details updated');
    } catch (e: any) { Alert.alert('Error', e?.message || 'Save failed'); }
  };

  const handleLogout = () => {
    Alert.alert('Logout', 'Are you sure?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Logout', style: 'destructive', onPress: async () => { await logout(); router.replace('/(auth)/login'); } },
    ]);
  };

  return (
    <Screen>
      <SafeAreaView style={{ flex: 1 }} edges={['top']}>
        <Header title="Settings" />
        <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 40 }} showsVerticalScrollIndicator={false}>
          {/* Profile card */}
          <Card style={{ marginBottom: 12 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <View style={{ width: 56, height: 56, borderRadius: 28, backgroundColor: theme.colors.primary, alignItems: 'center', justifyContent: 'center' }}>
                <Text style={{ color: '#FFF', fontSize: 24, fontWeight: '800' }}>{(profile?.displayName || profile?.email || 'U').charAt(0).toUpperCase()}</Text>
              </View>
              <View style={{ marginLeft: 14, flex: 1 }}>
                <Text style={{ fontSize: 16, fontWeight: '800', color: theme.colors.text }}>{profile?.displayName || 'User'}</Text>
                <Text style={{ fontSize: 12, color: theme.colors.textSecondary, marginTop: 2 }}>{profile?.email}</Text>
                <View style={{ marginTop: 6 }}><Badge label={profile?.role?.toUpperCase() || 'ADMIN'} tone="primary" /></View>
              </View>
            </View>
          </Card>

          {/* Company */}
          <Text style={styles.sectionLabel}>Company</Text>
          <Card style={{ marginBottom: 12 }}>
            <SettingRow icon="business" label={company?.name || 'No company'} value={company?.ssmNumber || 'No SSM'} onPress={() => setCompanyEdit(true)} />
            <Divider />
            <SettingRow icon="phone" label="Phone" value={company?.phone || 'Not set'} />
            <Divider />
            <SettingRow icon="place" label="Address" value={company?.address || 'Not set'} />
            <Divider />
            <SettingRow icon="attach-money" label="Currency" value={company?.currency || 'MYR'} />
            <Divider />
            <SettingRow icon="warning" label="Low Stock Threshold" value={`${company?.lowStockThreshold ?? 10} units (global default)`} />
          </Card>

          {/* Data */}
          <Text style={styles.sectionLabel}>Data</Text>
          <Card style={{ marginBottom: 12 }}>
            <SettingRow icon="people" label="Customers" value={`${customers.length} customer(s)`} onPress={() => setCustomersModal(true)} />
            <Divider />
            <SettingRow icon="local-shipping" label="Suppliers" value={`${suppliers.length} supplier(s)`} onPress={() => router.push('/(tabs)/inventory')} />
            <Divider />
            <SettingRow icon="inventory-2" label="Products" value={`${products.length} product(s)`} onPress={() => router.push('/(tabs)/inventory')} />
            <Divider />
            <SettingRow icon="receipt-long" label="Sales" value={`${sales.length} sale(s)`} />
            <Divider />
            <SettingRow icon="shopping-cart" label="Purchases" value={`${purchases.length} purchase(s)`} />
            <Divider />
            <SettingRow icon="receipt" label="Expenses" value={`${expenses.length} expense(s)`} onPress={() => router.push('/expenses')} />
          </Card>

          {/* Team & Access */}
          {perms.canManageTeam && (
            <>
              <Text style={styles.sectionLabel}>Team & Access</Text>
              <Card style={{ marginBottom: 12 }}>
                <SettingRow icon="groups" label="Team Members" value={`${team.length} member(s) • ${invites.filter((i) => !i.used).length} pending invite(s)`} onPress={() => router.push('/team')} />
              </Card>
            </>
          )}

          {/* Preferences */}
          <Text style={styles.sectionLabel}>Preferences</Text>
          <Card style={{ marginBottom: 12 }}>
            <View style={styles.row}>
              <MaterialIcons name="dark-mode" size={22} color={theme.colors.primary} />
              <View style={{ flex: 1, marginLeft: 12 }}>
                <Text style={{ fontSize: 15, fontWeight: '600', color: theme.colors.text }}>Dark Mode</Text>
                <Text style={{ fontSize: 12, color: theme.colors.textSecondary, marginTop: 2 }}>{mode === 'system' ? 'Following system' : mode === 'dark' ? 'Enabled' : 'Disabled'}</Text>
              </View>
              <Switch value={mode === 'dark'} onValueChange={(v) => setMode(v ? 'dark' : 'light')} trackColor={{ true: theme.colors.primary }} />
            </View>
          </Card>

          {/* Subscription */}
          {perms.canManageSubscription && (
            <>
              <Text style={styles.sectionLabel}>Subscription</Text>
              <Card style={{ marginBottom: 12 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                  <View style={{ width: 44, height: 44, borderRadius: 22, backgroundColor: theme.colors.primaryLight, alignItems: 'center', justifyContent: 'center' }}>
                    <MaterialIcons name="workspace-premium" size={22} color={theme.colors.primary} />
                  </View>
                  <View style={{ flex: 1, marginLeft: 12 }}>
                    <Text style={{ fontSize: 15, fontWeight: '800', color: theme.colors.text }}>Free Trial</Text>
                    <Text style={{ fontSize: 12, color: theme.colors.textSecondary, marginTop: 2 }}>Full access for 14 days</Text>
                  </View>
                  <Badge label="ACTIVE" tone="success" />
                </View>
                <Button title="Upgrade to Pro" onPress={() => Alert.alert('Coming soon', 'Subscription plans will be available soon')} icon="star" fullWidth style={{ marginTop: 12 }} />
              </Card>
            </>
          )}

          {/* Backup */}
          {perms.canBackupRestore && (
            <>
              <Text style={styles.sectionLabel}>Data Management</Text>
              <Card style={{ marginBottom: 12 }}>
                <SettingRow icon="backup" label="Backup & Restore" value="Export or import your business data" onPress={() => router.push('/backup')} />
              </Card>
            </>
          )}

          {/* Danger */}
          <Card>
            <TouchableOpacity onPress={handleLogout} style={{ flexDirection: 'row', alignItems: 'center' }}>
              <MaterialIcons name="logout" size={22} color={theme.colors.error} />
              <Text style={{ fontSize: 15, fontWeight: '700', color: theme.colors.error, marginLeft: 12 }}>Logout</Text>
            </TouchableOpacity>
          </Card>

          <Text style={{ textAlign: 'center', color: theme.colors.textMuted, fontSize: 11, marginTop: 24 }}>BizFlow Pro v1.0 • Made for Malaysian SMEs</Text>
        </ScrollView>

        {/* Company edit modal */}
        <Modal visible={companyEdit} transparent animationType="slide" onRequestClose={() => setCompanyEdit(false)}>
          <View style={{ flex: 1, backgroundColor: theme.colors.overlay, justifyContent: 'flex-end' }}>
            <View style={{ backgroundColor: theme.colors.background, borderTopLeftRadius: 24, borderTopRightRadius: 24, maxHeight: '92%' }}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 20 }}>
                <Text style={{ fontSize: 20, fontWeight: '800', color: theme.colors.text }}>Company Details</Text>
                <TouchableOpacity onPress={() => setCompanyEdit(false)}><MaterialIcons name="close" size={26} color={theme.colors.text} /></TouchableOpacity>
              </View>
              <ScrollView contentContainerStyle={{ padding: 20, paddingTop: 0 }}>
                <Input label="Company Name" value={form.name} onChangeText={(v) => setForm({ ...form, name: v })} icon="business" />
                <Input label="SSM Number" value={form.ssmNumber} onChangeText={(v) => setForm({ ...form, ssmNumber: v })} icon="badge" />
                <Input label="Owner" value={form.ownerName} onChangeText={(v) => setForm({ ...form, ownerName: v })} icon="person" />
                <Input label="Phone" value={form.phone} onChangeText={(v) => setForm({ ...form, phone: v })} icon="phone" keyboardType="phone-pad" />
                <Input label="Email" value={form.email} onChangeText={(v) => setForm({ ...form, email: v })} icon="email" keyboardType="email-address" autoCapitalize="none" />
                <Input label="Address" value={form.address} onChangeText={(v) => setForm({ ...form, address: v })} icon="place" multiline />
                <Input label="Low Stock Threshold (default)" value={form.lowStockThreshold} onChangeText={(v) => setForm({ ...form, lowStockThreshold: v })} icon="warning" keyboardType="number-pad" />
                <Button title="Save" onPress={saveCompany} icon="check" fullWidth size="lg" />
                <View style={{ height: 40 }} />
              </ScrollView>
            </View>
          </View>
        </Modal>

        {/* Customers modal */}
        <CustomersModal
          visible={customersModal}
          onClose={() => setCustomersModal(false)}
          customers={customers}
          onCreate={createCustomer}
          onUpdate={updateCustomer}
          onDelete={deleteCustomer}
        />
      </SafeAreaView>
    </Screen>
  );
}

function CustomersModal({ visible, onClose, customers, onCreate, onUpdate, onDelete }: any) {
  const { theme } = useTheme();
  const [editing, setEditing] = useState<any>(null);
  const [form, setForm] = useState({ name: '', phone: '', email: '', address: '', membership: 'regular' as any });

  const open = (c?: any) => { setEditing(c || null); setForm(c ? { name: c.name, phone: c.phone || '', email: c.email || '', address: c.address || '', membership: c.membership || 'regular' } : { name: '', phone: '', email: '', address: '', membership: 'regular' }); };
  const save = async () => {
    if (!form.name.trim()) return Alert.alert('Missing', 'Name is required');
    try {
      if (editing) await onUpdate(editing.id, form);
      else await onCreate(form);
      setEditing(null);
      setForm({ name: '', phone: '', email: '', address: '', membership: 'regular' });
    } catch (e: any) { Alert.alert('Error', e?.message || 'Failed'); }
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={{ flex: 1, backgroundColor: theme.colors.overlay, justifyContent: 'flex-end' }}>
        <View style={{ backgroundColor: theme.colors.background, borderTopLeftRadius: 24, borderTopRightRadius: 24, maxHeight: '92%' }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 20 }}>
            <Text style={{ fontSize: 20, fontWeight: '800', color: theme.colors.text }}>Customers ({customers.length})</Text>
            <TouchableOpacity onPress={onClose}><MaterialIcons name="close" size={26} color={theme.colors.text} /></TouchableOpacity>
          </View>
          <ScrollView contentContainerStyle={{ padding: 20, paddingTop: 0 }}>
            <Card style={{ marginBottom: 12 }}>
              <Text style={{ fontSize: 14, fontWeight: '700', color: theme.colors.text, marginBottom: 8 }}>{editing ? 'Edit Customer' : 'New Customer'}</Text>
              <Input label="Name *" value={form.name} onChangeText={(v) => setForm({ ...form, name: v })} icon="person" />
              <Input label="Phone" value={form.phone} onChangeText={(v) => setForm({ ...form, phone: v })} icon="phone" keyboardType="phone-pad" />
              <Input label="Email" value={form.email} onChangeText={(v) => setForm({ ...form, email: v })} icon="email" keyboardType="email-address" autoCapitalize="none" />
              <Input label="Address" value={form.address} onChangeText={(v) => setForm({ ...form, address: v })} icon="place" multiline />
              <Text style={{ fontSize: 13, fontWeight: '600', color: theme.colors.text, marginBottom: 6 }}>Membership</Text>
              <View style={{ flexDirection: 'row', gap: 8, marginBottom: 16 }}>
                {(['regular', 'silver', 'gold'] as const).map((m) => (
                  <TouchableOpacity key={m} onPress={() => setForm({ ...form, membership: m })} style={{ flex: 1, paddingVertical: 10, borderRadius: 10, backgroundColor: form.membership === m ? theme.colors.primary : theme.colors.cardMuted, alignItems: 'center' }}>
                    <Text style={{ color: form.membership === m ? '#FFF' : theme.colors.text, fontWeight: '700', fontSize: 12, textTransform: 'capitalize' }}>{m}</Text>
                  </TouchableOpacity>
                ))}
              </View>
              <View style={{ flexDirection: 'row', gap: 8 }}>
                {editing && <Button title="Cancel" variant="secondary" onPress={() => { setEditing(null); setForm({ name: '', phone: '', email: '', address: '', membership: 'regular' }); }} />}
                <View style={{ flex: 1 }} />
                <Button title={editing ? 'Update' : 'Add'} onPress={save} icon={editing ? 'check' : 'add'} />
              </View>
            </Card>
            {customers.map((c: any) => (
              <Card key={c.id} style={{ marginBottom: 8 }}>
                <View style={{ flexDirection: 'row', alignItems: 'flex-start' }}>
                  <View style={{ flex: 1 }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                      <Text style={{ fontSize: 15, fontWeight: '700', color: theme.colors.text }}>{c.name}</Text>
                      <Badge label={c.membership?.toUpperCase() || 'REGULAR'} tone={c.membership === 'gold' ? 'warning' : c.membership === 'silver' ? 'primary' : 'default'} />
                    </View>
                    {c.phone ? <Text style={{ fontSize: 12, color: theme.colors.textSecondary, marginTop: 3 }}>📞 {c.phone}</Text> : null}
                    {c.email ? <Text style={{ fontSize: 12, color: theme.colors.textSecondary, marginTop: 2 }}>✉️ {c.email}</Text> : null}
                  </View>
                  <TouchableOpacity onPress={() => open(c)}><MaterialIcons name="edit" size={20} color={theme.colors.primary} /></TouchableOpacity>
                  <TouchableOpacity onPress={() => Alert.alert('Delete?', c.name, [{ text: 'Cancel', style: 'cancel' }, { text: 'Delete', style: 'destructive', onPress: () => onDelete(c.id) }])} style={{ marginLeft: 8 }}>
                    <MaterialIcons name="delete-outline" size={20} color={theme.colors.error} />
                  </TouchableOpacity>
                </View>
              </Card>
            ))}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

function SettingRow({ icon, label, value, onPress }: any) {
  const { theme } = useTheme();
  return (
    <TouchableOpacity disabled={!onPress} onPress={onPress} style={styles.row}>
      <MaterialIcons name={icon} size={20} color={theme.colors.primary} />
      <View style={{ flex: 1, marginLeft: 12 }}>
        <Text style={{ fontSize: 14, fontWeight: '600', color: theme.colors.text }}>{label}</Text>
        <Text style={{ fontSize: 12, color: theme.colors.textSecondary, marginTop: 2 }} numberOfLines={1}>{value}</Text>
      </View>
      {onPress && <MaterialIcons name="chevron-right" size={22} color={theme.colors.textMuted} />}
    </TouchableOpacity>
  );
}

function Divider() {
  const { theme } = useTheme();
  return <View style={{ height: 1, backgroundColor: theme.colors.border, marginVertical: 4 }} />;
}

const styles = StyleSheet.create({
  sectionLabel: { fontSize: 12, fontWeight: '700', color: '#64748B', textTransform: 'uppercase', letterSpacing: 0.5, marginTop: 8, marginBottom: 8, paddingHorizontal: 4 },
  row: { flexDirection: 'row', alignItems: 'center', paddingVertical: 12 },
});
