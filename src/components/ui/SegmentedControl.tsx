/* eslint-disable react-hooks/immutability -- Reanimated shared values are intentionally mutable. */
import React, { useCallback, useEffect, useState } from 'react';
import { StyleSheet, useWindowDimensions, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withTiming
} from 'react-native-reanimated';

import { hapticSelect } from '@/lib/haptics';
import { useTheme } from '@/theme';
import { PressableScale } from './PressableScale';
import { Text } from './Text';

export interface SegmentOption<T extends string> {
  value: T;
  label: string;
  icon?: keyof typeof Ionicons.glyphMap;
}

interface SegmentedControlProps<T extends string> {
  options: readonly SegmentOption<T>[];
  value: T;
  onChange: (value: T) => void;
  compact?: boolean;
}

export function SegmentedControl<T extends string>({
  options,
  value,
  onChange,
  compact = false
}: SegmentedControlProps<T>) {
  const { colors, radius, spacing } = useTheme();
  const { fontScale } = useWindowDimensions();
  const [width, setWidth] = useState(0);
  const translateX = useSharedValue(0);
  const padding = 4;
  const baseHeight = compact ? 52 : 56;
  const height = Math.max(baseHeight, Math.round(baseHeight * Math.min(fontScale, 1.5)));
  const itemWidth = width > 0 ? (width - padding * 2) / options.length : 0;
  const activeIndex = Math.max(
    0,
    options.findIndex((option) => option.value === value)
  );

  const updateIndicator = useCallback(
    (index: number) => {
      if (itemWidth <= 0) return;
      translateX.value = withTiming(index * itemWidth, { duration: 240 });
    },
    [itemWidth, translateX]
  );

  useEffect(() => {
    updateIndicator(activeIndex);
  }, [activeIndex, updateIndicator]);

  const indicatorStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: translateX.value }]
  }));

  return (
    <View
      onLayout={(event) => setWidth(event.nativeEvent.layout.width)}
      style={{
        height,
        borderRadius: radius.pill,
        borderWidth: 1,
        borderColor: colors.border,
        backgroundColor: colors.surfaceSunken,
        padding,
        flexDirection: 'row',
        alignItems: 'center'
      }}
    >
      {itemWidth > 0 ? (
        <Animated.View
          pointerEvents="none"
          style={[
            {
              position: 'absolute',
              left: padding,
              top: padding,
              bottom: padding,
              width: itemWidth,
              borderRadius: radius.pill,
              backgroundColor: colors.surfaceRaised,
              borderWidth: 1,
              borderColor: colors.borderStrong
            },
            indicatorStyle
          ]}
        />
      ) : null}
      {options.map((option) => {
        const selected = option.value === value;
        return (
          <PressableScale
            key={option.value}
            onPress={() => {
              if (selected) return;
              hapticSelect();
              onChange(option.value);
            }}
            accessibilityLabel={option.label}
            accessibilityRole="tab"
            accessibilityState={{ selected }}
            style={[
              styles.item,
              {
                height: height - padding * 2,
                borderRadius: radius.pill,
                gap: spacing.xs,
                paddingHorizontal: spacing.sm,
                minWidth: 0
              }
            ]}
            containerStyle={styles.flex}
          >
            {option.icon ? (
              <Ionicons
                name={option.icon}
                size={compact ? 14 : 16}
                color={selected ? colors.primary : colors.textMuted}
              />
            ) : null}
            <Text
              variant="bodyStrong"
              numberOfLines={1}
              style={{
                fontSize: compact ? 12 : 13,
                lineHeight: compact ? 16 : 18,
                color: selected ? colors.text : colors.textMuted,
                flexShrink: 1,
                minWidth: 0
              }}
              ellipsizeMode="tail"
            >
              {option.label}
            </Text>
          </PressableScale>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  item: { flexDirection: 'row' }
});
