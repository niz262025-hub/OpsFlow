import React, { useState } from 'react';
import { Alert, ScrollView } from 'react-native';
import { useData } from '@/src/contexts/DataContext';
import { Button, Card, Input } from '@/src/components/UI';

export function CompanySetup() {
  const { company, updateCompany } = useData();
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    name: company?.name || '',
    ssmNumber: company?.ssmNumber || '',
    ownerName: company?.ownerName || '',
    phone: company?.phone || '',
    email: company?.email || '',
    address: company?.address || '',
    taxRate: String(company?.taxRate ?? 0),
    lowStockThreshold: String(company?.lowStockThreshold ?? 10),
    receiptFooter: company?.receiptFooter || '',
  });

  React.useEffect(() => {
    setForm({
      name: company?.name || '',
      ssmNumber: company?.ssmNumber || '',
      ownerName: company?.ownerName || '',
      phone: company?.phone || '',
      email: company?.email || '',
      address: company?.address || '',
      taxRate: String(company?.taxRate ?? 0),
      lowStockThreshold: String(company?.lowStockThreshold ?? 10),
      receiptFooter: company?.receiptFooter || '',
    });
  }, [company]);

  const save = async () => {
    try {
      setSaving(true);
      await updateCompany({
        name: form.name.trim(),
        ssmNumber: form.ssmNumber.trim() || undefined,
        ownerName: form.ownerName.trim() || undefined,
        phone: form.phone.trim() || undefined,
        email: form.email.trim() || undefined,
        address: form.address.trim() || undefined,
        taxRate: parseFloat(form.taxRate) || 0,
        lowStockThreshold: parseInt(form.lowStockThreshold, 10) || 10,
        receiptFooter: form.receiptFooter.trim() || undefined,
      });
      Alert.alert('Saved', 'Company settings updated');
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : 'Could not update company';
      Alert.alert('Save failed', message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 40 }} showsVerticalScrollIndicator>
      <Card style={{ marginBottom: 12 }}>
        <Input label="Company Name" value={form.name} onChangeText={(v) => setForm({ ...form, name: v })} />
        <Input label="SSM Number" value={form.ssmNumber} onChangeText={(v) => setForm({ ...form, ssmNumber: v })} />
        <Input label="Owner Name" value={form.ownerName} onChangeText={(v) => setForm({ ...form, ownerName: v })} />
        <Input label="Phone" value={form.phone} onChangeText={(v) => setForm({ ...form, phone: v })} />
        <Input label="Email" value={form.email} onChangeText={(v) => setForm({ ...form, email: v })} keyboardType="email-address" autoCapitalize="none" />
        <Input label="Address" value={form.address} onChangeText={(v) => setForm({ ...form, address: v })} multiline />
        <Input label="Tax Rate (%)" value={form.taxRate} onChangeText={(v) => setForm({ ...form, taxRate: v })} keyboardType="decimal-pad" />
        <Input label="Low Stock Threshold" value={form.lowStockThreshold} onChangeText={(v) => setForm({ ...form, lowStockThreshold: v })} keyboardType="number-pad" />
        <Input label="Receipt Footer" value={form.receiptFooter} onChangeText={(v) => setForm({ ...form, receiptFooter: v })} multiline />
        <Button title="Save Company" onPress={save} loading={saving} icon="check" fullWidth />
      </Card>
    </ScrollView>
  );
}
