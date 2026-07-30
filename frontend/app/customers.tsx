import React from 'react';
import { View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useTheme } from '@/src/contexts/ThemeContext';
import { Header, Screen } from '@/src/components/UI';
import { useData } from '@/src/contexts/DataContext';
import CustomersModalContent from '@/src/components/CustomersModalContent';

export default function CustomersPage() {
  const { theme } = useTheme();
  const router = useRouter();
  const data = useData();
  return (
    <Screen>
      <SafeAreaView style={{ flex: 1 }} edges={['top', 'bottom']}>
        <Header title="Customers" onBack={() => router.back()} />
        <View style={{ flex: 1 }}>
          <CustomersModalContent
            customers={data.customers}
            onCreate={data.createCustomer}
            onUpdate={data.updateCustomer}
            onDelete={data.deleteCustomer}
          />
        </View>
      </SafeAreaView>
    </Screen>
  );
}
