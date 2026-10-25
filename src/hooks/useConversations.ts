import { useCallback, useEffect, useState } from 'react';
import type { RealtimeChannel } from '@supabase/supabase-js';

import { supabase } from '@/lib/supabase';
import { useAuth } from '@/context/AuthProvider';
import type { Conversation, Message, Profile } from '@/types';

interface ConversationRow {
  id: string;
  user_low_id: string;
  user_high_id: string;
  status: Conversation['status'];
  requested_by: string | null;
}

let conversationChannelSequence = 0;

export function useConversations() {
  const { user } = useAuth();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [conversationsForUserId, setConversationsForUserId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!user) {
      setConversations([]);
      setConversationsForUserId(null);
      setLoading(false);
      return;
    }
    setConversations([]);
    setConversationsForUserId(user.id);
    setLoading(true);
    setError(null);
    try {
      const { data: rawConversations, error: conversationError } = await supabase
        .from('conversations')
        .select('id,user_low_id,user_high_id,status,requested_by')
        .or(`user_low_id.eq.${user.id},user_high_id.eq.${user.id}`);
      if (conversationError) throw conversationError;
      const rows = (rawConversations ?? []) as ConversationRow[];
      if (rows.length === 0) {
        setConversations([]);
        return;
      }
      const ids = rows.map((row) => row.id);
      const partnerIds = rows.map((row) => row.user_low_id === user.id ? row.user_high_id : row.user_low_id);
      const [{ data: rawMessages, error: messagesError }, { data: rawProfiles, error: profilesError }] = await Promise.all([
        supabase.from('messages').select('*').in('conversation_id', ids).order('created_at', { ascending: false }),
        supabase.from('profiles').select('id,full_name,avatar_url').in('id', partnerIds)
      ]);
      if (messagesError) throw messagesError;
      if (profilesError) throw profilesError;
      const messages = (rawMessages ?? []) as Message[];
      const latestByConversation = new Map<string, Message>();
      for (const message of messages) {
        if (!latestByConversation.has(message.conversation_id)) latestByConversation.set(message.conversation_id, message);
      }
      const profileById = new Map<string, Pick<Profile, 'id' | 'full_name' | 'avatar_url'>>(
        (rawProfiles ?? []).map((profile) => [profile.id, profile as Pick<Profile, 'id' | 'full_name' | 'avatar_url'>])
      );
      setConversations(rows.map((row) => {
        const partnerId = row.user_low_id === user.id ? row.user_high_id : row.user_low_id;
        return {
          id: row.id,
          status: row.status,
          requested_by: row.requested_by,
          partner: profileById.get(partnerId) ?? { id: partnerId, full_name: 'Member', avatar_url: null },
          lastMessage: latestByConversation.get(row.id) ?? null
        };
      }).sort((a, b) => (b.lastMessage?.created_at ?? '').localeCompare(a.lastMessage?.created_at ?? '')));
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Could not load conversations.');
      setConversations([]);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void load();
  }, [load]);

  useEffect(() => {
    if (!user) return;
    // The chat screen and floating tab bar both use this hook. Supabase reuses
    // channels by topic, so a fixed topic lets the second hook instance try to
    // register Postgres callbacks after the first instance has subscribed.
    const channelInstance = ++conversationChannelSequence;
    let timer: ReturnType<typeof setTimeout> | undefined;
    const channel: RealtimeChannel = supabase.channel(`conversation-requests:${user.id}:${channelInstance}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'conversations' }, () => {
        if (timer) clearTimeout(timer);
        timer = setTimeout(() => { void load(); }, 150);
      }).subscribe();
    return () => {
      if (timer) clearTimeout(timer);
      void supabase.removeChannel(channel);
    };
  }, [user, load]);

  const accountConversations = conversationsForUserId === user?.id ? conversations : [];
  const incomingRequests = accountConversations.filter((item) => item.status === 'pending' && item.requested_by !== user?.id);
  const visibleConversations = accountConversations.filter((item) =>
    item.status === 'accepted' || item.requested_by === user?.id
  );
  return { conversations: visibleConversations, incomingRequests, pendingRequestCount: incomingRequests.length, loading, error, reload: load };
}
