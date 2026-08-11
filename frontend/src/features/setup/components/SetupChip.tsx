import React from 'react';
import { TouchableOpacity, Text } from 'react-native';
import { useTheme } from '@/src/contexts/ThemeContext';

export function SetupChip({ label, active, onPress }: { label: string; active: boolean; onPress: () => void }) {
  const { theme } = useTheme();
  const slug = label.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

  return (
    <TouchableOpacity
      onPress={onPress}
      testID={`setup-chip-${slug}`}
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ selected: active }}
      style={{
        height: 36,
        borderRadius: 18,
        paddingHorizontal: 14,
        backgroundColor: active ? theme.colors.primary : theme.colors.cardMuted,
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <Text style={{ fontSize: 13, fontWeight: '700', color: active ? '#FFF' : theme.colors.text }}>{label}</Text>
    </TouchableOpacity>
  );
}
