import React from 'react';
import { View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { useTheme } from '@/theme';
import { PressableScale } from './PressableScale';
import { Text } from './Text';

interface ErrorBannerProps {
  message: string;
  title?: string;
  onRetry?: () => void;
  retryLabel?: string;
}

export function ErrorBanner({
  message,
  title = 'Something went wrong',
  onRetry,
  retryLabel = 'Retry'
}: ErrorBannerProps) {
  const { colors, radius, spacing } = useTheme();
  return (
    <View
      accessibilityRole="alert"
      style={{
        flexDirection: 'row',
        gap: spacing.md,
        borderWidth: 1,
        borderColor: `${colors.danger}44`,
        backgroundColor: colors.dangerSoft,
        borderRadius: radius.input,
        padding: spacing.md,
        marginBottom: spacing.md
      }}
    >
      <Ionicons name="alert-circle" size={20} color={colors.danger} style={{ marginTop: 1 }} />
      <View style={{ flex: 1, minWidth: 0 }}>
        <Text variant="bodyStrong" color={colors.text} numberOfLines={2} ellipsizeMode="tail">
          {title}
        </Text>
        <Text variant="caption" color={colors.textSecondary} style={{ marginTop: 2 }}>
          {message}
        </Text>
        {onRetry ? (
          <PressableScale
            onPress={onRetry}
            accessibilityLabel={retryLabel}
            style={{ alignSelf: 'flex-start', minHeight: 44, justifyContent: 'center', marginTop: 2 }}
          >
            <Text variant="caption" color={colors.danger} weight="bold">
              {retryLabel}
            </Text>
          </PressableScale>
        ) : null}
      </View>
    </View>
  );
}
