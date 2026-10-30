import React from 'react';
import { ActivityIndicator, View } from 'react-native';
import { Redirect } from 'expo-router';
import { useAuth } from '@/src/contexts/AuthContext';
import MyopsEntry from '@/src/components/MyopsEntry';

export function CustomerGuard({ children }: { children: React.ReactNode }) {
  const { user, loading, onboardingRequired } = useAuth();
  if (loading) return <View accessibilityLabel="Sahkan akses MYOPS"><ActivityIndicator /></View>;
  if (onboardingRequired) return <Redirect href={'/onboarding' as never} />;
  if (!user) return <MyopsEntry />;
  return <>{children}</>;
}

// Platform administration is exclusively hosted and authorized by MYOPS.
export function AdminGuard(_props: { children: React.ReactNode }) {
  return <MyopsEntry admin />;
}
