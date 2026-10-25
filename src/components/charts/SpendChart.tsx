import React, { useEffect, useState } from 'react';
import { StyleSheet, View, type LayoutChangeEvent } from 'react-native';
import Svg, { Circle, Defs, Line, LinearGradient, Path, Stop } from 'react-native-svg';
import Animated, {
  useAnimatedProps,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withSpring,
  withTiming
} from 'react-native-reanimated';

import { useTheme } from '@/theme';
import { Text } from '@/components/ui';

export interface ChartPoint {
  label: string;
  value: number;
}

interface ChartProps {
  points: ChartPoint[];
  height?: number;
  accent?: string;
  highlightIndex?: number;
}

function smoothPath(coords: { x: number; y: number }[]): string {
  if (coords.length === 0) return '';
  if (coords.length === 1) return `M ${coords[0].x} ${coords[0].y}`;
  let path = `M ${coords[0].x} ${coords[0].y}`;
  for (let index = 1; index < coords.length; index += 1) {
    const previous = coords[index - 1];
    const current = coords[index];
    const midX = (previous.x + current.x) / 2;
    path += ` C ${midX} ${previous.y}, ${midX} ${current.y}, ${current.x} ${current.y}`;
  }
  return path;
}

const AnimatedPath = Animated.createAnimatedComponent(Path);

export function SpendAreaChart({ points, height = 132, accent, highlightIndex }: ChartProps) {
  const { colors, spacing } = useTheme();
  const [width, setWidth] = useState(0);
  const draw = useSharedValue(0);
  const tone = accent ?? colors.primary;
  const chartTop = 10;
  const chartBottom = height - 22;
  const maxValue = Math.max(1, ...points.map((point) => point.value));

  useEffect(() => {
    draw.value = 0;
    draw.value = withTiming(1, { duration: 900 });
  }, [draw, points]);

  const animatedProps = useAnimatedProps(() => ({
    strokeDashoffset: 1400 * (1 - draw.value)
  }));

  const coords = points.map((point, index) => ({
    x: points.length === 1 ? width / 2 : (index / (points.length - 1)) * width,
    y: chartBottom - (point.value / maxValue) * (chartBottom - chartTop)
  }));

  const line = smoothPath(coords);
  const area = coords.length
    ? `${line} L ${coords[coords.length - 1].x} ${chartBottom + 8} L ${coords[0].x} ${chartBottom + 8} Z`
    : '';
  const last = coords[coords.length - 1];

  return (
    <View>
      <View style={{ height }} onLayout={(event: LayoutChangeEvent) => setWidth(event.nativeEvent.layout.width)}>
        {width > 0 ? (
          <Svg width={width} height={height}>
            <Defs>
              <LinearGradient id="areaFill" x1="0" y1="0" x2="0" y2="1">
                <Stop offset="0" stopColor={tone} stopOpacity={0.3} />
                <Stop offset="1" stopColor={tone} stopOpacity={0.01} />
              </LinearGradient>
            </Defs>
            {[0.25, 0.5, 0.75].map((ratio) => (
              <Line
                key={ratio}
                x1={0}
                x2={width}
                y1={chartTop + (chartBottom - chartTop) * ratio}
                y2={chartTop + (chartBottom - chartTop) * ratio}
                stroke={colors.chartGrid}
                strokeWidth={1}
                strokeDasharray="3 6"
              />
            ))}
            <Path d={area} fill="url(#areaFill)" />
            <AnimatedPath
              d={line}
              stroke={tone}
              strokeWidth={2.6}
              fill="none"
              strokeLinecap="round"
              strokeDasharray="1400 1400"
              animatedProps={animatedProps}
            />
            {last ? (
              <>
                <Circle cx={last.x} cy={last.y} r={7} fill={tone} opacity={0.18} />
                <Circle cx={last.x} cy={last.y} r={3.5} fill={tone} />
              </>
            ) : null}
          </Svg>
        ) : null}
      </View>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: spacing.xs }}>
        {points.map((point, index) => {
          const active = highlightIndex === index;
          return (
            <Text
              key={`${point.label}-${index}`}
              variant="caption"
              color={active ? colors.primary : colors.textMuted}
              weight={active ? 'bold' : 'medium'}
              style={{ fontSize: 10, lineHeight: 14, flex: 1, textAlign: 'center' }}
            >
              {point.label}
            </Text>
          );
        })}
      </View>
    </View>
  );
}

function Bar({
  ratio,
  active,
  label,
  index,
  chartHeight
}: {
  ratio: number;
  active: boolean;
  label: string;
  index: number;
  chartHeight: number;
}) {
  const { colors, spacing } = useTheme();
  const grow = useSharedValue(0);
  const barHeight = Math.max(8, (chartHeight - 24) * ratio);
  useEffect(() => {
    grow.value = 0;
    grow.value = withDelay(index * 45, withSpring(1, { damping: 16, stiffness: 120 }));
  }, [grow, index]);

  const style = useAnimatedStyle(() => ({ transform: [{ scaleY: grow.value }] }));

  return (
    <View
      style={{
        flex: 1,
        height: '100%',
        alignItems: 'center',
        justifyContent: 'flex-end',
        gap: spacing.xs
      }}
    >
      <Animated.View
        style={[
          {
            width: '58%',
            height: barHeight,
            borderRadius: 8,
            backgroundColor: active ? colors.primary : `${colors.primary}55`,
            borderWidth: active ? 0 : 1,
            borderColor: `${colors.primary}33`
          },
          style
        ]}
      />
      <Text
        variant="caption"
        color={active ? colors.primary : colors.textMuted}
        weight={active ? 'bold' : 'medium'}
        style={{ fontSize: 10, lineHeight: 14 }}
      >
        {label}
      </Text>
    </View>
  );
}

export function SpendBarChart({ points, height = 132, highlightIndex }: ChartProps) {
  const maxValue = Math.max(1, ...points.map((point) => point.value));
  return (
    <View style={{ flexDirection: 'row', alignItems: 'flex-end', height, gap: 8 }}>
      {points.map((point, index) => (
        <Bar
          key={`${point.label}-${index}`}
          ratio={point.value / maxValue}
          active={highlightIndex === index}
          label={point.label}
          index={index}
          chartHeight={height}
        />
      ))}
    </View>
  );
}

export const chartStyles = StyleSheet.create({});
