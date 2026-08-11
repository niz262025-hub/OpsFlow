import React from 'react';
import { Alert, View, Text, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { MaterialIcons } from '@expo/vector-icons';
import { useTheme } from '@/src/contexts/ThemeContext';
import { Badge, Button, Card, Header, Screen } from '@/src/components/UI';

export default function SubscriptionPage() {
  const { theme } = useTheme();
  const router = useRouter();

  return (
    <Screen>
      <SafeAreaView style={{ flex: 1 }} edges={['top', 'bottom']}>
        <Header title="Subscription" onBack={() => router.back()} subtitle="Plan & billing" />
        <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 40 }}>
          <Card style={{ marginBottom: 12, backgroundColor: theme.colors.primaryLight }}>
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <View style={{ width: 52, height: 52, borderRadius: 16, backgroundColor: '#FFF', alignItems: 'center', justifyContent: 'center' }}>
                <MaterialIcons name="workspace-premium" size={24} color={theme.colors.primary} />
              </View>
              <View style={{ flex: 1, marginLeft: 12 }}>
                <Text style={{ fontSize: 18, fontWeight: '800', color: theme.colors.text }}>BizFlow Pro Trial</Text>
                <Text style={{ fontSize: 12, color: theme.colors.textSecondary, marginTop: 2 }}>Commercial-ready tools for modern retail operations</Text>
              </View>
              <Badge label="ACTIVE" tone="success" />
            </View>
          </Card>

          <Card style={{ marginBottom: 12 }}>
            <Text style={{ fontSize: 15, fontWeight: '700', color: theme.colors.text, marginBottom: 10 }}>Included Features</Text>
            <Text style={{ fontSize: 13, color: theme.colors.textSecondary, marginBottom: 6 }}>• POS and receipt workflows</Text>
            <Text style={{ fontSize: 13, color: theme.colors.textSecondary, marginBottom: 6 }}>• Inventory and stock movement tracking</Text>
            <Text style={{ fontSize: 13, color: theme.colors.textSecondary, marginBottom: 6 }}>• Purchase, customer, expense and reports modules</Text>
            <Text style={{ fontSize: 13, color: theme.colors.textSecondary }}>• Team roles and export-ready reports</Text>
          </Card>

          <Card style={{ marginBottom: 12 }}>
            <Text style={{ fontSize: 15, fontWeight: '700', color: theme.colors.text, marginBottom: 8 }}>Upgrade Path</Text>
            <Text style={{ fontSize: 13, color: theme.colors.textSecondary, marginBottom: 12 }}>Billing integration can be connected to Stripe or your preferred provider in the next release phase.</Text>
            <Button title="Contact Sales" onPress={() => Alert.alert('Contact Sales', 'Sales contact channel will be enabled in a future billing release.')} icon="support-agent" fullWidth />
          </Card>
        </ScrollView>
      </SafeAreaView>
    </Screen>
  );
}
