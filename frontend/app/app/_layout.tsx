import React from 'react';
import { Stack } from 'expo-router';
import { CustomerGuard } from '@/src/components/guards';

export default function CustomerAppLayout() {
  return (
    <CustomerGuard>
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="index" />
        <Stack.Screen name="pos" />
        <Stack.Screen name="purchase" />
        <Stack.Screen name="inventory" />
        <Stack.Screen name="layout" />
        <Stack.Screen name="finance" />
        <Stack.Screen name="reports" />
        <Stack.Screen name="setup" />
      </Stack>
    </CustomerGuard>
  );
}
