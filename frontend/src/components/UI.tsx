import React from 'react';
import { View, Text, TouchableOpacity, ActivityIndicator, StyleSheet, ViewStyle, TextStyle } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useTheme } from '@/src/contexts/ThemeContext';
import { radius, spacing } from '@/src/constants/theme';

// ---------- Card ----------
export function Card({ children, style, padded = true }: { children: React.ReactNode; style?: ViewStyle; padded?: boolean }) {
  const { theme } = useTheme();
  return (
    <View style={[
      {
        backgroundColor: theme.colors.card,
        borderRadius: radius.lg,
        padding: padded ? spacing.md : 0,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: theme.isDark ? 0.2 : 0.05,
        shadowRadius: 8,
        elevation: 2,
        borderWidth: 1,
        borderColor: theme.colors.border,
      },
      style,
    ]}>
      {children}
    </View>
  );
}

// ---------- Button ----------
interface BtnProps {
  title: string;
  onPress: () => void;
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger';
  disabled?: boolean;
  loading?: boolean;
  icon?: keyof typeof MaterialIcons.glyphMap;
  fullWidth?: boolean;
  size?: 'sm' | 'md' | 'lg';
  testID?: string;
  style?: ViewStyle;
}
export function Button({ title, onPress, variant = 'primary', disabled, loading, icon, fullWidth, size = 'md', testID, style }: BtnProps) {
  const { theme } = useTheme();
  const heights = { sm: 36, md: 48, lg: 56 };
  const bg = variant === 'primary' ? theme.colors.primary
    : variant === 'secondary' ? theme.colors.cardMuted
    : variant === 'danger' ? theme.colors.error
    : 'transparent';
  const textColor = variant === 'primary' || variant === 'danger' ? theme.colors.white
    : variant === 'secondary' ? theme.colors.text
    : theme.colors.primary;

  return (
    <TouchableOpacity
      testID={testID}
      onPress={onPress}
      disabled={disabled || loading}
      activeOpacity={0.8}
      style={[{
        height: heights[size],
        backgroundColor: bg,
        borderRadius: radius.md,
        paddingHorizontal: spacing.lg,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        opacity: disabled ? 0.5 : 1,
        alignSelf: fullWidth ? 'stretch' : 'flex-start',
        gap: 8,
      }, style]}
    >
      {loading ? <ActivityIndicator color={textColor} /> : (
        <>
          {icon && <MaterialIcons name={icon} size={size === 'sm' ? 16 : 20} color={textColor} />}
          <Text style={{ color: textColor, fontWeight: '600', fontSize: size === 'sm' ? 13 : 15 }}>{title}</Text>
        </>
      )}
    </TouchableOpacity>
  );
}

// ---------- Input ----------
interface InputProps {
  label?: string;
  value: string;
  onChangeText: (v: string) => void;
  placeholder?: string;
  icon?: keyof typeof MaterialIcons.glyphMap;
  keyboardType?: any;
  secureTextEntry?: boolean;
  autoCapitalize?: any;
  error?: string;
  helper?: string;
  prefix?: string;
  editable?: boolean;
  testID?: string;
  multiline?: boolean;
  numberOfLines?: number;
}
export function Input({ label, value, onChangeText, placeholder, icon, keyboardType, secureTextEntry, autoCapitalize, error, helper, prefix, editable = true, testID, multiline, numberOfLines }: InputProps) {
  const { theme } = useTheme();
  const [focused, setFocused] = React.useState(false);
  const { TextInput } = require('react-native');
  return (
    <View style={{ marginBottom: spacing.md }}>
      {label && <Text style={{ fontSize: 13, fontWeight: '600', color: theme.colors.text, marginBottom: 6 }}>{label}</Text>}
      <View style={{
        flexDirection: 'row',
        alignItems: multiline ? 'flex-start' : 'center',
        backgroundColor: theme.colors.surface,
        borderWidth: 1.5,
        borderColor: error ? theme.colors.error : focused ? theme.colors.primary : theme.colors.border,
        borderRadius: radius.md,
        paddingHorizontal: 14,
        paddingVertical: multiline ? 10 : 0,
        minHeight: multiline ? 80 : 48,
      }}>
        {icon && <MaterialIcons name={icon} size={18} color={theme.colors.textSecondary} style={{ marginRight: 8 }} />}
        {prefix && <Text style={{ color: theme.colors.textSecondary, fontWeight: '600', marginRight: 6 }}>{prefix}</Text>}
        <TextInput
          testID={testID}
          value={value}
          onChangeText={onChangeText}
          placeholder={placeholder}
          placeholderTextColor={theme.colors.textMuted}
          keyboardType={keyboardType}
          secureTextEntry={secureTextEntry}
          autoCapitalize={autoCapitalize}
          editable={editable}
          multiline={multiline}
          numberOfLines={numberOfLines}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          style={{ flex: 1, color: theme.colors.text, fontSize: 15, paddingVertical: multiline ? 0 : 12, textAlignVertical: multiline ? 'top' : 'center' }}
        />
      </View>
      {error && <Text style={{ fontSize: 12, color: theme.colors.error, marginTop: 4 }}>{error}</Text>}
      {!error && helper && <Text style={{ fontSize: 12, color: theme.colors.textSecondary, marginTop: 4 }}>{helper}</Text>}
    </View>
  );
}

// ---------- EmptyState ----------
export function EmptyState({ icon = 'inbox', title, subtitle, actionLabel, onAction }: { icon?: any; title: string; subtitle?: string; actionLabel?: string; onAction?: () => void }) {
  const { theme } = useTheme();
  return (
    <View style={{ alignItems: 'center', justifyContent: 'center', paddingVertical: 60, paddingHorizontal: 32 }}>
      <View style={{ width: 72, height: 72, borderRadius: 36, backgroundColor: theme.colors.cardMuted, alignItems: 'center', justifyContent: 'center', marginBottom: 20 }}>
        <MaterialIcons name={icon} size={36} color={theme.colors.textSecondary} />
      </View>
      <Text style={{ fontSize: 17, fontWeight: '700', color: theme.colors.text, marginBottom: 6 }}>{title}</Text>
      {subtitle && <Text style={{ fontSize: 14, color: theme.colors.textSecondary, textAlign: 'center', marginBottom: 20 }}>{subtitle}</Text>}
      {actionLabel && onAction && <Button title={actionLabel} onPress={onAction} icon="add" />}
    </View>
  );
}

// ---------- LoadingState ----------
export function LoadingState({ label = 'Loading...' }: { label?: string }) {
  const { theme } = useTheme();
  return (
    <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
      <ActivityIndicator size="large" color={theme.colors.primary} />
      <Text style={{ marginTop: 12, color: theme.colors.textSecondary }}>{label}</Text>
    </View>
  );
}

// ---------- SearchBar ----------
export function SearchBar({ value, onChangeText, placeholder = 'Search...', testID }: { value: string; onChangeText: (v: string) => void; placeholder?: string; testID?: string }) {
  const { theme } = useTheme();
  const { TextInput } = require('react-native');
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: theme.colors.surface, borderRadius: radius.md, paddingHorizontal: 14, borderWidth: 1, borderColor: theme.colors.border, height: 48 }}>
      <MaterialIcons name="search" size={20} color={theme.colors.textSecondary} />
      <TextInput
        testID={testID}
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={theme.colors.textMuted}
        style={{ flex: 1, marginLeft: 8, color: theme.colors.text, fontSize: 15 }}
      />
      {value.length > 0 && (
        <TouchableOpacity onPress={() => onChangeText('')}>
          <MaterialIcons name="close" size={18} color={theme.colors.textSecondary} />
        </TouchableOpacity>
      )}
    </View>
  );
}

// ---------- Screen wrapper ----------
export function Screen({ children }: { children: React.ReactNode }) {
  const { theme } = useTheme();
  return <View style={{ flex: 1, backgroundColor: theme.colors.background }}>{children}</View>;
}

// ---------- Header ----------
export function Header({ title, subtitle, right, onBack }: { title: string; subtitle?: string; right?: React.ReactNode; onBack?: () => void }) {
  const { theme } = useTheme();
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingVertical: 16, backgroundColor: theme.colors.surface, borderBottomWidth: 1, borderBottomColor: theme.colors.border }}>
      <View style={{ flex: 1, flexDirection: 'row', alignItems: 'center' }}>
        {onBack && (
          <TouchableOpacity onPress={onBack} style={{ marginRight: 12 }}>
            <MaterialIcons name="arrow-back" size={24} color={theme.colors.text} />
          </TouchableOpacity>
        )}
        <View>
          <Text style={{ fontSize: 22, fontWeight: '700', color: theme.colors.text }}>{title}</Text>
          {subtitle && <Text style={{ fontSize: 12, color: theme.colors.textSecondary, marginTop: 2 }}>{subtitle}</Text>}
        </View>
      </View>
      {right}
    </View>
  );
}

// ---------- Badge ----------
export function Badge({ label, tone = 'default' }: { label: string; tone?: 'default' | 'success' | 'warning' | 'error' | 'primary' }) {
  const { theme } = useTheme();
  const bg = tone === 'success' ? theme.colors.successLight
    : tone === 'warning' ? theme.colors.warningLight
    : tone === 'error' ? theme.colors.errorLight
    : tone === 'primary' ? theme.colors.primaryLight
    : theme.colors.cardMuted;
  const fg = tone === 'success' ? theme.colors.success
    : tone === 'warning' ? theme.colors.warning
    : tone === 'error' ? theme.colors.error
    : tone === 'primary' ? theme.colors.primary
    : theme.colors.textSecondary;
  return (
    <View style={{ backgroundColor: bg, paddingHorizontal: 10, paddingVertical: 4, borderRadius: radius.full, alignSelf: 'flex-start' }}>
      <Text style={{ color: fg, fontSize: 11, fontWeight: '700' }}>{label}</Text>
    </View>
  );
}
