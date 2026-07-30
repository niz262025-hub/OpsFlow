import React, { useEffect } from 'react';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { LogBox, StatusBar } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { useIconFonts } from '@/src/hooks/use-icon-fonts';
import { AuthProvider } from '@/src/contexts/AuthContext';
import { DataProvider } from '@/src/contexts/DataContext';
import { ThemeProvider, useTheme } from '@/src/contexts/ThemeContext';

LogBox.ignoreAllLogs(true);
SplashScreen.preventAutoHideAsync();

function StatusBarWrap() {
  const { theme } = useTheme();
  return <StatusBar barStyle={theme.isDark ? 'light-content' : 'dark-content'} backgroundColor={theme.colors.background} />;
}

export default function RootLayout() {
  const [loaded, error] = useIconFonts();

  useEffect(() => {
    if (loaded || error) SplashScreen.hideAsync();
  }, [loaded, error]);

  if (!loaded && !error) return null;

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <ThemeProvider>
          <StatusBarWrap />
          <AuthProvider>
            <DataProvider>
              <Stack screenOptions={{ headerShown: false, animation: 'fade' }}>
                <Stack.Screen name="index" />
                <Stack.Screen name="(auth)/login" />
                <Stack.Screen name="(auth)/register" />
                <Stack.Screen name="(auth)/forgot-password" />
                <Stack.Screen name="(setup)/company-setup" />
                <Stack.Screen name="(tabs)" />
                <Stack.Screen name="team" options={{ animation: 'slide_from_right' }} />
                <Stack.Screen name="purchases" options={{ animation: 'slide_from_right' }} />
                <Stack.Screen name="expenses" options={{ animation: 'slide_from_right' }} />
                <Stack.Screen name="customers" options={{ animation: 'slide_from_right' }} />
                <Stack.Screen name="backup" options={{ animation: 'slide_from_right' }} />
              </Stack>
            </DataProvider>
          </AuthProvider>
        </ThemeProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
