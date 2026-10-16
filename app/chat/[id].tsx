import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  Alert,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View
} from 'react-native';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

import { Screen } from '@/components/Screen';
import { MessageBubble } from '@/components/MessageBubble';
import { ReportModal } from '@/components/ReportModal';
import { EmptyState } from '@/components/EmptyState';
import { useAuth } from '@/context/AuthProvider';
import { useMessages } from '@/hooks/useMessages';
import { useBlockedUsers } from '@/hooks/useBlockedUsers';
import { reportUser, blockUser } from '@/services/moderation';
import { supabase } from '@/lib/supabase';
import { COLORS } from '@/lib/constants';
import type { Message, ReportReason } from '@/types';

export default function ChatScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const partnerId = id ?? null;
  const router = useRouter();
  const { user } = useAuth();

  const { messages, sendMessage, loading, reload } = useMessages(partnerId);
  const { blockedIds, block, unblock, refresh } = useBlockedUsers();

  const [partnerName, setPartnerName] = useState('Chat');
  const [draft, setDraft] = useState('');
  const [sending, setSending] = useState(false);
  const [reportVisible, setReportVisible] = useState(false);
  const listRef = useRef<FlatList<Message>>(null);

  const isBlocked = partnerId ? blockedIds.includes(partnerId) : false;

  useEffect(() => {
    if (!partnerId) return;
    void (async () => {
      const { data } = await supabase
        .from('profiles')
        .select('full_name, email')
        .eq('id', partnerId)
        .maybeSingle();
      setPartnerName(data?.full_name ?? data?.email ?? 'Chat');
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
        reason,
        details: details || null
      });
      Alert.alert('Report submitted', 'Thank you. We review every report.');
    },
    [partnerId]
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
            <Pressable onPress={openMenu} hitSlop={12} accessibilityLabel="Conversation options">
              <Ionicons name="ellipsis-vertical" size={22} color={COLORS.primaryDark} />
            </Pressable>
          )
        }}
      />

      {isBlocked ? (
        <View style={styles.blockedBanner}>
          <Ionicons name="ban" size={16} color={COLORS.danger} />
          <Text style={styles.blockedBannerText}>
            You blocked this user. Messages are hidden and you cannot send more.
          </Text>
        </View>
      ) : null}

      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
      >
        <FlatList
          ref={listRef}
          data={messages}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.messages}
          onContentSizeChange={() => listRef.current?.scrollToEnd({ animated: false })}
          renderItem={({ item }) => (
            <MessageBubble
              message={item}
              isOwn={item.sender_id === user?.id}
              onLongPress={() => {
                if (item.sender_id !== user?.id) setReportVisible(true);
              }}
            />
          )}
          ListEmptyComponent={
            loading ? null : (
              <EmptyState
                icon="chatbubble-ellipses-outline"
                title="No messages yet"
                message="Say hello. Long-press a message to report it."
              />
            )
          }
        />

        <View style={styles.composer}>
          <TextInput
            style={styles.input}
            value={draft}
            onChangeText={setDraft}
            placeholder={isBlocked ? 'Unblock to send messages' : 'Message'}
            placeholderTextColor={COLORS.textMuted}
            editable={!isBlocked}
            multiline
          />
          <Pressable
            style={[styles.send, (!draft.trim() || isBlocked || sending) && styles.sendDisabled]}
            onPress={() => void handleSend()}
            disabled={!draft.trim() || isBlocked || sending}
            accessibilityLabel="Send message"
          >
            <Ionicons name="send" size={20} color={COLORS.textInverse} />
          </Pressable>
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

const styles = StyleSheet.create({
  flex: { flex: 1 },
  messages: { padding: 16, paddingBottom: 8, flexGrow: 1 },
  blockedBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#FEF2F2',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: COLORS.border
  },
  blockedBannerText: { color: COLORS.danger, fontSize: 13, flex: 1 },
  composer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    padding: 12,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: COLORS.border,
    backgroundColor: COLORS.surface,
    gap: 10
  },
  input: {
    flex: 1,
    minHeight: 44,
    maxHeight: 120,
    borderRadius: 22,
    backgroundColor: COLORS.background,
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 12,
    fontSize: 15,
    color: COLORS.text
  },
  send: {
    width: 46,
    height: 46,
    borderRadius: 23,
    backgroundColor: COLORS.primary,
    alignItems: 'center',
    justifyContent: 'center'
  },
  sendDisabled: { backgroundColor: COLORS.textMuted }
});
