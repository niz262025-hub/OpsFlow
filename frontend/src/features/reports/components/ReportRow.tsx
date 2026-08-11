import React from 'react';
import { View, Text } from 'react-native';
import { useTheme } from '@/src/contexts/ThemeContext';
import { formatMYR } from '@/src/utils/currency';

export function ReportRow({ label, value, tone, big }: { label: string; value: number; tone: 'primary' | 'success' | 'error' | 'warning'; big?: boolean }) {
  const { theme } = useTheme();
  const color = tone === 'success' ? theme.colors.success : tone === 'error' ? theme.colors.error : tone === 'warning' ? theme.colors.warning : theme.colors.primary;
  return (
    <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 }}>
      <Text style={{ fontSize: big ? 15 : 13, color: theme.colors.text, fontWeight: big ? '700' : '500' }}>{label}</Text>
      <Text style={{ fontSize: big ? 18 : 14, color, fontWeight: '800' }}>{formatMYR(value)}</Text>
    </View>
  );
}
