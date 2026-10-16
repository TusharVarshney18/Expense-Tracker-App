import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { COLORS } from '@/lib/constants';
import { initialsOf } from '@/lib/format';

interface AvatarProps {
  name?: string | null;
  size?: number;
}

export function Avatar({ name, size = 44 }: AvatarProps) {
  return (
    <View
      style={[
        styles.circle,
        { width: size, height: size, borderRadius: size / 2 }
      ]}
    >
      <Text style={[styles.text, { fontSize: size * 0.38 }]}>
        {initialsOf(name)}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  circle: {
    backgroundColor: COLORS.primaryTint,
    alignItems: 'center',
    justifyContent: 'center'
  },
  text: { color: COLORS.primaryDark, fontWeight: '700' }
});
