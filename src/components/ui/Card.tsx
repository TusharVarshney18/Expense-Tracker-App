import React from 'react';
import { View, type StyleProp, type ViewStyle } from 'react-native';

import { useTheme } from '@/theme';

type CardVariant = 'default' | 'raised' | 'sunken' | 'accent' | 'danger';

interface CardProps {
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  variant?: CardVariant;
  padded?: boolean;
}

/** Elevated surface with a hairline border. */
export function Card({ children, style, variant = 'default', padded = true }: CardProps) {
  const { colors, radius, spacing, shadows } = useTheme();
  const variantStyle: ViewStyle =
    variant === 'raised'
      ? { backgroundColor: colors.surfaceRaised, ...shadows.card }
      : variant === 'sunken'
        ? { backgroundColor: colors.surfaceSunken }
        : variant === 'accent'
          ? { backgroundColor: colors.primarySoft, borderColor: `${colors.primary}33` }
          : variant === 'danger'
            ? { backgroundColor: colors.dangerSoft, borderColor: `${colors.danger}44` }
            : { backgroundColor: colors.surface, ...shadows.card };

  return (
    <View
      style={[
        {
          borderRadius: radius.card,
          borderWidth: 1,
          borderColor: colors.border,
          padding: padded ? spacing.lg : 0,
          overflow: 'hidden',
          minWidth: 0,
          maxWidth: '100%'
        },
        variantStyle,
        style
      ]}
    >
      {children}
    </View>
  );
}
