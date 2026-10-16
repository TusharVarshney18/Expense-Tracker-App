import React, { useEffect } from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import { Stack, useRouter, useSegments } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import * as SplashScreen from 'expo-splash-screen';
import { Ionicons } from '@expo/vector-icons';

import { AuthProvider, useAuth } from '@/context/AuthProvider';
import { Button } from '@/components/Button';
import { COLORS } from '@/lib/constants';
import { configureAndroidChannel } from '@/lib/notifications';

SplashScreen.preventAutoHideAsync().catch(() => {
  /* already prevented */
});

/** Redirects between the auth group and the app based on session state. */
function useProtectedRoute() {
  const { session, initializing } = useAuth();
  const segments = useSegments();
  const router = useRouter();

  useEffect(() => {
    if (initializing) return;
    const inAuthGroup = segments[0] === '(auth)';

    if (!session && !inAuthGroup) {
      router.replace('/(auth)/sign-in');
    } else if (session && inAuthGroup) {
      router.replace('/(tabs)');
    }
  }, [session, initializing, segments, router]);
}

/** Full-screen biometric gate shown when the app lock is enabled. */
function LockScreen() {
  const { unlock, signOut } = useAuth();
  return (
    <View style={styles.lock}>
      <Ionicons name="lock-closed" size={56} color={COLORS.primary} />
      <Text style={styles.lockTitle}>Expense Counter is locked</Text>
      <Text style={styles.lockMessage}>
        Unlock with your biometrics or device passcode to continue.
      </Text>
      <View style={styles.lockActions}>
        <Button label="Unlock" onPress={() => void unlock()} />
        <Button label="Sign out" variant="secondary" onPress={() => void signOut()} />
      </View>
    </View>
  );
}

function RootNavigator() {
  const { initializing, locked } = useAuth();
  useProtectedRoute();

  useEffect(() => {
    if (!initializing) {
      SplashScreen.hideAsync().catch(() => {
        /* no-op */
      });
    }
  }, [initializing]);

  if (initializing) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator size="large" color={COLORS.primary} />
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
        contentStyle: { backgroundColor: COLORS.background },
        headerTintColor: COLORS.primaryDark,
        headerStyle: { backgroundColor: COLORS.surface }
      }}
    >
      <Stack.Screen name="(auth)" />
      <Stack.Screen name="(tabs)" />
      <Stack.Screen
        name="chat/[id]"
        options={{ headerShown: true, title: 'Chat' }}
      />
      <Stack.Screen
        name="expense/new"
        options={{ headerShown: true, title: 'New expense', presentation: 'modal' }}
      />
      <Stack.Screen
        name="legal/privacy"
        options={{ headerShown: true, title: 'Privacy Policy' }}
      />
      <Stack.Screen
        name="legal/terms"
        options={{ headerShown: true, title: 'Terms of Service' }}
      />
    </Stack>
  );
}

export default function RootLayout() {
  useEffect(() => {
    void configureAndroidChannel();
  }, []);

  return (
    <SafeAreaProvider>
      <AuthProvider>
        <StatusBar style="dark" />
        <RootNavigator />
      </AuthProvider>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  loading: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.background
  },
  lock: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 32,
    backgroundColor: COLORS.background
  },
  lockTitle: { fontSize: 20, fontWeight: '700', color: COLORS.text, marginTop: 16 },
  lockMessage: {
    fontSize: 14,
    color: COLORS.textMuted,
    textAlign: 'center',
    marginTop: 8,
    lineHeight: 20
  },
  lockActions: { marginTop: 28, gap: 12, alignSelf: 'stretch' }
});
