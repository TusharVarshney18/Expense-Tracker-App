import React, { useCallback, useState } from 'react';
import { RefreshControl, ScrollView, View } from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import Animated, { FadeInDown } from 'react-native-reanimated';

import {
  AvatarStack,
  BottomSheet,
  Button,
  Card,
  EmptyState,
  ErrorBanner,
  Input,
  Money,
  PressableScale,
  Screen,
  SkeletonList,
  Text
} from '@/components/ui';
import { useAuth } from '@/context/AuthProvider';
import { hapticError, hapticSuccess } from '@/lib/haptics';
import {
  createGroup,
  getGroupDetails,
  joinGroup,
  listGroups,
  type GroupDetails,
  type GroupSummary
} from '@/services/groups';
import { useTheme } from '@/theme';

function netBalanceFor(details: GroupDetails | undefined, userId: string | undefined): number {
  if (!userId || !details) return 0;
  const members = Array.isArray(details.members) ? details.members : [];
  const expenses = Array.isArray(details.expenses) ? details.expenses : [];
  const settlements = Array.isArray(details.settlements) ? details.settlements : [];
  const net = new Map(members.map((member) => [member.user_id, 0]));
  for (const expense of expenses) {
    net.set(expense.paid_by, (net.get(expense.paid_by) ?? 0) + expense.amount_paise);
    for (const split of expense.splits) {
      net.set(split.user_id, (net.get(split.user_id) ?? 0) - split.share_paise);
    }
  }
  for (const settlement of settlements) {
    net.set(settlement.from_user, (net.get(settlement.from_user) ?? 0) + settlement.amount_paise);
    net.set(settlement.to_user, (net.get(settlement.to_user) ?? 0) - settlement.amount_paise);
  }
  return net.get(userId) ?? 0;
}

export default function GroupsScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const { colors, spacing, radius, layout } = useTheme();

  const [groups, setGroups] = useState<GroupSummary[]>([]);
  const [detailsById, setDetailsById] = useState<Record<string, GroupDetails>>({});
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [creating, setCreating] = useState(false);
  const [joining, setJoining] = useState(false);
  const [name, setName] = useState('');
  const [inviteCode, setInviteCode] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [createVisible, setCreateVisible] = useState(false);
  const [joinVisible, setJoinVisible] = useState(false);
  const [sheetError, setSheetError] = useState<string | null>(null);

  const reload = useCallback(async () => {
    setError(null);
    try {
      const nextGroups = await listGroups();
      setGroups(nextGroups);
      const detailResults = await Promise.allSettled(
        nextGroups.map((group) => getGroupDetails(group.id))
      );
      const nextDetails: Record<string, GroupDetails> = {};
      detailResults.forEach((result) => {
        if (result.status === 'fulfilled') nextDetails[result.value.group.id] = result.value;
      });
      setDetailsById(nextDetails);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not load groups.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      void reload();
    }, [reload])
  );

  const handleCreate = useCallback(async () => {
    if (!name.trim()) {
      setSheetError('Enter a name for the group.');
      hapticError();
      return;
    }
    setCreating(true);
    setSheetError(null);
    try {
      const id = await createGroup(name);
      hapticSuccess();
      setName('');
      setCreateVisible(false);
      await reload();
      router.push({ pathname: '/group/[id]', params: { id } });
    } catch (err) {
      hapticError();
      setSheetError(err instanceof Error ? err.message : 'Could not create the group.');
    } finally {
      setCreating(false);
    }
  }, [name, reload, router]);

  const handleJoin = useCallback(async () => {
    if (!inviteCode.trim()) {
      setSheetError('Enter an invite code.');
      hapticError();
      return;
    }
    setJoining(true);
    setSheetError(null);
    try {
      const id = await joinGroup(inviteCode);
      hapticSuccess();
      setInviteCode('');
      setJoinVisible(false);
      await reload();
      router.push({ pathname: '/group/[id]', params: { id } });
    } catch (err) {
      hapticError();
      setSheetError(err instanceof Error ? err.message : 'Could not join the group.');
    } finally {
      setJoining(false);
    }
  }, [inviteCode, reload, router]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    void reload();
  }, [reload]);

  const openCreate = () => {
    setSheetError(null);
    setCreateVisible(true);
  };
  const openJoin = () => {
    setSheetError(null);
    setJoinVisible(true);
  };

  return (
    <Screen padded={false}>
      <ScrollView
        contentContainerStyle={{
          paddingHorizontal: layout.screenPadding,
          paddingTop: spacing.sm,
          paddingBottom: layout.tabBarContentInset
        }}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={colors.primary}
            colors={[colors.primary]}
            progressBackgroundColor={colors.surface}
          />
        }
        showsVerticalScrollIndicator={false}
      >
        <Text variant="title" color={colors.text}>
          Groups
        </Text>
        <Text variant="body" color={colors.textMuted} style={{ marginTop: 4 }}>
          Shared money, without the awkward maths.
        </Text>

        <View style={{ flexDirection: 'row', gap: spacing.sm, marginTop: spacing.lg, minWidth: 0 }}>
          <Button label="New group" icon="add" onPress={openCreate} fullWidth={false} containerStyle={{ flex: 1, minWidth: 0 }} style={{ flex: 1, minWidth: 0, width: '100%' }} />
          <Button label="Join" icon="key-outline" variant="secondary" onPress={openJoin} fullWidth={false} containerStyle={{ flex: 1, minWidth: 0 }} style={{ flex: 1, minWidth: 0, width: '100%' }} />
        </View>

        {error ? (
          <View style={{ marginTop: spacing.lg }}>
            <ErrorBanner message={error} title="Could not load groups" onRetry={() => void reload()} />
          </View>
        ) : null}

        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginTop: spacing.xl,
            marginBottom: spacing.md
          }}
        >
          <Text variant="subtitle" color={colors.text}>
            Your groups
          </Text>
          {groups.length > 0 ? (
            <Text variant="caption" color={colors.textMuted}>
              {groups.length} {groups.length === 1 ? 'group' : 'groups'}
            </Text>
          ) : null}
        </View>

        {loading && groups.length === 0 ? (
          <SkeletonList rows={3} />
        ) : groups.length === 0 ? (
          <EmptyState
            icon="people-outline"
            title="No shared groups yet"
            message="Create a group for your flat, a trip, or a dinner — then invite people with a code."
            actionLabel="Create your first group"
            onAction={openCreate}
          />
        ) : (
          groups.map((group, groupIndex) => {
            const details = detailsById[group.id];
            const net = netBalanceFor(details, user?.id);
            const names = (Array.isArray(details?.members) ? details.members : []).map(
              (member) => member.profile?.full_name ?? 'Member'
            );
            const settled = Boolean(details) && Math.abs(net) < 1;
            return (
              <Animated.View
                key={group.id}
                entering={FadeInDown.delay(Math.min(groupIndex, 6) * 50).duration(300)}
              >
                <PressableScale
                  onPress={() => router.push({ pathname: '/group/[id]', params: { id: group.id } })}
                  accessibilityLabel={`Open group ${group.name}`}
                  style={{ marginBottom: spacing.md }}
                  containerStyle={{ width: '100%' }}
                >
                <Card>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.md }}>
                    <View
                      style={{
                        width: 44,
                        height: 44,
                        borderRadius: radius.sm,
                        alignItems: 'center',
                        justifyContent: 'center',
                        backgroundColor: colors.primarySoft
                      }}
                    >
                      <Ionicons name="people" size={20} color={colors.primary} />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text variant="bodyStrong" color={colors.text} numberOfLines={1}>
                        {group.name}
                      </Text>
                      <Text variant="caption" color={colors.textMuted} style={{ marginTop: 2, textTransform: 'capitalize' }}>
                        {group.role} · {group.member_count} {group.member_count === 1 ? 'member' : 'members'}
                      </Text>
                    </View>
                    <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
                  </View>

                  <View
                    style={{
                      flexDirection: 'row',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      marginTop: spacing.md,
                      paddingTop: spacing.md,
                      borderTopWidth: 1,
                      borderTopColor: colors.border,
                      gap: spacing.md
                    }}
                  >
                    {names.length > 0 ? (
                      <AvatarStack names={names} size={30} max={4} borderColor={colors.surface} />
                    ) : (
                      <Text variant="caption" color={colors.textMuted}>
                        {details ? 'Invite your first member' : 'Loading members…'}
                      </Text>
                    )}
                    <View
                      style={{
                        flexDirection: 'row',
                        alignItems: 'center',
                        gap: 5,
                        paddingHorizontal: spacing.md,
                        paddingVertical: 7,
                        borderRadius: radius.pill,
                        backgroundColor: !details || settled
                          ? colors.surfaceSunken
                          : net > 0
                            ? colors.successSoft
                            : colors.dangerSoft
                      }}
                    >
                      <Text
                        variant="caption"
                        weight="bold"
                        color={!details || settled ? colors.textMuted : net > 0 ? colors.success : colors.danger}
                      >
                        {!details ? 'Loading balance…' : settled ? 'Settled up' : net > 0 ? 'You are owed' : 'You owe'}
                      </Text>
                      {details && !settled ? (
                        <Money
                          paise={Math.abs(net)}
                          size="small"
                          color={net > 0 ? colors.success : colors.danger}
                        />
                      ) : null}
                    </View>
                  </View>
                </Card>
                </PressableScale>
              </Animated.View>
            );
          })
        )}
      </ScrollView>

      <BottomSheet
        visible={createVisible}
        onClose={() => {
          if (!creating) setCreateVisible(false);
        }}
        title="Create a group"
        subtitle="Give it a name your people will recognise."
        footer={
          <Button
            label={creating ? 'Creating…' : 'Create group'}
            onPress={() => void handleCreate()}
            loading={creating}
            style={{ marginBottom: spacing.sm }}
          />
        }
      >
        <Input
          label="Group name"
          value={name}
          onChangeText={setName}
          placeholder="Flat 4B, Goa trip, Sunday brunch"
          maxLength={80}
          returnKeyType="done"
          onSubmitEditing={() => void handleCreate()}
          autoFocus
        />
        {sheetError ? <ErrorBanner message={sheetError} title="Could not create group" /> : null}
      </BottomSheet>

      <BottomSheet
        visible={joinVisible}
        onClose={() => {
          if (!joining) setJoinVisible(false);
        }}
        title="Join a group"
        subtitle="Paste the invite code someone shared with you."
        footer={
          <Button
            label={joining ? 'Joining…' : 'Join group'}
            onPress={() => void handleJoin()}
            loading={joining}
            style={{ marginBottom: spacing.sm }}
          />
        }
      >
        <Input
          label="Invite code"
          value={inviteCode}
          onChangeText={setInviteCode}
          placeholder="e.g. 7f3k9q"
          autoCapitalize="characters"
          autoCorrect={false}
          autoFocus
          returnKeyType="done"
          onSubmitEditing={() => void handleJoin()}
        />
        {sheetError ? <ErrorBanner message={sheetError} title="Could not join group" /> : null}
      </BottomSheet>
    </Screen>
  );
}
