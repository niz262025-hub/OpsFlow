import React from 'react';
import { View, Text, ScrollView, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { MaterialIcons } from '@expo/vector-icons';
import { useTheme } from '@/src/contexts/ThemeContext';
import { Card, Header, Screen } from '@/src/components/UI';

function HelpRow({ icon, title, subtitle }: { icon: keyof typeof MaterialIcons.glyphMap; title: string; subtitle: string }) {
  const { theme } = useTheme();
  return (
    <TouchableOpacity style={{ flexDirection: 'row', alignItems: 'center', paddingVertical: 12 }}>
      <View style={{ width: 40, height: 40, borderRadius: 12, backgroundColor: theme.colors.primaryLight, alignItems: 'center', justifyContent: 'center' }}>
        <MaterialIcons name={icon} size={20} color={theme.colors.primary} />
      </View>
      <View style={{ flex: 1, marginLeft: 10 }}>
        <Text style={{ fontSize: 14, fontWeight: '700', color: theme.colors.text }}>{title}</Text>
        <Text style={{ fontSize: 12, color: theme.colors.textSecondary, marginTop: 2 }}>{subtitle}</Text>
      </View>
      <MaterialIcons name="chevron-right" size={22} color={theme.colors.textMuted} />
    </TouchableOpacity>
  );
}

export default function HelpPage() {
  const { theme } = useTheme();
  const router = useRouter();

  return (
    <Screen>
      <SafeAreaView style={{ flex: 1 }} edges={['top', 'bottom']}>
        <Header title="Help Center" onBack={() => router.back()} subtitle="Support and guides" />
        <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 40 }}>
          <Card style={{ marginBottom: 12 }}>
            <Text style={{ fontSize: 18, fontWeight: '800', color: theme.colors.text }}>How can we help?</Text>
            <Text style={{ fontSize: 13, color: theme.colors.textSecondary, marginTop: 4 }}>Find quick answers for onboarding, POS, inventory, reporting, and team management.</Text>
          </Card>

          <Card>
            <HelpRow icon="play-circle-outline" title="Getting Started" subtitle="Set up company profile and first products" />
            <HelpRow icon="point-of-sale" title="POS Operations" subtitle="Checkout, receipt, and payment flow" />
            <HelpRow icon="inventory-2" title="Inventory Workflow" subtitle="Products, stock movements, and low stock alerts" />
            <HelpRow icon="bar-chart" title="Reports & Export" subtitle="PDF and Excel output" />
            <HelpRow icon="groups" title="Users & Roles" subtitle="Invite team and assign access" />
          </Card>
        </ScrollView>
      </SafeAreaView>
    </Screen>
  );
}
