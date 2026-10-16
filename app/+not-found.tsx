import React from 'react';
import { Link, Stack } from 'expo-router';

import { Screen } from '@/components/Screen';
import { EmptyState } from '@/components/EmptyState';
import { COLORS } from '@/lib/constants';

export default function NotFoundScreen() {
  return (
    <Screen>
      <Stack.Screen options={{ title: 'Not found' }} />
      <EmptyState
        icon="alert-circle-outline"
        title="Page not found"
        message="The screen you were looking for does not exist."
      />
      <Link href="/(tabs)" style={{ color: COLORS.primary, textAlign: 'center' }}>
        Go back home
      </Link>
    </Screen>
  );
}
