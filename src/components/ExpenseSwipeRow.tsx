import React from 'react';
import { StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Animated, { FadeInDown } from 'react-native-reanimated';
import Swipeable from 'react-native-gesture-handler/ReanimatedSwipeable';

import { useTheme } from '@/theme';
import { categoryColor, categoryMeta } from '@/lib/categories';
import { rupeesToPaise } from '@/lib/money';
import type { Expense } from '@/types';
import { PressableScale } from './ui/PressableScale';
import { Text } from './ui/Text';
import { Money } from './ui/Money';

interface ExpenseSwipeRowProps {
  expense: Expense;
  onEdit: () => void;
  onDelete: () => void;
  onPress?: () => void;
  index?: number;
}

export function ExpenseSwipeRow({ expense, onEdit, onDelete, onPress, index = 0 }: ExpenseSwipeRowProps) {
  const { colors, radius, spacing } = useTheme();
  const meta = categoryMeta(expense.category);
  const accent = categoryColor(colors, expense.category);

  const actions = (_progress: unknown, _translation: unknown, methods: { close: () => void }) => (
    <View style={{ flexDirection: 'row', paddingLeft: spacing.xs }}>
      <PressableScale
        onPress={() => {
          methods.close();
          onEdit();
        }}
        accessibilityLabel="Edit expense"
        style={{
          width: 72,
          height: '100%',
          backgroundColor: colors.surfaceRaised,
          borderRadius: radius.card,
          marginRight: spacing.xs,
          gap: 4
        }}
      >
        <Ionicons name="pencil" size={18} color={colors.textSecondary} />
        <Text variant="caption" color={colors.textSecondary} style={{ fontSize: 10 }}>
          Edit
        </Text>
      </PressableScale>
      <PressableScale
        onPress={() => {
          methods.close();
          onDelete();
        }}
        accessibilityLabel="Delete expense"
        style={{
          width: 72,
          height: '100%',
          backgroundColor: colors.danger,
          borderRadius: radius.card,
          gap: 4
        }}
      >
        <Ionicons name="trash" size={18} color={colors.textInverse} />
        <Text variant="caption" color={colors.textInverse} style={{ fontSize: 10 }}>
          Delete
        </Text>
      </PressableScale>
    </View>
  );

  return (
    <Animated.View entering={FadeInDown.delay(Math.min(index, 8) * 35).duration(280)}>
      <Swipeable
        renderRightActions={actions}
      overshootRight={false}
      rightThreshold={42}
      friction={2}
        containerStyle={{
          borderRadius: radius.card,
          marginBottom: spacing.sm,
          overflow: 'hidden'
        }}
      >
        <PressableScale
        onPress={onPress}
        accessibilityLabel={`${expense.category} expense`}
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          gap: spacing.md,
          padding: spacing.md,
          backgroundColor: colors.surface,
          borderRadius: radius.card,
          borderWidth: 1,
          borderColor: colors.border,
          minHeight: 66
        }}
      >
        <View
          style={{
            width: 40,
            height: 40,
            borderRadius: radius.sm,
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: `${accent}18`
          }}
        >
          <Ionicons name={meta.icon} size={19} color={accent} />
        </View>
        <View style={{ flex: 1 }}>
          <Text variant="bodyStrong" color={colors.text} numberOfLines={1} style={{ textTransform: 'capitalize' }}>
            {expense.note?.trim() || expense.category}
          </Text>
          <Text variant="caption" color={colors.textMuted} numberOfLines={1} style={{ marginTop: 2, textTransform: 'capitalize' }}>
            {expense.note ? expense.category : 'Personal expense'}
          </Text>
        </View>
          <Money paise={rupeesToPaise(Number(expense.amount))} size="body" color={colors.text} />
        </PressableScale>
      </Swipeable>
    </Animated.View>
  );
}

export const expenseRowStyles = StyleSheet.create({});
