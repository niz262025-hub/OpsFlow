import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, TextInput, ViewStyle, StyleProp, Pressable } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import { useTheme } from '@/src/contexts/ThemeContext';
import { radius, spacing } from '@/src/constants/theme';

type Tone = 'primary' | 'secondary' | 'success' | 'warning' | 'danger' | 'neutral';

interface NavItem {
  key: string;
  label: string;
  icon: keyof typeof MaterialIcons.glyphMap;
  path?: string;
}

export function BizFlowButton({
  title,
  onPress,
  variant = 'primary',
  size = 'md',
  icon,
  fullWidth = false,
  disabled = false,
  style,
}: {
  title: string;
  onPress: () => void;
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger';
  size?: 'sm' | 'md' | 'lg';
  icon?: keyof typeof MaterialIcons.glyphMap;
  fullWidth?: boolean;
  disabled?: boolean;
  style?: StyleProp<ViewStyle>;
}) {
  const { theme } = useTheme();
  const heights = { sm: 38, md: 44, lg: 52 };
  const paddings = { sm: 12, md: 16, lg: 18 };
  const bg = variant === 'primary'
    ? theme.colors.primary
    : variant === 'danger'
      ? theme.colors.danger
      : variant === 'secondary'
        ? theme.colors.surface
        : 'transparent';
  const border = variant === 'secondary' ? theme.colors.border : 'transparent';
  const textColor = variant === 'primary' || variant === 'danger' ? theme.colors.white : theme.colors.primary;

  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={disabled}
      activeOpacity={0.85}
      style={[
        styles.button,
        {
          height: heights[size],
          paddingHorizontal: paddings[size],
          backgroundColor: bg,
          borderColor: border,
          borderWidth: variant === 'secondary' ? 1 : 0,
          alignSelf: fullWidth ? 'stretch' : 'flex-start',
          opacity: disabled ? 0.65 : 1,
        },
        style,
      ]}
    >
      {icon ? <MaterialIcons name={icon} size={18} color={textColor} /> : null}
      <Text style={[styles.buttonText, { color: textColor }]}>{title}</Text>
    </TouchableOpacity>
  );
}

export function BizFlowBadge({ label, tone = 'primary' }: { label: string; tone?: Tone }) {
  const { theme } = useTheme();
  const colors = {
    primary: { bg: theme.colors.primaryLight, text: theme.colors.primary },
    secondary: { bg: '#EDE9FE', text: theme.colors.secondary },
    success: { bg: '#DCFCE7', text: theme.colors.success },
    warning: { bg: '#FEF3C7', text: theme.colors.warning },
    danger: { bg: '#FEE2E2', text: theme.colors.danger },
    neutral: { bg: theme.colors.cardMuted, text: theme.colors.textSecondary },
  };
  return (
    <View style={[styles.badge, { backgroundColor: colors[tone].bg }]}> 
      <Text style={[styles.badgeText, { color: colors[tone].text }]}>{label}</Text>
    </View>
  );
}

export function BizFlowStatusChip({ label, tone = 'success' }: { label: string; tone?: Tone }) {
  const { theme } = useTheme();
  const colors = {
    primary: { bg: theme.colors.primaryLight, text: theme.colors.primary },
    secondary: { bg: '#EDE9FE', text: theme.colors.secondary },
    success: { bg: '#DCFCE7', text: theme.colors.success },
    warning: { bg: '#FEF3C7', text: theme.colors.warning },
    danger: { bg: '#FEE2E2', text: theme.colors.danger },
    neutral: { bg: theme.colors.cardMuted, text: theme.colors.textSecondary },
  };
  return (
    <View style={[styles.statusChip, { backgroundColor: colors[tone].bg }]}> 
      <View style={[styles.statusDot, { backgroundColor: colors[tone].text }]} />
      <Text style={[styles.statusText, { color: colors[tone].text }]}>{label}</Text>
    </View>
  );
}

export function BizFlowKpiCard({ label, value, detail, tone = 'primary' }: { label: string; value: string; detail?: string; tone?: Tone }) {
  const { theme } = useTheme();
  const accent = tone === 'success' ? theme.colors.success : tone === 'warning' ? theme.colors.warning : tone === 'danger' ? theme.colors.danger : theme.colors.primary;
  return (
    <View style={[styles.kpiCard, { borderColor: theme.colors.border }]}> 
      <View style={[styles.kpiAccent, { backgroundColor: accent }]} />
      <Text style={styles.kpiLabel}>{label}</Text>
      <Text style={styles.kpiValue}>{value}</Text>
      {detail ? <Text style={styles.kpiDetail}>{detail}</Text> : null}
    </View>
  );
}

export function BizFlowSectionCard({ title, subtitle, action, children, style }: { title?: string; subtitle?: string; action?: React.ReactNode; children?: React.ReactNode; style?: StyleProp<ViewStyle> }) {
  const { theme } = useTheme();
  return (
    <View style={[styles.sectionCard, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }, style]}> 
      {(title || subtitle || action) ? (
        <View style={styles.sectionHeader}> 
          <View style={{ flex: 1 }}>
            {title ? <Text style={styles.sectionTitle}>{title}</Text> : null}
            {subtitle ? <Text style={styles.sectionSubtitle}>{subtitle}</Text> : null}
          </View>
          {action}
        </View>
      ) : null}
      {children}
    </View>
  );
}

export function BizFlowTable({ columns, rows }: { columns: Array<{ key: string; label: string }>; rows: Array<Record<string, React.ReactNode>> }) {
  const { theme } = useTheme();
  return (
    <View style={[styles.table, { borderColor: theme.colors.border }]}> 
      <View style={[styles.tableHeader, { backgroundColor: theme.colors.cardMuted }]}> 
        {columns.map((column) => (
          <Text key={column.key} style={styles.tableHeaderText}>{column.label}</Text>
        ))}
      </View>
      {rows.map((row, index) => (
        <View key={index} style={[styles.tableRow, { borderTopColor: theme.colors.border }]}> 
          {columns.map((column) => (
            <Text key={column.key} style={styles.tableCell}>{row[column.key]}</Text>
          ))}
        </View>
      ))}
    </View>
  );
}

export function BizFlowChart({ data, labels }: { data: number[]; labels: string[] }) {
  const { theme } = useTheme();
  const max = Math.max(...data, 1);
  return (
    <View style={styles.chartRow}> 
      {data.map((value, index) => (
        <View key={`${value}-${index}`} style={styles.chartBarWrap}> 
          <View style={[styles.chartBar, { height: (value / max) * 100, backgroundColor: index % 2 === 0 ? theme.colors.primary : theme.colors.secondary }]} />
          <Text style={styles.chartLabel}>{labels[index]}</Text>
        </View>
      ))}
    </View>
  );
}

export function BizFlowSidebar({ items, activeKey, onNavigate }: { items: NavItem[]; activeKey: string; onNavigate: (item: NavItem) => void }) {
  const { theme } = useTheme();
  return (
    <View style={[styles.sidebar, { backgroundColor: '#081A3A', borderRightColor: '#12264C' }]}> 
      <View style={styles.brandWrap}> 
        <View style={[styles.brandIcon, { backgroundColor: 'rgba(255,255,255,0.14)' }]}> 
          <MaterialIcons name="store" size={22} color={'#FFFFFF'} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.brandTitle}>BizFlow</Text>
          <Text style={styles.brandSubtitle}>Merchant operations</Text>
        </View>
      </View>
      {items.map((item) => {
        const active = item.key === activeKey;
        return (
          <Pressable key={item.key} style={[styles.navItem, active && { backgroundColor: '#12315E' }]} onPress={() => onNavigate(item)}>
            <MaterialIcons name={item.icon} size={18} color={active ? '#FFFFFF' : '#93A6C8'} />
            <Text style={[styles.navLabel, active && { color: '#FFFFFF' }]}>{item.label}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

export function BizFlowTopBar({ title, subtitle, searchValue, onSearchChange, profileName, profileRole, avatarLabel, actions }: { title: string; subtitle?: string; searchValue?: string; onSearchChange?: (value: string) => void; profileName?: string; profileRole?: string; avatarLabel?: string; actions?: React.ReactNode }) {
  const { theme } = useTheme();
  return (
    <View style={styles.topBar}> 
      <View style={{ flex: 1 }}>
        <Text style={styles.topBarTitle}>{title}</Text>
        {subtitle ? <Text style={styles.topBarSubtitle}>{subtitle}</Text> : null}
      </View>
      {searchValue !== undefined ? (
        <View style={[styles.searchBox, { backgroundColor: '#FFFFFF', borderColor: '#E2E8F0' }]}> 
          <MaterialIcons name="search" size={18} color={theme.colors.textMuted} />
          <TextInput value={searchValue} onChangeText={onSearchChange} placeholder="Search" placeholderTextColor={theme.colors.textMuted} style={styles.searchInput} />
        </View>
      ) : null}
      {actions}
      {(profileName || profileRole) ? (
        <View style={[styles.profileChip, { backgroundColor: '#FFFFFF', borderColor: '#E2E8F0' }]}> 
          <View style={[styles.profileAvatar, { backgroundColor: '#DBEAFE' }]}> 
            <Text style={[styles.profileAvatarText, { color: '#2563EB' }]}>{avatarLabel || profileName?.charAt(0).toUpperCase() || 'U'}</Text>
          </View>
          <View>
            <Text style={styles.profileName}>{profileName}</Text>
            <Text style={styles.profileRole}>{profileRole}</Text>
          </View>
        </View>
      ) : null}
    </View>
  );
}

export function BizFlowDashboardShell({ sidebarItems, activeKey, onNavigate, title, subtitle, searchValue, onSearchChange, profileName, profileRole, avatarLabel, actions, children }: { sidebarItems: NavItem[]; activeKey: string; onNavigate: (item: NavItem) => void; title: string; subtitle?: string; searchValue?: string; onSearchChange?: (value: string) => void; profileName?: string; profileRole?: string; avatarLabel?: string; actions?: React.ReactNode; children: React.ReactNode }) {
  return (
    <SafeAreaView style={styles.safeArea}> 
      <View style={styles.shell}> 
        <BizFlowSidebar items={sidebarItems} activeKey={activeKey} onNavigate={onNavigate} />
        <ScrollView style={styles.main} contentContainerStyle={styles.mainContent}> 
          <BizFlowTopBar title={title} subtitle={subtitle} searchValue={searchValue} onSearchChange={onSearchChange} profileName={profileName} profileRole={profileRole} avatarLabel={avatarLabel} actions={actions} />
          {children}
        </ScrollView>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#F8FAFC' },
  shell: { flex: 1, flexDirection: 'row' },
  sidebar: { width: 260, borderRightWidth: 1, paddingHorizontal: 16, paddingTop: 24 },
  brandWrap: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 24 },
  brandIcon: { width: 44, height: 44, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  brandTitle: { fontSize: 18, fontWeight: '800', color: '#FFFFFF', fontFamily: 'Inter' },
  brandSubtitle: { fontSize: 12, color: '#93A6C8', fontFamily: 'Inter' },
  navItem: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 12, paddingHorizontal: 12, borderRadius: 12, marginBottom: 4 },
  navLabel: { fontSize: 14, fontWeight: '600', color: '#93A6C8', fontFamily: 'Inter' },
  main: { flex: 1, backgroundColor: '#F8FAFC' },
  mainContent: { padding: 20, gap: 16, paddingBottom: 32 },
  topBar: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 12, flexWrap: 'wrap' },
  topBarTitle: { fontSize: 24, fontWeight: '800', color: '#0F172A', fontFamily: 'Inter' },
  topBarSubtitle: { fontSize: 13, color: '#64748B', marginTop: 2, fontFamily: 'Inter' },
  searchBox: { flexDirection: 'row', alignItems: 'center', gap: 8, borderRadius: 999, paddingHorizontal: 14, paddingVertical: 10, borderWidth: 1, minWidth: 240 },
  searchInput: { flex: 1, color: '#0F172A', fontSize: 14, fontFamily: 'Inter' },
  profileChip: { flexDirection: 'row', alignItems: 'center', gap: 10, borderRadius: 999, paddingHorizontal: 10, paddingVertical: 8, borderWidth: 1 },
  profileAvatar: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  profileAvatarText: { fontSize: 14, fontWeight: '700', fontFamily: 'Inter' },
  profileName: { fontSize: 13, fontWeight: '700', color: '#0F172A', fontFamily: 'Inter' },
  profileRole: { fontSize: 12, color: '#64748B', fontFamily: 'Inter' },
  button: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', borderRadius: 999, gap: 8 },
  buttonText: { fontSize: 14, fontWeight: '700', fontFamily: 'Inter' },
  badge: { alignSelf: 'flex-start', borderRadius: 999, paddingHorizontal: 10, paddingVertical: 6 },
  badgeText: { fontSize: 12, fontWeight: '700', fontFamily: 'Inter' },
  statusChip: { flexDirection: 'row', alignItems: 'center', gap: 6, alignSelf: 'flex-start', borderRadius: 999, paddingHorizontal: 10, paddingVertical: 6 },
  statusDot: { width: 8, height: 8, borderRadius: 4 },
  statusText: { fontSize: 12, fontWeight: '700', fontFamily: 'Inter' },
  kpiCard: { flex: 1, minWidth: 180, backgroundColor: '#FFFFFF', borderRadius: 18, padding: 16, borderWidth: 1, position: 'relative' },
  kpiAccent: { position: 'absolute', left: 0, top: 0, bottom: 0, width: 4, borderTopLeftRadius: 18, borderBottomLeftRadius: 18 },
  kpiLabel: { fontSize: 12, color: '#64748B', fontFamily: 'Inter', marginBottom: 6 },
  kpiValue: { fontSize: 24, fontWeight: '800', color: '#0F172A', fontFamily: 'Inter' },
  kpiDetail: { fontSize: 12, color: '#64748B', marginTop: 6, fontFamily: 'Inter' },
  sectionCard: { borderRadius: 20, padding: 18, borderWidth: 1 },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  sectionTitle: { fontSize: 16, fontWeight: '700', color: '#0F172A', fontFamily: 'Inter' },
  sectionSubtitle: { fontSize: 12, color: '#64748B', marginTop: 2, fontFamily: 'Inter' },
  table: { borderRadius: 14, overflow: 'hidden', borderWidth: 1 },
  tableHeader: { flexDirection: 'row', paddingHorizontal: 12, paddingVertical: 10 },
  tableHeaderText: { flex: 1, fontSize: 12, fontWeight: '700', color: '#475569', fontFamily: 'Inter' },
  tableRow: { flexDirection: 'row', paddingHorizontal: 12, paddingVertical: 12, borderTopWidth: 1 },
  tableCell: { flex: 1, fontSize: 13, color: '#0F172A', fontFamily: 'Inter' },
  chartRow: { flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between', height: 140, gap: 10, marginTop: 8 },
  chartBarWrap: { flex: 1, alignItems: 'center', gap: 8 },
  chartBar: { width: '100%', maxWidth: 28, borderRadius: 999, minHeight: 22 },
  chartLabel: { fontSize: 11, color: '#64748B', fontFamily: 'Inter' },
});
