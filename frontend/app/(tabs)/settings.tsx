import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
  Modal,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '@/src/contexts/AuthContext';
import { useData } from '@/src/contexts/DataContext';
import { theme } from '@/src/constants/theme';
import { MaterialIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';

export default function Settings() {
  const { user, logout } = useAuth();
  const { updateSettings } = useData();
  const router = useRouter();
  const [editModalVisible, setEditModalVisible] = useState(false);
  const [companyName, setCompanyName] = useState(user?.company_name || '');
  const [lowStockThreshold, setLowStockThreshold] = useState(
    user?.low_stock_threshold?.toString() || '10'
  );
  const [saving, setSaving] = useState(false);

  const handleSaveSettings = async () => {
    if (!companyName.trim()) {
      Alert.alert('Error', 'Please enter a company name');
      return;
    }

    const threshold = parseInt(lowStockThreshold, 10);
    if (isNaN(threshold) || threshold < 0) {
      Alert.alert('Error', 'Please enter a valid threshold value');
      return;
    }

    setSaving(true);
    try {
      await updateSettings({
        company_name: companyName.trim(),
        low_stock_threshold: threshold,
      });
      Alert.alert('Success', 'Settings updated successfully');
      setEditModalVisible(false);
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to update settings');
    } finally {
      setSaving(false);
    }
  };

  const handleLogout = () => {
    Alert.alert('Logout', 'Are you sure you want to logout?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Logout',
        style: 'destructive',
        onPress: async () => {
          await logout();
          router.replace('/(auth)/login');
        },
      },
    ]);
  };

  const getTrialStatus = () => {
    if (!user) return { text: 'Loading...', color: theme.colors.textSecondary };

    if (user.trial_expired) {
      return { text: 'Trial Expired', color: theme.colors.error };
    }

    const daysLeft = user.trial_days_remaining;
    if (daysLeft <= 3) {
      return { text: `${daysLeft} days left`, color: theme.colors.warning };
    }

    return { text: `${daysLeft} days left`, color: theme.colors.success };
  };

  const trialStatus = getTrialStatus();

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Settings</Text>
        <MaterialIcons name="settings" size={24} color={theme.colors.primary} />
      </View>

      <ScrollView style={styles.scrollView}>
        {/* Profile Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Company Profile</Text>

          <View style={styles.profileCard}>
            <View style={styles.logoPlaceholder}>
              <Text style={styles.logoLetter}>
                {user?.company_name?.charAt(0).toUpperCase() || 'B'}
              </Text>
            </View>
            <View style={styles.profileInfo}>
              <Text style={styles.companyName}>{user?.company_name || 'Company Name'}</Text>
              <Text style={styles.email}>{user?.email || 'email@example.com'}</Text>
            </View>
          </View>

          <TouchableOpacity
            style={styles.menuItem}
            onPress={() => {
              setCompanyName(user?.company_name || '');
              setLowStockThreshold(user?.low_stock_threshold?.toString() || '10');
              setEditModalVisible(true);
            }}
          >
            <View style={styles.menuItemLeft}>
              <MaterialIcons name="edit" size={20} color={theme.colors.primary} />
              <Text style={styles.menuItemText}>Edit Profile</Text>
            </View>
            <MaterialIcons name="chevron-right" size={24} color={theme.colors.textSecondary} />
          </TouchableOpacity>
        </View>

        {/* Business Settings */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Business Settings</Text>

          <View style={styles.settingItem}>
            <View style={styles.settingLeft}>
              <MaterialIcons name="inventory" size={20} color={theme.colors.primary} />
              <View style={styles.settingTextContainer}>
                <Text style={styles.settingLabel}>Low Stock Alert</Text>
                <Text style={styles.settingValue}>
                  Alert when stock is {user?.low_stock_threshold || 10} or below
                </Text>
              </View>
            </View>
          </View>

          <View style={styles.settingItem}>
            <View style={styles.settingLeft}>
              <MaterialIcons name="attach-money" size={20} color={theme.colors.primary} />
              <View style={styles.settingTextContainer}>
                <Text style={styles.settingLabel}>Currency</Text>
                <Text style={styles.settingValue}>Malaysian Ringgit (MYR)</Text>
              </View>
            </View>
          </View>
        </View>

        {/* Trial Information */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Trial Status</Text>

          <View style={styles.trialCard}>
            <View style={styles.trialHeader}>
              <MaterialIcons name="schedule" size={32} color={theme.colors.primary} />
              <View style={styles.trialInfo}>
                <Text style={styles.trialTitle}>14-Day Free Trial</Text>
                <Text style={[styles.trialStatus, { color: trialStatus.color }]}>
                  {trialStatus.text}
                </Text>
              </View>
            </View>

            {!user?.trial_expired && (
              <View style={styles.progressBar}>
                <View
                  style={[
                    styles.progressFill,
                    {
                      width: `${((14 - (user?.trial_days_remaining || 0)) / 14) * 100}%`,
                    },
                  ]}
                />
              </View>
            )}

            <Text style={styles.trialDescription}>
              {user?.trial_expired
                ? 'Your trial has expired. Upgrade to continue using BizFlow Lite.'
                : 'Enjoying BizFlow Lite? Upgrade anytime to unlock premium features and unlimited access.'}
            </Text>

            <TouchableOpacity style={styles.upgradeButton}>
              <Text style={styles.upgradeButtonText}>Upgrade Now</Text>
              <MaterialIcons name="arrow-forward" size={20} color={theme.colors.white} />
            </TouchableOpacity>
          </View>
        </View>

        {/* About */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>About</Text>

          <View style={styles.aboutItem}>
            <Text style={styles.aboutLabel}>App Version</Text>
            <Text style={styles.aboutValue}>1.0.0</Text>
          </View>

          <View style={styles.aboutItem}>
            <Text style={styles.aboutLabel}>Platform</Text>
            <Text style={styles.aboutValue}>Android</Text>
          </View>
        </View>

        {/* Logout */}
        <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
          <MaterialIcons name="logout" size={20} color={theme.colors.error} />
          <Text style={styles.logoutText}>Logout</Text>
        </TouchableOpacity>
      </ScrollView>

      {/* Edit Settings Modal */}
      <Modal visible={editModalVisible} animationType="slide" transparent={true}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Edit Settings</Text>
              <TouchableOpacity onPress={() => setEditModalVisible(false)}>
                <MaterialIcons name="close" size={24} color={theme.colors.text} />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalForm}>
              <Text style={styles.label}>Company Name</Text>
              <TextInput
                style={styles.input}
                value={companyName}
                onChangeText={setCompanyName}
                placeholder="Enter company name"
                placeholderTextColor={theme.colors.textSecondary}
              />

              <Text style={styles.label}>Low Stock Alert Threshold</Text>
              <TextInput
                style={styles.input}
                value={lowStockThreshold}
                onChangeText={setLowStockThreshold}
                placeholder="10"
                keyboardType="number-pad"
                placeholderTextColor={theme.colors.textSecondary}
              />
              <Text style={styles.helperText}>
                You'll be alerted when product stock falls to or below this number
              </Text>

              <TouchableOpacity
                style={styles.saveButton}
                onPress={handleSaveSettings}
                disabled={saving}
              >
                {saving ? (
                  <ActivityIndicator color={theme.colors.white} />
                ) : (
                  <Text style={styles.saveButtonText}>Save Changes</Text>
                )}
              </TouchableOpacity>
            </ScrollView>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.secondary,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    backgroundColor: theme.colors.white,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: theme.colors.text,
  },
  scrollView: {
    flex: 1,
  },
  section: {
    backgroundColor: theme.colors.white,
    padding: 20,
    marginTop: 8,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: theme.colors.textSecondary,
    textTransform: 'uppercase',
    marginBottom: 16,
    letterSpacing: 0.5,
  },
  profileCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    backgroundColor: theme.colors.card,
    borderRadius: theme.borderRadius.md,
    marginBottom: 16,
  },
  logoPlaceholder: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: theme.colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 16,
  },
  logoLetter: {
    fontSize: 28,
    fontWeight: 'bold',
    color: theme.colors.white,
  },
  profileInfo: {
    flex: 1,
  },
  companyName: {
    fontSize: 18,
    fontWeight: '600',
    color: theme.colors.text,
    marginBottom: 4,
  },
  email: {
    fontSize: 14,
    color: theme.colors.textSecondary,
  },
  menuItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    backgroundColor: theme.colors.card,
    borderRadius: theme.borderRadius.md,
    marginBottom: 12,
  },
  menuItemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  menuItemText: {
    fontSize: 16,
    color: theme.colors.text,
    fontWeight: '500',
  },
  settingItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  settingLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    gap: 12,
  },
  settingTextContainer: {
    flex: 1,
  },
  settingLabel: {
    fontSize: 16,
    fontWeight: '500',
    color: theme.colors.text,
    marginBottom: 4,
  },
  settingValue: {
    fontSize: 14,
    color: theme.colors.textSecondary,
  },
  trialCard: {
    backgroundColor: theme.colors.primaryLight,
    padding: 20,
    borderRadius: theme.borderRadius.md,
  },
  trialHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    gap: 16,
  },
  trialInfo: {
    flex: 1,
  },
  trialTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: theme.colors.text,
    marginBottom: 4,
  },
  trialStatus: {
    fontSize: 14,
    fontWeight: '600',
  },
  progressBar: {
    height: 8,
    backgroundColor: theme.colors.white,
    borderRadius: 4,
    overflow: 'hidden',
    marginBottom: 16,
  },
  progressFill: {
    height: '100%',
    backgroundColor: theme.colors.primary,
  },
  trialDescription: {
    fontSize: 14,
    color: theme.colors.textSecondary,
    lineHeight: 20,
    marginBottom: 16,
  },
  upgradeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.colors.primary,
    paddingVertical: 14,
    borderRadius: theme.borderRadius.md,
    gap: 8,
  },
  upgradeButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: theme.colors.white,
  },
  aboutItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  aboutLabel: {
    fontSize: 16,
    color: theme.colors.text,
  },
  aboutValue: {
    fontSize: 16,
    color: theme.colors.textSecondary,
    fontWeight: '500',
  },
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.colors.white,
    padding: 16,
    marginTop: 8,
    marginBottom: 20,
    gap: 8,
  },
  logoutText: {
    fontSize: 16,
    fontWeight: '600',
    color: theme.colors.error,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: theme.colors.white,
    borderTopLeftRadius: theme.borderRadius.xl,
    borderTopRightRadius: theme.borderRadius.xl,
    paddingTop: 20,
    maxHeight: '70%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    marginBottom: 20,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: theme.colors.text,
  },
  modalForm: {
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: theme.colors.text,
    marginBottom: 8,
  },
  input: {
    backgroundColor: theme.colors.card,
    borderRadius: theme.borderRadius.md,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
    color: theme.colors.text,
    borderWidth: 1,
    borderColor: theme.colors.border,
    marginBottom: 16,
  },
  helperText: {
    fontSize: 12,
    color: theme.colors.textSecondary,
    marginTop: -12,
    marginBottom: 16,
  },
  saveButton: {
    backgroundColor: theme.colors.primary,
    borderRadius: theme.borderRadius.md,
    paddingVertical: 16,
    alignItems: 'center',
    marginTop: 8,
    marginBottom: 32,
  },
  saveButtonText: {
    color: theme.colors.white,
    fontSize: 16,
    fontWeight: '600',
  },
});
