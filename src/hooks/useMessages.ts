import { useCallback, useEffect, useRef, useState } from 'react';
import type { RealtimeChannel } from '@supabase/supabase-js';

import { supabase } from '@/lib/supabase';
import { cacheMessages, getLocalMessages } from '@/lib/db';
import { useAuth } from '@/context/AuthProvider';
import type { Conversation, Message } from '@/types';

interface ConversationLookup extends Pick<Conversation, 'id' | 'status' | 'requested_by'> {
  user_low_id: string;
  user_high_id: string;
}

/**
 * Loads and live-subscribes to the 1:1 conversation between the signed-in user
 * and `partnerId`. Messages exchanged with a blocked user (in either direction)
 * are filtered out by the messages RLS SELECT policy, so they never reach the
 * client. A defensive client-side filter is applied as well.
 */
export function useMessages(partnerId: string | null) {
  const { user } = useAuth();
  const selfId = user?.id ?? null;

  const [messages, setMessages] = useState<Message[]>([]);
  const [messagesForKey, setMessagesForKey] = useState<string | null>(null);
  const [conversation, setConversation] = useState<ConversationLookup | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [blockedIds, setBlockedIds] = useState<string[]>([]);
  const [blockedForUserId, setBlockedForUserId] = useState<string | null>(null);
  const channelRef = useRef<RealtimeChannel | null>(null);
  const requestKey = selfId && partnerId ? `${selfId}:${partnerId}` : null;

  const loadBlocked = useCallback(async () => {
    if (!selfId) {
      setBlockedIds([]);
      setBlockedForUserId(null);
      return;
    }
    const { data } = await supabase.from('blocks').select('blocked_id');
    setBlockedIds((data ?? []).map((r) => r.blocked_id as string));
    setBlockedForUserId(selfId);
  }, [selfId]);

  const load = useCallback(async () => {
    if (!selfId || !partnerId) {
      setMessages([]);
      setMessagesForKey(null);
      setConversation(null);
      setLoading(false);
      return;
    }
    setMessages([]);
    setMessagesForKey(requestKey);
    setLoading(true);
    setError(null);
    try {
      const { data: conversationData, error: conversationError } = await supabase
        .from('conversations')
        .select('id,user_low_id,user_high_id,status,requested_by')
        .or(`and(user_low_id.eq.${selfId},user_high_id.eq.${partnerId}),and(user_low_id.eq.${partnerId},user_high_id.eq.${selfId})`)
        .maybeSingle();
      if (conversationError) throw conversationError;
      if (!conversationData) {
        setConversation(null);
        setMessages([]);
        return;
      }
      const found = conversationData as ConversationLookup;
      setConversation(found);
      const { data, error } = await supabase
        .from('messages')
        .select('*')
        .eq('conversation_id', found.id)
        .order('created_at', { ascending: true });
      if (error) throw error;
      setMessages((data as Message[]) ?? []);
      await cacheMessages((data as Message[]) ?? []);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Could not load messages.');
      setMessages(await getLocalMessages(partnerId, selfId));
    } finally {
      setLoading(false);
    }
  }, [selfId, partnerId, requestKey]);

  useEffect(() => {
    // These effects start async data loads; the state updates belong to those requests.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void load();
    void loadBlocked();
  }, [load, loadBlocked]);

  useEffect(() => {
    if (!selfId || !partnerId) return;

    const channel = supabase
      .channel(`messages:${selfId}:${partnerId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
          filter: `receiver_id=eq.${selfId}`
        },
        (payload) => {
          const incoming = payload.new as Message;
          if (incoming.sender_id !== partnerId) return;
          setMessages((prev) =>
            prev.some((m) => m.id === incoming.id) ? prev : [...prev, incoming]
          );
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
          filter: `sender_id=eq.${selfId}`
        },
        (payload) => {
          const outgoing = payload.new as Message;
          if (outgoing.receiver_id !== partnerId) return;
          setMessages((prev) =>
            prev.some((m) => m.id === outgoing.id) ? prev : [...prev, outgoing]
          );
        }
      )
      .subscribe();

    channelRef.current = channel;
    return () => {
      channelRef.current = null;
      void supabase.removeChannel(channel);
    };
  }, [selfId, partnerId]);

  const sendMessage = useCallback(
    async (body: string) => {
      const text = body.trim();
      if (!selfId || !partnerId) throw new Error('No conversation selected.');
      if (!text) return;
      if (blockedForUserId === selfId && blockedIds.includes(partnerId)) {
        throw new Error('You have blocked this user. Unblock them to send messages.');
      }

      if (!conversation) throw new Error('Conversation not found. Start a request first.');
      const { error } = await supabase.rpc('send_conversation_message', {
        p_conversation_id: conversation.id,
        p_body: text
      });
      if (error) throw error;
      await load();
    },
    [selfId, partnerId, blockedIds, blockedForUserId, conversation, load]
  );

  const markRead = useCallback(
    async (messageId: string) => {
      await supabase
        .from('messages')
        .update({ read_at: new Date().toISOString() })
        .eq('id', messageId)
        .is('read_at', null);
    },
    []
  );

  const isPartnerBlocked = partnerId && blockedForUserId === selfId
    ? blockedIds.includes(partnerId)
    : false;
  const visibleMessages = messagesForKey === requestKey ? messages : [];
  const visibleConversation = messagesForKey === requestKey ? conversation : null;

  return {
    messages: visibleMessages,
    conversation: visibleConversation,
    error,
    loading,
    isPartnerBlocked,
    sendMessage,
    markRead,
    reload: load,
    reloadBlocked: loadBlocked
  };
}
