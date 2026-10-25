import React from 'react';
import Svg, { Circle, Path, Rect } from 'react-native-svg';

import { useTheme } from '@/theme';

interface BrandMarkProps {
  size?: number;
  variant?: 'solid' | 'outline';
}

/** Simple vector mark: a split coin/rupee glyph inside an ink tile. */
export function BrandMark({ size = 48, variant = 'solid' }: BrandMarkProps) {
  const { colors } = useTheme();
  const fill = variant === 'solid' ? colors.primary : 'transparent';
  const glyph = variant === 'solid' ? colors.onPrimary : colors.primary;
  return (
    <Svg width={size} height={size} viewBox="0 0 56 56">
      <Rect
        x={2}
        y={2}
        width={52}
        height={52}
        rx={16}
        fill={fill}
        stroke={variant === 'outline' ? colors.primary : 'transparent'}
        strokeWidth={2}
      />
      <Path
        d="M19 18h18M19 25h18M26 18c6.5 0 10 3.1 10 8s-3.5 8-10 8l12 10"
        stroke={glyph}
        strokeWidth={3.4}
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />
      <Circle cx={40} cy={40} r={3} fill={glyph} opacity={0.7} />
    </Svg>
  );
}
