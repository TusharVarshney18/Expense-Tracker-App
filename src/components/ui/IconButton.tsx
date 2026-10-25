import React from 'react';
import { Ionicons } from '@expo/vector-icons';
import type { StyleProp, ViewStyle } from 'react-native';

import { hapticTap } from '@/lib/haptics';
import { useTheme } from '@/theme';
import { PressableScale } from './PressableScale';

type IconButtonVariant = 'soft' | 'solid' | 'ghost' | 'danger' | 'surface';

interface IconButtonProps {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  onPress?: () => void;
  variant?: IconButtonVariant;
  size?: number;
  disabled?: boolean;
  style?: StyleProp<ViewStyle>;
}

export function IconButton({
  icon,
  label,
  onPress,
  variant = 'soft',
  size = 44,
  disabled = false,
  style
}: IconButtonProps) {
  const { colors } = useTheme();
  const palette: Record<IconButtonVariant, { bg: string; fg: string; border: string }> = {
    soft: { bg: colors.primarySoft, fg: colors.primary, border: 'transparent' },
    solid: { bg: colors.primary, fg: colors.onPrimary, border: colors.primary },
    surface: { bg: colors.surface, fg: colors.text, border: colors.border },
    ghost: { bg: 'transparent', fg: colors.textSecondary, border: 'transparent' },
    danger: { bg: colors.dangerSoft, fg: colors.danger, border: 'transparent' }
  };
  const tone = palette[variant];

  return (
    <PressableScale
      onPress={() => {
        if (disabled) return;
        hapticTap();
        onPress?.();
      }}
      disabled={disabled}
      accessibilityLabel={label}
      accessibilityState={{ disabled }}
      style={[
        {
          width: size,
          height: size,
          borderRadius: size / 2,
          backgroundColor: tone.bg,
          borderWidth: 1,
          borderColor: tone.border,
          opacity: disabled ? 0.45 : 1
        },
        style
      ]}
    >
      <Ionicons name={icon} size={Math.round(size * 0.45)} color={tone.fg} />
    </PressableScale>
  );
}
