import React, { useState } from 'react';
import { View, Text, ScrollView, Alert } from 'react-native';
import { useData } from '@/src/contexts/DataContext';
import { Button, Card, Input } from '@/src/components/UI';
import { SetupChip } from '@/src/features/setup/components/SetupChip';

export function BarcodeSettingsSetup() {
  const { company, updateCompany } = useData();
  const [saving, setSaving] = useState(false);
  const [prefix, setPrefix] = useState(company?.barcodePrefix || 'BF');
  const [digits, setDigits] = useState(String(company?.barcodeDigits ?? 6));
  const [autoGenerate, setAutoGenerate] = useState(company?.barcodeAutoGenerate ?? true);

  React.useEffect(() => {
    setPrefix(company?.barcodePrefix || 'BF');
    setDigits(String(company?.barcodeDigits ?? 6));
    setAutoGenerate(company?.barcodeAutoGenerate ?? true);
  }, [company]);

  const save = async () => {
    try {
      setSaving(true);
      await updateCompany({
        barcodePrefix: prefix.trim() || 'BF',
        barcodeDigits: Math.max(4, Math.min(12, parseInt(digits, 10) || 6)),
        barcodeAutoGenerate: autoGenerate,
      });
      Alert.alert('Saved', 'Barcode settings updated');
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : 'Could not save barcode settings';
      Alert.alert('Failed', message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 40 }} showsVerticalScrollIndicator>
      <Card>
        <Input label="Barcode Prefix" value={prefix} onChangeText={setPrefix} />
        <Input label="Barcode Digits" value={digits} onChangeText={setDigits} keyboardType="number-pad" />
        <Text style={{ fontSize: 13, fontWeight: '600', marginBottom: 6 }}>Generation</Text>
        <View style={{ flexDirection: 'row', gap: 8, marginBottom: 12 }}>
          <SetupChip label="Auto Generate" active={autoGenerate} onPress={() => setAutoGenerate(true)} />
          <SetupChip label="Manual" active={!autoGenerate} onPress={() => setAutoGenerate(false)} />
        </View>
        <Button title="Save Barcode Settings" onPress={save} loading={saving} icon="check" fullWidth />
      </Card>
    </ScrollView>
  );
}
