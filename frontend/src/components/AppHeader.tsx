import React, { useState } from 'react';
import { ActivityIndicator, Alert, Pressable, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useTheme } from '@/src/contexts/ThemeContext';
import { useAuth } from '@/src/contexts/AuthContext';
import { useData } from '@/src/contexts/DataContext';

export function AppHeader() {
  const { theme } = useTheme();
  const router = useRouter();
  const { logout, profile } = useAuth();
  const { company } = useData();
  const [menuOpen, setMenuOpen] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);

  const displayName = profile?.displayName || profile?.email?.split('@')[0] || 'Admin';
  const companyName = company?.name || 'BizFlow ERP';
  const roleLabel = profile?.role ? profile.role.charAt(0).toUpperCase() + profile.role.slice(1) : 'Admin';
  const avatarLabel = (displayName || 'A').charAt(0).toUpperCase();

  const handleLogout = async () => {
    if (loggingOut) return;

    setLoggingOut(true);
    try {
      setMenuOpen(false);
      await logout();
      router.replace('/login');
    } catch (error: any) {
      Alert.alert('Sign out failed', error?.message || 'Could not sign out right now.');
    } finally {
      setLoggingOut(false);
    }
  };

  return (
    <View style={styles.wrapper}>
      <SafeAreaView edges={['top']} style={[styles.safeArea, { backgroundColor: theme.colors.surface }]}> 
        <View style={[styles.container, { borderBottomColor: theme.colors.border, backgroundColor: theme.colors.surface }]}> 
          <View style={styles.brandSection}>
            <View style={[styles.logo, { backgroundColor: theme.colors.primary }]}> 
              <Text style={styles.logoText}>B</Text>
            </View>
            <View style={styles.brandText}>
              <Text style={[styles.brandTitle, { color: theme.colors.text }]}>BizFlow ERP</Text>
              <Text style={[styles.brandSubtitle, { color: theme.colors.textSecondary }]} numberOfLines={1}>
                {companyName}
              </Text>
            </View>
          </View>

          <View style={styles.profileWrap}>
            <TouchableOpacity
              accessibilityRole="button"
              testID="profile-menu-trigger"
              onPress={() => setMenuOpen((value) => !value)}
              style={[styles.trigger, { borderColor: theme.colors.border, backgroundColor: theme.colors.card }]}
            >
              <View style={[styles.avatar, { backgroundColor: theme.colors.primary }]}> 
                <Text style={styles.avatarText}>{avatarLabel}</Text>
              </View>
              <View style={styles.triggerText}>
                <Text style={[styles.triggerName, { color: theme.colors.text }]} numberOfLines={1}>
                  {displayName}
                </Text>
                <Text style={[styles.triggerRole, { color: theme.colors.textSecondary }]} numberOfLines={1}>
                  {roleLabel}
                </Text>
              </View>
              <MaterialIcons name={menuOpen ? 'expand-less' : 'expand-more'} size={20} color={theme.colors.textSecondary} />
            </TouchableOpacity>

            {menuOpen ? (
              <View style={[styles.dropdown, { backgroundColor: theme.colors.card, borderColor: theme.colors.border }]}> 
                <View style={styles.dropdownHeader}>
                  <Text style={[styles.dropdownName, { color: theme.colors.text }]} numberOfLines={1}>{displayName}</Text>
                  <Text style={[styles.dropdownCompany, { color: theme.colors.textSecondary }]} numberOfLines={1}>{companyName}</Text>
                  <Text style={[styles.dropdownRole, { color: theme.colors.primary }]}>{roleLabel}</Text>
                </View>
                <TouchableOpacity
                  accessibilityRole="button"
                  testID="logout-button"
                  disabled={loggingOut}
                  onPress={handleLogout}
                  style={styles.logoutRow}
                >
                  {loggingOut ? (
                    <ActivityIndicator size="small" color={theme.colors.primary} />
                  ) : (
                    <MaterialIcons name="logout" size={18} color={theme.colors.error} />
                  )}
                  <Text style={[styles.logoutText, { color: theme.colors.error }]}>
                    {loggingOut ? 'Signing out...' : 'Sign Out'}
                  </Text>
                </TouchableOpacity>
              </View>
            ) : null}
          </View>
        </View>
      </SafeAreaView>

      {menuOpen ? (
        <Pressable style={StyleSheet.absoluteFill} onPress={() => setMenuOpen(false)} />
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    position: 'relative',
    zIndex: 10,
  },
  safeArea: {
    width: '100%',
  },
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  brandSection: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    minWidth: 0,
  },
  logo: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoText: {
    color: '#FFF',
    fontSize: 20,
    fontWeight: '800',
  },
  brandText: {
    marginLeft: 12,
    flex: 1,
    minWidth: 0,
  },
  brandTitle: {
    fontSize: 16,
    fontWeight: '700',
  },
  brandSubtitle: {
    fontSize: 12,
    marginTop: 2,
  },
  profileWrap: {
    position: 'relative',
    marginLeft: 12,
    zIndex: 20,
  },
  trigger: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 999,
    borderWidth: 1,
    maxWidth: 220,
  },
  avatar: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    color: '#FFF',
    fontSize: 14,
    fontWeight: '700',
  },
  triggerText: {
    marginLeft: 8,
    flexShrink: 1,
    minWidth: 0,
  },
  triggerName: {
    fontSize: 13,
    fontWeight: '700',
  },
  triggerRole: {
    fontSize: 11,
    marginTop: 1,
  },
  dropdown: {
    position: 'absolute',
    top: 50,
    right: 0,
    minWidth: 220,
    borderRadius: 14,
    borderWidth: 1,
    padding: 12,
    shadowColor: '#000',
    shadowOpacity: 0.12,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 6 },
    elevation: 8,
  },
  dropdownHeader: {
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(148, 163, 184, 0.25)',
    marginBottom: 8,
  },
  dropdownName: {
    fontSize: 15,
    fontWeight: '700',
  },
  dropdownCompany: {
    fontSize: 12,
    marginTop: 2,
  },
  dropdownRole: {
    fontSize: 12,
    fontWeight: '600',
    marginTop: 4,
  },
  logoutRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    gap: 8,
  },
  logoutText: {
    fontSize: 14,
    fontWeight: '600',
  },
});
