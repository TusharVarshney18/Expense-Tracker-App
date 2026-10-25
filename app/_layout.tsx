import React, { useEffect } from 'react';
import { View } from 'react-native';
import { Stack, useRouter, useSegments } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import * as SplashScreen from 'expo-splash-screen';
import { GestureHandlerRootView } from 'react-native-gesture-handler';

import { AuthProvider, useAuth } from '@/context/AuthProvider';
import { BrandMark } from '@/components/BrandMark';
import { LockScreen } from '@/components/LockScreen';
import { Text } from '@/components/ui/Text';
import { configureAndroidChannel } from '@/lib/notifications';
import { ThemeProvider, useTheme } from '@/theme';
import { useAppFonts } from '@/theme/useAppFonts';

SplashScreen.preventAutoHideAsync().catch(() => {
  /* already prevented */
});

function useProtectedRoute() {
  const { session, initializing, termsAccepted } = useAuth();
  const segments = useSegments();
  const router = useRouter();

  useEffect(() => {
    if (initializing) return;
    const inAuthGroup = segments[0] === '(auth)';

    if (!session && !inAuthGroup) {
      router.replace('/(auth)/sign-in');
    } else if (session && !termsAccepted && segments[0] !== 'legal') {
      router.replace('/legal/accept-terms');
    } else if (session && termsAccepted && (inAuthGroup || (segments[0] === 'legal' && segments[1] === 'accept-terms'))) {
      router.replace('/(tabs)');
    }
  }, [session, initializing, termsAccepted, segments, router]);
}

function RootNavigator({ fontsReady }: { fontsReady: boolean }) {
  const { initializing, locked } = useAuth();
  const { colors, fonts, typography } = useTheme();
  useProtectedRoute();

  useEffect(() => {
    if (!initializing && fontsReady) {
      SplashScreen.hideAsync().catch(() => {
        /* no-op */
      });
    }
  }, [fontsReady, initializing]);

  if (initializing || !fontsReady) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.background, gap: 16 }}>
        <BrandMark size={64} />
        <Text variant="caption" color={colors.textMuted}>
          Preparing your money…
        </Text>
      </View>
    );
  }

  if (locked) {
    return <LockScreen />;
  }

  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: colors.background },
        headerTintColor: colors.text,
        headerStyle: { backgroundColor: colors.background },
        headerShadowVisible: false,
        headerTitleStyle: {
          fontFamily: fonts.semibold,
          fontSize: typography.subtitle.fontSize,
          color: colors.text
        },
        headerBackButtonDisplayMode: 'minimal',
        animation: 'slide_from_right'
      }}
    >
      <Stack.Screen name="(auth)" />
      <Stack.Screen name="(tabs)" />
      <Stack.Screen name="group/[id]" options={{ headerShown: false }} />
      <Stack.Screen name="chat/[id]" options={{ headerShown: true, title: 'Chat' }} />
      <Stack.Screen
        name="expense/new"
        options={{
          headerShown: false,
          presentation: 'modal',
          animation: 'slide_from_bottom'
        }}
      />
      <Stack.Screen name="legal/privacy" options={{ headerShown: true, title: 'Privacy Policy' }} />
      <Stack.Screen name="legal/terms" options={{ headerShown: true, title: 'Terms of Service' }} />
      <Stack.Screen name="legal/accept-terms" options={{ headerShown: false, gestureEnabled: false }} />
    </Stack>
  );
}

function ThemedApp({ fontsReady }: { fontsReady: boolean }) {
  const { statusBarStyle } = useTheme();
  return (
    <>
      <StatusBar style={statusBarStyle} />
      <RootNavigator fontsReady={fontsReady} />
    </>
  );
}

export default function RootLayout() {
  const [fontsLoaded, fontError] = useAppFonts();

  useEffect(() => {
    void configureAndroidChannel();
  }, []);

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <ThemeProvider>
          <AuthProvider>
            <ThemedApp fontsReady={fontsLoaded || Boolean(fontError)} />
          </AuthProvider>
        </ThemeProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
