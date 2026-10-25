import React, { useEffect, useRef, useState } from 'react';
import { Text as RNText, View, type StyleProp, type TextStyle } from 'react-native';

import { formatPaise, formatPaiseParts, formatSignedPaise, paiseSign } from '@/lib/money';
import { useTheme } from '@/theme';

type MoneySize = 'hero' | 'display' | 'title' | 'body' | 'small';

const SIZE_MAP: Record<MoneySize, { number: number; symbol: number; line: number }> = {
  hero: { number: 40, symbol: 22, line: 44 },
  display: { number: 32, symbol: 18, line: 38 },
  title: { number: 22, symbol: 13, line: 27 },
  body: { number: 16, symbol: 10, line: 21 },
  small: { number: 13, symbol: 9, line: 17 }
};

interface MoneyProps {
  paise: number;
  size?: MoneySize;
  color?: string;
  showSign?: boolean;
  strike?: boolean;
  style?: StyleProp<TextStyle>;
}

/** Renders paise with a smaller raised rupee mark and tabular numerals. */
export function Money({ paise, size = 'body', color, showSign = false, strike = false, style }: MoneyProps) {
  const { colors, fonts } = useTheme();
  const parts = formatPaiseParts(paise);
  const metrics = SIZE_MAP[size];
  const tone = color ?? colors.text;
  const sign = paiseSign(paise, showSign);

  return (
    <View
      accessible
      accessibilityLabel={showSign ? formatSignedPaise(paise) : formatPaise(paise)}
      style={{ flexDirection: 'row', alignItems: 'flex-start' }}
    >
      {sign ? (
        <RNText
          style={{
            fontFamily: fonts.money,
            color: tone,
            fontSize: metrics.number,
            lineHeight: metrics.line,
            fontVariant: ['tabular-nums']
          }}
        >
          {sign}
        </RNText>
      ) : null}
      <RNText
        style={{
          fontFamily: fonts.money,
          color: tone,
          fontSize: metrics.symbol,
          lineHeight: metrics.number,
          marginTop: metrics.symbol * 0.16,
          marginRight: 1,
          fontVariant: ['tabular-nums']
        }}
      >
        {parts.symbol}
      </RNText>
      <RNText
        style={[
          {
            fontFamily: fonts.money,
            color: tone,
            fontSize: metrics.number,
            lineHeight: metrics.line,
            letterSpacing: -metrics.number * 0.035,
            fontVariant: ['tabular-nums'],
            textDecorationLine: strike ? 'line-through' : 'none'
          },
          style
        ]}
      >
        {parts.whole}
        <RNText style={{ fontSize: metrics.number * 0.66, color: tone }}>.{parts.fraction}</RNText>
      </RNText>
    </View>
  );
}

function easeOutCubic(t: number): number {
  return 1 - (1 - t) ** 3;
}

interface AnimatedMoneyProps extends Omit<MoneyProps, 'paise'> {
  paise: number;
  duration?: number;
}

/** Counts up to a paise value on mount and between updates. */
export function AnimatedMoney({ paise, duration = 750, ...rest }: AnimatedMoneyProps) {
  const [display, setDisplay] = useState(0);
  const fromRef = useRef(0);
  const frameRef = useRef<ReturnType<typeof requestAnimationFrame> | null>(null);

  useEffect(() => {
    const from = fromRef.current;
    const to = paise;
    if (from === to) return;
    const start = Date.now();
    const tick = () => {
      const progress = Math.min(1, (Date.now() - start) / duration);
      const next = Math.round(from + (to - from) * easeOutCubic(progress));
      setDisplay(next);
      if (progress < 1) {
        frameRef.current = requestAnimationFrame(tick);
      } else {
        fromRef.current = to;
      }
    };
    frameRef.current = requestAnimationFrame(tick);
    return () => {
      if (frameRef.current) cancelAnimationFrame(frameRef.current);
      fromRef.current = paise;
    };
  }, [paise, duration]);

  return <Money paise={display} {...rest} />;
}
