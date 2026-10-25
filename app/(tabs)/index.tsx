import React, { useCallback, useMemo, useState } from 'react';
import { RefreshControl, SectionList, View } from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import {
  differenceInCalendarDays,
  endOfMonth,
  format,
  isSameMonth,
  isToday,
  isYesterday,
  parseISO,
  subDays
} from 'date-fns';

import { SpendAreaChart, SpendBarChart, type ChartPoint } from '@/components/charts/SpendChart';
import { ExpenseSwipeRow } from '@/components/ExpenseSwipeRow';
import {
  AnimatedMoney,
  Avatar,
  BottomSheet,
  Button,
  Card,
  Chip,
  EmptyState,
  ErrorBanner,
  Fab,
  Input,
  Money,
  PressableScale,
  ProgressRing,
  ResponsiveActions,
  Screen,
  SectionHeader,
  SegmentedControl,
  Skeleton,
  SkeletonList,
  Text
} from '@/components/ui';
import { useAuth } from '@/context/AuthProvider';
import { useBudget } from '@/hooks/useBudget';
import { useExpenses } from '@/hooks/useExpenses';
import { categoryColor, categoryMeta } from '@/lib/categories';
import { EXPENSE_CATEGORIES } from '@/lib/constants';
import { formatDate } from '@/lib/format';
import { hapticError, hapticSuccess } from '@/lib/haptics';
import { rupeesToPaise } from '@/lib/money';
import { useTheme } from '@/theme';
import type { Expense } from '@/types';

type Range = 'week' | 'month';

interface ExpenseSection {
  title: string;
  totalPaise: number;
  data: Expense[];
}

function dayTitle(date: Date): string {
  if (isToday(date)) return 'Today';
  if (isYesterday(date)) return 'Yesterday';
  return format(date, 'EEEE, d MMM');
}

function sumExpenses(expenses: Expense[]): number {
  return expenses.reduce((sum, expense) => sum + rupeesToPaise(Number(expense.amount)), 0);
}

export default function HomeScreen() {
  const router = useRouter();
  const { user, profile } = useAuth();
  const { colors, spacing, radius, layout, shadows } = useTheme();
  const { expenses, loading, error, reload, removeExpense, addExpense } = useExpenses();
  const { budgetPaise, refreshBudget } = useBudget();

  const [refreshing, setRefreshing] = useState(false);
  const [range, setRange] = useState<Range>('week');
  const [expenseToDelete, setExpenseToDelete] = useState<Expense | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [expenseToEdit, setExpenseToEdit] = useState<Expense | null>(null);
  const [editAmount, setEditAmount] = useState('');
  const [editCategory, setEditCategory] = useState('general');
  const [editNote, setEditNote] = useState('');
  const [savingEdit, setSavingEdit] = useState(false);
  const [editError, setEditError] = useState<string | null>(null);

  useFocusEffect(
    useCallback(() => {
      void reload();
      void refreshBudget();
    }, [reload, refreshBudget])
  );

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await reload();
    setRefreshing(false);
  }, [reload]);

  const now = useMemo(() => new Date(), []);
  const monthExpenses = useMemo(
    () => expenses.filter((expense) => isSameMonth(parseISO(expense.spent_at), now)),
    [expenses, now]
  );
  const monthSpend = useMemo(() => sumExpenses(monthExpenses), [monthExpenses]);
  const weekExpenses = useMemo(
    () =>
      expenses.filter((expense) => {
        const date = parseISO(expense.spent_at);
        return differenceInCalendarDays(now, date) < 7 && differenceInCalendarDays(now, date) >= 0;
      }),
    [expenses, now]
  );
  const scopeExpenses = range === 'week' ? weekExpenses : monthExpenses;

  const chartPoints = useMemo<ChartPoint[]>(() => {
    if (range === 'week') {
      return Array.from({ length: 7 }).map((_, index) => {
        const date = subDays(now, 6 - index);
        const dayPaise = weekExpenses
          .filter((expense) => format(parseISO(expense.spent_at), 'yyyy-MM-dd') === format(date, 'yyyy-MM-dd'))
          .reduce((total, expense) => total + rupeesToPaise(Number(expense.amount)), 0);
        return { label: format(date, 'EEE'), value: dayPaise };
      });
    }
    const days = endOfMonth(now).getDate();
    return Array.from({ length: 5 }).map((_, bucket) => {
      const from = bucket * 7 + 1;
      const to = bucket === 4 ? days : from + 6;
      const bucketTotal = monthExpenses
        .filter((expense) => {
          const day = parseISO(expense.spent_at).getDate();
          return day >= from && day <= to;
        })
        .reduce((total, expense) => total + rupeesToPaise(Number(expense.amount)), 0);
      return { label: `W${bucket + 1}`, value: bucketTotal };
    });
  }, [monthExpenses, now, range, weekExpenses]);

  const chartTotal = chartPoints.reduce((total, point) => total + point.value, 0);

  const categories = useMemo(() => {
    const totals = new Map<string, number>();
    for (const expense of scopeExpenses) {
      const key = (expense.category || 'general').toLowerCase();
      totals.set(key, (totals.get(key) ?? 0) + rupeesToPaise(Number(expense.amount)));
    }
    const scopeTotal = Array.from(totals.values()).reduce((sum, value) => sum + value, 0);
    return Array.from(totals.entries())
      .map(([category, paise]) => ({
        category,
        paise,
        share: scopeTotal > 0 ? paise / scopeTotal : 0
      }))
      .sort((a, b) => b.paise - a.paise)
      .slice(0, 4);
  }, [scopeExpenses]);

  const sections = useMemo<ExpenseSection[]>(() => {
    const byDay = new Map<string, Expense[]>();
    for (const expense of expenses) {
      const key = expense.spent_at.slice(0, 10);
      const list = byDay.get(key) ?? [];
      list.push(expense);
      byDay.set(key, list);
    }
    return Array.from(byDay.entries())
      .sort((a, b) => b[0].localeCompare(a[0]))
      .map(([key, data]) => ({
        title: dayTitle(parseISO(key)),
        totalPaise: sumExpenses(data),
        data
      }));
  }, [expenses]);

  const budgetProgress = budgetPaise > 0 ? monthSpend / budgetPaise : 0;
  const overBudget = budgetPaise > 0 && monthSpend > budgetPaise;
  const ringColor = overBudget
    ? colors.danger
    : budgetProgress >= 0.8
      ? colors.warning
      : colors.primary;
  const remaining = budgetPaise - monthSpend;

  const greeting = useMemo(() => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 17) return 'Good afternoon';
    return 'Good evening';
  }, []);
  const displayName = profile?.display_name ?? profile?.full_name ?? user?.email ?? 'there';
  const firstName = displayName.split(' ')[0];

  const openEdit = useCallback((expense: Expense) => {
    setEditError(null);
    setExpenseToEdit(expense);
    setEditAmount(Number(expense.amount).toFixed(2));
    setEditCategory(expense.category);
    setEditNote(expense.note ?? '');
  }, []);

  const confirmDelete = useCallback((expense: Expense) => {
    setDeleteError(null);
    setExpenseToDelete(expense);
  }, []);

  const handleDelete = useCallback(async () => {
    if (!expenseToDelete || deleting) return;
    setDeleting(true);
    setDeleteError(null);
    try {
      await removeExpense(expenseToDelete.id);
      hapticSuccess();
      setExpenseToDelete(null);
    } catch (err) {
      hapticError();
      setDeleteError(err instanceof Error ? err.message : 'Could not delete expense.');
    } finally {
      setDeleting(false);
    }
  }, [deleting, expenseToDelete, removeExpense]);

  const handleEditSave = useCallback(async () => {
    if (!expenseToEdit || savingEdit) return;
    const numeric = Number.parseFloat(editAmount.trim());
    if (!Number.isFinite(numeric) || numeric <= 0) {
      setEditError('Enter an amount greater than zero.');
      hapticError();
      return;
    }
    setSavingEdit(true);
    setEditError(null);
    try {
      await addExpense({
        amount: numeric,
        category: editCategory,
        note: editNote.trim() || null,
        spentAt: expenseToEdit.spent_at.slice(0, 10)
      });
      await removeExpense(expenseToEdit.id);
      hapticSuccess();
      setExpenseToEdit(null);
    } catch (err) {
      hapticError();
      setEditError(err instanceof Error ? err.message : 'Could not update expense.');
    } finally {
      setSavingEdit(false);
    }
  }, [addExpense, editAmount, editCategory, editNote, expenseToEdit, removeExpense, savingEdit]);

  const header = (
    <View>
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
        <View style={{ flex: 1, minWidth: 0 }}>
          <Text variant="caption" color={colors.textMuted}>
            {format(now, 'EEEE, d MMMM')}
          </Text>
          <Text variant="title" color={colors.text} style={{ marginTop: 2 }} numberOfLines={2} ellipsizeMode="tail">
            {greeting}, {firstName}
          </Text>
        </View>
        <PressableScale
          onPress={() => router.push('/settings')}
          accessibilityLabel="Open settings"
        >
          <Avatar name={displayName} size={46} ring />
        </PressableScale>
      </View>

      <LinearGradient
        colors={overBudget ? [colors.heroOverFrom, colors.heroTo] : [colors.heroFrom, colors.heroTo]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={[
          {
            marginTop: spacing.lg,
            borderRadius: radius.hero,
            padding: spacing.xl,
            borderWidth: 1,
            borderColor: colors.heroBorder,
            overflow: 'hidden'
          },
          shadows.card
        ]}
      >
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'flex-start', gap: spacing.lg }}>
          <View style={{ flex: 1, minWidth: 140 }}>
            <Text variant="label" color={colors.heroMuted}>
              This month
            </Text>
            <View style={{ marginTop: spacing.sm }}>
              <AnimatedMoney paise={monthSpend} size="hero" color={colors.heroText} />
            </View>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.xs, marginTop: spacing.sm }}>
              <Ionicons
                name={overBudget ? 'trending-up' : 'shield-checkmark'}
                size={14}
                color={overBudget ? colors.danger : colors.primary}
              />
              <Text variant="caption" color={overBudget ? colors.danger : colors.heroMuted}>
                {overBudget ? 'You are over budget' : 'On track this month'}
              </Text>
            </View>
          </View>
          <ProgressRing
            progress={Math.min(1, Math.max(0, budgetProgress))}
            size={82}
            strokeWidth={8}
            color={ringColor}
            trackColor={colors.heroTrack}
          >
            <Text variant="bodyStrong" color={colors.heroText} style={{ fontSize: 18 }}>
              {Math.round(budgetProgress * 100)}%
            </Text>
            <Text variant="caption" color={colors.heroMuted} style={{ fontSize: 9 }}>
              used
            </Text>
          </ProgressRing>
        </View>

        <View
          style={{
            marginTop: spacing.lg,
            paddingTop: spacing.md,
            borderTopWidth: 1,
            borderTopColor: colors.heroTrack,
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: spacing.md
          }}
        >
          <View>
            <Text variant="caption" color={colors.heroMuted}>
              Monthly budget
            </Text>
            <View style={{ marginTop: 2 }}>
              <Money paise={budgetPaise} size="small" color={colors.heroText} />
            </View>
          </View>
          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              gap: 5,
              backgroundColor: overBudget ? colors.dangerSoft : colors.heroTrack,
              paddingHorizontal: spacing.md,
              paddingVertical: 7,
              borderRadius: radius.pill
            }}
          >
            <Text variant="caption" color={overBudget ? colors.danger : colors.heroText} weight="bold">
              {overBudget ? 'Over by' : 'Left'}
            </Text>
            <Money
              paise={Math.abs(remaining)}
              size="small"
              color={overBudget ? colors.danger : colors.heroText}
            />
          </View>
        </View>
      </LinearGradient>

      <SectionHeader title="Spending trend" subtitle={range === 'week' ? 'Last 7 days' : 'This month'} />

      <Card>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: spacing.md }}>
          <View style={{ flex: 1, minWidth: 120 }}>
            <Text variant="caption" color={colors.textMuted}>
              {range === 'week' ? 'This week' : 'This month'}
            </Text>
            <View style={{ marginTop: 2 }}>
              <Money paise={chartTotal} size="title" color={colors.text} />
            </View>
          </View>
          <View style={{ flex: 1, minWidth: 132, maxWidth: 168 }}>
            <SegmentedControl
              compact
              value={range}
              onChange={setRange}
              options={[
                { value: 'week', label: 'Week' },
                { value: 'month', label: 'Month' }
              ]}
            />
          </View>
        </View>
        <View style={{ marginTop: spacing.lg }}>
          {loading && expenses.length === 0 ? (
            <Skeleton width="100%" height={132} radius={radius.sm} />
          ) : range === 'week' ? (
            <SpendBarChart points={chartPoints} highlightIndex={6} />
          ) : (
            <SpendAreaChart points={chartPoints} highlightIndex={4} />
          )}
        </View>
      </Card>

      <SectionHeader title="Categories" subtitle={range === 'week' ? 'Last 7 days' : 'This month'} />
      <Card>
        {categories.length === 0 ? (
          <Text variant="body" color={colors.textMuted} style={{ paddingVertical: spacing.sm }}>
            No spending in this period yet.
          </Text>
        ) : (
          categories.map((item, index) => {
            const meta = categoryMeta(item.category);
            const accent = categoryColor(colors, item.category);
            return (
              <View
                key={item.category}
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: spacing.md,
                  paddingVertical: spacing.sm,
                  borderTopWidth: index === 0 ? 0 : 1,
                  borderTopColor: colors.border
                }}
              >
                <View
                  style={{
                    width: 36,
                    height: 36,
                    borderRadius: radius.sm,
                    alignItems: 'center',
                    justifyContent: 'center',
                    backgroundColor: `${accent}18`
                  }}
                >
                  <Ionicons name={meta.icon} size={17} color={accent} />
                </View>
                <View style={{ flex: 1 }}>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 5 }}>
                    <Text variant="bodyStrong" color={colors.text} style={{ textTransform: 'capitalize' }}>
                      {item.category}
                    </Text>
                    <Money paise={item.paise} size="small" color={colors.text} />
                  </View>
                  <View style={{ height: 5, borderRadius: 3, backgroundColor: colors.surfaceSunken, overflow: 'hidden' }}>
                    <View
                      style={{
                        width: `${Math.max(4, Math.round(item.share * 100))}%`,
                        height: '100%',
                        borderRadius: 3,
                        backgroundColor: accent
                      }}
                    />
                  </View>
                </View>
                <Text variant="caption" color={colors.textMuted} style={{ width: 34, textAlign: 'right' }}>
                  {Math.round(item.share * 100)}%
                </Text>
              </View>
            );
          })
        )}
      </Card>

      {error && expenses.length > 0 ? (
        <View style={{ marginTop: spacing.lg }}>
          <ErrorBanner message={error} title="Showing offline data" onRetry={() => void reload()} />
        </View>
      ) : null}

      <SectionHeader title="Recent" subtitle="Swipe a row to edit or delete" />
    </View>
  );

  return (
    <Screen padded={false} maxWidth={960}>
      <SectionList
        sections={sections}
        keyExtractor={(item) => item.id}
        contentContainerStyle={{
          paddingHorizontal: layout.screenPadding,
          paddingTop: spacing.sm,
          paddingBottom: layout.tabBarContentInset
        }}
        stickySectionHeadersEnabled={false}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={colors.primary}
            colors={[colors.primary]}
            progressBackgroundColor={colors.surface}
          />
        }
        ListHeaderComponent={header}
        renderSectionHeader={({ section }) => (
          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'space-between',
              paddingTop: spacing.sm,
              paddingBottom: spacing.sm
            }}
          >
            <Text variant="label" color={colors.textMuted}>
              {section.title}
            </Text>
            <Money paise={section.totalPaise} size="small" color={colors.textMuted} />
          </View>
        )}
        renderItem={({ item, index }) => (
          <ExpenseSwipeRow
            expense={item}
            index={index}
            onPress={() => openEdit(item)}
            onEdit={() => openEdit(item)}
            onDelete={() => confirmDelete(item)}
          />
        )}
        ListEmptyComponent={
          loading ? (
            <SkeletonList rows={4} />
          ) : error ? (
            <ErrorBanner message={error} title="Could not load expenses" onRetry={() => void reload()} />
          ) : (
            <EmptyState
              icon="wallet-outline"
              title="Your ledger is empty"
              message="Add your first expense and watch your monthly picture build itself."
              actionLabel="Add an expense"
              onAction={() => router.push('/expense/new')}
            />
          )
        }
      />

      <Fab
        onPress={() => router.push('/expense/new')}
        style={{ position: 'absolute', right: layout.screenPadding, bottom: layout.tabBarContentInset + spacing.md }}
      />

      <BottomSheet
        visible={expenseToDelete !== null}
        onClose={() => {
          if (!deleting) {
            setExpenseToDelete(null);
            setDeleteError(null);
          }
        }}
        title="Delete expense?"
        subtitle="This removes it everywhere and cannot be undone."
        footer={
          <ResponsiveActions
            primaryLabel={deleting ? 'Deleting…' : 'Delete'}
            primaryVariant="danger"
            onPrimaryPress={() => void handleDelete()}
            primaryLoading={deleting}
            secondaryLabel="Cancel"
            secondaryVariant="secondary"
            onSecondaryPress={() => setExpenseToDelete(null)}
            disabled={deleting}
          />
        }
      >
        {expenseToDelete ? (
          <Card variant="sunken" padded>
            <Text variant="bodyStrong" color={colors.text} style={{ textTransform: 'capitalize' }}>
              {expenseToDelete.note || expenseToDelete.category}
            </Text>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: spacing.sm }}>
              <Text variant="caption" color={colors.textMuted}>
                {formatDate(expenseToDelete.spent_at)}
              </Text>
              <Money paise={rupeesToPaise(Number(expenseToDelete.amount))} size="small" color={colors.text} />
            </View>
          </Card>
        ) : null}
        {deleteError ? (
          <View style={{ marginTop: spacing.md }}>
            <ErrorBanner message={deleteError} title="Delete failed" />
          </View>
        ) : null}
      </BottomSheet>

      <BottomSheet
        visible={expenseToEdit !== null}
        onClose={() => {
          if (!savingEdit) setExpenseToEdit(null);
        }}
        title="Edit expense"
        subtitle="Changes replace the original entry."
        footer={
          <Button
            label={savingEdit ? 'Saving…' : 'Save changes'}
            onPress={() => void handleEditSave()}
            loading={savingEdit}
            style={{ marginBottom: spacing.sm }}
          />
        }
      >
        <Input
          label="Amount (₹)"
          value={editAmount}
          onChangeText={setEditAmount}
          keyboardType="decimal-pad"
          placeholder="0.00"
        />
        <Text variant="label" color={colors.textMuted} style={{ marginBottom: spacing.sm }}>
          Category
        </Text>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, marginBottom: spacing.lg }}>
          {EXPENSE_CATEGORIES.map((option) => (
            <Chip
              key={option}
              label={option}
              selected={editCategory === option}
              onPress={() => setEditCategory(option)}
              icon={categoryMeta(option).icon}
              color={categoryColor(colors, option)}
            />
          ))}
        </View>
        <Input
          label="Note (optional)"
          value={editNote}
          onChangeText={setEditNote}
          placeholder="What was this for?"
        />
        {expenseToEdit ? (
          <Text variant="caption" color={colors.textMuted}>
            Date stays {formatDate(expenseToEdit.spent_at)}.
          </Text>
        ) : null}
        {editError ? (
          <View style={{ marginTop: spacing.md }}>
            <ErrorBanner message={editError} title="Could not save" />
          </View>
        ) : null}
      </BottomSheet>
    </Screen>
  );
}
