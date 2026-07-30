import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '@/src/contexts/AuthContext';
import { theme } from '@/src/constants/theme';
import { MaterialIcons } from '@expo/vector-icons';

const API_URL = process.env.EXPO_PUBLIC_BACKEND_URL;
const { width } = Dimensions.get('window');

interface DailySale {
  date: string;
  total: number;
}

interface MonthlySale {
  month: string;
  total: number;
}

interface TopProduct {
  product_name: string;
  quantity: number;
  revenue: number;
}

export default function Reports() {
  const { token } = useAuth();
  const [dailySales, setDailySales] = useState<DailySale[]>([]);
  const [monthlySales, setMonthlySales] = useState<MonthlySale[]>([]);
  const [topProducts, setTopProducts] = useState<TopProduct[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchReports();
  }, []);

  const fetchReports = async () => {
    try {
      const [dailyRes, monthlyRes, topRes] = await Promise.all([
        fetch(`${API_URL}/api/reports/daily-sales?days=7`, {
          headers: { Authorization: `Bearer ${token}` },
        }),
        fetch(`${API_URL}/api/reports/monthly-sales?months=6`, {
          headers: { Authorization: `Bearer ${token}` },
        }),
        fetch(`${API_URL}/api/reports/top-products?limit=5`, {
          headers: { Authorization: `Bearer ${token}` },
        }),
      ]);

      if (dailyRes.ok && monthlyRes.ok && topRes.ok) {
        const daily = await dailyRes.json();
        const monthly = await monthlyRes.json();
        const top = await topRes.json();
        
        setDailySales(daily);
        setMonthlySales(monthly);
        setTopProducts(top);
      }
    } catch (error) {
      console.error('Error fetching reports:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-MY', { day: '2-digit', month: 'short' });
  };

  const formatMonth = (monthString: string) => {
    const [year, month] = monthString.split('-');
    const date = new Date(parseInt(year), parseInt(month) - 1);
    return date.toLocaleDateString('en-MY', { month: 'short', year: 'numeric' });
  };

  const renderSimpleBarChart = (data: DailySale[]) => {
    if (data.length === 0) {
      return (
        <View style={styles.emptyChart}>
          <Text style={styles.emptyChartText}>No sales data available</Text>
        </View>
      );
    }

    const maxValue = Math.max(...data.map((d) => d.total), 1);
    const chartHeight = 200;
    const barWidth = (width - 80) / data.length - 8;

    return (
      <View style={styles.chartContainer}>
        <View style={styles.chart}>
          {data.map((item, index) => {
            const barHeight = (item.total / maxValue) * chartHeight;
            return (
              <View key={index} style={styles.barContainer}>
                <View style={styles.barWrapper}>
                  <View style={[styles.bar, { height: barHeight || 4 }]}>
                    <Text style={styles.barValue}>
                      {item.total > 0 ? item.total.toFixed(0) : ''}
                    </Text>
                  </View>
                </View>
                <Text style={styles.barLabel}>{formatDate(item.date)}</Text>
              </View>
            );
          })}
        </View>
      </View>
    );
  };

  const renderMonthlyChart = (data: MonthlySale[]) => {
    if (data.length === 0) {
      return (
        <View style={styles.emptyChart}>
          <Text style={styles.emptyChartText}>No monthly data available</Text>
        </View>
      );
    }

    const maxValue = Math.max(...data.map((d) => d.total), 1);
    const chartHeight = 200;

    return (
      <View style={styles.chartContainer}>
        <View style={styles.chart}>
          {data.map((item, index) => {
            const barHeight = (item.total / maxValue) * chartHeight;
            return (
              <View key={index} style={styles.barContainer}>
                <View style={styles.barWrapper}>
                  <View style={[styles.bar, { height: barHeight || 4 }]}>
                    <Text style={styles.barValue}>
                      {item.total > 0 ? item.total.toFixed(0) : ''}
                    </Text>
                  </View>
                </View>
                <Text style={styles.barLabel}>{formatMonth(item.month)}</Text>
              </View>
            );
          })}
        </View>
      </View>
    );
  };

  const getTotalDailySales = () => {
    return dailySales.reduce((sum, item) => sum + item.total, 0);
  };

  const getTotalMonthlySales = () => {
    return monthlySales.reduce((sum, item) => sum + item.total, 0);
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
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Reports</Text>
        <MaterialIcons name="assessment" size={24} color={theme.colors.primary} />
      </View>

      <ScrollView style={styles.scrollView}>
        {/* Daily Sales */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <MaterialIcons name="today" size={24} color={theme.colors.primary} />
            <Text style={styles.sectionTitle}>Daily Sales (Last 7 Days)</Text>
          </View>
          <View style={styles.totalCard}>
            <Text style={styles.totalLabel}>Total Sales</Text>
            <Text style={styles.totalValue}>RM {getTotalDailySales().toFixed(2)}</Text>
          </View>
          {renderSimpleBarChart(dailySales)}
        </View>

        {/* Monthly Sales */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <MaterialIcons name="calendar-today" size={24} color={theme.colors.primary} />
            <Text style={styles.sectionTitle}>Monthly Sales</Text>
          </View>
          <View style={styles.totalCard}>
            <Text style={styles.totalLabel}>Total Sales</Text>
            <Text style={styles.totalValue}>RM {getTotalMonthlySales().toFixed(2)}</Text>
          </View>
          {renderMonthlyChart(monthlySales)}
        </View>

        {/* Top Products */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <MaterialIcons name="star" size={24} color={theme.colors.warning} />
            <Text style={styles.sectionTitle}>Top Selling Products</Text>
          </View>

          {topProducts.length === 0 ? (
            <View style={styles.emptyState}>
              <Text style={styles.emptyText}>No sales data available</Text>
            </View>
          ) : (
            topProducts.map((product, index) => (
              <View key={index} style={styles.productCard}>
                <View style={styles.rankBadge}>
                  <Text style={styles.rankText}>#{index + 1}</Text>
                </View>
                <View style={styles.productInfo}>
                  <Text style={styles.productName}>{product.product_name}</Text>
                  <View style={styles.productStats}>
                    <View style={styles.statItem}>
                      <MaterialIcons name="shopping-cart" size={14} color={theme.colors.textSecondary} />
                      <Text style={styles.statText}>{product.quantity} sold</Text>
                    </View>
                    <View style={styles.statDivider} />
                    <View style={styles.statItem}>
                      <MaterialIcons name="monetization-on" size={14} color={theme.colors.textSecondary} />
                      <Text style={styles.statText}>RM {product.revenue.toFixed(2)}</Text>
                    </View>
                  </View>
                </View>
              </View>
            ))
          )}
        </View>

        {/* Summary Stats */}
        <View style={styles.summarySection}>
          <Text style={styles.summaryTitle}>Summary</Text>
          <View style={styles.summaryGrid}>
            <View style={styles.summaryCard}>
              <MaterialIcons name="trending-up" size={28} color={theme.colors.success} />
              <Text style={styles.summaryValue}>
                {dailySales.length > 0 ? dailySales.length : 0}
              </Text>
              <Text style={styles.summaryLabel}>Days Active</Text>
            </View>
            <View style={styles.summaryCard}>
              <MaterialIcons name="inventory" size={28} color={theme.colors.primary} />
              <Text style={styles.summaryValue}>{topProducts.length}</Text>
              <Text style={styles.summaryLabel}>Top Products</Text>
            </View>
          </View>
        </View>
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
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    gap: 8,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: theme.colors.text,
  },
  totalCard: {
    backgroundColor: theme.colors.primaryLight,
    padding: 16,
    borderRadius: theme.borderRadius.md,
    alignItems: 'center',
    marginBottom: 16,
  },
  totalLabel: {
    fontSize: 14,
    color: theme.colors.textSecondary,
    marginBottom: 4,
  },
  totalValue: {
    fontSize: 28,
    fontWeight: 'bold',
    color: theme.colors.primary,
  },
  chartContainer: {
    marginTop: 8,
  },
  chart: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    height: 220,
    paddingBottom: 20,
  },
  barContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'flex-end',
  },
  barWrapper: {
    width: '100%',
    alignItems: 'center',
    justifyContent: 'flex-end',
    height: 200,
  },
  bar: {
    width: '80%',
    backgroundColor: theme.colors.primary,
    borderTopLeftRadius: 6,
    borderTopRightRadius: 6,
    justifyContent: 'flex-start',
    alignItems: 'center',
    paddingTop: 4,
  },
  barValue: {
    fontSize: 10,
    fontWeight: '600',
    color: theme.colors.white,
  },
  barLabel: {
    fontSize: 10,
    color: theme.colors.textSecondary,
    marginTop: 8,
    textAlign: 'center',
  },
  emptyChart: {
    height: 200,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: theme.colors.card,
    borderRadius: theme.borderRadius.md,
  },
  emptyChartText: {
    fontSize: 14,
    color: theme.colors.textSecondary,
  },
  productCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    backgroundColor: theme.colors.card,
    borderRadius: theme.borderRadius.md,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  rankBadge: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: theme.colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 16,
  },
  rankText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: theme.colors.white,
  },
  productInfo: {
    flex: 1,
  },
  productName: {
    fontSize: 16,
    fontWeight: '600',
    color: theme.colors.text,
    marginBottom: 8,
  },
  productStats: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  statText: {
    fontSize: 12,
    color: theme.colors.textSecondary,
  },
  statDivider: {
    width: 1,
    height: 12,
    backgroundColor: theme.colors.border,
    marginHorizontal: 12,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  emptyText: {
    fontSize: 14,
    color: theme.colors.textSecondary,
  },
  summarySection: {
    padding: 20,
    backgroundColor: theme.colors.white,
    marginTop: 8,
    marginBottom: 20,
  },
  summaryTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: theme.colors.text,
    marginBottom: 16,
  },
  summaryGrid: {
    flexDirection: 'row',
    gap: 12,
  },
  summaryCard: {
    flex: 1,
    backgroundColor: theme.colors.card,
    padding: 20,
    borderRadius: theme.borderRadius.md,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  summaryValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: theme.colors.text,
    marginTop: 8,
  },
  summaryLabel: {
    fontSize: 12,
    color: theme.colors.textSecondary,
    marginTop: 4,
    textAlign: 'center',
  },
});
