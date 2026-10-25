import React from 'react';
import { StyleSheet, Text as RNText, type TextProps, type TextStyle } from 'react-native';

import { useTheme } from '@/theme';

type Variant =
  | 'hero'
  | 'display'
  | 'title'
  | 'subtitle'
  | 'body'
  | 'bodyStrong'
  | 'caption'
  | 'label'
  | 'button'
  | 'money'
  | 'moneySmall';

interface AppTextProps extends TextProps {
  variant?: Variant;
  color?: string;
  align?: TextStyle['textAlign'];
  weight?: keyof ReturnType<typeof useTheme>['fonts'];
}

export function Text({
  variant = 'body',
  color,
  align,
  weight,
  style,
  children,
  ...rest
}: AppTextProps) {
  const theme = useTheme();
  const variantStyle = theme.typography[variant];
  return (
    <RNText
      {...rest}
      style={[
        variantStyle,
        { flexShrink: 1, minWidth: 0 },
        color ? { color } : null,
        align ? { textAlign: align } : null,
        weight ? { fontFamily: theme.fonts[weight] } : null,
        style
      ]}
    >
      {children}
    </RNText>
  );
}

export const textStyles = StyleSheet.create({});
