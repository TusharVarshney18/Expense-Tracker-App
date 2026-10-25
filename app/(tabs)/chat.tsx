import React, { useCallback, useState } from 'react';
import { Alert, FlatList, RefreshControl, View } from 'react-native';
import { Link, useFocusEffect, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import Animated, { FadeInDown } from 'react-native-reanimated';

import {
  Avatar,
  EmptyState,
  ErrorBanner,
  Input,
  Button,
  PressableScale,
  Screen,
  SkeletonList,
  Text
} from '@/components/ui';
import { useAuth } from '@/context/AuthProvider';
import { useConversations } from '@/hooks/useConversations';
import { formatDate } from '@/lib/format';
import { useTheme } from '@/theme';
import { blockUser, reportUser, searchProfiles } from '@/services/moderation';
import { notifyMessageRequest, respondToConversation, startConversation } from '@/services/chat';
import { ReportModal } from '@/components/ReportModal';
import type { Conversation, ReportReason } from '@/types';

interface PersonRow {
  id: string;
  full_name: string | null;
  avatar_url: string | null;
}

export default function ChatListScreen() {
  const { user } = useAuth();
  const userId = user?.id;
  const router = useRouter();
  const { colors, spacing, radius, layout } = useTheme();
  const { conversations, incomingRequests, pendingRequestCount, loading, error, reload } = useConversations();

  const [query, setQuery] = useState('');
  const [results, setResults] = useState<PersonRow[]>([]);
  const [searchedQuery, setSearchedQuery] = useState<string | null>(null);
  const [searchError, setSearchError] = useState<string | null>(null);
  const [searching, setSearching] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [firstMessage, setFirstMessage] = useState('');
  const [workingId, setWorkingId] = useState<string | null>(null);
  const [reportTarget, setReportTarget] = useState<Conversation | null>(null);

  useFocusEffect(
    useCallback(() => {
      void reload();
    }, [reload])
  );

  const runSearch = useCallback(async () => {
    if (!userId) return;
    if (!query.trim()) return;
    setSearching(true);
    setSearchError(null);
    try {
      const res = await searchProfiles(query, userId);
      setResults(res);
      setSearchedQuery(query.trim());
    } catch (err: unknown) {
      setSearchError(
        err instanceof Error
          ? err.message
          : typeof err === 'object' && err !== null && 'message' in err && typeof (err as { message: unknown }).message === 'string'
            ? (err as { message: string }).message
            : 'Failed to search users.'
      );
    } finally {
      setSearching(false);
    }
  }, [query, userId]);

  const openChat = useCallback(
    (id: string) => {
      setQuery('');
      setResults([]);
      setSearchedQuery(null);
      setSearchError(null);
      router.push({ pathname: '/chat/[id]', params: { id } });
    },
    [router]
  );

  const beginConversation = useCallback(async (person: PersonRow) => {
    if (!firstMessage.trim()) {
      setSearchError('Write a first message before sending a request.');
      return;
    }
    setWorkingId(person.id);
    try {
      const started = await startConversation(person.id, firstMessage);
      if (started.created) {
        try { await notifyMessageRequest(started.conversationId); }
        catch (pushError: unknown) { console.warn('[chat] request notification failed', pushError); }
      }
      setFirstMessage('');
      openChat(person.id);
      await reload();
    } catch (err: unknown) {
      setSearchError(err instanceof Error ? err.message : 'Could not start a conversation.');
    } finally { setWorkingId(null); }
  }, [firstMessage, openChat, reload]);

  const handleRequest = useCallback(async (item: Conversation, accept: boolean) => {
    setWorkingId(item.id);
    try {
      await respondToConversation(item.id, accept);
      await reload();
      if (accept) openChat(item.partner.id);
    } catch (err: unknown) {
      Alert.alert('Could not update request', err instanceof Error ? err.message : 'Please try again.');
    } finally { setWorkingId(null); }
  }, [openChat, reload]);

  const openRequestMenu = useCallback((item: Conversation) => {
    Alert.alert(item.partner.full_name ?? 'Member', 'Request options', [
      { text: 'Block', style: 'destructive', onPress: () => Alert.alert('Block this user?', 'Their pending request will be declined.', [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Block', style: 'destructive', onPress: () => {
          void blockUser(item.partner.id).then(reload).catch((err: unknown) => Alert.alert('Could not block', err instanceof Error ? err.message : 'Please try again.'));
        } }
      ]) },
      { text: 'Report', onPress: () => setReportTarget(item) },
      { text: 'Cancel', style: 'cancel' }
    ]);
  }, [reload]);

  const submitRequestReport = useCallback(async (reason: ReportReason, details: string) => {
    if (!reportTarget) return;
    await reportUser({ reportedUserId: reportTarget.partner.id, conversationId: reportTarget.id, reason, details });
    setReportTarget(null);
    Alert.alert('Report submitted', 'Thank you. We review every report.');
  }, [reportTarget]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await reload();
    setRefreshing(false);
  }, [reload]);

  const header = (
    <View>
      <View style={{ flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between' }}>
        <View>
          <Text variant="title" color={colors.text}>
            Chats
          </Text>
          <Text variant="body" color={colors.textMuted} style={{ marginTop: 4 }}>
            Private one-to-one conversations.
          </Text>
        </View>
        <View
          style={{
            width: 42,
            height: 42,
            borderRadius: 21,
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: colors.primarySoft
          }}
        >
          <Ionicons name="lock-closed" size={18} color={colors.primary} />
        </View>
      </View>

      <View style={{ marginTop: spacing.lg }}>
        <Input
          value={query}
          onChangeText={(text) => {
            setQuery(text);
            if (!text.trim()) {
              setResults([]);
              setSearchedQuery(null);
              setSearchError(null);
            }
          }}
          placeholder="Search by name or email"
          autoCapitalize="none"
          autoCorrect={false}
          returnKeyType="search"
          onSubmitEditing={() => void runSearch()}
          icon="search-outline"
          containerStyle={{ marginBottom: 0 }}
          right={
            <PressableScale
              onPress={() => void runSearch()}
              accessibilityLabel="Search people"
              disabled={searching || !query.trim()}
              style={{
                width: 44,
                height: 44,
                borderRadius: 22,
                alignItems: 'center',
                justifyContent: 'center',
                backgroundColor: query.trim() ? colors.primary : colors.surfaceSunken
              }}
            >
              <Ionicons name="arrow-forward" size={17} color={query.trim() ? colors.onPrimary : colors.textMuted} />
            </PressableScale>
          }
        />
        <Input
          value={firstMessage}
          onChangeText={setFirstMessage}
          placeholder="Write the first message to send a request"
          multiline
          containerStyle={{ marginTop: spacing.sm }}
        />
      </View>

      {searchError ? (
        <View style={{ marginTop: spacing.md }}>
          <ErrorBanner message={searchError} title="Search failed" onRetry={() => void runSearch()} />
        </View>
      ) : null}

      {searching ? (
        <View style={{ marginTop: spacing.md }}>
          <SkeletonList rows={2} />
        </View>
      ) : results.length > 0 ? (
        <View style={{ marginTop: spacing.lg }}>
          <Text variant="label" color={colors.textMuted} style={{ marginBottom: spacing.sm }}>
            Search results
          </Text>
          {results.map((person) => (
            <PressableScale
              key={person.id}
              onPress={() => void beginConversation(person)}
              disabled={workingId === person.id || !firstMessage.trim()}
              accessibilityLabel={`Send a request to ${person.full_name ?? 'member'}`}
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                gap: spacing.md,
                padding: spacing.md,
                borderRadius: radius.card,
                backgroundColor: colors.surface,
                borderWidth: 1,
                borderColor: colors.border,
                marginBottom: spacing.sm
              }}
            >
              <Avatar name={person.full_name ?? 'Member'} size={42} />
              <View style={{ flex: 1 }}>
                <Text variant="bodyStrong" color={colors.text} numberOfLines={1} ellipsizeMode="tail">
                  {person.full_name ?? 'Unnamed user'}
                </Text>
                <Text variant="caption" color={colors.textMuted} numberOfLines={1} ellipsizeMode="tail" style={{ marginTop: 2 }}>
                  {query.trim().includes('@') ? 'Matched by email' : 'Expense Counter user'}
                </Text>
              </View>
              <Ionicons name="chevron-forward" size={17} color={colors.textMuted} />
            </PressableScale>
          ))}
        </View>
      ) : searchedQuery ? (
        <View
          style={{
            marginTop: spacing.lg,
            padding: spacing.md,
            borderRadius: radius.input,
            backgroundColor: colors.surfaceSunken
          }}
        >
          <Text variant="caption" color={colors.textMuted}>
            No registered users found matching “{searchedQuery}”.
          </Text>
        </View>
      ) : null}

      {pendingRequestCount > 0 ? (
        <View style={{ marginTop: spacing.lg }}>
          <Text variant="label" color={colors.textMuted} style={{ marginBottom: spacing.sm }}>
            Requests ({pendingRequestCount})
          </Text>
          {incomingRequests.map((item) => (
            <View key={item.id} style={{ padding: spacing.md, borderRadius: radius.card, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, marginBottom: spacing.sm }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.md }}>
                <Avatar name={item.partner.full_name ?? 'Member'} size={42} />
                <View style={{ flex: 1 }}>
                  <Text variant="bodyStrong" color={colors.text} numberOfLines={1} ellipsizeMode="tail">{item.partner.full_name ?? 'Member'}</Text>
                  <Text variant="caption" color={colors.textMuted} numberOfLines={1} ellipsizeMode="tail">{item.lastMessage?.body ?? 'Message request'}</Text>
                </View>
                <PressableScale
                  onPress={() => openRequestMenu(item)}
                  accessibilityLabel="Request options"
                  style={{ width: 44, height: 44, borderRadius: 22, backgroundColor: colors.surfaceSunken }}
                >
                  <Ionicons name="ellipsis-vertical" size={18} color={colors.textMuted} />
                </PressableScale>
              </View>
              <View style={{ flexDirection: 'row', justifyContent: 'flex-end', gap: spacing.sm, marginTop: spacing.sm }}>
                <Button label="Decline" variant="secondary" size="sm" onPress={() => void handleRequest(item, false)} loading={workingId === item.id} fullWidth={false} />
                <Button label="Accept" size="sm" onPress={() => void handleRequest(item, true)} loading={workingId === item.id} fullWidth={false} />
              </View>
            </View>
          ))}
        </View>
      ) : null}

      {error ? <ErrorBanner title="Could not load chats" message={error} onRetry={() => void reload()} /> : null}

      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginTop: spacing.xl,
          marginBottom: spacing.sm
        }}
      >
        <Text variant="subtitle" color={colors.text}>
          Chats
        </Text>
        {conversations.length > 0 ? (
          <Text variant="caption" color={colors.textMuted}>
            {conversations.length}
          </Text>
        ) : null}
      </View>
    </View>
  );

  return (
    <Screen padded={false}>
      <FlatList
        data={conversations}
        keyExtractor={(item) => item.id}
        contentContainerStyle={{
          paddingHorizontal: layout.screenPadding,
          paddingTop: spacing.sm,
          paddingBottom: layout.tabBarContentInset + 28
        }}
        showsVerticalScrollIndicator={false}
        ListHeaderComponent={header}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={colors.primary}
            colors={[colors.primary]}
            progressBackgroundColor={colors.surface}
          />
        }
        renderItem={({ item, index }) => {
          const last = item.lastMessage;
          const unread = last ? last.receiver_id === userId && !last.read_at : false;
          const name = item.partner.full_name ?? 'Member';
          return (
            <Animated.View entering={FadeInDown.delay(Math.min(index, 7) * 35).duration(260)}>
            <PressableScale
              onPress={() => openChat(item.partner.id)}
              accessibilityLabel={`Chat with ${name}`}
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                gap: spacing.md,
                paddingVertical: spacing.md,
                borderBottomWidth: 1,
                borderBottomColor: colors.border
              }}
            >
              <Avatar name={name} size={48} ring={unread} />
              <View style={{ flex: 1 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: spacing.sm }}>
                  <Text variant="bodyStrong" color={colors.text} numberOfLines={1} ellipsizeMode="tail" style={{ flex: 1, minWidth: 0 }}>
                    {name}
                  </Text>
                  <Text variant="caption" color={unread ? colors.primary : colors.textMuted} weight={unread ? 'bold' : 'medium'}>
                    {last ? formatDate(last.created_at) : ''}
                  </Text>
                </View>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginTop: 3 }}>
                  <Text
                    variant="caption"
                    color={unread ? colors.textSecondary : colors.textMuted}
                    numberOfLines={1}
                    style={{ flex: 1 }}
                  >
                    {item.status === 'pending' ? `Waiting for ${name} to accept` : item.status === 'declined' ? 'Request declined' : last ? last.body : 'No messages yet'}
                  </Text>
                  {unread ? (
                    <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: colors.primary }} />
                  ) : null}
                </View>
              </View>
            </PressableScale>
            </Animated.View>
          );
        }}
        ListEmptyComponent={
          loading ? (
            <SkeletonList rows={4} />
          ) : (
            <EmptyState
              icon="chatbubbles-outline"
              title="No conversations yet"
              message="Search for someone above to start a private chat. Only the two of you can read it."
            />
          )
        }
        ListFooterComponent={
          <View style={{ alignItems: 'center', marginTop: spacing.xl }}>
            <Link href="/settings" style={{ color: colors.textMuted, fontSize: 12 }}>
              Manage blocked users in Settings
            </Link>
          </View>
        }
      />
      <ReportModal
        visible={reportTarget !== null}
        onClose={() => setReportTarget(null)}
        onSubmit={submitRequestReport}
      />
    </Screen>
  );
}
