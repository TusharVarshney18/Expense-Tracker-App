import React from 'react';
import { View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Svg, { Circle, Path, Rect } from 'react-native-svg';

import { useTheme } from '@/theme';
import { Button } from './Button';
import { Text } from './Text';

interface EmptyStateProps {
  title: string;
  message?: string;
  icon?: keyof typeof Ionicons.glyphMap;
  actionLabel?: string;
  onAction?: () => void;
  compact?: boolean;
}

function Illustration({ icon }: { icon?: keyof typeof Ionicons.glyphMap }) {
  const { colors } = useTheme();
  return (
    <View style={{ width: 148, height: 112, alignItems: 'center', justifyContent: 'center' }}>
      <Svg width={148} height={112} viewBox="0 0 148 112">
        <Circle cx={74} cy={58} r={48} fill={colors.primarySoft} />
        <Circle cx={28} cy={26} r={7} fill={`${colors.primary}66`} />
        <Circle cx={124} cy={84} r={5} fill={`${colors.warning}88`} />
        <Circle cx={128} cy={22} r={3} fill={`${colors.info}99`} />
        <Rect x={38} y={30} width={72} height={58} rx={16} fill={colors.surface} stroke={colors.borderStrong} strokeWidth={1.5} />
        <Rect x={50} y={44} width={48} height={7} rx={3.5} fill={colors.surfaceSunken} />
        <Rect x={50} y={58} width={32} height={7} rx={3.5} fill={colors.primary} opacity={0.85} />
        <Path d="M100 18 L108 26 L100 34" stroke={colors.primary} strokeWidth={3} strokeLinecap="round" strokeLinejoin="round" fill="none" />
        <Path d="M46 92 Q74 104 102 92" stroke={colors.borderStrong} strokeWidth={2} strokeLinecap="round" fill="none" />
      </Svg>
      {icon ? (
        <View
          style={{
            position: 'absolute',
            width: 36,
            height: 36,
            borderRadius: 18,
            backgroundColor: colors.primary,
            alignItems: 'center',
            justifyContent: 'center'
          }}
        >
          <Ionicons name={icon} size={18} color={colors.onPrimary} />
        </View>
      ) : null}
    </View>
  );
}

export function EmptyState({
  title,
  message,
  icon,
  actionLabel,
  onAction,
  compact = false
}: EmptyStateProps) {
  const { colors, spacing } = useTheme();
  return (
    <View
      style={{
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: compact ? spacing.xl : spacing.xxl,
        paddingHorizontal: spacing.lg
      }}
    >
      <Illustration icon={icon} />
      <Text variant="subtitle" align="center" color={colors.text} style={{ marginTop: spacing.md }}>
        {title}
      </Text>
      {message ? (
        <Text
          variant="body"
          align="center"
          color={colors.textMuted}
          style={{ marginTop: spacing.sm, maxWidth: 300 }}
        >
          {message}
        </Text>
      ) : null}
      {actionLabel && onAction ? (
        <Button
          label={actionLabel}
          onPress={onAction}
          size="sm"
          fullWidth={false}
          style={{ marginTop: spacing.lg, paddingHorizontal: spacing.xl }}
        />
      ) : null}
    </View>
  );
}
