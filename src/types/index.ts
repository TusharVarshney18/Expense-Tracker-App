/**
 * Shared domain types mirrored from supabase/schema.sql.
 */

export type ReportReason = 'spam' | 'harassment' | 'hate' | 'scam' | 'other';

export type ReportStatus = 'open' | 'reviewing' | 'resolved' | 'dismissed';

export interface Profile {
  id: string;
  email: string;
  full_name: string | null;
  display_name: string | null;
  upi_id: string | null;
  avatar_url: string | null;
  push_token: string | null;
  created_at: string;
  updated_at: string;
  terms_accepted_at: string | null;
  terms_version: string | null;
}

export interface Expense {
  id: string;
  user_id: string;
  amount: number;
  category: string;
  note: string | null;
  receipt_url: string | null;
  spent_at: string;
  created_at: string;
}

export interface Message {
  id: string;
  conversation_id: string;
  sender_id: string;
  receiver_id: string;
  body: string;
  read_at: string | null;
  created_at: string;
}

export interface Report {
  id: string;
  reporter_id: string;
  reported_user_id: string;
  message_id: string | null;
  conversation_id: string | null;
  reason: ReportReason;
  details: string | null;
  status: ReportStatus;
  created_at: string;
}

export interface Block {
  id: string;
  blocker_id: string;
  blocked_id: string;
  created_at: string;
}

export interface Conversation {
  id: string;
  status: 'pending' | 'accepted' | 'declined';
  requested_by: string | null;
  partner: Pick<Profile, 'id' | 'full_name' | 'avatar_url'>;
  lastMessage: Message | null;
}
