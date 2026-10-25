import React, { useState } from 'react';
import {
  Platform,
  StyleSheet,
  TextInput,
  View,
  type StyleProp,
  type TextInputProps,
  type TextStyle,
  type ViewStyle
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { useTheme } from '@/theme';
import { Text } from './Text';

// React Native Web accepts `outlineStyle: 'none'`, but React Native's TextStyle
// union does not include it. The custom mint ring below replaces the browser
// focus outline so it matches the app on every platform.
const webInputOutline =
  Platform.OS === 'web' ? ({ outlineStyle: 'none' } as unknown as TextStyle) : null;

interface InputProps extends Omit<TextInputProps, 'style'> {
  label?: string;
  errorText?: string | null;
  hint?: string;
  icon?: keyof typeof Ionicons.glyphMap;
  right?: React.ReactNode;
  containerStyle?: StyleProp<ViewStyle>;
  inputStyle?: StyleProp<TextStyle>;
}

export function Input({
  label,
  errorText,
  hint,
  icon,
  right,
  containerStyle,
  inputStyle,
  multiline,
  onFocus,
  onBlur,
  ...rest
}: InputProps) {
  const { colors, radius, spacing, typography, fonts } = useTheme();
  const [focused, setFocused] = useState(false);
  const borderColor = errorText ? colors.danger : focused ? colors.primary : colors.inputBorder;
  const fieldHeight = multiline ? 96 : 54;

  return (
    <View style={[{ marginBottom: spacing.lg }, containerStyle]}>
      {label ? (
        <Text variant="label" color={colors.textMuted} style={{ marginBottom: spacing.sm }}>
          {label}
        </Text>
      ) : null}
      <View style={{ position: 'relative' }}>
        <View
          style={[
            styles.row,
            {
              minHeight: fieldHeight,
              borderRadius: radius.input,
              borderWidth: 1,
              borderColor,
              backgroundColor: colors.input,
              paddingHorizontal: spacing.md,
              alignItems: multiline ? 'flex-start' : 'center',
              minWidth: 0
            }
          ]}
        >
          {icon ? (
            <Ionicons name={icon} size={18} color={focused ? colors.primary : colors.textMuted} style={{ marginRight: spacing.sm }} />
          ) : null}
          <TextInput
            {...rest}
            accessibilityLabel={rest.accessibilityLabel ?? label}
            multiline={multiline}
            onFocus={(event) => {
              setFocused(true);
              onFocus?.(event);
            }}
            onBlur={(event) => {
              setFocused(false);
              onBlur?.(event);
            }}
            placeholderTextColor={colors.textMuted}
            selectionColor={colors.primary}
            style={[
              {
                flex: 1,
                minWidth: 0,
                color: colors.text,
                fontFamily: fonts.regular,
                fontSize: Math.max(16, typography.body.fontSize),
                lineHeight: typography.body.lineHeight,
                paddingVertical: spacing.md,
                minHeight: multiline ? 88 : fieldHeight - 2,
                textAlignVertical: multiline ? 'top' : 'center'
              },
              webInputOutline,
              inputStyle
            ]}
          />
          {right ? <View style={{ marginLeft: spacing.sm }}>{right}</View> : null}
        </View>
        {focused ? (
          <View
            pointerEvents="none"
            style={{
              position: 'absolute',
              top: -3,
              left: -3,
              right: -3,
              bottom: -3,
              borderRadius: radius.input + 3,
              borderWidth: 2,
              borderColor: errorText ? colors.danger : colors.focusRing
            }}
          />
        ) : null}
      </View>
      {errorText ? (
        <Text variant="caption" color={colors.danger} style={{ marginTop: spacing.xs + 2 }}>
          {errorText}
        </Text>
      ) : hint ? (
        <Text variant="caption" color={colors.textMuted} style={{ marginTop: spacing.xs + 2 }}>
          {hint}
        </Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row' }
});
