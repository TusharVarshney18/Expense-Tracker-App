import React from 'react';
import { Link, Stack } from 'expo-router';
import { View } from 'react-native';

import { EmptyState } from '@/components/ui/EmptyState';
import { Screen } from '@/components/ui/Screen';
import { Text } from '@/components/ui/Text';
import { useTheme } from '@/theme';

export default function NotFoundScreen() {
  const { colors } = useTheme();
  return (
    <Screen>
      <Stack.Screen options={{ title: 'Not found', headerShown: true }} />
      <View style={{ flex: 1, justifyContent: 'center' }}>
        <EmptyState
          icon="alert-circle-outline"
          title="Page not found"
          message="The screen you were looking for does not exist."
        />
        <Link href="/(tabs)" style={{ color: colors.primary, textAlign: 'center' }}>
          <Text variant="bodyStrong" color={colors.primary} align="center">
            Go back home
          </Text>
        </Link>
      </View>
    </Screen>
  );
}
