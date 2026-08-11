import React from 'react';
import { View, Text, TouchableOpacity, ActivityIndicator, TextInput, ViewStyle, Modal, ScrollView, StyleSheet, KeyboardAvoidingView, Platform } from 'react-native';
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
  accessibilityLabel?: string;
  autoFocus?: boolean;
  returnKeyType?: any;
  onSubmitEditing?: () => void;
  inputRef?: React.Ref<TextInput>;
}
export function Input({ label, value, onChangeText, placeholder, icon, keyboardType, secureTextEntry, autoCapitalize, error, helper, prefix, editable = true, testID, multiline, numberOfLines, accessibilityLabel, autoFocus, returnKeyType, onSubmitEditing, inputRef }: InputProps) {
  const { theme } = useTheme();
  const [focused, setFocused] = React.useState(false);
  const slug = React.useMemo(() => (label || placeholder || 'input').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, ''), [label, placeholder]);
  const inputTestId = testID || (slug ? `input-${slug}` : undefined);
  const resolvedAccessibilityLabel = accessibilityLabel || label || placeholder || 'Input';
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
          ref={inputRef}
          testID={inputTestId}
          accessibilityLabel={resolvedAccessibilityLabel}
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
          autoFocus={autoFocus}
          returnKeyType={returnKeyType}
          onSubmitEditing={onSubmitEditing}
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
export function SearchBar({ value, onChangeText, placeholder = 'Search...', testID, onSubmitEditing, returnKeyType, inputRef, autoFocus }: { value: string; onChangeText: (v: string) => void; placeholder?: string; testID?: string; onSubmitEditing?: () => void; returnKeyType?: any; inputRef?: React.Ref<TextInput>; autoFocus?: boolean }) {
  const { theme } = useTheme();
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: theme.colors.surface, borderRadius: radius.md, paddingHorizontal: 14, borderWidth: 1, borderColor: theme.colors.border, height: 48 }}>
      <MaterialIcons name="search" size={20} color={theme.colors.textSecondary} />
      <TextInput
        ref={inputRef}
        testID={testID}
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={theme.colors.textMuted}
        returnKeyType={returnKeyType}
        onSubmitEditing={onSubmitEditing}
        autoFocus={autoFocus}
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
  return <View style={{ flex: 1, minHeight: 0, backgroundColor: theme.colors.background }}>{children}</View>;
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

// ---------- AppModal ----------
export function AppModal({
  visible,
  title,
  subtitle,
  onClose,
  footer,
  children,
  testID = 'app-modal',
  closeButtonTestID = 'modal-close-button',
}: {
  visible: boolean;
  title: string;
  subtitle?: string;
  onClose: () => void;
  footer?: React.ReactNode;
  children: React.ReactNode;
  testID?: string;
  closeButtonTestID?: string;
}) {
  const { theme } = useTheme();
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
        <View style={[StyleSheet.absoluteFillObject, { backgroundColor: theme.colors.overlay, justifyContent: 'center', padding: 16 }] }>
          <View testID={testID} style={{ backgroundColor: theme.colors.background, borderRadius: radius.lg, maxHeight: '92%', overflow: 'hidden' }}>
            <View style={{ flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', padding: 16, borderBottomWidth: 1, borderBottomColor: theme.colors.border }}>
              <View style={{ flex: 1, paddingRight: 12 }}>
                <Text style={{ fontSize: 18, fontWeight: '800', color: theme.colors.text }}>{title}</Text>
                {subtitle ? <Text style={{ marginTop: 4, fontSize: 12, color: theme.colors.textSecondary, lineHeight: 18 }}>{subtitle}</Text> : null}
              </View>
              <TouchableOpacity testID={closeButtonTestID} onPress={onClose} style={{ padding: 4 }} accessibilityRole="button" accessibilityLabel="Close modal">
                <MaterialIcons name="close" size={24} color={theme.colors.text} />
              </TouchableOpacity>
            </View>
            <ScrollView contentContainerStyle={{ padding: 16 }} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
              {children}
            </ScrollView>
            {footer ? <View style={{ padding: 16, borderTopWidth: 1, borderTopColor: theme.colors.border }}>{footer}</View> : null}
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

type DataTableColumn<T> = {
  key: string;
  title: string;
  width?: number;
  sortValue?: (row: T) => string | number;
  render?: (row: T) => React.ReactNode;
};

export function DataTable<T extends { id?: string; uid?: string }>({
  rows,
  columns,
  selectable = false,
  onBulkDelete,
}: {
  rows: T[];
  columns: DataTableColumn<T>[];
  selectable?: boolean;
  onBulkDelete?: (ids: string[]) => Promise<void> | void;
  exportFileName?: string;
}) {
  const { theme } = useTheme();
  const [sortKey, setSortKey] = React.useState<string | null>(null);
  const [sortAsc, setSortAsc] = React.useState(true);
  const [selected, setSelected] = React.useState<Set<string>>(new Set());

  const getRowId = React.useCallback((row: T, index: number) => row.id || row.uid || String(index), []);

  const sortedRows = React.useMemo(() => {
    if (!sortKey) return rows;
    const column = columns.find((item) => item.key === sortKey);
    if (!column?.sortValue) return rows;
    return [...rows].sort((left, right) => {
      const a = column.sortValue ? column.sortValue(left) : '';
      const b = column.sortValue ? column.sortValue(right) : '';
      const result = String(a).localeCompare(String(b), undefined, { numeric: true, sensitivity: 'base' });
      return sortAsc ? result : -result;
    });
  }, [columns, rows, sortAsc, sortKey]);

  const toggleSort = (column: DataTableColumn<T>) => {
    if (!column.sortValue) return;
    setSortAsc((currentAsc) => (sortKey === column.key ? !currentAsc : true));
    setSortKey((currentKey) => (currentKey === column.key ? currentKey : column.key));
  };

  const toggleSelected = (row: T, index: number) => {
    const id = getRowId(row, index);
    setSelected((current) => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const toggleAll = () => {
    setSelected((current) => {
      if (current.size === sortedRows.length) return new Set();
      return new Set(sortedRows.map((row, index) => getRowId(row, index)));
    });
  };

  return (
    <View style={{ borderWidth: 1, borderColor: theme.colors.border, borderRadius: radius.lg, overflow: 'hidden', backgroundColor: theme.colors.background }}>
      {selectable && onBulkDelete ? (
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 12, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: theme.colors.border, backgroundColor: theme.colors.surface }}>
          <TouchableOpacity onPress={toggleAll} style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <MaterialIcons name={selected.size === sortedRows.length && sortedRows.length > 0 ? 'check-box' : 'check-box-outline-blank'} size={20} color={theme.colors.primary} />
            <Text style={{ color: theme.colors.text, fontWeight: '600' }}>{selected.size > 0 ? `${selected.size} selected` : 'Select all'}</Text>
          </TouchableOpacity>
          {selected.size > 0 ? (
            <TouchableOpacity onPress={() => onBulkDelete(Array.from(selected))} style={{ paddingHorizontal: 10, paddingVertical: 6 }}>
              <Text style={{ color: theme.colors.error, fontWeight: '700' }}>Delete selected</Text>
            </TouchableOpacity>
          ) : null}
        </View>
      ) : null}

      <ScrollView horizontal showsHorizontalScrollIndicator={false}>
        <View>
          <View style={{ flexDirection: 'row', backgroundColor: theme.colors.surface, borderBottomWidth: 1, borderBottomColor: theme.colors.border }}>
            {selectable ? <View style={{ width: 44, padding: 12 }} /> : null}
            {columns.map((column) => (
              <TouchableOpacity
                key={column.key}
                onPress={() => toggleSort(column)}
                disabled={!column.sortValue}
                style={{ width: column.width || 160, paddingHorizontal: 12, paddingVertical: 12, flexDirection: 'row', alignItems: 'center', gap: 4 }}
              >
                <Text style={{ color: theme.colors.textSecondary, fontWeight: '700', fontSize: 12 }}>{column.title}</Text>
                {sortKey === column.key ? <MaterialIcons name={sortAsc ? 'arrow-drop-up' : 'arrow-drop-down'} size={18} color={theme.colors.primary} /> : null}
              </TouchableOpacity>
            ))}
          </View>

          {sortedRows.length === 0 ? (
            <View style={{ padding: 20 }}>
              <Text style={{ color: theme.colors.textSecondary }}>No data available</Text>
            </View>
          ) : (
            sortedRows.map((row, rowIndex) => {
              const rowId = getRowId(row, rowIndex);
              const isSelected = selected.has(rowId);
              return (
                <View key={rowId} style={{ flexDirection: 'row', borderBottomWidth: 1, borderBottomColor: theme.colors.border, backgroundColor: isSelected ? theme.colors.primaryLight : theme.colors.background }}>
                  {selectable ? (
                    <TouchableOpacity onPress={() => toggleSelected(row, rowIndex)} style={{ width: 44, alignItems: 'center', justifyContent: 'center' }}>
                      <MaterialIcons name={isSelected ? 'check-box' : 'check-box-outline-blank'} size={20} color={theme.colors.primary} />
                    </TouchableOpacity>
                  ) : null}
                  {columns.map((column) => (
                    <View key={column.key} style={{ width: column.width || 160, paddingHorizontal: 12, paddingVertical: 12, justifyContent: 'center' }}>
                      {column.render ? column.render(row) : <Text style={{ color: theme.colors.text, fontSize: 13 }}>{String((row as any)[column.key] ?? '-')}</Text>}
                    </View>
                  ))}
                </View>
              );
            })
          )}
        </View>
      </ScrollView>
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
