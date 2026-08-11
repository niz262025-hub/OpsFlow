import React, { useState } from 'react';
import { Alert, ScrollView } from 'react-native';
import { useData } from '@/src/contexts/DataContext';
import { Button, Card, Input } from '@/src/components/UI';

export function TaxSetup() {
  const { company, updateCompany } = useData();
  const [saving, setSaving] = useState(false);
  const [taxRate, setTaxRate] = useState(String(company?.taxRate ?? 0));
  const [taxLabel, setTaxLabel] = useState(company?.taxLabel || 'SST');
  const [taxRegistrationNumber, setTaxRegistrationNumber] = useState(company?.taxRegistrationNumber || '');

  React.useEffect(() => {
    setTaxRate(String(company?.taxRate ?? 0));
    setTaxLabel(company?.taxLabel || 'SST');
    setTaxRegistrationNumber(company?.taxRegistrationNumber || '');
  }, [company]);

  const save = async () => {
    try {
      setSaving(true);
      await updateCompany({
        taxRate: parseFloat(taxRate) || 0,
        taxLabel: taxLabel.trim() || 'SST',
        taxRegistrationNumber: taxRegistrationNumber.trim() || undefined,
      });
      Alert.alert('Saved', 'Tax settings updated');
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : 'Could not save tax settings';
      Alert.alert('Failed', message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 40 }} showsVerticalScrollIndicator>
      <Card>
        <Input label="Tax Label" value={taxLabel} onChangeText={setTaxLabel} placeholder="SST / GST / VAT" />
        <Input label="Tax Rate (%)" value={taxRate} onChangeText={setTaxRate} keyboardType="decimal-pad" />
        <Input label="Tax Registration Number" value={taxRegistrationNumber} onChangeText={setTaxRegistrationNumber} />
        <Button title="Save Tax Settings" onPress={save} loading={saving} icon="check" fullWidth />
      </Card>
    </ScrollView>
  );
}
