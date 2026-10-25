import React, { useEffect, useRef, useState } from 'react';
import {
  StyleSheet,
  Text as RNText,
  View,
  type StyleProp,
  type ViewStyle
} from 'react-native';
import Animated, {
  Easing,
  cancelAnimation,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming
} from 'react-native-reanimated';

import { AvatarStack } from '@/components/ui/Avatar';
import { Text } from '@/components/ui/Text';
import { useReducedMotion } from '@/hooks/useReducedMotion';
import { formatPaiseParts } from '@/lib/money';
import { useTheme } from '@/theme';

interface AuthSplitCardProps {
  title?: string;
  amountPaise?: number;
  people?: (string | null | undefined)[];
  ways?: number;
  owedPaise?: number;
  compact?: boolean;
  style?: StyleProp<ViewStyle>;
}

function useCountUpRupees(target: number): number {
  const reduced = useReducedMotion();
  const [value, setValue] = useState(0);
  const frame = useRef<number | null>(null);

  useEffect(() => {
    if (reduced) return;
    const start = Date.now();
    const duration = 900;
    const tick = () => {
      const progress = Math.min(1, (Date.now() - start) / duration);
      const eased = 1 - (1 - progress) ** 3;
      setValue(Math.round(target * eased));
      if (progress < 1) frame.current = requestAnimationFrame(tick);
    };
    frame.current = requestAnimationFrame(tick);
    return () => {
      if (frame.current != null) cancelAnimationFrame(frame.current);
    };
  }, [reduced, target]);

  return reduced ? target : value;
}

/**
 * Floating split-bill illustration for the auth screens. Everything is drawn
 * with real views, avatars and text — no bitmap assets.
 */
export function AuthSplitCard({
  title = 'Dinner',
  amountPaise = 120_000,
  people = ['Aarav Shah', 'Meera Nair', 'Kabir Rao'],
  ways = 3,
  owedPaise = 40_000,
  compact = false,
  style
}: AuthSplitCardProps) {
  const { colors, fonts, radius, shadows, spacing } = useTheme();
  const reduced = useReducedMotion();
  const float = useSharedValue(0);

  const amountParts = formatPaiseParts(amountPaise);
  const owedParts = formatPaiseParts(owedPaise);
  const total = useCountUpRupees(Math.max(0, Math.round(amountPaise / 100)));
  const amountLabel = `₹${amountParts.whole}`;
  const owedLabel = `₹${owedParts.whole}`;

  useEffect(() => {
    if (reduced) {
      float.value = withTiming(0, { duration: 0 });
      return;
    }
    float.value = withRepeat(
      withTiming(1, { duration: 6200, easing: Easing.inOut(Easing.sin) }),
      -1,
      true
    );
    return () => cancelAnimation(float);
  }, [float, reduced]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: -7 * float.value }]
  }));

  return (
    <View style={[{ marginTop: spacing.xl }, style]}>
      <Animated.View
        accessible
        accessibilityLabel={`Split preview: ${title}, ${amountLabel}, split ${ways} ways, you owe ${owedLabel}`}
        style={animatedStyle}
      >
        <View
          pointerEvents="none"
          style={[
            styles.ghost,
            {
              top: 9,
              left: 9,
              right: 9,
              bottom: -9,
              borderRadius: radius.hero,
              borderWidth: 1,
              borderColor: colors.authCardBorder,
              backgroundColor: colors.backgroundAlt
            }
          ]}
        />
        <View
          style={[
            {
              borderRadius: radius.hero,
              borderWidth: 1,
              borderColor: colors.authCardBorder,
              backgroundColor: colors.authCard,
              padding: compact ? spacing.lg : spacing.xl,
              overflow: 'hidden'
            },
            shadows.floating
          ]}
        >
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.md }}>
            <View style={{ flex: 1, minWidth: 0 }}>
              {!compact ? (
                <View
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    gap: spacing.xs + 2,
                    marginBottom: spacing.xs + 2
                  }}
                >
                  <View
                    style={{
                      width: 6,
                      height: 6,
                      borderRadius: 3,
                      backgroundColor: colors.primary
                    }}
                  />
                  <Text variant="label" color={colors.textMuted}>
                    Group outing
                  </Text>
                </View>
              ) : null}
              <Text variant="title" color={colors.text} numberOfLines={1}>
                {title}
              </Text>
            </View>
            <AvatarStack
              names={people}
              size={compact ? 28 : 32}
              max={ways}
              borderColor={colors.authCard}
            />
          </View>

          <View
            style={{
              flexDirection: 'row',
              alignItems: 'flex-end',
              justifyContent: 'space-between',
              gap: spacing.md,
              marginTop: compact ? spacing.md : spacing.lg
            }}
          >
            <View
              accessible={false}
              style={{ flexDirection: 'row', alignItems: 'flex-start', minWidth: 0 }}
            >
              <RNText
                style={{
                  fontFamily: fonts.money,
                  color: colors.text,
                  fontSize: compact ? 17 : 21,
                  lineHeight: compact ? 25 : 31,
                  marginTop: compact ? 4 : 6,
                  marginRight: 2,
                  fontVariant: ['tabular-nums'],
                  fontFeatureSettings: 'tnum'
                }}
              >
                {amountParts.symbol}
              </RNText>
              <RNText
                style={{
                  fontFamily: fonts.money,
                  color: colors.text,
                  fontSize: compact ? 32 : 42,
                  lineHeight: compact ? 37 : 47,
                  letterSpacing: compact ? -0.8 : -1.4,
                  fontVariant: ['tabular-nums'],
                  fontFeatureSettings: 'tnum'
                }}
              >
                {total.toLocaleString('en-IN')}
              </RNText>
            </View>
            {!compact ? (
              <View
                style={{
                  borderRadius: radius.pill,
                  borderWidth: 1,
                  borderColor: colors.divider,
                  paddingHorizontal: spacing.sm + 2,
                  paddingVertical: spacing.xxs + 2,
                  marginBottom: spacing.xs,
                  flexShrink: 1
                }}
              >
                <Text variant="label" color={colors.textSecondary} numberOfLines={1}>
                  {ways}-way
                </Text>
              </View>
            ) : null}
          </View>

          <View
            style={{
              height: 1,
              backgroundColor: colors.divider,
              marginTop: compact ? spacing.md : spacing.lg
            }}
          />

          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              flexWrap: 'wrap',
              gap: spacing.sm,
              marginTop: spacing.md
            }}
          >
            <Text variant="body" color={colors.textSecondary}>
              Split {ways} ways
            </Text>
            <Text variant="body" color={colors.textMuted}>
              ·
            </Text>
            <Text variant="bodyStrong" color={colors.primary}>
              You owe {owedLabel}
            </Text>
          </View>
        </View>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  ghost: { position: 'absolute', transform: [{ rotate: '-1.6deg' }] }
});
