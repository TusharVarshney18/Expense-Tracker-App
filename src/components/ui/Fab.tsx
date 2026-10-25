import React from 'react';
import { StyleSheet, type StyleProp, type ViewStyle } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';

import { hapticTap } from '@/lib/haptics';
import { useTheme } from '@/theme';
import { PressableScale } from './PressableScale';

interface FabProps {
  onPress: () => void;
  label?: string;
  icon?: keyof typeof Ionicons.glyphMap;
  style?: StyleProp<ViewStyle>;
}

export function Fab({ onPress, label = 'Add expense', icon = 'add', style }: FabProps) {
  const { colors, shadows } = useTheme();
  return (
    <PressableScale
      onPress={() => {
        hapticTap();
        onPress();
      }}
      accessibilityLabel={label}
      style={[
        {
          width: 58,
          height: 58,
          borderRadius: 29,
          overflow: 'hidden'
        },
        shadows.glow,
        style
      ]}
    >
      <LinearGradient
        colors={[colors.primary, colors.primaryDeep]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={StyleSheet.absoluteFill}
      />
      <Ionicons name={icon} size={28} color={colors.onPrimary} />
    </PressableScale>
  );
}
