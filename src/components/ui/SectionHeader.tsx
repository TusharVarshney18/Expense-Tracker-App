import React from 'react';
import { View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { useTheme } from '@/theme';
import { PressableScale } from './PressableScale';
import { Text } from './Text';

interface SectionHeaderProps {
  title: string;
  subtitle?: string;
  actionLabel?: string;
  onAction?: () => void;
  style?: { marginTop?: number; marginBottom?: number };
}

export function SectionHeader({ title, subtitle, actionLabel, onAction, style }: SectionHeaderProps) {
  const { colors, spacing } = useTheme();
  return (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'flex-start',
        justifyContent: 'space-between',
        marginTop: style?.marginTop ?? spacing.xl,
        marginBottom: style?.marginBottom ?? spacing.md,
        gap: spacing.md,
        flexWrap: 'wrap'
      }}
    >
      <View style={{ flex: 1, minWidth: 0 }}>
        <Text variant="subtitle" color={colors.text} numberOfLines={2} ellipsizeMode="tail">
          {title}
        </Text>
        {subtitle ? (
          <Text variant="caption" color={colors.textMuted} style={{ marginTop: 2 }} numberOfLines={2} ellipsizeMode="tail">
            {subtitle}
          </Text>
        ) : null}
      </View>
      {actionLabel && onAction ? (
        <PressableScale
          onPress={onAction}
          accessibilityLabel={actionLabel}
          style={{ flexDirection: 'row', alignItems: 'center', gap: 2, minHeight: 44, minWidth: 0, paddingLeft: spacing.sm }}
        >
          <Text variant="caption" color={colors.primary} weight="bold" numberOfLines={1} ellipsizeMode="tail">
            {actionLabel}
          </Text>
          <Ionicons name="arrow-forward" size={13} color={colors.primary} />
        </PressableScale>
      ) : null}
    </View>
  );
}
