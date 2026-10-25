import React, { useEffect } from 'react';
import { StyleSheet, useWindowDimensions, View } from 'react-native';
import Animated, {
  interpolate,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withTiming
} from 'react-native-reanimated';

import { useTheme } from '@/theme';

const COUNT = 26;

function ConfettiPiece({
  index,
  visible,
  width,
  height,
  color
}: {
  index: number;
  visible: boolean;
  width: number;
  height: number;
  color: string;
}) {
  const progress = useSharedValue(0);
  const seed = (index * 37) % 100;
  const startX = (index / COUNT) * width;
  const drift = ((seed % 2 === 0 ? 1 : -1) * ((seed % 40) + 20));
  const size = 5 + (seed % 6);
  const delay = (index % 9) * 45;

  useEffect(() => {
    if (visible) {
      progress.value = 0;
      progress.value = withDelay(delay, withTiming(1, { duration: 1400 + (seed % 5) * 120 }));
    } else {
      progress.value = 0;
    }
  }, [delay, progress, seed, visible]);

  const style = useAnimatedStyle(() => ({
    transform: [
      { translateY: interpolate(progress.value, [0, 1], [-40, height * 0.72]) },
      { translateX: interpolate(progress.value, [0, 1], [0, drift]) },
      { rotate: `${interpolate(progress.value, [0, 1], [0, 540 + seed * 4])}deg` }
    ],
    opacity: interpolate(progress.value, [0, 0.08, 0.78, 1], [0, 1, 1, 0])
  }));

  return (
    <Animated.View
      style={[
        {
          position: 'absolute',
          left: startX,
          top: 0,
          width: size,
          height: size * (index % 3 === 0 ? 2.2 : 1),
          borderRadius: 2,
          backgroundColor: color
        },
        style
      ]}
    />
  );
}

export function Confetti({ visible }: { visible: boolean }) {
  const { colors } = useTheme();
  const { width, height } = useWindowDimensions();
  const palette = [
    colors.primary,
    colors.warning,
    colors.info,
    colors.accentPink,
    colors.accentViolet,
    colors.accentTeal
  ];

  if (!visible) return null;

  return (
    <View pointerEvents="none" style={[StyleSheet.absoluteFill, { zIndex: 50 }]}>
      {Array.from({ length: COUNT }).map((_, index) => (
        <ConfettiPiece
          key={index}
          index={index}
          visible={visible}
          width={width}
          height={height}
          color={palette[index % palette.length]}
        />
      ))}
    </View>
  );
}
