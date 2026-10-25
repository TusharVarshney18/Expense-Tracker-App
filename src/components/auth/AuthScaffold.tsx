import React, { useEffect, useId } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  View,
  useWindowDimensions,
  type StyleProp,
  type ViewStyle
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withTiming
} from 'react-native-reanimated';
import Svg, { Defs, RadialGradient, Rect, Stop } from 'react-native-svg';

import { BrandMark } from '@/components/BrandMark';
import { Screen } from '@/components/ui/Screen';
import { Text } from '@/components/ui/Text';
import { useReducedMotion } from '@/hooks/useReducedMotion';
import { useTheme } from '@/theme';

/**
 * Shared shell for the auth screens: near-black canvas, a soft radial mint halo
 * behind the header and a single centred column that stays comfortable from a
 * 320 px phone up to tablet widths.
 */

function AuthGlow() {
  const { colors, isDark } = useTheme();
  const { width, height } = useWindowDimensions();
  const gradientId = `auth-glow-${useId().replace(/[:]/g, '')}`;
  const glowHeight = Math.min(560, Math.max(320, height * 0.58));

  return (
    <View pointerEvents="none" style={StyleSheet.absoluteFill}>
      <Svg width={width} height={glowHeight} style={styles.glow}>
        <Defs>
          <RadialGradient id={gradientId} cx="50%" cy="0%" r="70%" fx="50%" fy="0%">
            <Stop offset="0" stopColor={colors.authGlow} stopOpacity={isDark ? 0.18 : 0.13} />
            <Stop offset="0.45" stopColor={colors.authGlow} stopOpacity={isDark ? 0.06 : 0.05} />
            <Stop offset="1" stopColor={colors.authGlow} stopOpacity={0} />
          </RadialGradient>
        </Defs>
        <Rect x={0} y={0} width={width} height={glowHeight} fill={`url(#${gradientId})`} />
      </Svg>
    </View>
  );
}

function AuthHeader() {
  const { colors, spacing } = useTheme();
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.md }}>
      <BrandMark size={44} />
      <View style={{ flex: 1, minWidth: 0 }}>
        <Text variant="title" color={colors.text} numberOfLines={1}>
          Expense Counter
        </Text>
        <Text variant="caption" color={colors.textMuted} numberOfLines={1} style={{ marginTop: 1 }}>
          Split money. Keep friendships.
        </Text>
      </View>
    </View>
  );
}

function AuthFooter() {
  const { colors, spacing } = useTheme();
  return (
    <View style={{ alignItems: 'center', paddingTop: spacing.lg }}>
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'center',
          flexWrap: 'wrap',
          gap: spacing.xs + 2,
          maxWidth: 320
        }}
      >
        <Ionicons name="lock-closed" size={11} color={colors.textMuted} />
        <Text variant="caption" color={colors.textMuted} style={{ textAlign: 'center' }}>
          Made by Tushar · Your data is encrypted in transit
        </Text>
      </View>
    </View>
  );
}

interface AuthScaffoldProps {
  children: React.ReactNode;
  /** Rendered above the brand row, e.g. the back control on password reset. */
  topSlot?: React.ReactNode;
}

export function AuthScaffold({ children, topSlot }: AuthScaffoldProps) {
  const { spacing, layout } = useTheme();
  const { width } = useWindowDimensions();
  const gutter = width < 360 ? spacing.lg : spacing.xl;

  return (
    <Screen
      padded={false}
      edges={['top', 'left', 'right', 'bottom']}
      backdrop={<AuthGlow />}
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={{ flex: 1 }}
      >
        <ScrollView
          contentContainerStyle={{
            flexGrow: 1,
            paddingHorizontal: gutter,
            paddingTop: spacing.xl,
            paddingBottom: spacing.lg
          }}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode={Platform.OS === 'ios' ? 'interactive' : 'on-drag'}
          showsVerticalScrollIndicator={false}
        >
          <View
            style={{
              flexGrow: 1,
              width: '100%',
              maxWidth: layout.authMaxWidth,
              alignSelf: 'center'
            }}
          >
            {topSlot ? <Reveal delay={0}>{topSlot}</Reveal> : null}
            <Reveal delay={0}>
              <AuthHeader />
            </Reveal>
            {children}
            <View style={{ flexGrow: 1, minHeight: spacing.xxl }} />
            <Reveal delay={660}>
              <AuthFooter />
            </Reveal>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </Screen>
  );
}

interface RevealProps {
  children: React.ReactNode;
  delay?: number;
  style?: StyleProp<ViewStyle>;
}

/** Fade + slide entrance that collapses to an instant reveal for reduced motion. */
export function Reveal({ children, delay = 0, style }: RevealProps) {
  const reduced = useReducedMotion();
  const progress = useSharedValue(reduced ? 1 : 0);

  useEffect(() => {
    if (reduced) {
      progress.value = withTiming(1, { duration: 0 });
      return;
    }
    progress.value = 0;
    progress.value = withDelay(
      delay,
      withTiming(1, { duration: 460, easing: Easing.out(Easing.cubic) })
    );
  }, [delay, progress, reduced]);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: progress.value,
    transform: [{ translateY: (1 - progress.value) * 14 }]
  }));

  return <Animated.View style={[style, animatedStyle]}>{children}</Animated.View>;
}

export function AuthDivider() {
  const { colors, spacing } = useTheme();
  return (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.md,
        marginTop: spacing.xl
      }}
    >
      <View style={{ flex: 1, height: 1, backgroundColor: colors.divider }} />
      <Text variant="caption" color={colors.textMuted}>
        or
      </Text>
      <View style={{ flex: 1, height: 1, backgroundColor: colors.divider }} />
    </View>
  );
}

export function AuthError({ message }: { message: string }) {
  const { colors, radius, spacing } = useTheme();
  return (
    <View
      accessibilityRole="alert"
      style={{
        flexDirection: 'row',
        alignItems: 'flex-start',
        gap: spacing.sm,
        borderRadius: radius.input,
        backgroundColor: colors.dangerSoft,
        paddingHorizontal: spacing.md,
        paddingVertical: spacing.sm + 2,
        marginBottom: spacing.lg
      }}
    >
      <Ionicons name="alert-circle" size={17} color={colors.danger} style={{ marginTop: 1 }} />
      <Text variant="body" color={colors.text} style={{ flex: 1 }}>
        {message}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  glow: { position: 'absolute', top: 0, left: 0 }
});
