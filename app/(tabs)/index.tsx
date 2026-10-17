import React, { useCallback, useState } from 'react';
import {
  Alert,
  FlatList,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  View
} from 'react-native';
import { Link, useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

import { Screen } from '@/components/Screen';
import { ExpenseRow } from '@/components/ExpenseRow';
import { EmptyState } from '@/components/EmptyState';
import { useExpenses } from '@/hooks/useExpenses';
import { formatCurrency } from '@/lib/format';
import { COLORS } from '@/lib/constants';
import type { Expense } from '@/types';

export default function ExpensesScreen() {
  const { expenses, loading, total, reload, removeExpense } = useExpenses();
  const [refreshing, setRefreshing] = useState(false);

  useFocusEffect(
    useCallback(() => {
      void reload();
    }, [reload])
  );

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await reload();
    setRefreshing(false);
  }, [reload]);

  const confirmDelete = useCallback(
    (expense: Expense) => {
      Alert.alert(
        'Delete expense',
        'This removes the expense everywhere and cannot be undone.',
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Delete',
            style: 'destructive',
            onPress: () => {
              void removeExpense(expense.id).catch((err) =>
                Alert.alert('Error', err instanceof Error ? err.message : 'Could not delete.')
              );
            }
          }
        ]
      );
    },
    [removeExpense]
  );

  return (
    <Screen padded={false}>
      <View style={styles.header}>
        <View>
          <Text style={styles.totalLabel}>Total tracked</Text>
          <Text style={styles.total}>{formatCurrency(total)}</Text>
        </View>
        <Link href="/expense/new" asChild>
          <Pressable style={styles.addButton} accessibilityLabel="Add expense">
            <Ionicons name="add" size={26} color={COLORS.textInverse} />
          </Pressable>
        </Link>
      </View>

      <FlatList
        data={expenses}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={COLORS.primary} />
        }
        renderItem={({ item }) => (
          <ExpenseRow
            expense={item}
            onLongPress={() => confirmDelete(item)}
          />
        )}
        ListEmptyComponent={
          loading ? undefined : (
            <EmptyState
              icon="wallet-outline"
              title="No expenses yet"
              message="Tap + to record your first expense. You can attach a receipt photo too."
            />
          )
        }
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 16
  },
  totalLabel: { fontSize: 13, color: COLORS.textMuted, textTransform: 'uppercase', letterSpacing: 0.4 },
  total: { fontSize: 30, fontWeight: '800', color: COLORS.primaryDark, marginTop: 2 },
  addButton: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: COLORS.primary,
    alignItems: 'center',
    justifyContent: 'center'
  },
  list: { paddingHorizontal: 20, paddingBottom: 32, flexGrow: 1 }
});
