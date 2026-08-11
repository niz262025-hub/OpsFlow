import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useRouter, usePathname } from 'expo-router';
import { useAuth } from '@/src/contexts/AuthContext';
import { storage } from '@/src/utils/storage';

export function CustomerGuard({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (loading) return;
    if (!user) {
      const target = pathname === '/app' ? '/login' : '/login';
      router.replace(target);
    }
  }, [loading, pathname, router, user]);

  if (loading) {
    return (
      <View style={styles.centered}>
        <Text style={styles.message}>Preparing your workspace…</Text>
      </View>
    );
  }

  if (!user) {
    return null;
  }

  return <>{children}</>;
}

export function AdminGuard({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [authorized, setAuthorized] = useState<boolean | null>(null);

  useEffect(() => {
    let isMounted = true;

    const checkSession = async () => {
      const token = await storage.getItem<string | null>('auth:admin-token', null);
      if (isMounted) {
        setAuthorized(Boolean(token));
      }
    };

    void checkSession();

    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    if (pathname === '/admin' || pathname === '/admin/') {
      setAuthorized(true);
      return;
    }

    if (authorized === false) {
      router.replace('/admin');
    }
  }, [authorized, pathname, router]);

  if (pathname === '/admin' || pathname === '/admin/') {
    return <>{children}</>;
  }

  if (authorized === null) {
    return (
      <View style={styles.centered}>
        <Text style={styles.message}>Loading admin workspace…</Text>
      </View>
    );
  }

  if (!authorized) {
    return null;
  }

  return <>{children}</>;
}

const styles = StyleSheet.create({
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F8FAFC',
    padding: 24,
  },
  message: {
    fontSize: 16,
    fontWeight: '600',
    color: '#0F172A',
    textAlign: 'center',
  },
});
