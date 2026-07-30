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
import Animated, { FadeInDown, FadeInRight } from 'react-native-reanimated';

const API_URL = process.env.EXPO_PUBLIC_BACKEND_URL;

interface LatestSale {
  id: string;
  product_name: string;
  quantity: number;
  total_price: number;
  payment_method: string;
  created_at: string;
}

interface DashboardData {
  today_sales: number;
  total_products: number;
  total_stock: number;
  stock_value: number;
  low_stock: number;
  latest_sales: LatestSale[];
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

  const formatTimeAgo = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    return `${diffDays}d ago`;
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
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        {/* Header with Greeting */}
        <Animated.View entering={FadeInDown.duration(400)} style={styles.header}>
          <View style={styles.greetingContainer}>
            <Text style={styles.greetingEmoji}>👋</Text>
            <View>
              <Text style={styles.greeting}>Welcome back,</Text>
              <Text style={styles.userName}>{user?.company_name || 'User'}</Text>
            </View>
          </View>
          <View style={styles.trialBadge}>
            <MaterialIcons name="schedule" size={14} color={theme.colors.primary} />
            <Text style={styles.trialText}>
              {user?.trial_expired ? 'Expired' : `${user?.trial_days_remaining}d left`}
            </Text>
          </View>
        </Animated.View>

        {/* Metrics Cards Grid */}
        <View style={styles.metricsContainer}>
          <Animated.View entering={FadeInRight.delay(100).duration(400)}>
            {/* Today's Sales - Featured */}
            <View style={[styles.metricCard, styles.featuredCard]}>
              <View style={styles.metricIconContainer}>
                <MaterialIcons name="trending-up" size={24} color={theme.colors.white} />
              </View>
              <View style={styles.metricContent}>
                <Text style={styles.metricLabel}>Today's Sales</Text>
                <Text style={styles.metricValueLarge}>RM {data?.today_sales.toFixed(2) || '0.00'}</Text>
              </View>
            </View>
          </Animated.View>

          <Animated.View entering={FadeInRight.delay(200).duration(400)} style={styles.metricRow}>
            {/* Products */}
            <View style={styles.metricCardSmall}>
              <View style={[styles.metricIconSmall, { backgroundColor: '#E0F2FE' }]}>
                <MaterialIcons name="inventory-2" size={20} color="#0284C7" />
              </View>
              <View style={styles.metricContentSmall}>
                <Text style={styles.metricLabelSmall}>Products</Text>
                <Text style={styles.metricValueSmall}>{data?.total_products || 0}</Text>
              </View>
            </View>

            {/* Stock Value */}
            <View style={styles.metricCardSmall}>
              <View style={[styles.metricIconSmall, { backgroundColor: '#D1FAE5' }]}>
                <MaterialIcons name="account-balance-wallet" size={20} color="#059669" />
              </View>
              <View style={styles.metricContentSmall}>
                <Text style={styles.metricLabelSmall}>Stock Value</Text>
                <Text style={styles.metricValueSmall}>RM {data?.stock_value.toFixed(0) || '0'}</Text>
              </View>
            </View>
          </Animated.View>

          <Animated.View entering={FadeInRight.delay(300).duration(400)} style={styles.metricRow}>
            {/* Total Stock */}
            <View style={styles.metricCardSmall}>
              <View style={[styles.metricIconSmall, { backgroundColor: '#F3E8FF' }]}>
                <MaterialIcons name="widgets" size={20} color="#9333EA" />
              </View>
              <View style={styles.metricContentSmall}>
                <Text style={styles.metricLabelSmall}>Total Stock</Text>
                <Text style={styles.metricValueSmall}>{data?.total_stock || 0}</Text>
              </View>
            </View>

            {/* Low Stock */}
            <View style={styles.metricCardSmall}>
              <View
                style={[
                  styles.metricIconSmall,
                  {
                    backgroundColor:
                      data?.low_stock && data.low_stock > 0 ? '#FEF3C7' : '#F3F4F6',
                  },
                ]}
              >
                <MaterialIcons
                  name="warning"
                  size={20}
                  color={data?.low_stock && data.low_stock > 0 ? '#D97706' : '#6B7280'}
                />
              </View>
              <View style={styles.metricContentSmall}>
                <Text style={styles.metricLabelSmall}>Low Stock</Text>
                <Text
                  style={[
                    styles.metricValueSmall,
                    data?.low_stock && data.low_stock > 0 && { color: '#D97706' },
                  ]}
                >
                  {data?.low_stock || 0}
                </Text>
              </View>
            </View>
          </Animated.View>
        </View>

        {/* Quick Actions */}
        <Animated.View entering={FadeInDown.delay(400).duration(400)} style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Quick Actions</Text>
          </View>

          <View style={styles.actionsGrid}>
            <TouchableOpacity
              style={styles.actionCard}
              onPress={() => router.push('/(tabs)/products')}
            >
              <View style={[styles.actionIcon, { backgroundColor: '#DBEAFE' }]}>
                <MaterialIcons name="add-box" size={28} color="#2563EB" />
              </View>
              <Text style={styles.actionText}>Add Product</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.actionCard}
              onPress={() => router.push('/(tabs)/sales')}
            >
              <View style={[styles.actionIcon, { backgroundColor: '#D1FAE5' }]}>
                <MaterialIcons name="point-of-sale" size={28} color="#059669" />
              </View>
              <Text style={styles.actionText}>New Sale</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.actionCard}
              onPress={() => router.push('/(tabs)/reports')}
            >
              <View style={[styles.actionIcon, { backgroundColor: '#F3E8FF' }]}>
                <MaterialIcons name="assessment" size={28} color="#9333EA" />
              </View>
              <Text style={styles.actionText}>Reports</Text>
            </TouchableOpacity>
          </View>
        </Animated.View>

        {/* Latest Sales */}
        {data?.latest_sales && data.latest_sales.length > 0 && (
          <Animated.View entering={FadeInDown.delay(500).duration(400)} style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Latest Sales</Text>
              <TouchableOpacity onPress={() => router.push('/(tabs)/sales')}>
                <Text style={styles.seeAllText}>See All</Text>
              </TouchableOpacity>
            </View>

            {data.latest_sales.map((sale, index) => (
              <View key={sale.id} style={styles.saleCard}>
                <View style={styles.saleLeft}>
                  <View style={styles.saleIconContainer}>
                    <MaterialIcons
                      name={sale.payment_method === 'Cash' ? 'payments' : 'qr-code'}
                      size={20}
                      color={theme.colors.primary}
                    />
                  </View>
                  <View style={styles.saleInfo}>
                    <Text style={styles.saleProductName}>{sale.product_name}</Text>
                    <Text style={styles.saleQuantity}>Qty: {sale.quantity}</Text>
                  </View>
                </View>
                <View style={styles.saleRight}>
                  <Text style={styles.saleAmount}>RM {sale.total_price.toFixed(2)}</Text>
                  <Text style={styles.saleTime}>{formatTimeAgo(sale.created_at)}</Text>
                </View>
              </View>
            ))}
          </Animated.View>
        )}

        {/* Demo Data Button */}
        {data?.total_products === 0 && (
          <Animated.View entering={FadeInDown.delay(600).duration(400)} style={styles.demoSection}>
            <TouchableOpacity style={styles.demoButton} onPress={seedSampleData}>
              <MaterialIcons name="cloud-download" size={20} color={theme.colors.primary} />
              <Text style={styles.demoButtonText}>Load Sample Data</Text>
            </TouchableOpacity>
          </Animated.View>
        )}

        <View style={styles.bottomSpacing} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
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
    paddingHorizontal: 20,
    paddingVertical: 20,
    backgroundColor: theme.colors.white,
  },
  greetingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  greetingEmoji: {
    fontSize: 32,
  },
  greeting: {
    fontSize: 14,
    color: theme.colors.textSecondary,
  },
  userName: {
    fontSize: 20,
    fontWeight: 'bold',
    color: theme.colors.text,
    marginTop: 2,
  },
  trialBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.primaryLight,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 16,
    gap: 4,
  },
  trialText: {
    fontSize: 11,
    fontWeight: '600',
    color: theme.colors.primary,
  },
  metricsContainer: {
    padding: 16,
    gap: 12,
  },
  metricRow: {
    flexDirection: 'row',
    gap: 12,
  },
  featuredCard: {
    backgroundColor: theme.colors.primary,
    borderRadius: 20,
    padding: 20,
    flexDirection: 'row',
    alignItems: 'center',
    shadowColor: theme.colors.primary,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 8,
  },
  metricIconContainer: {
    width: 56,
    height: 56,
    borderRadius: 16,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 16,
  },
  metricContent: {
    flex: 1,
  },
  metricLabel: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.9)',
    marginBottom: 6,
  },
  metricValueLarge: {
    fontSize: 32,
    fontWeight: 'bold',
    color: theme.colors.white,
  },
  metricCardSmall: {
    flex: 1,
    backgroundColor: theme.colors.white,
    borderRadius: 16,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  metricIconSmall: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  metricContentSmall: {
    flex: 1,
  },
  metricLabelSmall: {
    fontSize: 12,
    color: theme.colors.textSecondary,
    marginBottom: 4,
  },
  metricValueSmall: {
    fontSize: 20,
    fontWeight: 'bold',
    color: theme.colors.text,
  },
  metricCard: {
    backgroundColor: theme.colors.white,
    borderRadius: 16,
    padding: 16,
  },
  section: {
    backgroundColor: theme.colors.white,
    marginHorizontal: 16,
    marginBottom: 16,
    borderRadius: 20,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: theme.colors.text,
  },
  seeAllText: {
    fontSize: 14,
    color: theme.colors.primary,
    fontWeight: '600',
  },
  actionsGrid: {
    flexDirection: 'row',
    gap: 12,
  },
  actionCard: {
    flex: 1,
    backgroundColor: '#F8FAFC',
    borderRadius: 16,
    padding: 16,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  actionIcon: {
    width: 56,
    height: 56,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  actionText: {
    fontSize: 13,
    fontWeight: '600',
    color: theme.colors.text,
    textAlign: 'center',
  },
  saleCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  saleLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  saleIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: theme.colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  saleInfo: {
    flex: 1,
  },
  saleProductName: {
    fontSize: 15,
    fontWeight: '600',
    color: theme.colors.text,
    marginBottom: 4,
  },
  saleQuantity: {
    fontSize: 13,
    color: theme.colors.textSecondary,
  },
  saleRight: {
    alignItems: 'flex-end',
  },
  saleAmount: {
    fontSize: 16,
    fontWeight: 'bold',
    color: theme.colors.primary,
    marginBottom: 4,
  },
  saleTime: {
    fontSize: 12,
    color: theme.colors.textSecondary,
  },
  demoSection: {
    paddingHorizontal: 16,
    marginBottom: 16,
  },
  demoButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.colors.primaryLight,
    padding: 16,
    borderRadius: 16,
    gap: 8,
    borderWidth: 1,
    borderColor: theme.colors.primary,
    borderStyle: 'dashed',
  },
  demoButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: theme.colors.primary,
  },
  bottomSpacing: {
    height: 20,
  },
});
