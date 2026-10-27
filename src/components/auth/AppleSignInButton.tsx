import React, { useEffect, useState } from 'react';
import { Platform, StyleSheet, View } from 'react-native';
import * as AppleAuthentication from 'expo-apple-authentication';

import { isAppleSignInAvailable } from '@/lib/appleAuth';
import { useTheme } from '@/theme';

interface AppleSignInButtonProps {
  onPress: () => void;
  disabled?: boolean;
}

/**
 * The native Sign in with Apple button. Apple's Human Interface Guidelines
 * require the official button, so it is rendered by expo-apple-authentication
 * instead of the app's custom Button component.
 *
 * Renders nothing on Android/web or on iOS devices/simulators where Apple
 * sign-in is unavailable.
 */
export function AppleSignInButton({ onPress, disabled = false }: AppleSignInButtonProps) {
  const { radius } = useTheme();
  const [available, setAvailable] = useState(false);

  useEffect(() => {
    if (Platform.OS !== 'ios') return;
    let active = true;
    void isAppleSignInAvailable().then((supported) => {
      if (active) setAvailable(supported);
    });
    return () => {
      active = false;
    };
  }, []);

  if (Platform.OS !== 'ios' || !available) return null;

  return (
    <View
      pointerEvents={disabled ? 'none' : 'auto'}
      style={[styles.wrapper, { opacity: disabled ? 0.6 : 1 }]}
    >
      <AppleAuthentication.AppleAuthenticationButton
        buttonType={AppleAuthentication.AppleAuthenticationButtonType.SIGN_IN}
        buttonStyle={AppleAuthentication.AppleAuthenticationButtonStyle.WHITE_OUTLINE}
        cornerRadius={radius.input}
        style={styles.button}
        onPress={onPress}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    width: '100%'
  },
  button: {
    width: '100%',
    height: 54
  }
});
