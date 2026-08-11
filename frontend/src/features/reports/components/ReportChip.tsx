import React from 'react';
import { TouchableOpacity, Text } from 'react-native';
import { useTheme } from '@/src/contexts/ThemeContext';

export function ReportChip({ label, active, onPress }: { label: string; active: boolean; onPress: () => void }) {
  const { theme } = useTheme();
  return (
    <TouchableOpacity
      onPress={onPress}
      style={{
        height: 36,
        borderRadius: 18,
        paddingHorizontal: 14,
        backgroundColor: active ? theme.colors.primary : theme.colors.cardMuted,
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <Text style={{ color: active ? '#FFF' : theme.colors.text, fontSize: 12, fontWeight: '700' }}>{label}</Text>
    </TouchableOpacity>
  );
}
