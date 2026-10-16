import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { COLORS } from '@/lib/constants';
import { formatCurrency, formatDate } from '@/lib/format';
import type { Expense } from '@/types';

interface ExpenseRowProps {
  expense: Expense;
  onPress?: () => void;
  onLongPress?: () => void;
}

export function ExpenseRow({ expense, onPress, onLongPress }: ExpenseRowProps) {
  return (
    <Pressable
      onPress={onPress}
      onLongPress={onLongPress}
      style={({ pressed }) => [styles.row, pressed && styles.pressed]}
    >
      <View style={styles.left}>
        <Text style={styles.category}>{expense.category}</Text>
        <Text style={styles.meta} numberOfLines={1}>
          {formatDate(expense.spent_at)}
          {expense.note ? `  ·  ${expense.note}` : ''}
        </Text>
      </View>
      <Text style={styles.amount}>{formatCurrency(Number(expense.amount))}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: COLORS.surface,
    borderRadius: 12,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: COLORS.border
  },
  pressed: { opacity: 0.7 },
  left: { flex: 1, marginRight: 12 },
  category: {
    fontSize: 15,
    fontWeight: '600',
    color: COLORS.text,
    textTransform: 'capitalize'
  },
  meta: { fontSize: 13, color: COLORS.textMuted, marginTop: 3 },
  amount: { fontSize: 16, fontWeight: '700', color: COLORS.primaryDark }
});
