import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { COLORS } from '@/lib/constants';
import { formatTime } from '@/lib/format';
import type { Message } from '@/types';

interface MessageBubbleProps {
  message: Message;
  isOwn: boolean;
  onLongPress?: (message: Message) => void;
}

export function MessageBubble({ message, isOwn, onLongPress }: MessageBubbleProps) {
  return (
    <Pressable
      onLongPress={() => onLongPress?.(message)}
      delayLongPress={350}
      style={[styles.row, isOwn ? styles.rowOwn : styles.rowOther]}
    >
      <View style={[styles.bubble, isOwn ? styles.bubbleOwn : styles.bubbleOther]}>
        <Text style={[styles.body, isOwn && styles.bodyOwn]}>{message.body}</Text>
        <Text style={[styles.time, isOwn && styles.timeOwn]}>
          {formatTime(message.created_at)}
        </Text>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: { marginVertical: 3, flexDirection: 'row' },
  rowOwn: { justifyContent: 'flex-end' },
  rowOther: { justifyContent: 'flex-start' },
  bubble: {
    maxWidth: '78%',
    borderRadius: 16,
    paddingHorizontal: 14,
    paddingVertical: 9
  },
  bubbleOwn: { backgroundColor: COLORS.primary, borderBottomRightRadius: 4 },
  bubbleOther: { backgroundColor: COLORS.surface, borderBottomLeftRadius: 4 },
  body: { fontSize: 15, color: COLORS.text, lineHeight: 20 },
  bodyOwn: { color: COLORS.textInverse },
  time: { fontSize: 11, color: COLORS.textMuted, marginTop: 4, alignSelf: 'flex-end' },
  timeOwn: { color: '#D1FAE5' }
});
