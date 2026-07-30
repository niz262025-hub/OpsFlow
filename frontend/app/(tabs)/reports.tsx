import React, { useMemo, useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, Dimensions, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { useTheme } from '@/src/contexts/ThemeContext';
import { useData } from '@/src/contexts/DataContext';
import { formatMYR } from '@/src/utils/currency';
import { Button, Card, EmptyState, Header, Screen } from '@/src/components/UI';
import { generateFinancialReportPDF } from '@/src/utils/exports/pdf';
import { exportFinancialWorkbook, exportSalesDetailXlsx, exportSalesXlsx, exportPurchasesXlsx, exportExpensesXlsx, exportProductsXlsx } from '@/src/utils/exports/excel';

const { width } = Dimensions.get('window');

type Range = 'today' | 'week' | 'month' | 'year';

export default function Reports() {
  const { theme } = useTheme();
  const { sales, purchases, expenses, products, company } = useData();
  const [range, setRange] = useState<Range>('month');
  const [exporting, setExporting] = useState(false);

  const startTs = useMemo(() => {
    const n = new Date();
    if (range === 'today') return new Date(n.getFullYear(), n.getMonth(), n.getDate()).getTime();
    if (range === 'week') return n.getTime() - 7 * 86400000;
    if (range === 'month') return new Date(n.getFullYear(), n.getMonth(), 1).getTime();
    return new Date(n.getFullYear(), 0, 1).getTime();
  }, [range]);

  const inRange = <T extends { createdAt?: any; date?: any }>(list: T[], useDate = false): T[] =>
    list.filter((x) => {
      const t = useDate ? (x.date?.toMillis?.() || (x.date instanceof Date ? x.date.getTime() : 0)) : (x.createdAt?.toMillis?.() || 0);
      return t >= startTs;
    });

  const rSales = inRange(sales);
  const rPurchases = inRange(purchases);
  const rExpenses = inRange(expenses, true);

  const revenue = rSales.reduce((s, x) => s + x.total, 0);
  const cogs = rSales.reduce((s, x) => s + x.items.reduce((c, i) => c + i.costPrice * i.quantity, 0), 0);
  const grossProfit = revenue - cogs;
  const expenseTotal = rExpenses.reduce((s, x) => s + x.amount, 0);
  const netProfit = grossProfit - expenseTotal;
  const purchaseTotal = rPurchases.reduce((s, x) => s + x.total, 0);

  const paymentBreakdown = { Cash: 0, QR: 0, Transfer: 0 };
  for (const s of rSales) paymentBreakdown[s.paymentMethod] = (paymentBreakdown[s.paymentMethod] || 0) + s.total;

  const topProducts = useMemo(() => {
    const map: Record<string, { name: string; qty: number; revenue: number }> = {};
    for (const s of rSales) {
      for (const i of s.items) {
        if (!map[i.productId]) map[i.productId] = { name: i.productName, qty: 0, revenue: 0 };
        map[i.productId].qty += i.quantity;
        map[i.productId].revenue += i.total;
      }
    }
    return Object.values(map).sort((a, b) => b.revenue - a.revenue).slice(0, 10);
  }, [rSales]);

  const lowStock = products.filter((p) => p.status === 'active' && p.stock <= (p.minStock || 10));

  const rangeLabel = range.charAt(0).toUpperCase() + range.slice(1);
  const startDate = new Date(startTs);
  const endDate = new Date();

  const exportPdf = async () => {
    setExporting(true);
    try {
      await generateFinancialReportPDF({
        company, rangeLabel, from: startDate, to: endDate,
        revenue, cogs, grossProfit, expenses: expenseTotal, netProfit, purchaseTotal, paymentBreakdown, topProducts,
      });
    } catch (e: any) { Alert.alert('Export Failed', e?.message || 'Could not generate PDF'); }
    finally { setExporting(false); }
  };

  const exportXlsx = async () => {
    setExporting(true);
    try {
      await exportFinancialWorkbook({
        sales: rSales, purchases: rPurchases, expenses: rExpenses,
        products, rangeLabel,
      });
    } catch (e: any) { Alert.alert('Export Failed', e?.message || 'Could not generate Excel'); }
    finally { setExporting(false); }
  };

  const exportSpecific = () => {
    Alert.alert('Export as Excel', 'Choose data to export', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Sales (summary)', onPress: () => exportSalesXlsx(rSales, `sales-${rangeLabel}`).catch((e) => Alert.alert('Error', e?.message)) },
      { text: 'Sales (line items)', onPress: () => exportSalesDetailXlsx(rSales, `sales-detail-${rangeLabel}`).catch((e) => Alert.alert('Error', e?.message)) },
      { text: 'Purchases', onPress: () => exportPurchasesXlsx(rPurchases, `purchases-${rangeLabel}`).catch((e) => Alert.alert('Error', e?.message)) },
      { text: 'Expenses', onPress: () => exportExpensesXlsx(rExpenses, `expenses-${rangeLabel}`).catch((e) => Alert.alert('Error', e?.message)) },
      { text: 'Inventory', onPress: () => exportProductsXlsx(products, 'products').catch((e) => Alert.alert('Error', e?.message)) },
    ]);
  };

  return (
    <Screen>
      <SafeAreaView style={{ flex: 1 }} edges={['top']}>
        <Header title="Reports" subtitle="Sales, profit & inventory insights" right={
          <TouchableOpacity onPress={exportSpecific} style={{ padding: 6 }}>
            <MaterialIcons name="download" size={24} color={theme.colors.primary} />
          </TouchableOpacity>
        } />
        <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 40 }} showsVerticalScrollIndicator={false}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, marginBottom: 16 }}>
            {(['today', 'week', 'month', 'year'] as Range[]).map((r) => (
              <TouchableOpacity key={r} onPress={() => setRange(r)} style={[styles.chip, { backgroundColor: range === r ? theme.colors.primary : theme.colors.cardMuted }]}>
                <Text style={{ color: range === r ? '#FFF' : theme.colors.text, fontWeight: '700', fontSize: 13, textTransform: 'capitalize' }}>{r}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>

          {/* Export actions */}
          <View style={{ flexDirection: 'row', gap: 8, marginBottom: 12 }}>
            <View style={{ flex: 1 }}><Button title="Export PDF" onPress={exportPdf} loading={exporting} icon="picture-as-pdf" fullWidth testID="report-export-pdf-button" /></View>
            <View style={{ flex: 1 }}><Button title="Export Excel" onPress={exportXlsx} loading={exporting} variant="secondary" icon="grid-on" fullWidth testID="report-export-excel-button" /></View>
          </View>

          {/* P&L Summary */}
          <Animated.View entering={FadeInDown.duration(400)}>
            <Card style={{ marginBottom: 12 }}>
              <Text style={{ fontSize: 16, fontWeight: '800', color: theme.colors.text, marginBottom: 12 }}>Profit & Loss</Text>
              <Row label="Revenue (Sales)" value={formatMYR(revenue)} tone="positive" />
              <Row label="COGS" value={`- ${formatMYR(cogs)}`} tone="negative" />
              <View style={{ height: 1, backgroundColor: theme.colors.border, marginVertical: 8 }} />
              <Row label="Gross Profit" value={formatMYR(grossProfit)} bold />
              <Row label="Expenses" value={`- ${formatMYR(expenseTotal)}`} tone="negative" />
              <View style={{ height: 1, backgroundColor: theme.colors.border, marginVertical: 8 }} />
              <Row label="Net Profit" value={formatMYR(netProfit)} bold big tone={netProfit >= 0 ? 'positive' : 'negative'} />
            </Card>
          </Animated.View>

          {/* Cash Flow */}
          <Animated.View entering={FadeInDown.delay(50).duration(400)}>
            <Card style={{ marginBottom: 12 }}>
              <Text style={{ fontSize: 16, fontWeight: '800', color: theme.colors.text, marginBottom: 12 }}>Cash Flow</Text>
              <Row label="Cash In (Sales)" value={formatMYR(revenue)} tone="positive" />
              <Row label="Cash Out (Purchases)" value={`- ${formatMYR(purchaseTotal)}`} tone="negative" />
              <Row label="Cash Out (Expenses)" value={`- ${formatMYR(expenseTotal)}`} tone="negative" />
              <View style={{ height: 1, backgroundColor: theme.colors.border, marginVertical: 8 }} />
              <Row label="Net Cash Flow" value={formatMYR(revenue - purchaseTotal - expenseTotal)} bold big />
            </Card>
          </Animated.View>

          {/* Payment breakdown */}
          <Animated.View entering={FadeInDown.delay(100).duration(400)}>
            <Card style={{ marginBottom: 12 }}>
              <Text style={{ fontSize: 16, fontWeight: '800', color: theme.colors.text, marginBottom: 12 }}>Sales by Payment</Text>
              {Object.entries(paymentBreakdown).map(([k, v]) => (
                <View key={k} style={{ marginBottom: 8 }}>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 }}>
                    <Text style={{ fontSize: 13, color: theme.colors.text }}>{k}</Text>
                    <Text style={{ fontSize: 13, fontWeight: '700', color: theme.colors.text }}>{formatMYR(v)}</Text>
                  </View>
                  <View style={{ height: 6, backgroundColor: theme.colors.cardMuted, borderRadius: 3 }}>
                    <View style={{ height: 6, backgroundColor: theme.colors.primary, borderRadius: 3, width: revenue > 0 ? `${(v / revenue) * 100}%` : '0%' }} />
                  </View>
                </View>
              ))}
            </Card>
          </Animated.View>

          {/* Top selling */}
          <Animated.View entering={FadeInDown.delay(150).duration(400)}>
            <Card style={{ marginBottom: 12 }}>
              <Text style={{ fontSize: 16, fontWeight: '800', color: theme.colors.text, marginBottom: 12 }}>Top Selling Products</Text>
              {topProducts.length === 0 ? <Text style={{ color: theme.colors.textSecondary, fontSize: 13, textAlign: 'center', paddingVertical: 12 }}>No sales in this period</Text> :
                topProducts.map((p, i) => (
                  <View key={p.name + i} style={{ flexDirection: 'row', alignItems: 'center', paddingVertical: 8, borderBottomWidth: i < topProducts.length - 1 ? 1 : 0, borderBottomColor: theme.colors.border }}>
                    <View style={{ width: 28, height: 28, borderRadius: 14, backgroundColor: theme.colors.primary, alignItems: 'center', justifyContent: 'center' }}>
                      <Text style={{ color: '#FFF', fontSize: 12, fontWeight: '800' }}>{i + 1}</Text>
                    </View>
                    <View style={{ flex: 1, marginLeft: 12 }}>
                      <Text style={{ fontSize: 14, fontWeight: '600', color: theme.colors.text }} numberOfLines={1}>{p.name}</Text>
                      <Text style={{ fontSize: 11, color: theme.colors.textSecondary, marginTop: 2 }}>{p.qty} sold</Text>
                    </View>
                    <Text style={{ fontSize: 14, fontWeight: '800', color: theme.colors.primary }}>{formatMYR(p.revenue)}</Text>
                  </View>
                ))}
            </Card>
          </Animated.View>

          {/* Low stock */}
          <Animated.View entering={FadeInDown.delay(200).duration(400)}>
            <Card>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                <Text style={{ fontSize: 16, fontWeight: '800', color: theme.colors.text }}>Low Stock Report</Text>
                <Text style={{ fontSize: 12, color: theme.colors.error, fontWeight: '700' }}>{lowStock.length} items</Text>
              </View>
              {lowStock.length === 0 ? <Text style={{ color: theme.colors.textSecondary, fontSize: 13, textAlign: 'center', paddingVertical: 12 }}>No low-stock products 🎉</Text> :
                lowStock.slice(0, 10).map((p, i) => (
                  <View key={p.id} style={{ flexDirection: 'row', alignItems: 'center', paddingVertical: 8, borderBottomWidth: i < Math.min(10, lowStock.length) - 1 ? 1 : 0, borderBottomColor: theme.colors.border }}>
                    <MaterialIcons name="warning" size={18} color={theme.colors.error} />
                    <View style={{ flex: 1, marginLeft: 10 }}>
                      <Text style={{ fontSize: 13, fontWeight: '600', color: theme.colors.text }}>{p.name}</Text>
                      <Text style={{ fontSize: 11, color: theme.colors.textSecondary, marginTop: 2 }}>SKU: {p.sku}</Text>
                    </View>
                    <Text style={{ fontSize: 13, fontWeight: '700', color: theme.colors.error }}>{p.stock} / {p.minStock}</Text>
                  </View>
                ))}
            </Card>
          </Animated.View>
        </ScrollView>
      </SafeAreaView>
    </Screen>
  );
}

function Row({ label, value, bold, big, tone }: any) {
  const { theme } = useTheme();
  const color = tone === 'positive' ? theme.colors.success : tone === 'negative' ? theme.colors.error : theme.colors.text;
  return (
    <View style={{ flexDirection: 'row', justifyContent: 'space-between', paddingVertical: big ? 4 : 2 }}>
      <Text style={{ fontSize: big ? 15 : 13, color: theme.colors.textSecondary, fontWeight: bold ? '700' : '500' }}>{label}</Text>
      <Text style={{ fontSize: big ? 20 : 14, color, fontWeight: bold ? '800' : '600' }}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  chip: { paddingHorizontal: 16, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
});
