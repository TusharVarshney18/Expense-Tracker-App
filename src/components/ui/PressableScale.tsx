/* eslint-disable react-hooks/immutability -- Reanimated shared values are intentionally mutable. */
import React from 'react';
import {
  Pressable,
  StyleSheet,
  type AccessibilityRole,
  type PressableProps,
  type StyleProp,
  type ViewStyle
} from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring
} from 'react-native-reanimated';

interface PressableScaleProps {
  children: React.ReactNode;
  onPress?: () => void;
  onLongPress?: () => void;
  disabled?: boolean;
  style?: StyleProp<ViewStyle>;
  containerStyle?: StyleProp<ViewStyle>;
  hitSlop?: PressableProps['hitSlop'];
  accessibilityLabel?: string;
  accessibilityHint?: string;
  accessibilityRole?: AccessibilityRole;
  accessibilityState?: PressableProps['accessibilityState'];
  testID?: string;
  scaleTo?: number;
  delayLongPress?: number;
}

/** A touchable that springs to 0.97 while pressed. */
export function PressableScale({
  children,
  onPress,
  onLongPress,
  disabled = false,
  style,
  containerStyle,
  hitSlop,
  accessibilityLabel,
  accessibilityHint,
  accessibilityRole = 'button',
  accessibilityState,
  testID,
  scaleTo = 0.97,
  delayLongPress
}: PressableScaleProps) {
  const scale = useSharedValue(1);
  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }]
  }));

  return (
    <Pressable
      onPress={onPress}
      onLongPress={onLongPress}
      delayLongPress={delayLongPress}
      disabled={disabled}
      hitSlop={hitSlop}
      accessibilityLabel={accessibilityLabel}
      accessibilityHint={accessibilityHint}
      accessibilityRole={accessibilityRole}
      accessibilityState={{ ...accessibilityState, disabled }}
      testID={testID}
      onPressIn={() => {
        if (!disabled) scale.value = withSpring(scaleTo, { damping: 18, stiffness: 320 });
      }}
      onPressOut={() => {
        scale.value = withSpring(1, { damping: 16, stiffness: 260 });
      }}
      style={containerStyle}
    >
      <Animated.View style={[styles.inner, style, animatedStyle]}>{children}</Animated.View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  inner: { alignItems: 'center', justifyContent: 'center' }
});
