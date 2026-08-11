import React, { useState } from 'react';
import { View, ScrollView, TouchableOpacity, Alert } from 'react-native';
import { useData } from '@/src/contexts/DataContext';
import { Badge, Button, Card, Input } from '@/src/components/UI';
import { addUniqueListValue, removeListValue } from '@/src/features/setup/utils/list';

export function PaymentMethodsSetup() {
  const { company, updateCompany } = useData();
  const [saving, setSaving] = useState(false);
  const [input, setInput] = useState('');
  const [methods, setMethods] = useState<string[]>(company?.paymentMethods || ['Cash', 'QR', 'Transfer']);

  React.useEffect(() => {
    setMethods(company?.paymentMethods || ['Cash', 'QR', 'Transfer']);
  }, [company]);

  const add = () => {
    const result = addUniqueListValue(methods, input, true);
    if (!result.added) return;
    setMethods(result.next);
    setInput('');
  };

  const remove = (method: string) => setMethods((prev) => removeListValue(prev, method));

  const save = async () => {
    try {
      setSaving(true);
      await updateCompany({ paymentMethods: methods });
      Alert.alert('Saved', 'Payment methods updated');
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : 'Could not save payment methods';
      Alert.alert('Failed', message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 40 }} showsVerticalScrollIndicator>
      <Card>
        <Input label="Add Method" value={input} onChangeText={setInput} placeholder="e.g. E-Wallet" />
        <Button title="Add Method" onPress={add} variant="secondary" icon="add" fullWidth />
        <View style={{ height: 10 }} />
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
          {methods.map((method) => (
            <TouchableOpacity key={method} onPress={() => remove(method)}>
              <Badge label={`${method}  x`} tone="primary" />
            </TouchableOpacity>
          ))}
        </View>
        <View style={{ height: 12 }} />
        <Button title="Save Payment Methods" onPress={save} loading={saving} icon="check" fullWidth />
      </Card>
    </ScrollView>
  );
}
