/* eslint-disable react-hooks/immutability -- Reanimated shared values are intentionally mutable. */
import React, { useEffect, useState } from 'react';
import {
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  useWindowDimensions,
  View
} from 'react-native';
import { Gesture, GestureDetector, GestureHandlerRootView } from 'react-native-gesture-handler';
import Animated, {
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useTheme } from '@/theme';
import { IconButton } from './IconButton';
import { Text } from './Text';

interface BottomSheetProps {
  visible: boolean;
  onClose: () => void;
  title?: string;
  subtitle?: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
  showClose?: boolean;
}

export function BottomSheet({
  visible,
  onClose,
  title,
  subtitle,
  children,
  footer,
  showClose = true
}: BottomSheetProps) {
  const { colors, radius, spacing, shadows } = useTheme();
  const insets = useSafeAreaInsets();
  const { height: windowHeight } = useWindowDimensions();
  const [mounted, setMounted] = useState(visible);
  const translateY = useSharedValue(windowHeight);
  const backdrop = useSharedValue(0);

  useEffect(() => {
    // Keep the sheet mounted long enough to animate out after `visible` flips.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (visible) setMounted(true);
  }, [visible]);

  useEffect(() => {
    if (!mounted) return;
    if (visible) {
      translateY.value = withTiming(0, { duration: 280 });
      backdrop.value = withTiming(1, { duration: 220 });
      return;
    }
    translateY.value = withTiming(windowHeight, { duration: 220 });
    backdrop.value = withTiming(0, { duration: 180 });
    const timer = setTimeout(() => setMounted(false), 240);
    return () => clearTimeout(timer);
  }, [backdrop, mounted, translateY, visible, windowHeight]);

  const sheetStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.value }]
  }));
  const backdropStyle = useAnimatedStyle(() => ({ opacity: backdrop.value }));

  const pan = Gesture.Pan()
    .activeOffsetY([-12, 12])
    .onUpdate((event) => {
      translateY.value = Math.max(0, event.translationY);
    })
    .onEnd((event) => {
      if (event.translationY > 110 || event.velocityY > 900) {
        runOnJS(onClose)();
      } else {
        translateY.value = withSpring(0, { damping: 20, stiffness: 220 });
      }
    });

  if (!mounted) return null;

  return (
    <Modal visible={mounted} transparent statusBarTranslucent animationType="none" onRequestClose={onClose}>
      <GestureHandlerRootView style={{ flex: 1 }}>
        <KeyboardAvoidingView
          style={styles.fill}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        >
          <Animated.View
            pointerEvents="none"
            style={[StyleSheet.absoluteFill, { backgroundColor: colors.overlay }, backdropStyle]}
          />
          <Pressable
            style={StyleSheet.absoluteFill}
            onPress={onClose}
            accessibilityLabel="Close sheet"
            accessibilityRole="button"
          />
          <Animated.View
            style={[
              {
                maxHeight: windowHeight * 0.9,
                width: '100%',
                maxWidth: 520,
                alignSelf: 'center',
                backgroundColor: colors.surface,
                borderTopLeftRadius: radius.sheet,
                borderTopRightRadius: radius.sheet,
                borderBottomLeftRadius: radius.sheet,
                borderBottomRightRadius: radius.sheet,
                borderWidth: 1,
                borderColor: colors.border,
                paddingBottom: Math.max(insets.bottom, spacing.md),
                ...shadows.sheet
              },
              sheetStyle
            ]}
          >
              <GestureDetector gesture={pan}>
                <View style={{ alignItems: 'center', paddingTop: spacing.sm, paddingBottom: spacing.xs }}>
                  <View
                    style={{
                      width: 40,
                      height: 4,
                      borderRadius: 2,
                      backgroundColor: colors.borderStrong
                    }}
                  />
                </View>
              </GestureDetector>
              {title ? (
                <View
                  style={{
                    flexDirection: 'row',
                    alignItems: 'flex-start',
                    paddingHorizontal: spacing.xl,
                    paddingTop: spacing.md,
                    gap: spacing.md
                  }}
                >
                  <View style={{ flex: 1, minWidth: 0 }}>
                    <Text variant="title" color={colors.text}>
                      {title}
                    </Text>
                    {subtitle ? (
                      <Text variant="caption" color={colors.textMuted} style={{ marginTop: 3 }}>
                        {subtitle}
                      </Text>
                    ) : null}
                  </View>
                  {showClose ? (
                    <IconButton icon="close" label="Close" variant="ghost" onPress={onClose} />
                  ) : null}
                </View>
              ) : null}
              <ScrollView
                keyboardShouldPersistTaps="handled"
                showsVerticalScrollIndicator={false}
                contentContainerStyle={{
                  paddingHorizontal: spacing.xl,
                  paddingTop: title ? spacing.lg : spacing.xl,
                  paddingBottom: spacing.lg
                }}
                style={{ flexShrink: 1, minWidth: 0 }}
              >
                {children}
              </ScrollView>
              {footer ? (
                <View
                  style={{
                    paddingHorizontal: spacing.xl,
                    paddingTop: spacing.md,
                    borderTopWidth: 1,
                    borderTopColor: colors.border
                  }}
                >
                  {footer}
                </View>
              ) : null}
          </Animated.View>
        </KeyboardAvoidingView>
      </GestureHandlerRootView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1, justifyContent: 'flex-end', alignItems: 'center' }
});
