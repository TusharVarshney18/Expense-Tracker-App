import { useCallback, useEffect, useRef, useState } from 'react';
import type { RealtimeChannel } from '@supabase/supabase-js';

import { supabase } from '@/lib/supabase';
import { cacheMessages, getLocalMessages } from '@/lib/db';
import { useAuth } from '@/context/AuthProvider';
import type { Message } from '@/types';

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
  const [loading, setLoading] = useState(true);
  const [blockedIds, setBlockedIds] = useState<string[]>([]);
  const channelRef = useRef<RealtimeChannel | null>(null);

  const loadBlocked = useCallback(async () => {
    const { data } = await supabase.from('blocks').select('blocked_id');
    setBlockedIds((data ?? []).map((r) => r.blocked_id as string));
  }, []);

  const load = useCallback(async () => {
    if (!selfId || !partnerId) {
      setMessages([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('messages')
        .select('*')
        .or(
          `and(sender_id.eq.${selfId},receiver_id.eq.${partnerId}),` +
            `and(sender_id.eq.${partnerId},receiver_id.eq.${selfId})`
        )
        .order('created_at', { ascending: true });
      if (error) throw error;
      setMessages((data as Message[]) ?? []);
      await cacheMessages((data as Message[]) ?? []);
    } catch {
      setMessages(await getLocalMessages(partnerId, selfId));
    } finally {
      setLoading(false);
    }
  }, [selfId, partnerId]);

  useEffect(() => {
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
      if (blockedIds.includes(partnerId)) {
        throw new Error('You have blocked this user. Unblock them to send messages.');
      }

      const { data, error } = await supabase
        .from('messages')
        .insert({ sender_id: selfId, receiver_id: partnerId, body: text })
        .select()
        .single();
      if (error) throw error;

      const created = data as Message;
      setMessages((prev) =>
        prev.some((m) => m.id === created.id) ? prev : [...prev, created]
      );
    },
    [selfId, partnerId, blockedIds]
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

  const isPartnerBlocked = partnerId ? blockedIds.includes(partnerId) : false;

  return {
    messages,
    loading,
    isPartnerBlocked,
    sendMessage,
    markRead,
    reload: load,
    reloadBlocked: loadBlocked
  };
}
