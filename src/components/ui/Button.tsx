import React from 'react';
import {
  ActivityIndicator,
  StyleSheet,
  useWindowDimensions,
  View,
  type StyleProp,
  type ViewStyle
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';

import { hapticTap } from '@/lib/haptics';
import { useTheme } from '@/theme';
import { PressableScale } from './PressableScale';
import { Text } from './Text';

type ButtonVariant = 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger';
type ButtonSize = 'sm' | 'md' | 'lg';

interface ButtonProps {
  label: string;
  onPress?: () => void;
  variant?: ButtonVariant;
  size?: ButtonSize;
  icon?: keyof typeof Ionicons.glyphMap;
  iconPosition?: 'left' | 'right';
  loading?: boolean;
  disabled?: boolean;
  /** Set to false for a flat mint fill instead of the signature gradient. */
  gradient?: boolean;
  fullWidth?: boolean;
  style?: StyleProp<ViewStyle>;
  accessibilityHint?: string;
  containerStyle?: StyleProp<ViewStyle>;
  onLabelLinesChange?: (lineCount: number) => void;
}

export function Button({
  label,
  onPress,
  variant = 'primary',
  size = 'md',
  icon,
  iconPosition = 'left',
  loading = false,
  disabled = false,
  gradient = true,
  fullWidth = true,
  style,
  accessibilityHint,
  containerStyle,
  onLabelLinesChange
}: ButtonProps) {
  const { colors, radius, spacing, typography, fonts } = useTheme();
  const { fontScale } = useWindowDimensions();
  const isDisabled = disabled || loading;
  const minHeight = size === 'sm' ? 44 : size === 'lg' ? 56 : 50;
  const iconSize = size === 'sm' ? 16 : 18;

  const palette: Record<ButtonVariant, { bg: string; border: string; fg: string }> = {
    primary: { bg: colors.primary, border: colors.primary, fg: colors.onPrimary },
    secondary: { bg: colors.surfaceRaised, border: colors.borderStrong, fg: colors.text },
    outline: { bg: 'transparent', border: colors.borderStrong, fg: colors.text },
    ghost: { bg: 'transparent', border: 'transparent', fg: colors.textSecondary },
    danger: { bg: colors.danger, border: colors.danger, fg: colors.textInverse }
  };
  const tone = palette[variant];
  const contentColor = isDisabled
    ? variant === 'primary'
      ? colors.onPrimary
      : colors.textMuted
    : tone.fg;

  return (
    <PressableScale
      onPress={() => {
        if (isDisabled) return;
        hapticTap();
        onPress?.();
      }}
      disabled={isDisabled}
      accessibilityLabel={label}
      accessibilityHint={accessibilityHint}
      accessibilityState={{ busy: loading, disabled: isDisabled }}
      style={[
        {
          minHeight: Math.max(minHeight, Math.round(minHeight * Math.min(fontScale, 1.5))),
          borderRadius: radius.input,
          borderWidth: 1,
          borderColor: tone.border,
          backgroundColor: tone.bg,
          paddingHorizontal: spacing.lg,
          paddingVertical: spacing.sm,
          minWidth: 0,
          overflow: 'hidden',
          opacity: isDisabled && !loading ? 0.5 : 1,
          width: fullWidth ? '100%' : undefined
        },
        style
      ]}
      containerStyle={fullWidth ? [styles.full, containerStyle] : containerStyle}
    >
      {variant === 'primary' && gradient ? (
        <LinearGradient
          colors={[colors.primary, colors.primaryDeep]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={StyleSheet.absoluteFill}
        />
      ) : null}
      {loading ? (
        <ActivityIndicator size="small" color={contentColor} />
      ) : (
        <View style={styles.content}>
          {icon && iconPosition === 'left' ? (
            <Ionicons name={icon} size={iconSize} color={contentColor} />
          ) : null}
          <Text
            style={{
              ...typography.button,
              fontFamily: fonts.bold,
              color: contentColor,
              fontSize: size === 'sm' ? 14 : typography.button.fontSize,
              lineHeight: size === 'sm' ? 18 : typography.button.lineHeight,
              flexShrink: 1,
              minWidth: 0,
              textAlign: 'center'
            }}
            numberOfLines={2}
            ellipsizeMode="tail"
            onTextLayout={(event) => onLabelLinesChange?.(event.nativeEvent.lines.length)}
          >
            {label}
          </Text>
          {icon && iconPosition === 'right' ? (
            <Ionicons name={icon} size={iconSize} color={contentColor} />
          ) : null}
        </View>
      )}
    </PressableScale>
  );
}

const styles = StyleSheet.create({
  full: { alignSelf: 'stretch', width: '100%' },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    flex: 1,
    minWidth: 0
  }
});
