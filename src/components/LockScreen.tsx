import React, { useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withRepeat,
  withTiming
} from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';

import { BrandMark } from '@/components/BrandMark';
import { Button } from '@/components/ui/Button';
import { Text } from '@/components/ui/Text';
import { useAuth } from '@/context/AuthProvider';
import { useTheme } from '@/theme';

function PulseRing({ delay }: { delay: number }) {
  const { colors } = useTheme();
  const progress = useSharedValue(0);
  useEffect(() => {
    progress.value = withDelay(
      delay,
      withRepeat(withTiming(1, { duration: 2200 }), -1, false)
    );
  }, [delay, progress]);

  const style = useAnimatedStyle(() => ({
    transform: [{ scale: 1 + progress.value * 0.9 }],
    opacity: 0.5 * (1 - progress.value)
  }));

  return (
    <Animated.View
      pointerEvents="none"
      style={[
        {
          position: 'absolute',
          width: 108,
          height: 108,
          borderRadius: 54,
          borderWidth: 1.5,
          borderColor: colors.primary
        },
        style
      ]}
    />
  );
}

export function LockScreen() {
  const { unlock, signOut } = useAuth();
  const { colors, spacing, radius } = useTheme();
  const [error, setError] = React.useState<string | null>(null);

  const handleUnlock = async () => {
    setError(null);
    const ok = await unlock();
    if (!ok) setError('Verification was cancelled. Try again to unlock.');
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }}>
      <LinearGradient
        colors={[colors.heroFrom, colors.background]}
        style={StyleSheet.absoluteFill}
      />
      <View style={{ flex: 1, paddingHorizontal: spacing.xl, justifyContent: 'space-between' }}>
        <View style={{ alignItems: 'center', marginTop: spacing.xxl }}>
          <BrandMark size={56} />
          <Text variant="label" color={colors.textMuted} style={{ marginTop: spacing.md }}>
            Expense Counter
          </Text>
        </View>

        <View style={{ alignItems: 'center' }}>
          <View style={{ width: 160, height: 160, alignItems: 'center', justifyContent: 'center' }}>
            <PulseRing delay={0} />
            <PulseRing delay={600} />
            <View
              style={{
                width: 88,
                height: 88,
                borderRadius: 44,
                alignItems: 'center',
                justifyContent: 'center',
                backgroundColor: colors.primarySoft,
                borderWidth: 1,
                borderColor: `${colors.primary}55`
              }}
            >
              <Ionicons name="finger-print" size={44} color={colors.primary} />
            </View>
          </View>
          <Text variant="title" align="center" style={{ marginTop: spacing.lg }}>
            Welcome back
          </Text>
          <Text variant="body" align="center" color={colors.textMuted} style={{ marginTop: spacing.sm, maxWidth: 280 }}>
            Unlock with your fingerprint, Face ID or device passcode to see your money.
          </Text>
        </View>

        <View style={{ gap: spacing.md, marginBottom: spacing.xl }}>
          {error ? (
            <View
              style={{
                backgroundColor: colors.dangerSoft,
                borderRadius: radius.input,
                padding: spacing.md
              }}
            >
              <Text variant="caption" color={colors.danger} align="center">
                {error}
              </Text>
            </View>
          ) : null}
          <Button label="Unlock" icon="finger-print" onPress={() => void handleUnlock()} />
          <Button label="Sign out" variant="ghost" onPress={() => void signOut()} />
        </View>
      </View>
    </SafeAreaView>
  );
}
