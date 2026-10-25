import React, { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, { FadeIn, FadeOut } from 'react-native-reanimated';

import { Avatar } from '@/components/ui/Avatar';
import { Text } from '@/components/ui/Text';
import { formatTime } from '@/lib/format';
import { useTheme } from '@/theme';
import type { Message } from '@/types';

interface MessageBubbleProps {
  message: Message;
  isOwn: boolean;
  firstInGroup?: boolean;
  lastInGroup?: boolean;
  senderName?: string;
  onLongPress?: (message: Message) => void;
}

export function MessageBubble({
  message,
  isOwn,
  firstInGroup = true,
  lastInGroup = true,
  senderName,
  onLongPress
}: MessageBubbleProps) {
  const { colors, spacing, fonts } = useTheme();
  const [showTime, setShowTime] = useState(false);
  const tailRadius = 6;

  const bubble = (
    <View
      style={{
        borderRadius: 18,
        borderBottomRightRadius: isOwn && lastInGroup ? tailRadius : 18,
        borderBottomLeftRadius: !isOwn && lastInGroup ? tailRadius : 18,
        paddingHorizontal: spacing.md + 2,
        paddingVertical: spacing.sm + 2,
        overflow: 'hidden'
      }}
    >
      {isOwn ? (
        <LinearGradient
          colors={[colors.primary, colors.primaryDeep]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={StyleSheet.absoluteFill}
        />
      ) : null}
      <View
        style={{
          borderWidth: isOwn ? 0 : 1,
          borderColor: colors.border,
          backgroundColor: isOwn ? 'transparent' : colors.surfaceRaised,
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          borderRadius: 18,
          borderBottomRightRadius: isOwn && lastInGroup ? tailRadius : 18,
          borderBottomLeftRadius: !isOwn && lastInGroup ? tailRadius : 18
        }}
      />
      <Text
        variant="body"
        color={isOwn ? colors.onPrimary : colors.text}
        style={{ lineHeight: 21 }}
      >
        {message.body}
      </Text>
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'flex-end',
          gap: 3,
          marginTop: 3
        }}
      >
        {showTime ? (
          <Animated.Text
            entering={FadeIn.duration(160)}
            exiting={FadeOut.duration(120)}
            style={{
              fontFamily: fonts.medium,
              fontSize: 10,
              lineHeight: 13,
              color: isOwn ? colors.onPrimary : colors.textMuted,
              opacity: isOwn ? 0.72 : 1
            }}
          >
            {formatTime(message.created_at)}
          </Animated.Text>
        ) : null}
        {isOwn ? (
          <Ionicons
            name={message.read_at ? 'checkmark-done' : 'checkmark'}
            size={12}
            color={colors.onPrimary}
            style={{ opacity: 0.7 }}
          />
        ) : null}
      </View>
    </View>
  );

  return (
    <Animated.View
      entering={FadeIn.duration(180)}
      style={{
        flexDirection: 'row',
        justifyContent: isOwn ? 'flex-end' : 'flex-start',
        alignItems: 'flex-end',
        marginTop: firstInGroup ? spacing.md : 3,
        gap: spacing.sm
      }}
    >
      {!isOwn ? (
        <View style={{ width: 28 }}>
          {firstInGroup ? <Avatar name={senderName ?? 'Chat'} size={28} /> : null}
        </View>
      ) : null}
      <Pressable
        onPress={() => setShowTime((visible) => !visible)}
        onLongPress={() => onLongPress?.(message)}
        delayLongPress={350}
        accessibilityRole="button"
        accessibilityLabel={`${isOwn ? 'You' : senderName ?? 'Them'}: ${message.body}. Tap to ${showTime ? 'hide' : 'show'} time.`}
        style={{ maxWidth: '78%' }}
      >
        {bubble}
      </Pressable>
    </Animated.View>
  );
}
