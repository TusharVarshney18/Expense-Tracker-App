import React from 'react';
import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { SafeAreaView, type Edge } from 'react-native-safe-area-context';

import { useTheme } from '@/theme';

interface ScreenGradient {
  colors: readonly [string, string, ...string[]];
  locations?: readonly [number, number, ...number[]];
  start?: { x: number; y: number };
  end?: { x: number; y: number };
}

interface ScreenProps {
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  edges?: readonly Edge[];
  padded?: boolean;
  background?: 'background' | 'backgroundAlt' | 'surface';
  maxWidth?: number;
  /** Full-bleed gradient painted behind the safe area and all content. */
  gradient?: ScreenGradient;
  /** Decorative full-bleed layer painted above the background, below content. */
  backdrop?: React.ReactNode;
}

/** Themed safe-area page container. */
export function Screen({
  children,
  style,
  edges = ['top', 'left', 'right'],
  padded = true,
  background = 'background',
  maxWidth = 640,
  gradient,
  backdrop
}: ScreenProps) {
  const { colors, layout } = useTheme();
  return (
    <View style={{ flex: 1, backgroundColor: colors[background] }}>
      {gradient ? (
        <LinearGradient
          pointerEvents="none"
          colors={gradient.colors}
          locations={gradient.locations}
          start={gradient.start ?? { x: 0.5, y: 0 }}
          end={gradient.end ?? { x: 0.5, y: 1 }}
          style={StyleSheet.absoluteFill}
        />
      ) : null}
      {backdrop}
      <SafeAreaView style={{ flex: 1 }} edges={edges}>
        <View style={{ flex: 1, alignItems: 'center' }}>
          <View
            style={[
              { flex: 1, width: '100%', maxWidth, alignSelf: 'center', minWidth: 0 },
              padded && { paddingHorizontal: layout.screenPadding },
              style
            ]}
          >
            {children}
          </View>
        </View>
      </SafeAreaView>
    </View>
  );
}
