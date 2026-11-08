import { useEffect } from 'react';
import { Linking } from 'react-native';
import { router } from 'expo-router';
import { useAuth } from '@/src/contexts/AuthContext';
import { myopsPortalUrl } from '@/src/services/myopsAppAccess';

// Legacy entry URLs never render a second login or a confirmation screen.
export default function MyopsEntry({ admin = false }: { admin?: boolean }) {
  const { user, loading, onboardingRequired } = useAuth();
  useEffect(() => {
    if (loading) return;
    if (!admin && onboardingRequired) {
      router.replace('/onboarding' as never);
    } else if (!admin && user) {
      router.replace('/app' as never);
    } else {
      const destination = admin ? new URL('admin/audit', myopsPortalUrl()).toString() : myopsPortalUrl();
      if (typeof window !== 'undefined') window.location.replace(destination);
      else void Linking.openURL(destination);
    }
  }, [admin, loading, user, onboardingRequired]);
  return null;
}
