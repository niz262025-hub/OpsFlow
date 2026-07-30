import React, { useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, Modal, Alert, KeyboardAvoidingView, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { MaterialIcons } from '@expo/vector-icons';
import { useTheme } from '@/src/contexts/ThemeContext';
import { useData } from '@/src/contexts/DataContext';
import { formatMYR } from '@/src/utils/currency';
import { Badge, Button, Card, EmptyState, Header, Input, Screen } from '@/src/components/UI';

const CATS = ['Rent', 'Utilities', 'Salary', 'Supplies', 'Marketing', 'Transport', 'Food', 'Maintenance', 'Other'];

export default function Expenses() {
  const { theme } = useTheme();
  const router = useRouter();
  const { expenses, createExpense, updateExpense, deleteExpense } = useData();
  const [modal, setModal] = useState(false);
  const [editing, setEditing] = useState<any>(null);
  const [form, setForm] = useState({ category: 'Rent', amount: '', description: '' });

  const openNew = () => { setEditing(null); setForm({ category: 'Rent', amount: '', description: '' }); setModal(true); };
  const openEdit = (e: any) => { setEditing(e); setForm({ category: e.category, amount: String(e.amount), description: e.description || '' }); setModal(true); };

  const save = async () => {
    const amt = parseFloat(form.amount);
    if (isNaN(amt) || amt <= 0) return Alert.alert('Invalid', 'Amount must be > 0');
    try {
      if (editing) await updateExpense(editing.id, { category: form.category, amount: amt, description: form.description });
      else await createExpense({ category: form.category, amount: amt, description: form.description, date: new Date() });
      setModal(false);
    } catch (e: any) { Alert.alert('Error', e?.message || 'Failed'); }
  };

  const total = expenses.reduce((s, e) => s + e.amount, 0);

  return (
    <Screen>
      <SafeAreaView style={{ flex: 1 }} edges={['top', 'bottom']}>
        <Header title="Expenses" onBack={() => router.back()} right={<TouchableOpacity onPress={openNew} style={{ width: 40, height: 40, borderRadius: 10, backgroundColor: theme.colors.primary, alignItems: 'center', justifyContent: 'center' }} testID="add-expense-button"><MaterialIcons name="add" size={22} color="#FFF" /></TouchableOpacity>} />
        <ScrollView contentContainerStyle={{ padding: 16 }}>
          <Card style={{ marginBottom: 12, backgroundColor: theme.colors.primaryLight }}>
            <Text style={{ fontSize: 12, color: theme.colors.primary, fontWeight: '700' }}>TOTAL EXPENSES</Text>
            <Text style={{ fontSize: 28, fontWeight: '800', color: theme.colors.primary, marginTop: 4 }}>{formatMYR(total)}</Text>
            <Text style={{ fontSize: 12, color: theme.colors.primary, marginTop: 2 }}>{expenses.length} record(s)</Text>
          </Card>
          {expenses.length === 0 ? (
            <EmptyState icon="receipt" title="No expenses yet" subtitle="Track your business expenses to see accurate profit" actionLabel="Add Expense" onAction={openNew} />
          ) : expenses.map((e) => (
            <Card key={e.id} style={{ marginBottom: 8 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <View style={{ width: 40, height: 40, borderRadius: 12, backgroundColor: theme.colors.errorLight, alignItems: 'center', justifyContent: 'center' }}>
                  <MaterialIcons name="trending-down" size={20} color={theme.colors.error} />
                </View>
                <View style={{ flex: 1, marginLeft: 12 }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                    <Badge label={e.category} tone="default" />
                  </View>
                  {e.description ? <Text style={{ fontSize: 13, color: theme.colors.text, marginTop: 4 }}>{e.description}</Text> : null}
                </View>
                <View style={{ alignItems: 'flex-end' }}>
                  <Text style={{ fontSize: 16, fontWeight: '800', color: theme.colors.error }}>{formatMYR(e.amount)}</Text>
                  <View style={{ flexDirection: 'row', gap: 8, marginTop: 6 }}>
                    <TouchableOpacity onPress={() => openEdit(e)}><MaterialIcons name="edit" size={18} color={theme.colors.primary} /></TouchableOpacity>
                    <TouchableOpacity onPress={() => Alert.alert('Delete?', 'Remove this expense?', [{ text: 'Cancel', style: 'cancel' }, { text: 'Delete', style: 'destructive', onPress: () => deleteExpense(e.id) }])}>
                      <MaterialIcons name="delete-outline" size={18} color={theme.colors.error} />
                    </TouchableOpacity>
                  </View>
                </View>
              </View>
            </Card>
          ))}
        </ScrollView>

        <Modal visible={modal} transparent animationType="slide" onRequestClose={() => setModal(false)}>
          <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1, backgroundColor: theme.colors.overlay, justifyContent: 'flex-end' }}>
            <View style={{ backgroundColor: theme.colors.background, borderTopLeftRadius: 24, borderTopRightRadius: 24, maxHeight: '90%' }}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 20 }}>
                <Text style={{ fontSize: 20, fontWeight: '800', color: theme.colors.text }}>{editing ? 'Edit Expense' : 'New Expense'}</Text>
                <TouchableOpacity onPress={() => setModal(false)}><MaterialIcons name="close" size={26} color={theme.colors.text} /></TouchableOpacity>
              </View>
              <ScrollView contentContainerStyle={{ padding: 20, paddingTop: 0 }}>
                <Text style={{ fontSize: 13, fontWeight: '600', color: theme.colors.text, marginBottom: 6 }}>Category</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, marginBottom: 16 }}>
                  {CATS.map((c) => (
                    <TouchableOpacity key={c} onPress={() => setForm({ ...form, category: c })} style={{ paddingHorizontal: 14, height: 36, borderRadius: 18, backgroundColor: form.category === c ? theme.colors.primary : theme.colors.cardMuted, alignItems: 'center', justifyContent: 'center' }}>
                      <Text style={{ color: form.category === c ? '#FFF' : theme.colors.text, fontSize: 13, fontWeight: '600' }}>{c}</Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
                <Input label="Amount" value={form.amount} onChangeText={(v) => setForm({ ...form, amount: v })} placeholder="0.00" keyboardType="decimal-pad" prefix="RM" testID="expense-amount-input" />
                <Input label="Description" value={form.description} onChangeText={(v) => setForm({ ...form, description: v })} placeholder="Optional" multiline />
                <Button title={editing ? 'Update' : 'Save'} onPress={save} icon="check" fullWidth size="lg" testID="save-expense-button" />
                <View style={{ height: 40 }} />
              </ScrollView>
            </View>
          </KeyboardAvoidingView>
        </Modal>
      </SafeAreaView>
    </Screen>
  );
}
