import React from 'react';
import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { useTheme } from '@/theme';
import { PressableScale } from './PressableScale';
import { Text } from './Text';

interface ListRowProps {
  title: string;
  subtitle?: string;
  icon?: keyof typeof Ionicons.glyphMap;
  iconColor?: string;
  leading?: React.ReactNode;
  right?: React.ReactNode;
  value?: string;
  onPress?: () => void;
  showChevron?: boolean;
  danger?: boolean;
  showDivider?: boolean;
  style?: StyleProp<ViewStyle>;
  accessibilityLabel?: string;
}

export function ListRow({
  title,
  subtitle,
  icon,
  iconColor,
  leading,
  right,
  value,
  onPress,
  showChevron = Boolean(onPress),
  danger = false,
  showDivider = false,
  style,
  accessibilityLabel
}: ListRowProps) {
  const { colors, spacing, radius } = useTheme();
  const tone = danger ? colors.danger : colors.text;

  const content = (
    <View
      style={[
        styles.content,
        {
          minHeight: 58,
          paddingVertical: spacing.md,
          borderTopWidth: showDivider ? 1 : 0,
          borderTopColor: colors.border,
          gap: spacing.md
        },
        style
      ]}
    >
      {leading ?? (icon ? (
        <View
          style={{
            width: 40,
            height: 40,
            borderRadius: radius.sm,
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: danger ? colors.dangerSoft : colors.surfaceSunken
          }}
        >
          <Ionicons name={icon} size={19} color={iconColor ?? (danger ? colors.danger : colors.textSecondary)} />
        </View>
      ) : null)}
      <View style={styles.copy}>
        <Text variant="bodyStrong" color={tone} numberOfLines={1}>
          {title}
        </Text>
        {subtitle ? (
          <Text variant="caption" color={colors.textMuted} style={{ marginTop: 3 }} numberOfLines={2}>
            {subtitle}
          </Text>
        ) : null}
      </View>
      {value ? (
        <Text variant="bodyStrong" color={colors.textSecondary} numberOfLines={1} ellipsizeMode="tail" style={{ flexShrink: 1, minWidth: 0, textAlign: 'right' }}>
          {value}
        </Text>
      ) : null}
      {right}
      {onPress && showChevron ? (
        <Ionicons name="chevron-forward" size={17} color={colors.textMuted} />
      ) : null}
    </View>
  );

  if (!onPress) return content;

  return (
    <PressableScale
      onPress={onPress}
      accessibilityLabel={accessibilityLabel ?? title}
      style={{ width: '100%' }}
    >
      {content}
    </PressableScale>
  );
}

const styles = StyleSheet.create({
  content: { flexDirection: 'row', alignItems: 'center', minWidth: 0 },
  copy: { flex: 1, minWidth: 0 }
});
