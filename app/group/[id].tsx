import React, { useCallback, useMemo, useState } from 'react';
import {
  Alert,
  Linking,
  RefreshControl,
  ScrollView,
  Share,
  View
} from 'react-native';
import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, {
  interpolate,
  useAnimatedScrollHandler,
  useAnimatedStyle,
  useSharedValue
} from 'react-native-reanimated';
import { formatDate } from '@/lib/format';

import {
  Avatar,
  AvatarStack,
  BottomSheet,
  Button,
  Card,
  Chip,
  Confetti,
  EmptyState,
  ErrorBanner,
  IconButton,
  Input,
  Money,
  PressableScale,
  ResponsiveActions,
  Screen,
  SectionHeader,
  SegmentedControl,
  SkeletonList,
  Text
} from '@/components/ui';
import { useAuth } from '@/context/AuthProvider';
import { categoryColor, categoryMeta } from '@/lib/categories';
import { EXPENSE_CATEGORIES } from '@/lib/constants';
import { hapticError, hapticSuccess, hapticTap } from '@/lib/haptics';
import { formatPaise, parseRupeesToPaise } from '@/lib/money';
import { simplifyDebts, calculateGroupBalances, splitEqual, splitExact, splitPercent, type SplitShare, type UserBalance } from '@/lib/splits';
import {
  addGroupExpense,
  confirmGroupSettlement,
  deleteGroupExpense,
  getGroupDetails,
  leaveGroup,
  recordGroupSettlement,
  updateGroupExpense,
  type GroupDetails,
  type GroupExpense,
  type GroupMember
} from '@/services/groups';
import { useTheme } from '@/theme';

type SplitMode = 'equal' | 'exact' | 'percent';
type GroupTab = 'expenses' | 'balances' | 'members';

interface TransferSuggestion {
  fromUser: string;
  toUser: string;
  amountPaise: number;
}

function transferKey(transfer: TransferSuggestion): string {
  return `${transfer.fromUser}:${transfer.toUser}:${transfer.amountPaise}`;
}

function parseNonnegativePaise(value: string): number | null {
  const match = /^(\d+)(?:\.(\d{0,2}))?$/.exec(value.trim());
  if (!match) return null;
  const amount = Number(match[1]) * 100 + Number((match[2] ?? '').padEnd(2, '0') || '0');
  return Number.isSafeInteger(amount) ? amount : null;
}

function parseBasisPoints(value: string): number | null {
  const match = /^(\d{1,3})(?:\.(\d{0,2}))?$/.exec(value.trim());
  if (!match) return null;
  const basisPoints = Number(match[1]) * 100 + Number((match[2] ?? '').padEnd(2, '0') || '0');
  return Number.isSafeInteger(basisPoints) && basisPoints <= 10_000 ? basisPoints : null;
}

function localDateString(): string {
  const now = new Date();
  const local = new Date(now.getTime() - now.getTimezoneOffset() * 60_000);
  return local.toISOString().slice(0, 10);
}

function paiseInput(value: number): string {
  return `${Math.floor(value / 100)}.${String(value % 100).padStart(2, '0')}`;
}

function memberName(member: GroupMember | undefined): string {
  return member?.profile?.full_name?.trim()
    || 'Group member';
}

function PayerOption({
  name,
  selected,
  onPress
}: {
  name: string;
  selected: boolean;
  onPress: () => void;
}) {
  const { colors, spacing, radius } = useTheme();
  return (
    <PressableScale
      onPress={onPress}
      accessibilityLabel={`Paid by ${name}`}
      accessibilityState={{ selected }}
      style={{ alignItems: 'center', width: 74, gap: 6 }}
    >
      <View
        style={{
          padding: 3,
          borderRadius: radius.pill,
          borderWidth: 2,
          borderColor: selected ? colors.primary : 'transparent'
        }}
      >
        <Avatar name={name} size={42} />
      </View>
      <Text variant="caption" color={selected ? colors.primary : colors.textMuted} numberOfLines={1} style={{ fontSize: 11 }}>
        {name}
      </Text>
      {selected ? <Ionicons name="checkmark-circle" size={14} color={colors.primary} style={{ marginTop: -spacing.xs }} /> : null}
    </PressableScale>
  );
}

function MemberToggle({
  name,
  selected,
  onPress
}: {
  name: string;
  selected: boolean;
  onPress: () => void;
}) {
  const { colors, spacing, radius } = useTheme();
  return (
    <PressableScale
      onPress={onPress}
      accessibilityLabel={`Include ${name} in split`}
      accessibilityState={{ selected }}
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.sm,
        paddingHorizontal: spacing.md,
        minHeight: 46,
        borderRadius: radius.pill,
        borderWidth: 1,
        borderColor: selected ? `${colors.primary}66` : colors.border,
        backgroundColor: selected ? colors.primarySoft : colors.surface
      }}
      containerStyle={{ alignSelf: 'flex-start' }}
    >
      <Avatar name={name} size={26} />
      <Text variant="caption" weight="bold" color={selected ? colors.primary : colors.textSecondary} numberOfLines={1} style={{ maxWidth: 100 }}>
        {name}
      </Text>
      <Ionicons
        name={selected ? 'checkmark-circle' : 'ellipse-outline'}
        size={16}
        color={selected ? colors.primary : colors.textMuted}
      />
    </PressableScale>
  );
}

export default function GroupDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const groupId = Array.isArray(id) ? id[0] : id;
  const router = useRouter();
  const { user } = useAuth();
  const { colors, spacing, radius, layout, shadows, fonts } = useTheme();
  const insets = useSafeAreaInsets();

  const [details, setDetails] = useState<GroupDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [tab, setTab] = useState<GroupTab>('expenses');
  const [expenseSheetVisible, setExpenseSheetVisible] = useState(false);
  const [editingExpense, setEditingExpense] = useState<GroupExpense | null>(null);
  const [selectedExpense, setSelectedExpense] = useState<GroupExpense | null>(null);
  const [deletingExpenseId, setDeletingExpenseId] = useState<string | null>(null);
  const [description, setDescription] = useState('');
  const [amountText, setAmountText] = useState('');
  const [category, setCategory] = useState('general');
  const [expenseDate, setExpenseDate] = useState(localDateString());
  const [paidBy, setPaidBy] = useState(user?.id ?? '');
  const [splitUserIds, setSplitUserIds] = useState<string[]>([]);
  const [splitMode, setSplitMode] = useState<SplitMode>('equal');
  const [exactShareText, setExactShareText] = useState<Record<string, string>>({});
  const [percentText, setPercentText] = useState<Record<string, string>>({});
  const [savingExpense, setSavingExpense] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [settlingKey, setSettlingKey] = useState<string | null>(null);
  const [settlingAction, setSettlingAction] = useState<'paid' | 'received' | null>(null);
  const [leaving, setLeaving] = useState(false);
  const [copied, setCopied] = useState(false);
  const [confetti, setConfetti] = useState(false);
  const [groupOptionsMode, setGroupOptionsMode] = useState<'menu' | 'leave-confirm' | null>(null);
  const [leaveError, setLeaveError] = useState<string | null>(null);
  const members = useMemo(
    () => (Array.isArray(details?.members) ? details.members : []),
    [details]
  );

  const scrollY = useSharedValue(0);
  const onScroll = useAnimatedScrollHandler((event) => {
    scrollY.value = event.contentOffset.y;
  });

  const reload = useCallback(async () => {
    if (!groupId) return;
    setError(null);
    try {
      const nextDetails = await getGroupDetails(groupId);
      if (!nextDetails?.group) throw new Error('The group response was incomplete. Please retry.');
      const safeDetails: GroupDetails = {
        ...nextDetails,
        members: Array.isArray(nextDetails.members) ? nextDetails.members : [],
        expenses: Array.isArray(nextDetails.expenses) ? nextDetails.expenses : [],
        settlements: Array.isArray(nextDetails.settlements) ? nextDetails.settlements : []
      };
      setDetails(safeDetails);
      setPaidBy((current) => current || user?.id || safeDetails.members[0]?.user_id || '');
      setSplitUserIds((current) => (current.length ? current : safeDetails.members.map((member) => member.user_id)));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not load this group.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [groupId, user?.id]);

  useFocusEffect(
    useCallback(() => {
      void reload();
    }, [reload])
  );

  const balanceResult = useMemo<{ balances: UserBalance[]; error: string | null }>(() => {
    if (!details) return { balances: [], error: null };
    try {
      return {
        balances: calculateGroupBalances(
          details.members,
          details.expenses,
          details.settlements
        ),
        error: null
      };
    } catch (err) {
      return {
        balances: [],
        error: err instanceof Error ? err.message : 'Group balances could not be verified.'
      };
    }
  }, [details]);
  const balances = balanceResult.balances;
  const suggestions = useMemo(() => {
    if (!members.some((member) => member.user_id.trim())) return [];
    return simplifyDebts(
      balances.filter(({ userId }) => userId.trim())
    );
  }, [balances, members]);
  const memberById = useMemo(
    () => new Map(members.map((member) => [member.user_id, member])),
    [members]
  );
  const myBalance = balances.find((balance) => balance.userId === user?.id)?.balancePaise ?? 0;
  const groupTotal = details?.expenses.reduce((sum, expense) => sum + expense.amount_paise, 0) ?? 0;

  const toggleSplitMember = useCallback((memberId: string) => {
    hapticTap();
    setSplitUserIds((current) => (current.includes(memberId)
      ? current.filter((idValue) => idValue !== memberId)
      : [...current, memberId]));
  }, []);

  const openAddExpense = () => {
    if (!details) return;
    setEditingExpense(null);
    setDescription('');
    setAmountText('');
    setCategory('general');
    setExpenseDate(localDateString());
    setPaidBy(user?.id ?? members[0]?.user_id ?? '');
    setSplitUserIds(members.map((member) => member.user_id));
    setSplitMode('equal');
    setExactShareText({});
    setPercentText({});
    setFormError(null);
    setExpenseSheetVisible(true);
  };

  const openEditExpense = (expense: GroupExpense) => {
    if (!details) return;
    const currentMemberIds = new Set(members.map((member) => member.user_id));
    const includedIds = expense.splits.map((split) => split.user_id).filter((id) => currentMemberIds.has(id));
    const equalShares = includedIds.length > 0 ? splitEqual(expense.amount_paise, includedIds) : [];
    const isEqual = equalShares.length === includedIds.length && equalShares.every((share) =>
      expense.splits.find((existing) => existing.user_id === share.userId)?.share_paise === share.sharePaise
    );
    setEditingExpense(expense);
    setSelectedExpense(null);
    setDescription(expense.description ?? '');
    setAmountText(paiseInput(expense.amount_paise));
    setCategory(expense.category ?? 'general');
    setExpenseDate(expense.expense_date);
    setPaidBy(expense.paid_by);
    setSplitUserIds(includedIds);
    setSplitMode(isEqual ? 'equal' : 'exact');
    setExactShareText(Object.fromEntries(expense.splits.filter((split) => currentMemberIds.has(split.user_id)).map((split) => [split.user_id, paiseInput(split.share_paise)])));
    setPercentText({});
    setFormError(null);
    setExpenseSheetVisible(true);
  };

  const amountPaiseForPreview = parseRupeesToPaise(amountText);
  const selectedMembers = members.filter((member) => splitUserIds.includes(member.user_id));
  let previewSplits: SplitShare[] | null = null;
  let splitValidationError: string | null = null;
  if (amountPaiseForPreview === null) {
    splitValidationError = 'Enter a valid expense amount to preview the split.';
  } else if (selectedMembers.length === 0) {
    splitValidationError = 'Choose at least one person to split the expense with.';
  } else {
    try {
      if (splitMode === 'equal') {
        previewSplits = splitEqual(amountPaiseForPreview, selectedMembers.map(({ user_id }) => user_id));
      } else if (splitMode === 'exact') {
        const shares = selectedMembers.map(({ user_id }) => ({
          userId: user_id,
          sharePaise: parseNonnegativePaise(exactShareText[user_id] ?? '')
        }));
        if (shares.some(({ sharePaise }) => sharePaise === null)) throw new Error('Enter a valid exact share for every selected member.');
        previewSplits = splitExact(amountPaiseForPreview, shares as { userId: string; sharePaise: number }[]);
      } else {
        const percentages = selectedMembers.map(({ user_id }) => ({
          userId: user_id,
          basisPoints: parseBasisPoints(percentText[user_id] ?? '')
        }));
        if (percentages.some(({ basisPoints }) => basisPoints === null)) throw new Error('Enter a percentage from 0 to 100 for every selected member.');
        previewSplits = splitPercent(amountPaiseForPreview, percentages as { userId: string; basisPoints: number }[]);
      }
    } catch (err) {
      splitValidationError = err instanceof Error ? err.message : 'The split is invalid.';
    }
  }

  const exactAssigned = selectedMembers.reduce(
    (sum, member) => sum + (parseNonnegativePaise(exactShareText[member.user_id] ?? '') ?? 0),
    0
  );
  const exactRemaining = (amountPaiseForPreview ?? 0) - exactAssigned;
  const percentAssigned = selectedMembers.reduce(
    (sum, member) => sum + (parseBasisPoints(percentText[member.user_id] ?? '') ?? 0),
    0
  );
  const percentRemaining = 10_000 - percentAssigned;

  const handleSaveExpense = async () => {
    if (!details || !groupId) return;
    const amountPaise = parseRupeesToPaise(amountText);
    if (!description.trim()) {
      setFormError('Add a short description for this expense.');
      hapticError();
      return;
    }
    if (amountPaise === null) {
      setFormError('Enter a positive amount with up to two decimal places.');
      hapticError();
      return;
    }
    if (!paidBy || !splitUserIds.length) {
      setFormError('Choose who paid and at least one person to split the expense with.');
      hapticError();
      return;
    }
    if (!previewSplits || splitValidationError) {
      setFormError(splitValidationError ?? 'Check the split amounts.');
      hapticError();
      return;
    }

    setSavingExpense(true);
    setFormError(null);
    try {
      const input = {
        paidBy,
        amountPaise,
        description,
        category,
        expenseDate,
        splits: previewSplits.map(({ userId, sharePaise }) => ({ user_id: userId, share_paise: sharePaise }))
      };
      if (editingExpense) {
        await updateGroupExpense({ ...input, expenseId: editingExpense.id });
      } else {
        await addGroupExpense({ ...input, groupId });
      }
      hapticSuccess();
      const wasEditing = editingExpense !== null;
      setEditingExpense(null);
      setExpenseSheetVisible(false);
      await reload();
      Alert.alert(wasEditing ? 'Expense updated' : 'Expense added', wasEditing ? 'The shared expense and balances are up to date.' : 'The shared expense was saved.');
    } catch (err) {
      hapticError();
      setFormError(err instanceof Error ? err.message : 'Could not save this expense.');
    } finally {
      setSavingExpense(false);
    }
  };

  const confirmDeleteExpense = () => {
    if (!selectedExpense) return;
    const expense = selectedExpense;
    Alert.alert('Delete shared expense?', 'This removes the expense from group balances. This action cannot be undone.', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: () => {
        void (async () => {
          setDeletingExpenseId(expense.id);
          try {
            await deleteGroupExpense(expense.id);
            setSelectedExpense(null);
            await reload();
            hapticSuccess();
            Alert.alert('Expense deleted', 'Group balances have been recalculated.');
          } catch (err) {
            hapticError();
            Alert.alert('Could not delete expense', err instanceof Error ? err.message : 'Please try again.');
          } finally {
            setDeletingExpenseId(null);
          }
        })();
      } }
    ]);
  };

  const shareInvite = useCallback(async () => {
    if (!details) return;
    await Share.share({
      message: `Join “${details.group.name}” in Expense Counter. Open Groups → Join group and enter this invite code: ${details.group.invite_code}`
    });
  }, [details]);

  const copyInvite = useCallback(async () => {
    if (!details) return;
    try {
      const clipboard = await import('expo-clipboard');
      await clipboard.setStringAsync(details.group.invite_code);
    } catch {
      Alert.alert(
        'Clipboard unavailable',
        'Rebuild and reinstall the development app to enable copying invite codes.'
      );
      return;
    }
    hapticSuccess();
    setCopied(true);
    setTimeout(() => setCopied(false), 1600);
  }, [details]);

  const confirmLeave = useCallback(() => {
    if (!groupId) return;
    setLeaveError(null);
    setGroupOptionsMode('leave-confirm');
  }, [groupId]);

  const leaveGroupNow = useCallback(async () => {
    if (!groupId) return;
    setLeaving(true);
    setLeaveError(null);
    try {
      await leaveGroup(groupId);
      setGroupOptionsMode(null);
      router.replace('/(tabs)/groups');
    } catch (err) {
      setLeaveError(err instanceof Error ? err.message : 'Could not leave this group.');
    } finally {
      setLeaving(false);
    }
  }, [groupId, router]);

  const runSettlement = useCallback(
    async (suggestion: TransferSuggestion, action: 'paid' | 'received') => {
      const key = transferKey(suggestion);
      setSettlingKey(key);
      setSettlingAction(action);
      setError(null);
      try {
        if (action === 'paid') {
          await recordGroupSettlement({
            groupId: groupId ?? '',
            toUser: suggestion.toUser,
            amountPaise: suggestion.amountPaise
          });
        } else {
          await confirmGroupSettlement({
            groupId: groupId ?? '',
            fromUser: suggestion.fromUser,
            amountPaise: suggestion.amountPaise
          });
        }
        hapticSuccess();
        // The last outstanding suggestion clears the group: celebrate.
        if (suggestions.length === 1) {
          setConfetti(true);
          setTimeout(() => setConfetti(false), 2600);
        }
        await reload();
      } catch (err) {
        hapticError();
        setError(err instanceof Error ? err.message : 'Could not record this settlement.');
      } finally {
        setSettlingKey(null);
        setSettlingAction(null);
      }
    },
    [groupId, reload, suggestions.length]
  );

  const payViaUpi = useCallback(
    async (suggestion: TransferSuggestion) => {
      const payee = memberById.get(suggestion.toUser);
      const payeeName = memberName(payee);
      const upiId = payee?.profile?.upi_id?.trim();
      const amountLabel = formatPaise(suggestion.amountPaise);

      if (!upiId) {
        try {
          const clipboard = await import('expo-clipboard');
          await clipboard.setStringAsync(amountLabel);
          hapticSuccess();
          Alert.alert(
            'Amount copied',
            `${payeeName} has not saved a UPI ID. ${amountLabel} is on your clipboard — paste it into your UPI app.`
          );
        } catch {
          Alert.alert(
            'No UPI ID saved',
            `${payeeName} has not saved a UPI ID. Pay ${amountLabel} in your UPI app.`
          );
        }
        return;
      }

      const amountRupees = (suggestion.amountPaise / 100).toFixed(2);
      const url =
        `upi://pay?pa=${encodeURIComponent(upiId)}` +
        `&pn=${encodeURIComponent(payeeName)}` +
        `&am=${amountRupees}&cu=INR` +
        `&tn=${encodeURIComponent('Expense Counter group settlement')}`;
      try {
        await Linking.openURL(url);
      } catch {
        Alert.alert(
          'Could not open a UPI app',
          'Install or enable a UPI app on this device, then try again.'
        );
      }
    },
    [memberById]
  );

  const openMenu = useCallback(() => {
    if (!details) return;
    setGroupOptionsMode('menu');
  }, [details]);

  const headerBackground = useAnimatedStyle(() => ({
    opacity: interpolate(scrollY.value, [24, 76], [0, 1], 'clamp')
  }));
  const headerTitle = useAnimatedStyle(() => ({
    opacity: interpolate(scrollY.value, [44, 92], [0, 1], 'clamp'),
    transform: [{ translateY: interpolate(scrollY.value, [44, 92], [6, 0], 'clamp') }]
  }));

  if (loading) {
    return (
      <Screen padded={false} edges={['left', 'right', 'bottom']}>
        <View style={{ paddingTop: insets.top + spacing.xl, paddingHorizontal: layout.screenPadding }}>
          <SkeletonList rows={3} />
        </View>
      </Screen>
    );
  }

  if (!details) {
    return (
      <Screen>
        <View style={{ flex: 1, justifyContent: 'center', gap: spacing.md }}>
          <ErrorBanner message={error ?? 'This group could not be found.'} title="Group unavailable" />
          <Button label="Back to groups" variant="secondary" onPress={() => router.replace('/(tabs)/groups')} />
        </View>
      </Screen>
    );
  }

  const invitePill = (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.sm,
        marginTop: spacing.lg
      }}
    >
      <View
        style={{
          flex: 1,
          flexDirection: 'row',
          alignItems: 'center',
          gap: spacing.sm,
          minHeight: 46,
          paddingHorizontal: spacing.md,
          borderRadius: radius.pill,
          backgroundColor: colors.heroTrack,
          borderWidth: 1,
          borderColor: colors.heroBorder
        }}
      >
        <Ionicons name="key-outline" size={15} color={colors.heroMuted} />
        <View style={{ flex: 1 }}>
          <Text variant="caption" color={colors.heroMuted} style={{ fontSize: 9, lineHeight: 11 }}>
            INVITE CODE
          </Text>
          <Text variant="bodyStrong" color={colors.heroText} style={{ letterSpacing: 1.2, flex: 1, minWidth: 0 }} numberOfLines={1} ellipsizeMode="middle">
            {details.group.invite_code.toUpperCase()}
          </Text>
        </View>
        <PressableScale
          onPress={() => void copyInvite()}
          accessibilityLabel="Copy invite code"
          style={{ width: 44, height: 44, borderRadius: 22 }}
        >
          <Ionicons name={copied ? 'checkmark' : 'copy-outline'} size={17} color={copied ? colors.primary : colors.heroText} />
        </PressableScale>
      </View>
      <IconButton icon="share-outline" label="Share invite" onPress={() => void shareInvite()} style={{ backgroundColor: colors.primary }} />
    </View>
  );

  const groupHeader = (
    <LinearGradient
      colors={[colors.heroFrom, colors.heroTo]}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={[
        {
          borderRadius: radius.hero,
          padding: spacing.xl,
          borderWidth: 1,
          borderColor: colors.heroBorder,
          marginBottom: spacing.lg,
          overflow: 'hidden'
        },
        shadows.card
      ]}
    >
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.md }}>
        <View
          style={{
            width: 46,
            height: 46,
            borderRadius: radius.sm,
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: colors.primarySoft
          }}
        >
          <Ionicons name="people" size={22} color={colors.primary} />
        </View>
        <View style={{ flex: 1 }}>
          <Text variant="title" color={colors.heroText} numberOfLines={1}>
            {details.group.name}
          </Text>
          <Text variant="caption" color={colors.heroMuted}>
            {members.length} members · Shared ledger
          </Text>
        </View>
        <AvatarStack
          names={members.map((member) => memberName(member))}
          size={26}
          max={3}
          borderColor={colors.heroTo}
        />
      </View>
      <View style={{ marginTop: spacing.lg }}>
        <Text variant="label" color={colors.heroMuted}>
          Total spent
        </Text>
        <View style={{ flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between', gap: spacing.md }}>
          <Money paise={groupTotal} size="display" color={colors.heroText} />
          <View
            style={{
              borderRadius: radius.pill,
              paddingHorizontal: spacing.md,
              paddingVertical: 6,
              backgroundColor: balanceResult.error
                ? colors.warningSoft
                : myBalance >= 0
                  ? colors.successSoft
                  : colors.dangerSoft
            }}
          >
            <Text
              variant="caption"
              weight="bold"
              color={
                balanceResult.error
                  ? colors.warning
                  : myBalance > 0
                    ? colors.success
                    : myBalance < 0
                      ? colors.danger
                      : colors.heroMuted
              }
            >
              {balanceResult.error
                ? 'Needs review'
                : myBalance > 0
                  ? 'You are owed'
                  : myBalance < 0
                    ? 'You owe'
                    : 'Settled up'}
            </Text>
          </View>
        </View>
      </View>
      {invitePill}
    </LinearGradient>
  );

  const expenseTab = (
    <View>
      <SectionHeader
        title="Expenses"
        subtitle={`${details.expenses.length} shared ${details.expenses.length === 1 ? 'entry' : 'entries'}`}
        actionLabel="Add expense"
        onAction={openAddExpense}
      />
      {details.expenses.length === 0 ? (
        <Card>
          <EmptyState
            compact
            icon="receipt-outline"
            title="No shared expenses"
            message="Add the first bill and this group will do the splitting."
            actionLabel="Add expense"
            onAction={openAddExpense}
          />
        </Card>
      ) : (
        details.expenses.map((expense) => {
          const meta = categoryMeta(expense.category);
          const accent = categoryColor(colors, expense.category);
          const myShare = expense.splits.find((split) => split.user_id === user?.id)?.share_paise ?? 0;
          const paidByMe = expense.paid_by === user?.id;
          const laterMembers = members.filter((member) =>
            new Date(member.joined_at).getTime() > new Date(expense.created_at).getTime()
            && !expense.splits.some((split) => split.user_id === member.user_id)
          );
          return (
            <PressableScale key={expense.id} onPress={() => setSelectedExpense(expense)} accessibilityLabel={`View expense ${expense.description ?? expense.category ?? 'shared expense'}`} style={{ marginBottom: spacing.sm }}>
            <Card style={{ marginBottom: 0 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.md }}>
                <View
                  style={{
                    width: 42,
                    height: 42,
                    borderRadius: radius.sm,
                    alignItems: 'center',
                    justifyContent: 'center',
                    backgroundColor: `${accent}18`
                  }}
                >
                  <Ionicons name={meta.icon} size={18} color={accent} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text variant="bodyStrong" color={colors.text} numberOfLines={1}>
                    {expense.description || expense.category || 'Shared expense'}
                  </Text>
                  {expense.updated_at ? <Text variant="caption" color={colors.primary} style={{ marginTop: 1 }}>Edited</Text> : null}
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5, marginTop: 3 }}>
                    <Avatar
                      name={memberName(memberById.get(expense.paid_by))}
                      size={16}
                    />
                    <Text variant="caption" color={colors.textMuted} numberOfLines={1}>
                      {paidByMe ? 'You' : memberName(memberById.get(expense.paid_by))} paid · {formatDate(expense.expense_date)}
                    </Text>
                  </View>
                </View>
                <Money paise={expense.amount_paise} size="body" color={colors.text} />
              </View>
              <View
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  marginTop: spacing.md,
                  paddingTop: spacing.sm,
                  borderTopWidth: 1,
                  borderTopColor: colors.border
                }}
              >
                <Text variant="caption" color={colors.textMuted} style={{ textTransform: 'capitalize' }}>
                  Split {expense.splits.length} {expense.splits.length === 1 ? 'way' : 'ways'} · {expense.category || 'general'}
                </Text>
                <Text variant="caption" weight="bold" color={paidByMe ? colors.success : colors.textSecondary}>
                  {paidByMe
                    ? `You lent ${formatPaise(Math.max(0, expense.amount_paise - myShare))}`
                    : `Your share ${formatPaise(myShare)}`}
                </Text>
              </View>
              {laterMembers.length > 0 ? (
                <Text variant="caption" color={colors.warning} style={{ marginTop: spacing.sm }}>
                  {laterMembers.map(memberName).join(', ')} joined later and {laterMembers.length === 1 ? 'is' : 'are'} not included. Edit to include.
                </Text>
              ) : null}
            </Card>
            </PressableScale>
          );
        })
      )}

      <SectionHeader title="Settlement history" subtitle="Payments recorded outside the app" />
      <Card>
        {details.settlements.length === 0 ? (
          <Text variant="body" color={colors.textMuted} style={{ paddingVertical: spacing.sm }}>
            No payments recorded yet.
          </Text>
        ) : (
          details.settlements.map((settlement, index) => (
            <View
              key={settlement.id}
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'space-between',
                minHeight: 54,
                gap: spacing.md,
                borderTopWidth: index === 0 ? 0 : 1,
                borderTopColor: colors.border
              }}
            >
              <Text variant="caption" color={colors.textSecondary} style={{ flex: 1 }}>
                {settlement.from_user === user?.id ? 'You' : memberName(memberById.get(settlement.from_user))}
                {' paid '}
                {settlement.to_user === user?.id ? 'you' : memberName(memberById.get(settlement.to_user))}
              </Text>
              <View style={{ alignItems: 'flex-end' }}>
                <Money paise={settlement.amount_paise} size="small" color={colors.text} />
                <Text variant="caption" color={colors.textMuted} style={{ fontSize: 10 }}>
                  {formatDate(settlement.created_at)}
                </Text>
              </View>
            </View>
          ))
        )}
      </Card>
    </View>
  );

  const balancesTab = (
    <View>
      <View style={{ marginTop: spacing.lg }}>
        <Card
          variant={
            balanceResult.error
              ? 'default'
              : myBalance > 0
                ? 'accent'
                : myBalance < 0
                  ? 'danger'
                  : 'default'
          }
        >
          <Text variant="label" color={colors.textMuted}>
            Your balance
          </Text>
          {balanceResult.error ? (
            <Text variant="body" color={colors.danger} style={{ marginTop: spacing.sm }}>
              Balance unavailable until the group ledger reconciles.
            </Text>
          ) : (
            <View style={{ flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between', marginTop: spacing.sm }}>
              <Money
                paise={myBalance}
                showSign={myBalance !== 0}
                size="display"
                color={myBalance > 0 ? colors.success : myBalance < 0 ? colors.danger : colors.text}
              />
              <Text variant="caption" color={myBalance > 0 ? colors.success : myBalance < 0 ? colors.danger : colors.textMuted} weight="bold">
                {myBalance > 0 ? 'Owed to you' : myBalance < 0 ? 'You owe' : 'All clear'}
              </Text>
            </View>
          )}
        </Card>
      </View>

      <SectionHeader title="Settle up" subtitle="Suggested transfers" />
      {suggestions.length === 0 ? (
        balanceResult.error ? (
          <Card>
            <Text variant="body" color={colors.warning}>
              Settle-up suggestions are unavailable until balances reconcile.
            </Text>
          </Card>
        ) : (
          <Card variant="accent">
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.md }}>
              <View
                style={{
                  width: 44,
                  height: 44,
                  borderRadius: 22,
                  alignItems: 'center',
                  justifyContent: 'center',
                  backgroundColor: colors.primary
                }}
              >
                <Ionicons name="checkmark" size={23} color={colors.onPrimary} />
              </View>
              <View style={{ flex: 1 }}>
                <Text variant="subtitle" color={colors.text}>
                  Everyone is settled up
                </Text>
                <Text variant="caption" color={colors.textMuted} style={{ marginTop: 2 }}>
                  No transfers left. Nicely done.
                </Text>
              </View>
            </View>
          </Card>
        )
      ) : (
        <Card>
          {suggestions.map((suggestion, index) => {
            const fromName = suggestion.fromUser === user?.id ? 'You' : memberName(memberById.get(suggestion.fromUser));
            const toName = suggestion.toUser === user?.id ? 'you' : memberName(memberById.get(suggestion.toUser));
            const isPayer = suggestion.fromUser === user?.id;
            const isReceiver = suggestion.toUser === user?.id;
            const key = transferKey(suggestion);
            const isSettling = settlingKey === key;
            const transferLabel = isPayer
              ? `You pay ${toName}`
              : isReceiver
                ? `${fromName} pays you`
                : `${fromName} pays ${toName}`;
            return (
              <View
                key={`${suggestion.fromUser}-${suggestion.toUser}`}
                style={{
                  paddingVertical: spacing.md,
                  borderTopWidth: index === 0 ? 0 : 1,
                  borderTopColor: colors.border
                }}
              >
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.md }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                    <Avatar name={fromName} size={30} />
                    <View style={{ marginLeft: -10 }}>
                      <Avatar name={toName} size={30} />
                    </View>
                  </View>
                  <View style={{ flex: 1, minWidth: 0 }}>
                    <Text variant="bodyStrong" color={colors.text} numberOfLines={1}>
                      {transferLabel}
                    </Text>
                    <Money paise={suggestion.amountPaise} size="small" color={colors.primary} style={{ marginTop: 2 }} />
                  </View>
                </View>

                {isPayer ? (
                  <View style={{ marginTop: spacing.sm }}>
                    <ResponsiveActions
                      primaryLabel={
                        isSettling && settlingAction === 'paid' ? 'Marking paid…' : 'Mark as paid'
                      }
                      primaryLoading={isSettling && settlingAction === 'paid'}
                      onPrimaryPress={() => void runSettlement(suggestion, 'paid')}
                      secondaryLabel="Pay via UPI"
                      secondaryVariant="secondary"
                      onSecondaryPress={() => void payViaUpi(suggestion)}
                      disabled={isSettling}
                    />
                  </View>
                ) : isReceiver ? (
                  <View style={{ marginTop: spacing.sm, gap: spacing.sm }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.xs + 2 }}>
                      <Ionicons name="time-outline" size={14} color={colors.warning} />
                      <Text variant="caption" color={colors.warning} style={{ flex: 1 }}>
                        Waiting for {fromName} to pay
                      </Text>
                    </View>
                    <Button
                      label={
                        isSettling && settlingAction === 'received'
                          ? 'Saving…'
                          : 'Mark as received'
                      }
                      size="sm"
                      variant="secondary"
                      icon="checkmark"
                      loading={isSettling && settlingAction === 'received'}
                      disabled={isSettling}
                      onPress={() => void runSettlement(suggestion, 'received')}
                      fullWidth={false}
                      style={{ alignSelf: 'flex-start', paddingHorizontal: spacing.lg }}
                    />
                  </View>
                ) : (
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.xs + 2, marginTop: spacing.sm }}>
                    <Ionicons name="time-outline" size={14} color={colors.textMuted} />
                    <Text variant="caption" color={colors.textMuted}>
                      Waiting for {fromName} to pay {toName}
                    </Text>
                  </View>
                )}
              </View>
            );
          })}
        </Card>
      )}
      <Text variant="caption" color={colors.textMuted} style={{ marginTop: spacing.sm, lineHeight: 18 }}>
        Marking paid records a payment made outside the app. No money moves here.
      </Text>

      <SectionHeader title="All balances" subtitle="Every member's net position" />
      <Card>
        {balances.length === 0 ? (
          <Text variant="body" color={colors.textMuted}>
            No member balances to show.
          </Text>
        ) : balances.map((balance, index) => {
          const member = memberById.get(balance.userId);
          const isCurrentUser = balance.userId === user?.id;
          const isOwed = balance.balancePaise > 0;
          const owes = balance.balancePaise < 0;
          const statusColor = isOwed ? colors.success : owes ? colors.danger : colors.textMuted;
          const statusAmount = formatPaise(Math.abs(balance.balancePaise));
          const statusText = isOwed
            ? `is owed ${statusAmount}`
            : owes
              ? `owes ${statusAmount}`
              : 'settled up';
          return (
            <View
              key={balance.userId}
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                gap: spacing.md,
                minHeight: 58,
                paddingVertical: spacing.sm,
                borderTopWidth: index === 0 ? 0 : 1,
                borderTopColor: colors.border
              }}
            >
              <Avatar name={isCurrentUser ? 'You' : memberName(member)} size={34} />
              <View style={{ flex: 1, minWidth: 0 }}>
                <Text variant="bodyStrong" color={colors.text}>
                  {isCurrentUser ? 'You' : memberName(member)}
                </Text>
                <Text variant="caption" color={statusColor} style={{ marginTop: 1 }}>
                  {statusText}
                </Text>
                {member?.profile?.upi_id ? (
                  <Text variant="caption" color={colors.textMuted} numberOfLines={1}>
                    {member.profile.upi_id}
                  </Text>
                ) : null}
              </View>
              <Money
                paise={balance.balancePaise}
                showSign={balance.balancePaise !== 0}
                size="small"
                color={statusColor}
              />
            </View>
          );
        })}
      </Card>
    </View>
  );

  const membersTab = (
    <View>
      <SectionHeader title="Members" subtitle={`${members.length} in this group`} />
      <Card>
        {members.map((member, index) => (
          <View
            key={member.user_id}
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              gap: spacing.md,
              minHeight: 58,
              borderTopWidth: index === 0 ? 0 : 1,
              borderTopColor: colors.border
            }}
          >
            <Avatar name={member.user_id === user?.id ? 'You' : memberName(member)} size={38} />
            <View style={{ flex: 1 }}>
              <Text variant="bodyStrong" color={colors.text}>
                {member.user_id === user?.id ? 'You' : memberName(member)}
              </Text>
              {member.profile?.upi_id ? (
                <Text variant="caption" color={colors.textMuted} numberOfLines={1}>
                  {member.profile.upi_id}
                </Text>
              ) : null}
            </View>
            <View
              style={{
                paddingHorizontal: spacing.sm,
                paddingVertical: 4,
                borderRadius: radius.pill,
                backgroundColor: colors.surfaceSunken
              }}
            >
              <Text variant="caption" color={colors.textMuted} style={{ textTransform: 'capitalize' }}>
                {member.role}
              </Text>
            </View>
          </View>
        ))}
      </Card>

      <SectionHeader title="Invite someone" subtitle="Share the code, settle together" />
      <Card variant="accent">
        <Text variant="body" color={colors.textMuted} style={{ marginBottom: spacing.md }}>
          Anyone with this code can join. Only share it with people you trust.
        </Text>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm }}>
          <View
            style={{
              flex: 1,
              minHeight: 46,
              justifyContent: 'center',
              paddingHorizontal: spacing.md,
              borderRadius: radius.pill,
              backgroundColor: colors.surface,
              borderWidth: 1,
              borderColor: colors.border
            }}
          >
            <Text variant="bodyStrong" color={colors.text} style={{ letterSpacing: 1.2, flex: 1, minWidth: 0 }} numberOfLines={1} ellipsizeMode="middle">
              {details.group.invite_code.toUpperCase()}
            </Text>
          </View>
          <IconButton icon="copy-outline" label="Copy invite code" variant="surface" onPress={() => void copyInvite()} />
          <IconButton icon="share-outline" label="Share invite" variant="solid" onPress={() => void shareInvite()} />
        </View>
      </Card>

      <Button
        label={leaving ? 'Leaving…' : 'Leave group'}
        variant="ghost"
        loading={leaving}
        onPress={confirmLeave}
        style={{ marginTop: spacing.xl }}
      />
    </View>
  );

  return (
    <Screen padded={false} edges={['left', 'right', 'bottom']}>
      <Animated.ScrollView
        onScroll={onScroll}
        scrollEventThrottle={16}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{
          paddingTop: insets.top + 60,
          paddingHorizontal: layout.screenPadding,
          paddingBottom: layout.tabBarContentInset + spacing.xl
        }}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => {
              setRefreshing(true);
              void reload();
            }}
            tintColor={colors.primary}
            colors={[colors.primary]}
            progressBackgroundColor={colors.surface}
          />
        }
      >
        {groupHeader}

        <SegmentedControl
          value={tab}
          onChange={setTab}
          options={[
            { value: 'expenses', label: 'Expenses' },
            { value: 'balances', label: 'Balances' },
            { value: 'members', label: 'Members' }
          ]}
        />

        {error ? (
          <View style={{ marginTop: spacing.lg }}>
            <ErrorBanner message={error} title="Something went wrong" onRetry={() => void reload()} />
          </View>
        ) : null}

        {balanceResult.error ? (
          <View style={{ marginTop: spacing.lg }}>
            <ErrorBanner
              message={balanceResult.error}
              title="Balances need attention"
              onRetry={() => void reload()}
            />
          </View>
        ) : null}

        <View style={{ marginTop: spacing.lg }}>
          {tab === 'expenses' ? expenseTab : tab === 'balances' ? balancesTab : membersTab}
        </View>
      </Animated.ScrollView>

      <View
        pointerEvents="box-none"
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          zIndex: 20,
          paddingTop: insets.top,
          height: insets.top + 58
        }}
      >
        <Animated.View
          pointerEvents="none"
          style={[
            {
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              backgroundColor: colors.background,
              borderBottomWidth: 1,
              borderBottomColor: colors.border
            },
            headerBackground
          ]}
        />
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            height: 58,
            paddingHorizontal: spacing.md,
            gap: spacing.sm
          }}
        >
          <IconButton
            icon="chevron-back"
            label="Back to groups"
            variant="surface"
            onPress={() => (router.canGoBack() ? router.back() : router.replace('/(tabs)/groups'))}
          />
          <Animated.Text
            style={[
              { flex: 1, textAlign: 'center', color: colors.text, fontFamily: fonts.semibold, fontSize: 16 },
              headerTitle
            ]}
            numberOfLines={1}
          >
            {details.group.name}
          </Animated.Text>
          <IconButton icon="ellipsis-horizontal" label="Group options" variant="surface" onPress={openMenu} />
        </View>
      </View>

      <Confetti visible={confetti} />

      <BottomSheet
        visible={groupOptionsMode !== null}
        onClose={() => {
          if (!leaving) setGroupOptionsMode(null);
        }}
        title={groupOptionsMode === 'leave-confirm' ? 'Leave group?' : 'Group options'}
        subtitle={groupOptionsMode === 'leave-confirm' ? undefined : details.group.name}
        footer={groupOptionsMode === 'leave-confirm' ? (
          <ResponsiveActions
            primaryLabel={leaving ? 'Leaving…' : 'Leave group'}
            primaryVariant="danger"
            onPrimaryPress={() => void leaveGroupNow()}
            primaryLoading={leaving}
            secondaryLabel="Cancel"
            secondaryVariant="secondary"
            onSecondaryPress={() => setGroupOptionsMode('menu')}
            disabled={leaving}
          />
        ) : undefined}
      >
        {groupOptionsMode === 'menu' ? (
          <View style={{ gap: spacing.sm }}>
            <Button
              label={copied ? 'Invite code copied' : 'Copy invite code'}
              variant="secondary"
              icon={copied ? 'checkmark' : 'copy-outline'}
              onPress={() => {
                setGroupOptionsMode(null);
                void copyInvite();
              }}
            />
            <Button
              label="Share invite"
              variant="secondary"
              icon="share-outline"
              onPress={() => {
                setGroupOptionsMode(null);
                void shareInvite();
              }}
            />
            <Button
              label="Leave group"
              variant="danger"
              icon="exit-outline"
              onPress={confirmLeave}
            />
          </View>
        ) : groupOptionsMode === 'leave-confirm' ? (
          <View>
            <Text variant="body" color={colors.textSecondary}>
              You will no longer see this group’s expenses or balances. If you are the only member, leaving will delete the group and its expenses.
            </Text>
            {leaveError ? (
              <View style={{ marginTop: spacing.md }}>
                <ErrorBanner title="Could not leave group" message={leaveError} />
              </View>
            ) : null}
          </View>
        ) : null}
      </BottomSheet>

      <BottomSheet
        visible={expenseSheetVisible}
        onClose={() => {
          if (!savingExpense) setExpenseSheetVisible(false);
        }}
        title={editingExpense ? 'Edit shared expense' : 'Add shared expense'}
        subtitle={editingExpense ? 'Update the bill and its current member shares.' : 'Amount, payer, then how to split it.'}
        footer={
          <Button
            label={savingExpense ? 'Saving…' : editingExpense ? 'Save changes' : 'Save shared expense'}
            onPress={() => void handleSaveExpense()}
            loading={savingExpense}
            disabled={!previewSplits || Boolean(splitValidationError)}
            style={{ marginBottom: spacing.sm }}
          />
        }
      >
        <View style={{ alignItems: 'center', marginBottom: spacing.lg }}>
          <Text variant="label" color={colors.textMuted}>
            Amount
          </Text>
          <View style={{ flexDirection: 'row', alignItems: 'flex-start', marginTop: spacing.xs }}>
            <Text variant="title" color={colors.textMuted} style={{ marginTop: 6, marginRight: 2 }}>
              ₹
            </Text>
            <Input
              value={amountText}
              onChangeText={setAmountText}
              keyboardType="decimal-pad"
              placeholder="0.00"
              containerStyle={{ marginBottom: 0, minWidth: 160 }}
              inputStyle={{ fontSize: 32, lineHeight: 40, textAlign: 'center', fontFamily: fonts.money }}
              accessibilityLabel="Shared expense amount"
            />
          </View>
        </View>

        <Input
          label="Description"
          value={description}
          onChangeText={setDescription}
          placeholder="Groceries, electricity bill, cab"
          maxLength={120}
          icon="create-outline"
        />

        <Text variant="label" color={colors.textMuted} style={{ marginBottom: spacing.sm }}>
          Category
        </Text>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, marginBottom: spacing.lg }}>
          {EXPENSE_CATEGORIES.map((option) => (
            <Chip
              key={option}
              label={option}
              selected={category === option}
              onPress={() => setCategory(option)}
              icon={categoryMeta(option).icon}
              color={categoryColor(colors, option)}
            />
          ))}
        </View>

        <Input
          label="Date"
          value={expenseDate}
          onChangeText={setExpenseDate}
          placeholder="YYYY-MM-DD"
          icon="calendar-outline"
          autoCapitalize="none"
        />

        <Text variant="label" color={colors.textMuted} style={{ marginBottom: spacing.sm }}>
          Paid by
        </Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: spacing.sm, paddingVertical: spacing.xs }}>
          {members.map((member) => {
            const name = member.user_id === user?.id ? 'You' : memberName(member);
            return (
              <PayerOption
                key={member.user_id}
                name={name}
                selected={paidBy === member.user_id}
                onPress={() => {
                  hapticTap();
                  setPaidBy(member.user_id);
                }}
              />
            );
          })}
        </ScrollView>

        <Text variant="label" color={colors.textMuted} style={{ marginTop: spacing.lg, marginBottom: spacing.sm }}>
          Split method
        </Text>
        <SegmentedControl
          compact
          value={splitMode}
          onChange={(mode) => {
            setSplitMode(mode);
            setFormError(null);
          }}
          options={[
            { value: 'equal', label: 'Equal' },
            { value: 'exact', label: 'Exact' },
            { value: 'percent', label: 'Percent' }
          ]}
        />

        <Text variant="label" color={colors.textMuted} style={{ marginTop: spacing.lg, marginBottom: spacing.sm }}>
          Split between
        </Text>
        <Button
          label="Split among all current members"
          variant="secondary"
          onPress={() => {
            setSplitUserIds(members.map((member) => member.user_id));
            setFormError(null);
          }}
          style={{ marginBottom: spacing.md }}
        />
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm }}>
          {members.map((member) => (
            <MemberToggle
              key={member.user_id}
              name={member.user_id === user?.id ? 'You' : memberName(member)}
              selected={splitUserIds.includes(member.user_id)}
              onPress={() => toggleSplitMember(member.user_id)}
            />
          ))}
        </View>

        {splitMode !== 'equal'
          ? selectedMembers.map((member) => (
              <Input
                key={`split-${member.user_id}`}
                label={`${member.user_id === user?.id ? 'You' : memberName(member)} · ${splitMode === 'exact' ? 'share (₹)' : 'share (%)'}`}
                value={splitMode === 'exact' ? exactShareText[member.user_id] ?? '' : percentText[member.user_id] ?? ''}
                onChangeText={(value) => {
                  if (splitMode === 'exact') {
                    setExactShareText((current) => ({ ...current, [member.user_id]: value }));
                  } else {
                    setPercentText((current) => ({ ...current, [member.user_id]: value }));
                  }
                }}
                placeholder="0.00"
                keyboardType="decimal-pad"
                containerStyle={{ marginTop: spacing.md, marginBottom: spacing.sm }}
              />
            ))
          : null}

        {splitMode === 'exact' ? (
          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: spacing.md,
              borderRadius: radius.input,
              backgroundColor: exactRemaining === 0 ? colors.successSoft : exactRemaining < 0 ? colors.dangerSoft : colors.warningSoft,
              marginTop: spacing.md
            }}
          >
            <Text variant="caption" weight="bold" color={exactRemaining === 0 ? colors.success : exactRemaining < 0 ? colors.danger : colors.warning}>
              {exactRemaining === 0 ? 'Fully assigned' : exactRemaining < 0 ? 'Over assigned' : 'Remaining'}
            </Text>
            <Money
              paise={Math.abs(exactRemaining)}
              size="small"
              color={exactRemaining === 0 ? colors.success : exactRemaining < 0 ? colors.danger : colors.warning}
            />
          </View>
        ) : splitMode === 'percent' ? (
          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: spacing.md,
              borderRadius: radius.input,
              backgroundColor: percentRemaining === 0 ? colors.successSoft : percentRemaining < 0 ? colors.dangerSoft : colors.warningSoft,
              marginTop: spacing.md
            }}
          >
            <Text variant="caption" weight="bold" color={percentRemaining === 0 ? colors.success : percentRemaining < 0 ? colors.danger : colors.warning}>
              {percentRemaining === 0 ? 'Fully assigned' : percentRemaining < 0 ? 'Over assigned' : 'Remaining'}
            </Text>
            <Text variant="bodyStrong" color={percentRemaining === 0 ? colors.success : percentRemaining < 0 ? colors.danger : colors.warning}>
              {(Math.abs(percentRemaining) / 100).toFixed(2)}%
            </Text>
          </View>
        ) : null}

        {splitMode !== 'equal' && splitValidationError ? (
          <Text variant="caption" color={colors.danger} style={{ marginTop: spacing.sm }}>
            {splitValidationError}
          </Text>
        ) : splitMode === 'equal' && previewSplits ? (
          <Text variant="caption" color={colors.textMuted} style={{ marginTop: spacing.sm }}>
            {previewSplits.map((share) => `${memberName(memberById.get(share.userId))}: ${formatPaise(share.sharePaise)}`).join(' · ')}
          </Text>
        ) : null}

        {formError ? (
          <View style={{ marginTop: spacing.md }}>
            <ErrorBanner message={formError} title="Could not save expense" />
          </View>
        ) : null}
      </BottomSheet>

      <BottomSheet
        visible={selectedExpense !== null}
        onClose={() => setSelectedExpense(null)}
        title="Shared expense"
        subtitle="Everyone in the split can see this entry."
        footer={selectedExpense && (selectedExpense.created_by === user?.id || memberById.get(user?.id ?? '')?.role === 'admin') ? (
          <View style={{ flexDirection: 'row', gap: spacing.md, paddingBottom: spacing.sm }}>
            <Button
              label={deletingExpenseId === selectedExpense?.id ? 'Deleting…' : 'Delete'}
              variant="danger"
              onPress={confirmDeleteExpense}
              loading={deletingExpenseId === selectedExpense?.id}
              fullWidth={false}
              containerStyle={{ flex: 1, minWidth: 0 }}
              style={{ flex: 1, minWidth: 0, width: '100%' }}
            />
            <Button
              label="Edit"
              onPress={() => {
                if (selectedExpense) openEditExpense(selectedExpense);
              }}
              fullWidth={false}
              containerStyle={{ flex: 1, minWidth: 0 }}
              style={{ flex: 1, minWidth: 0, width: '100%' }}
            />
          </View>
        ) : undefined}
      >
        {selectedExpense ? (
          <>
            <View style={{ alignItems: 'center', marginBottom: spacing.lg }}>
              <Money paise={selectedExpense.amount_paise} size="display" color={colors.text} />
              <Text variant="body" color={colors.textMuted} style={{ marginTop: spacing.xs }}>
                {selectedExpense.description || selectedExpense.category || 'Shared expense'}
              </Text>
              {selectedExpense.updated_at ? <Text variant="caption" color={colors.primary} style={{ marginTop: spacing.xs }}>Edited</Text> : null}
            </View>
            <Card variant="sunken">
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', paddingVertical: spacing.xs }}>
                <Text variant="caption" color={colors.textMuted}>Paid by</Text>
                <Text variant="bodyStrong" color={colors.text}>
                  {selectedExpense.paid_by === user?.id ? 'You' : memberName(memberById.get(selectedExpense.paid_by))}
                </Text>
              </View>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', paddingVertical: spacing.xs }}>
                <Text variant="caption" color={colors.textMuted}>Date</Text>
                <Text variant="bodyStrong" color={colors.text}>{formatDate(selectedExpense.expense_date)}</Text>
              </View>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', paddingVertical: spacing.xs }}>
                <Text variant="caption" color={colors.textMuted}>Category</Text>
                <Text variant="bodyStrong" color={colors.text} style={{ textTransform: 'capitalize' }}>
                  {selectedExpense.category || 'general'}
                </Text>
              </View>
            </Card>
            <Text variant="label" color={colors.textMuted} style={{ marginTop: spacing.lg, marginBottom: spacing.sm }}>
              Split between
            </Text>
            <Card variant="sunken">
              {selectedExpense.splits.map((split, index) => (
                <View
                  key={split.user_id}
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    gap: spacing.sm,
                    paddingVertical: spacing.sm,
                    borderTopWidth: index === 0 ? 0 : 1,
                    borderTopColor: colors.border
                  }}
                >
                  <Avatar name={split.user_id === user?.id ? 'You' : memberName(memberById.get(split.user_id))} size={28} />
                  <Text variant="body" color={colors.text} style={{ flex: 1 }}>
                    {split.user_id === user?.id ? 'You' : memberName(memberById.get(split.user_id))}
                  </Text>
                  <Money paise={split.share_paise} size="small" color={colors.text} />
                </View>
              ))}
            </Card>
            <Text variant="caption" color={colors.textMuted} align="center" style={{ marginTop: spacing.md }}>
              Editing or deleting this expense recalculates every balance.
            </Text>
          </>
        ) : null}
      </BottomSheet>

    </Screen>
  );
}
