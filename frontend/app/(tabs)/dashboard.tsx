import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '@/src/contexts/AuthContext';
import { theme } from '@/src/constants/theme';
import { MaterialIcons } from '@expo/vector-icons';

const API_URL = process.env.EXPO_PUBLIC_BACKEND_URL;

interface DashboardData {
  today_sales: number;
  total_products: number;
  total_stock: number;
  low_stock: number;
}

export default function Dashboard() {
  const { user, token, refreshUser } = useAuth();
  const router = useRouter();
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    fetchDashboard();
    refreshUser();
  }, []);

  const fetchDashboard = async () => {
    try {
      const response = await fetch(`${API_URL}/api/dashboard`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (response.ok) {
        const dashboardData = await response.json();
        setData(dashboardData);
      }
    } catch (error) {
      console.error('Error fetching dashboard:', error);
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchDashboard();
    await refreshUser();
    setRefreshing(false);
  };

  const seedSampleData = async () => {
    Alert.alert(
      'Load Sample Data',
      'This will add sample products, categories, and sales to your account. Continue?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Load Data',
          onPress: async () => {
            try {
              const response = await fetch(`${API_URL}/api/seed-data`, {
                method: 'POST',
                headers: {
                  Authorization: `Bearer ${token}`,
                },
              });

              if (response.ok) {
                Alert.alert('Success', 'Sample data loaded successfully');
                fetchDashboard();
              } else {
                const error = await response.json();
                Alert.alert('Info', error.message || 'Data already exists');
              }
            } catch (error) {
              Alert.alert('Error', 'Failed to load sample data');
            }
          },
        },
      ]
    );
  };

  if (loading) {
    return (
      <SafeAreaView style={[styles.container, styles.centerContent]}>
        <ActivityIndicator size="large" color={theme.colors.primary} />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView
        style={styles.scrollView}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        {/* Header */}
        <View style={styles.header}>
          <View>
            <Text style={styles.greeting}>Welcome back!</Text>
            <Text style={styles.companyName}>{user?.company_name || 'BizFlow User'}</Text>
          </View>
          <View style={styles.trialBadge}>
            <MaterialIcons name="schedule" size={16} color={theme.colors.primary} />
            <Text style={styles.trialText}>
              {user?.trial_expired ? 'Trial Expired' : `${user?.trial_days_remaining} days left`}
            </Text>
          </View>
        </View>

        {/* Metrics Cards */}
        <View style={styles.metricsGrid}>
          <View style={[styles.metricCard, styles.primaryCard]}>
            <MaterialIcons name="monetization-on" size={32} color={theme.colors.white} />
            <Text style={styles.metricValue}>RM {data?.today_sales.toFixed(2) || '0.00'}</Text>
            <Text style={styles.metricLabel}>Today's Sales</Text>
          </View>

          <View style={styles.metricCard}>
            <MaterialIcons name="inventory-2" size={28} color={theme.colors.primary} />
            <Text style={styles.metricValueDark}>{data?.total_products || 0}</Text>
            <Text style={styles.metricLabelDark}>Total Products</Text>
          </View>

          <View style={styles.metricCard}>
            <MaterialIcons name="storage" size={28} color={theme.colors.primary} />
            <Text style={styles.metricValueDark}>{data?.total_stock || 0}</Text>
            <Text style={styles.metricLabelDark}>Total Stock</Text>
          </View>

          <View style={[styles.metricCard, data?.low_stock && data.low_stock > 0 ? styles.warningCard : {}]}>
            <MaterialIcons
              name="warning"
              size={28}
              color={data?.low_stock && data.low_stock > 0 ? theme.colors.warning : theme.colors.primary}
            />
            <Text style={[styles.metricValueDark, data?.low_stock && data.low_stock > 0 ? styles.warningText : {}]}>
              {data?.low_stock || 0}
            </Text>
            <Text style={styles.metricLabelDark}>Low Stock</Text>
          </View>
        </View>

        {/* Quick Actions */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Quick Actions</Text>

          <TouchableOpacity style={styles.actionButton} onPress={() => router.push('/(tabs)/products')}>
            <View style={styles.actionIcon}>
              <MaterialIcons name="add-box" size={24} color={theme.colors.primary} />
            </View>
            <View style={styles.actionContent}>
              <Text style={styles.actionTitle}>Add Product</Text>
              <Text style={styles.actionSubtitle}>Create a new product</Text>
            </View>
            <MaterialIcons name="chevron-right" size={24} color={theme.colors.textSecondary} />
          </TouchableOpacity>

          <TouchableOpacity style={styles.actionButton} onPress={() => router.push('/(tabs)/sales')}>
            <View style={styles.actionIcon}>
              <MaterialIcons name="point-of-sale" size={24} color={theme.colors.primary} />
            </View>
            <View style={styles.actionContent}>
              <Text style={styles.actionTitle}>New Sale</Text>
              <Text style={styles.actionSubtitle}>Record a new transaction</Text>
            </View>
            <MaterialIcons name="chevron-right" size={24} color={theme.colors.textSecondary} />
          </TouchableOpacity>

          <TouchableOpacity style={styles.actionButton} onPress={() => router.push('/(tabs)/reports')}>
            <View style={styles.actionIcon}>
              <MaterialIcons name="assessment" size={24} color={theme.colors.primary} />
            </View>
            <View style={styles.actionContent}>
              <Text style={styles.actionTitle}>View Reports</Text>
              <Text style={styles.actionSubtitle}>Check sales analytics</Text>
            </View>
            <MaterialIcons name="chevron-right" size={24} color={theme.colors.textSecondary} />
          </TouchableOpacity>
        </View>

        {/* Demo Data Button */}
        {data?.total_products === 0 && (
          <TouchableOpacity style={styles.demoButton} onPress={seedSampleData}>
            <MaterialIcons name="cloud-download" size={20} color={theme.colors.primary} />
            <Text style={styles.demoButtonText}>Load Sample Data</Text>
          </TouchableOpacity>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.secondary,
  },
  centerContent: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  scrollView: {
    flex: 1,
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
  greeting: {
    fontSize: 14,
    color: theme.colors.textSecondary,
  },
  companyName: {
    fontSize: 20,
    fontWeight: 'bold',
    color: theme.colors.text,
    marginTop: 4,
  },
  trialBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.primaryLight,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    gap: 4,
  },
  trialText: {
    fontSize: 12,
    fontWeight: '600',
    color: theme.colors.primary,
  },
  metricsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    padding: 16,
    gap: 12,
  },
  metricCard: {
    width: '48%',
    backgroundColor: theme.colors.white,
    padding: 20,
    borderRadius: theme.borderRadius.md,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  primaryCard: {
    backgroundColor: theme.colors.primary,
    borderColor: theme.colors.primary,
  },
  warningCard: {
    backgroundColor: '#FFF7ED',
    borderColor: theme.colors.warning,
  },
  metricValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: theme.colors.white,
    marginTop: 8,
  },
  metricLabel: {
    fontSize: 12,
    color: theme.colors.white,
    marginTop: 4,
    opacity: 0.9,
  },
  metricValueDark: {
    fontSize: 24,
    fontWeight: 'bold',
    color: theme.colors.text,
    marginTop: 8,
  },
  metricLabelDark: {
    fontSize: 12,
    color: theme.colors.textSecondary,
    marginTop: 4,
  },
  warningText: {
    color: theme.colors.warning,
  },
  section: {
    padding: 20,
    backgroundColor: theme.colors.white,
    marginTop: 8,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: theme.colors.text,
    marginBottom: 16,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    backgroundColor: theme.colors.card,
    borderRadius: theme.borderRadius.md,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  actionIcon: {
    width: 48,
    height: 48,
    borderRadius: 12,
    backgroundColor: theme.colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionContent: {
    flex: 1,
    marginLeft: 16,
  },
  actionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: theme.colors.text,
  },
  actionSubtitle: {
    fontSize: 12,
    color: theme.colors.textSecondary,
    marginTop: 2,
  },
  demoButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.colors.primaryLight,
    padding: 16,
    margin: 20,
    borderRadius: theme.borderRadius.md,
    gap: 8,
  },
  demoButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: theme.colors.primary,
  },
});
