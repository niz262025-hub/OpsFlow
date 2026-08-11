import React, { useState } from 'react';
import { View, ScrollView, TouchableOpacity, Alert } from 'react-native';
import { useData } from '@/src/contexts/DataContext';
import { Badge, Button, Card, Input } from '@/src/components/UI';
import { addUniqueListValue, removeListValue } from '@/src/features/setup/utils/list';

export function UnitsSetup() {
  const { company, updateCompany } = useData();
  const [saving, setSaving] = useState(false);
  const [input, setInput] = useState('');
  const [units, setUnits] = useState<string[]>(company?.unitOptions || ['pcs', 'box', 'pack', 'kg', 'liter']);

  React.useEffect(() => {
    setUnits(company?.unitOptions || ['pcs', 'box', 'pack', 'kg', 'liter']);
  }, [company]);

  const add = () => {
    const result = addUniqueListValue(units, input, false);
    if (!result.added) return;
    setUnits(result.next);
    setInput('');
  };

  const remove = (unit: string) => setUnits((prev) => removeListValue(prev, unit));

  const save = async () => {
    try {
      setSaving(true);
      await updateCompany({ unitOptions: units });
      Alert.alert('Saved', 'Unit settings updated');
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : 'Could not save units';
      Alert.alert('Failed', message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 40 }} showsVerticalScrollIndicator>
      <Card>
        <Input label="Add Unit" value={input} onChangeText={setInput} placeholder="e.g. carton" testID="unit-input" accessibilityLabel="Add Unit" autoFocus />
        <Button title="Add Unit" onPress={add} variant="secondary" icon="add" fullWidth testID="add-unit-button" />
        <View style={{ height: 10 }} />
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
          {units.map((unit) => (
            <TouchableOpacity key={unit} onPress={() => remove(unit)}>
              <Badge label={`${unit}  x`} tone="primary" />
            </TouchableOpacity>
          ))}
        </View>
        <View style={{ height: 12 }} />
        <Button title="Save Unit Settings" onPress={save} loading={saving} icon="check" fullWidth testID="save-unit-settings-button" />
      </Card>
    </ScrollView>
  );
}
