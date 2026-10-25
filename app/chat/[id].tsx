import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  Alert,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  TextInput,
  View
} from 'react-native';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { format, isSameDay, isToday, isYesterday, parseISO } from 'date-fns';

import { MessageBubble } from '@/components/MessageBubble';
import { ReportModal } from '@/components/ReportModal';
import {
  EmptyState,
  ErrorBanner,
  IconButton,
  PressableScale,
  Screen,
  SkeletonList,
  Text
} from '@/components/ui';
import { useAuth } from '@/context/AuthProvider';
import { useBlockedUsers } from '@/hooks/useBlockedUsers';
import { useMessages } from '@/hooks/useMessages';
import { hapticError } from '@/lib/haptics';
import { supabase } from '@/lib/supabase';
import { reportUser } from '@/services/moderation';
import { useTheme } from '@/theme';
import type { Message, ReportReason } from '@/types';

function dayLabel(value: string): string {
  const date = parseISO(value);
  if (isToday(date)) return 'Today';
  if (isYesterday(date)) return 'Yesterday';
  return format(date, 'EEEE, d MMM');
}

function sameRun(a: Message | undefined, b: Message | undefined): boolean {
  if (!a || !b) return false;
  if (a.sender_id !== b.sender_id) return false;
  return Math.abs(parseISO(b.created_at).getTime() - parseISO(a.created_at).getTime()) < 5 * 60 * 1000;
}

export default function ChatScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const partnerId = id ?? null;
  const router = useRouter();
  const { user } = useAuth();
  const { colors, spacing, radius, fonts } = useTheme();

  const { messages, conversation, error: messagesError, sendMessage, loading, reload } = useMessages(partnerId);
  const { blockedIds, block, unblock, refresh } = useBlockedUsers();

  const [partnerName, setPartnerName] = useState('Chat');
  const [draft, setDraft] = useState('');
  const [sending, setSending] = useState(false);
  const [reportVisible, setReportVisible] = useState(false);
  const listRef = useRef<FlatList<Message>>(null);

  const isBlocked = partnerId ? blockedIds.includes(partnerId) : false;
  const isPending = conversation?.status === 'pending';
  const isDeclined = conversation?.status === 'declined';
  const canSend = Boolean(conversation?.status === 'accepted') && !isBlocked;
  const composerNote = isBlocked
    ? 'Unblock to send messages'
    : isPending
      ? 'Request sent — waiting for them to accept'
      : isDeclined
        ? 'This conversation was declined'
        : !conversation
          ? 'Start the conversation from Chats'
          : 'Message';

  useEffect(() => {
    if (!partnerId) return;
    void (async () => {
      const { data } = await supabase
        .from('profiles')
        .select('full_name')
        .eq('id', partnerId)
        .maybeSingle();
      setPartnerName(data?.full_name ?? 'Chat');
    })();
  }, [partnerId]);

  useEffect(() => {
    const timer = setTimeout(() => listRef.current?.scrollToEnd({ animated: false }), 100);
    return () => clearTimeout(timer);
  }, [messages.length]);

  const handleSend = useCallback(async () => {
    const text = draft.trim();
    if (!text) return;
    setSending(true);
    try {
      await sendMessage(text);
      setDraft('');
    } catch (err) {
      hapticError();
      Alert.alert('Message not sent', err instanceof Error ? err.message : 'Try again.');
    } finally {
      setSending(false);
    }
  }, [draft, sendMessage]);

  const handleReport = useCallback(
    async (reason: ReportReason, details: string) => {
      if (!partnerId) return;
      await reportUser({
        reportedUserId: partnerId,
        conversationId: conversation?.id,
        reason,
        details: details || null
      });
      Alert.alert('Report submitted', 'Thank you. We review every report.');
    },
    [partnerId, conversation?.id]
  );

  const handleBlockToggle = useCallback(() => {
    if (!partnerId) return;
    if (isBlocked) {
      Alert.alert('Unblock user', 'You will see each other\'s messages again.', [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Unblock',
          onPress: () => {
            void unblock(partnerId)
              .then(() => reload())
              .catch((err) =>
                Alert.alert('Error', err instanceof Error ? err.message : 'Could not unblock.')
              );
          }
        }
      ]);
      return;
    }
    Alert.alert(
      'Block user',
      'They will no longer be able to message you, and messages between you will be hidden.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Block',
          style: 'destructive',
          onPress: () => {
            void block(partnerId)
              .then(() => {
                void refresh();
                router.back();
              })
              .catch((err) =>
                Alert.alert('Error', err instanceof Error ? err.message : 'Could not block.')
              );
          }
        }
      ]
    );
  }, [partnerId, isBlocked, block, unblock, refresh, reload, router]);

  const openMenu = useCallback(() => {
    Alert.alert(partnerName, undefined, [
      { text: 'Report message or user', onPress: () => setReportVisible(true) },
      {
        text: isBlocked ? 'Unblock user' : 'Block user',
        style: isBlocked ? 'default' : 'destructive',
        onPress: handleBlockToggle
      },
      { text: 'Cancel', style: 'cancel' }
    ]);
  }, [partnerName, isBlocked, handleBlockToggle]);

  return (
    <Screen edges={['left', 'right', 'bottom']} padded={false}>
      <Stack.Screen
        options={{
          title: partnerName,
          headerRight: () => (
            <IconButton
              icon="ellipsis-vertical"
              label="Conversation options"
              variant="ghost"
              onPress={openMenu}
            />
          )
        }}
      />

      {isBlocked ? (
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            gap: spacing.sm,
            backgroundColor: colors.dangerSoft,
            paddingHorizontal: spacing.lg,
            paddingVertical: spacing.sm,
            borderBottomWidth: 1,
            borderBottomColor: colors.border
          }}
        >
          <Ionicons name="ban" size={16} color={colors.danger} />
          <Text variant="caption" color={colors.danger} style={{ flex: 1 }}>
            You blocked this user. Messages are hidden and you cannot send more.
          </Text>
        </View>
      ) : isPending ? (
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            gap: spacing.sm,
            backgroundColor: colors.warningSoft,
            paddingHorizontal: spacing.lg,
            paddingVertical: spacing.sm,
            borderBottomWidth: 1,
            borderBottomColor: colors.border
          }}
        >
          <Ionicons name="paper-plane-outline" size={16} color={colors.warning} />
          <Text variant="caption" color={colors.warning} style={{ flex: 1 }}>
            {conversation?.requested_by === user?.id
              ? `Waiting for ${partnerName} to accept your message request.`
              : 'Accept this request from the Chats tab before replying.'}
          </Text>
        </View>
      ) : isDeclined ? (
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            gap: spacing.sm,
            backgroundColor: colors.surfaceSunken,
            paddingHorizontal: spacing.lg,
            paddingVertical: spacing.sm,
            borderBottomWidth: 1,
            borderBottomColor: colors.border
          }}
        >
          <Ionicons name="close-circle-outline" size={16} color={colors.textMuted} />
          <Text variant="caption" color={colors.textMuted} style={{ flex: 1 }}>
            {conversation?.requested_by === user?.id
              ? `${partnerName} declined your message request.`
              : 'This message request was declined.'}
          </Text>
        </View>
      ) : null}

      {messagesError ? (
        <View style={{ paddingHorizontal: spacing.lg, paddingTop: spacing.sm }}>
          <ErrorBanner message={messagesError} title="Could not sync messages" onRetry={() => void reload()} />
        </View>
      ) : null}

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 92 : 0}
      >
        <FlatList
          ref={listRef}
          data={messages}
          keyExtractor={(item) => item.id}
          contentContainerStyle={{
            paddingHorizontal: spacing.lg,
            paddingTop: spacing.sm,
            paddingBottom: spacing.md,
            flexGrow: 1
          }}
          onContentSizeChange={() => listRef.current?.scrollToEnd({ animated: false })}
          renderItem={({ item, index }) => {
            const previous = messages[index - 1];
            const next = messages[index + 1];
            const firstInGroup = !sameRun(previous, item);
            const lastInGroup = !sameRun(item, next);
            const showDay = !previous || !isSameDay(parseISO(previous.created_at), parseISO(item.created_at));
            return (
              <View>
                {showDay ? (
                  <View style={{ alignItems: 'center', marginVertical: spacing.md }}>
                    <View
                      style={{
                        paddingHorizontal: spacing.md,
                        paddingVertical: 4,
                        borderRadius: radius.pill,
                        backgroundColor: colors.surfaceSunken
                      }}
                    >
                      <Text variant="caption" color={colors.textMuted} style={{ fontSize: 10 }}>
                        {dayLabel(item.created_at)}
                      </Text>
                    </View>
                  </View>
                ) : null}
                <MessageBubble
                  message={item}
                  isOwn={item.sender_id === user?.id}
                  firstInGroup={firstInGroup}
                  lastInGroup={lastInGroup}
                  senderName={partnerName}
                  onLongPress={() => {
                    if (item.sender_id !== user?.id) setReportVisible(true);
                  }}
                />
              </View>
            );
          }}
          ListEmptyComponent={
            loading ? (
              <SkeletonList rows={4} avatar={false} />
            ) : (
              <EmptyState
                icon="chatbubble-ellipses-outline"
                title="No messages yet"
                message="Say hello. Long-press a message to report it."
              />
            )
          }
        />

        <View
          style={{
            flexDirection: 'row',
            alignItems: 'flex-end',
            paddingHorizontal: spacing.md,
            paddingTop: spacing.sm,
            paddingBottom: spacing.sm,
            borderTopWidth: 1,
            borderTopColor: colors.border,
            backgroundColor: colors.background,
            gap: spacing.sm
          }}
        >
          <View
            style={{
              flex: 1,
              flexDirection: 'row',
              alignItems: 'flex-end',
              borderRadius: radius.pill,
              backgroundColor: colors.surface,
              borderWidth: 1,
              borderColor: colors.border,
              paddingHorizontal: spacing.md,
              minHeight: 48
            }}
          >
            <TextInput
              style={{
                flex: 1,
                minHeight: 46,
                maxHeight: 120,
                paddingTop: 12,
                paddingBottom: 12,
                fontFamily: fonts.regular,
                fontSize: 15,
                lineHeight: 21,
                color: colors.text
              }}
              value={draft}
              onChangeText={setDraft}
              placeholder={composerNote}
              placeholderTextColor={colors.textMuted}
              editable={canSend}
              multiline
              selectionColor={colors.primary}
              accessibilityLabel="Message"
            />
          </View>
          <PressableScale
            onPress={() => void handleSend()}
            disabled={!draft.trim() || !canSend || sending}
            accessibilityLabel="Send message"
            accessibilityState={{ disabled: !draft.trim() || !canSend || sending }}
            style={{
              width: 48,
              height: 48,
              borderRadius: 24,
              backgroundColor: draft.trim() && canSend ? colors.primary : colors.surfaceSunken
            }}
          >
            <Ionicons
              name="arrow-up"
              size={22}
              color={draft.trim() && canSend ? colors.onPrimary : colors.textMuted}
            />
          </PressableScale>
        </View>
      </KeyboardAvoidingView>

      <ReportModal
        visible={reportVisible}
        onClose={() => setReportVisible(false)}
        onSubmit={handleReport}
      />
    </Screen>
  );
}
