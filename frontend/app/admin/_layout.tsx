import React from 'react';
import { Stack } from 'expo-router';
import { AdminGuard } from '@/src/components/guards';

export default function AdminAppLayout() {
  return (
    <AdminGuard>
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="index" />
        <Stack.Screen name="dashboard" />
        <Stack.Screen name="companies" />
        <Stack.Screen name="company/[id]" />
        <Stack.Screen name="subscriptions" />
        <Stack.Screen name="payments" />
      </Stack>
    </AdminGuard>
  );
}
