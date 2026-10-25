import { supabase } from '@/lib/supabase';
import type { Block, ReportReason } from '@/types';

/**
 * Chat moderation: reporting messages/users and blocking/unblocking users.
 * Row Level Security in supabase/schema.sql restricts every write to the
 * authenticated user, and the messages SELECT policy hides messages exchanged
 * with a blocked user in either direction.
 */

export interface ReportInput {
  reportedUserId: string;
  messageId?: string | null;
  conversationId?: string | null;
  reason: ReportReason;
  details?: string | null;
}

interface ProfileSearchResult {
  id: string;
  full_name: string | null;
  avatar_url: string | null;
}

export async function reportUser(input: ReportInput): Promise<void> {
  const { error } = await supabase.rpc('report_user', {
    p_reported_user: input.reportedUserId,
    p_conversation_id: input.conversationId ?? null,
    p_reason: input.reason,
    p_details: input.details ?? null
  });
  if (error) throw error;
}

export async function blockUser(blockedId: string): Promise<Block> {
  const {
    data: { user }
  } = await supabase.auth.getUser();
  if (!user) throw new Error('You must be signed in to block a user.');
  if (user.id === blockedId) throw new Error('You cannot block yourself.');

  const { data, error } = await supabase
    .from('blocks')
    .insert({ blocker_id: user.id, blocked_id: blockedId })
    .select()
    .single();

  if (error) {
    // Treat an already-blocked user as success (unique constraint 23505).
    if (error.code === '23505') {
      const { data: existing } = await supabase
        .from('blocks')
        .select('*')
        .eq('blocker_id', user.id)
        .eq('blocked_id', blockedId)
        .single();
      if (existing) return existing as Block;
    }
    throw error;
  }
  return data as Block;
}

export async function unblockUser(blockedId: string): Promise<void> {
  const {
    data: { user }
  } = await supabase.auth.getUser();
  if (!user) throw new Error('You must be signed in.');

  const { error } = await supabase
    .from('blocks')
    .delete()
    .eq('blocker_id', user.id)
    .eq('blocked_id', blockedId);

  if (error) throw error;
}

/** IDs the current user has blocked. */
export async function getBlockedIds(): Promise<string[]> {
  try {
    const { data, error } = await supabase.from('blocks').select('blocked_id');
    if (error) return [];
    return (data ?? []).map((row) => row.blocked_id as string);
  } catch {
    return [];
  }
}

/** Search other users by name or email to start a conversation. */
export async function searchProfiles(query: string, selfId: string) {
  const trimmed = query.trim();
  if (trimmed.length < 2) return [];

  const blocked = await getBlockedIds();

  const { data, error } = await supabase.rpc('search_profiles', {
    p_query: trimmed
  });

  if (error) throw error;
  const people = (data ?? []) as ProfileSearchResult[];
  return people.filter((person: ProfileSearchResult) => person.id !== selfId && !blocked.includes(person.id));
}
