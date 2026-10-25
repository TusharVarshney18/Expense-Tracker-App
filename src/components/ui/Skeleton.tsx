import React, { useEffect } from 'react';
import { View, type DimensionValue, type StyleProp, type ViewStyle } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming
} from 'react-native-reanimated';

import { useTheme } from '@/theme';

interface SkeletonProps {
  width?: DimensionValue;
  height?: number;
  radius?: number;
  style?: StyleProp<ViewStyle>;
}

export function Skeleton({ width = '100%', height = 14, radius, style }: SkeletonProps) {
  const { colors, radius: radii } = useTheme();
  const opacity = useSharedValue(0.55);

  useEffect(() => {
    opacity.value = withRepeat(withTiming(1, { duration: 820 }), -1, true);
  }, [opacity]);

  const animatedStyle = useAnimatedStyle(() => ({ opacity: opacity.value }));

  return (
    <Animated.View
      style={[
        {
          width,
          height,
          borderRadius: radius ?? radii.xs,
          backgroundColor: colors.skeleton
        },
        style,
        animatedStyle
      ]}
    />
  );
}

export function SkeletonList({ rows = 5, avatar = true }: { rows?: number; avatar?: boolean }) {
  const { spacing, radius } = useTheme();
  return (
    <View style={{ gap: spacing.sm, paddingVertical: spacing.sm }}>
      {Array.from({ length: rows }).map((_, index) => (
        <View
          key={index}
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            gap: spacing.md,
            padding: spacing.md,
            borderRadius: radius.card,
            backgroundColor: 'transparent'
          }}
        >
          {avatar ? <Skeleton width={42} height={42} radius={21} /> : null}
          <View style={{ flex: 1, gap: spacing.sm }}>
            <Skeleton width="52%" height={13} />
            <Skeleton width="34%" height={10} />
          </View>
          <Skeleton width={58} height={18} radius={radius.xs} />
        </View>
      ))}
    </View>
  );
}
