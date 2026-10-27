import React from 'react';
import { View } from 'react-native';

import { BrandMark } from '@/components/BrandMark';
import { Text } from '@/components/ui/Text';
import { useTheme } from '@/theme';

/**
 * Landing route for the OAuth deep link. AuthProvider exchanges the code for a
 * session; the root route guard then sends the user to Accept Terms or Home.
 */
export default function AuthCallbackScreen() {
  const { colors } = useTheme();

  return (
    <View
      style={{
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: colors.background,
        gap: 16
      }}
    >
      <BrandMark size={64} />
      <Text variant="caption" color={colors.textMuted}>
        Finishing sign-in…
      </Text>
    </View>
  );
}
