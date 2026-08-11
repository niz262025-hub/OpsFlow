import React, { useState } from 'react';
import { View, Text, ScrollView, Alert } from 'react-native';
import { useData } from '@/src/contexts/DataContext';
import { Button, Card, Input } from '@/src/components/UI';
import { SetupChip } from '@/src/features/setup/components/SetupChip';

export function ReceiptSettingsSetup() {
  const { company, updateCompany } = useData();
  const [saving, setSaving] = useState(false);
  const [receiptHeader, setReceiptHeader] = useState(company?.receiptHeader || 'Thank you for your purchase');
  const [receiptFooter, setReceiptFooter] = useState(company?.receiptFooter || 'Please come again');
  const [showTax, setShowTax] = useState(company?.receiptShowTaxNumber ?? true);
  const [showCashier, setShowCashier] = useState(company?.receiptShowCashier ?? true);
  const [showCustomer, setShowCustomer] = useState(company?.receiptShowCustomer ?? true);

  React.useEffect(() => {
    setReceiptHeader(company?.receiptHeader || 'Thank you for your purchase');
    setReceiptFooter(company?.receiptFooter || 'Please come again');
    setShowTax(company?.receiptShowTaxNumber ?? true);
    setShowCashier(company?.receiptShowCashier ?? true);
    setShowCustomer(company?.receiptShowCustomer ?? true);
  }, [company]);

  const save = async () => {
    try {
      setSaving(true);
      await updateCompany({
        receiptHeader: receiptHeader.trim() || undefined,
        receiptFooter: receiptFooter.trim() || undefined,
        receiptShowTaxNumber: showTax,
        receiptShowCashier: showCashier,
        receiptShowCustomer: showCustomer,
      });
      Alert.alert('Saved', 'Receipt settings updated');
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : 'Could not save receipt settings';
      Alert.alert('Failed', message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 40 }} showsVerticalScrollIndicator>
      <Card>
        <Input label="Receipt Header" value={receiptHeader} onChangeText={setReceiptHeader} multiline />
        <Input label="Receipt Footer" value={receiptFooter} onChangeText={setReceiptFooter} multiline />
        <Text style={{ fontSize: 13, fontWeight: '600', marginBottom: 6 }}>Display Options</Text>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 12 }}>
          <SetupChip label={`Tax No: ${showTax ? 'ON' : 'OFF'}`} active={showTax} onPress={() => setShowTax((v) => !v)} />
          <SetupChip label={`Cashier: ${showCashier ? 'ON' : 'OFF'}`} active={showCashier} onPress={() => setShowCashier((v) => !v)} />
          <SetupChip label={`Customer: ${showCustomer ? 'ON' : 'OFF'}`} active={showCustomer} onPress={() => setShowCustomer((v) => !v)} />
        </View>
        <Button title="Save Receipt Settings" onPress={save} loading={saving} icon="check" fullWidth />
      </Card>
    </ScrollView>
  );
}
