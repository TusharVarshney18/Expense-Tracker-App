import { supabase } from '@/lib/supabase';

export interface StartedConversation {
  conversationId: string;
  created: boolean;
}

export async function startConversation(otherUserId: string, firstMessage: string): Promise<StartedConversation> {
  const { data, error } = await supabase.rpc('start_conversation', {
    p_other_user: otherUserId,
    p_first_message: firstMessage.trim()
  });
  if (error) throw error;
  const result = Array.isArray(data) ? data[0] : null;
  if (!result || typeof result.conversation_id !== 'string' || typeof result.created !== 'boolean') {
    throw new Error('The server did not return a conversation.');
  }
  return { conversationId: result.conversation_id, created: result.created };
}

export interface MessagePushTarget {
  messageId?: string;
  conversationId?: string;
}

export async function notifyMessagePush(target: MessagePushTarget): Promise<void> {
  const { error } = await supabase.functions.invoke('send-message-request-push', {
    body: target
  });
  if (error) throw error;
}

/** Notify the recipient about the first message in a new conversation. */
export async function notifyMessageRequest(conversationId: string): Promise<void> {
  await notifyMessagePush({ conversationId });
}

export async function respondToConversation(conversationId: string, accept: boolean): Promise<void> {
  const { error } = await supabase.rpc('respond_to_conversation', {
    p_conversation_id: conversationId,
    p_accept: accept
  });
  if (error) throw error;
}
