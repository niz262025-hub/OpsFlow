import React, { useEffect, useState } from 'react';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { LogBox, StatusBar, Text, View } from 'react-native';
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
  const [renderError, setRenderError] = useState<string | null>(null);
  const [bootFallbackReady, setBootFallbackReady] = useState(false);

  useEffect(() => {
    const fallbackTimer = setTimeout(() => setBootFallbackReady(true), 2500);
    return () => clearTimeout(fallbackTimer);
  }, []);

  useEffect(() => {
    try {
      if (loaded || error || bootFallbackReady) {
        void SplashScreen.hideAsync();
      }
    } catch (e) {
      setRenderError(e instanceof Error ? e.message : 'Unable to hide splash screen');
    }
  }, [bootFallbackReady, error, loaded]);

  useEffect(() => {
    const original = console.error;
    console.error = (...args: any[]) => {
      const text = args.join(' ');
      if (text.includes('Cannot read property') || text.includes('undefined is not')) {
        setRenderError(text);
      }
      original(...args);
    };

    return () => {
      console.error = original;
    };
  }, []);

  if (!loaded && !error && !bootFallbackReady) return null;

  if (renderError) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 }}>
        <Text style={{ fontSize: 16, fontWeight: '600', textAlign: 'center' }}>{renderError}</Text>
      </View>
    );
  }

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <ThemeProvider>
          <StatusBarWrap />
          <AuthProvider>
            <DataProvider>
              <Stack screenOptions={{ headerShown: false, animation: 'fade' }}>
                <Stack.Screen name="index" />
                <Stack.Screen name="login" />
                <Stack.Screen name="register" />
                <Stack.Screen name="demo" />
              </Stack>
            </DataProvider>
          </AuthProvider>
        </ThemeProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
