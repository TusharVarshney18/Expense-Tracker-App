import { useCallback, useEffect, useState } from 'react';

import { supabase } from '@/lib/supabase';
import { useAuth } from '@/context/AuthProvider';
import type { Conversation, Message, Profile } from '@/types';

/**
 * Builds the conversation list from the visible messages. Because the messages
 * SELECT policy hides anything exchanged with a blocked user, blocked partners
 * never appear here.
 */
export function useConversations() {
  const { user } = useAuth();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!user) {
      setConversations([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const { data: messages, error } = await supabase
        .from('messages')
        .select('*')
        .or(`sender_id.eq.${user.id},receiver_id.eq.${user.id}`)
        .order('created_at', { ascending: false })
        .limit(300);
      if (error) throw error;

      const rows = (messages as Message[]) ?? [];
      const latestByPartner = new Map<string, Message>();

      for (const m of rows) {
        const partnerId = m.sender_id === user.id ? m.receiver_id : m.sender_id;
        if (!latestByPartner.has(partnerId)) {
          latestByPartner.set(partnerId, m);
        }
      }

      const partnerIds = Array.from(latestByPartner.keys());
      if (partnerIds.length === 0) {
        setConversations([]);
        return;
      }

      const { data: profiles, error: profileError } = await supabase
        .from('profiles')
        .select('id, full_name, email, avatar_url')
        .in('id', partnerIds);
      if (profileError) throw profileError;

      const profileById = new Map<string, Profile>(
        (profiles as Profile[]).map((p) => [p.id, p])
      );

      const result: Conversation[] = partnerIds
        .map((id) => ({
          partner:
            profileById.get(id) ?? {
              id,
              full_name: null,
              email: 'Unknown user',
              avatar_url: null
            },
          lastMessage: latestByPartner.get(id) ?? null
        }))
        .sort((a, b) => {
          const at = a.lastMessage?.created_at ?? '';
          const bt = b.lastMessage?.created_at ?? '';
          return bt.localeCompare(at);
        });

      setConversations(result);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    void load();
  }, [load]);

  return { conversations, loading, reload: load };
}
