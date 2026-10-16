import { supabase } from '@/lib/supabase';
import type { Block, ReportReason, Report } from '@/types';

/**
 * Chat moderation: reporting messages/users and blocking/unblocking users.
 * Row Level Security in supabase/schema.sql restricts every write to the
 * authenticated user, and the messages SELECT policy hides messages exchanged
 * with a blocked user in either direction.
 */

export interface ReportInput {
  reportedUserId: string;
  messageId?: string | null;
  reason: ReportReason;
  details?: string | null;
}

export async function reportUser(input: ReportInput): Promise<Report> {
  const {
    data: { user }
  } = await supabase.auth.getUser();
  if (!user) throw new Error('You must be signed in to report.');

  const { data, error } = await supabase
    .from('reports')
    .insert({
      reporter_id: user.id,
      reported_user_id: input.reportedUserId,
      message_id: input.messageId ?? null,
      reason: input.reason,
      details: input.details ?? null
    })
    .select()
    .single();

  if (error) throw error;
  return data as Report;
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
  const { data, error } = await supabase.from('blocks').select('blocked_id');
  if (error) throw error;
  return (data ?? []).map((row) => row.blocked_id as string);
}

/** Search other users by name or email to start a conversation. */
export async function searchProfiles(query: string, selfId: string) {
  const trimmed = query.trim();
  if (trimmed.length < 2) return [];

  const blocked = await getBlockedIds();

  const { data, error } = await supabase
    .from('profiles')
    .select('id, full_name, email, avatar_url')
    .or(`full_name.ilike.%${trimmed}%,email.ilike.%${trimmed}%`)
    .neq('id', selfId)
    .limit(20);

  if (error) throw error;
  return (data ?? []).filter((p) => !blocked.includes(p.id));
}
