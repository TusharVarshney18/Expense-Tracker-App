import React from 'react';
import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { hapticSelect } from '@/lib/haptics';
import { useTheme } from '@/theme';
import { PressableScale } from './PressableScale';
import { Text } from './Text';

interface ChipProps {
  label: string;
  selected?: boolean;
  onPress?: () => void;
  icon?: keyof typeof Ionicons.glyphMap;
  color?: string;
  style?: StyleProp<ViewStyle>;
  accessibilityLabel?: string;
}

export function Chip({
  label,
  selected = false,
  onPress,
  icon,
  color,
  style,
  accessibilityLabel
}: ChipProps) {
  const { colors, radius, spacing } = useTheme();
  const accent = color ?? colors.primary;

  return (
    <PressableScale
      onPress={() => {
        hapticSelect();
        onPress?.();
      }}
      disabled={!onPress}
      accessibilityLabel={accessibilityLabel ?? label}
      accessibilityState={{ selected }}
      style={[
        {
          minHeight: 44,
          borderRadius: radius.pill,
          borderWidth: 1,
          borderColor: selected ? `${accent}66` : colors.border,
          backgroundColor: selected ? `${accent}1F` : colors.surface,
          paddingHorizontal: spacing.md,
          flexDirection: 'row',
          gap: spacing.xs + 2,
          minWidth: 0,
          maxWidth: '100%'
        },
        style
      ]}
      containerStyle={styles.auto}
    >
      {icon ? (
        <Ionicons name={icon} size={15} color={selected ? accent : colors.textMuted} />
      ) : null}
      <Text
        variant="bodyStrong"
        style={{
          fontSize: 13,
          lineHeight: 18,
          color: selected ? accent : colors.textSecondary,
          textTransform: 'capitalize',
          flexShrink: 1,
          minWidth: 0
        }}
        numberOfLines={1}
        ellipsizeMode="tail"
      >
        {label}
      </Text>
      {selected ? (
        <View style={{ marginLeft: spacing.xxs }}>
          <Ionicons name="checkmark-circle" size={14} color={accent} />
        </View>
      ) : null}
    </PressableScale>
  );
}

const styles = StyleSheet.create({
  auto: { alignSelf: 'flex-start' }
});
