import React from 'react';
import { Image, StyleSheet, Text as RNText, View } from 'react-native';

import { initialsOf } from '@/lib/format';
import { useTheme } from '@/theme';

const PALETTE_KEYS = [
  'primary',
  'info',
  'accentViolet',
  'warning',
  'accentPink',
  'accentTeal',
  'accentBlue',
  'accentOrange'
] as const;

function colorIndex(name: string | null | undefined): number {
  const source = (name ?? '?').trim();
  let hash = 0;
  for (let i = 0; i < source.length; i += 1) {
    hash = (hash * 31 + source.charCodeAt(i)) >>> 0;
  }
  return hash % PALETTE_KEYS.length;
}

interface AvatarProps {
  name?: string | null;
  size?: number;
  uri?: string | null;
  ring?: boolean;
  muted?: boolean;
  accessibilityLabel?: string;
}

export function Avatar({
  name,
  size = 44,
  uri,
  ring = false,
  muted = false,
  accessibilityLabel
}: AvatarProps) {
  const { colors } = useTheme();
  const color = muted ? colors.textMuted : colors[PALETTE_KEYS[colorIndex(name)]];
  const fontSize = Math.max(10, Math.round(size * 0.36));

  return (
    <View
      accessible
      accessibilityLabel={accessibilityLabel ?? name ?? 'User avatar'}
      style={[
        styles.circle,
        {
          width: size,
          height: size,
          borderRadius: size / 2,
          backgroundColor: `${color}22`,
          borderWidth: ring ? 2 : 1,
          borderColor: ring ? color : `${color}33`
        }
      ]}
    >
      {uri ? (
        <Image source={{ uri }} style={{ width: size, height: size }} />
      ) : (
        <RNText style={{ color, fontSize, fontWeight: '700' }}>{initialsOf(name)}</RNText>
      )}
    </View>
  );
}

interface AvatarStackProps {
  names: (string | null | undefined)[];
  size?: number;
  max?: number;
  borderColor?: string;
}

export function AvatarStack({ names, size = 28, max = 4, borderColor }: AvatarStackProps) {
  const { colors } = useTheme();
  const shown = names.slice(0, max);
  const overflow = names.length - shown.length;
  return (
    <View style={styles.stack} accessibilityLabel={`${names.length} members`}>
      {shown.map((name, index) => (
        <View
          key={`${name ?? 'member'}-${index}`}
          style={{
            marginLeft: index === 0 ? 0 : -Math.round(size * 0.32),
            borderRadius: size / 2,
            borderWidth: 2,
            borderColor: borderColor ?? colors.surface
          }}
        >
          <Avatar name={name} size={size} muted={!name} />
        </View>
      ))}
      {overflow > 0 ? (
        <View
          style={{
            marginLeft: -Math.round(size * 0.32),
            width: size,
            height: size,
            borderRadius: size / 2,
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: colors.surfaceRaised,
            borderWidth: 2,
            borderColor: borderColor ?? colors.surface
          }}
        >
          <RNText style={{ color: colors.textSecondary, fontSize: size * 0.32, fontWeight: '700' }}>
            +{overflow}
          </RNText>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  circle: { alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
  stack: { flexDirection: 'row', alignItems: 'center' }
});
