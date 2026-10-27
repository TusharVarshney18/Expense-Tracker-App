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
  const { session, initializing, profileLoading, authCallbackLoading, termsAccepted } = useAuth();
  const segments = useSegments();
  const router = useRouter();

  useEffect(() => {
    // Wait until the session and its profile (including Terms) are known.
    if (initializing || authCallbackLoading || (session && profileLoading)) return;

    const inAuthGroup = segments[0] === '(auth)';
    const inLegalGroup = segments[0] === 'legal';
    const onAcceptTerms = segments[0] === 'legal' && segments[1] === 'accept-terms';

    if (!session) {
      if (!inAuthGroup) router.replace('/(auth)/sign-in');
    } else if (!termsAccepted) {
      // The Accept Terms screen stays in front of every protected route. The
      // Terms and Privacy documents remain reachable from that screen.
      if (!inLegalGroup) router.replace('/legal/accept-terms');
    } else if (inAuthGroup || onAcceptTerms) {
      router.replace('/(tabs)');
    }
  }, [session, initializing, profileLoading, authCallbackLoading, termsAccepted, segments, router]);
}

function RootNavigator({ fontsReady }: { fontsReady: boolean }) {
  const { initializing, profileLoading, authCallbackLoading, locked, session } = useAuth();
  const { colors, fonts, typography } = useTheme();
  useProtectedRoute();

  const loading = initializing || authCallbackLoading || (Boolean(session) && profileLoading);

  useEffect(() => {
    if (!initializing && fontsReady) {
      SplashScreen.hideAsync().catch(() => {
        /* no-op */
      });
    }
  }, [fontsReady, initializing]);

  if (loading || !fontsReady) {
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
      <Stack.Screen name="auth-callback" options={{ headerShown: false }} />
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
