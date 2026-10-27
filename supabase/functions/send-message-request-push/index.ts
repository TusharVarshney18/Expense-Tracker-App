import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type'
};

interface PushPayload {
  conversationId?: string;
  messageId?: string;
}

interface MessageRow {
  id: string;
  conversation_id: string;
  sender_id: string;
  receiver_id: string;
  body: string;
  push_notified_at: string | null;
}

function json(body: unknown, status = 200): Response {
  return Response.json(body, { status, headers: corsHeaders });
}

function truncate(value: string, max = 140): string {
  const text = value.replace(/\s+/g, ' ').trim();
  return text.length > max ? `${text.slice(0, max - 1)}…` : text;
}

/**
 * Sends an Expo push for a chat message.
 *
 * Called by the app after `send_conversation_message` / `start_conversation`.
 * Accepts either the new `messageId` (normal replies) or a `conversationId`
 * (the first message of a request, kept for backwards compatibility).
 *
 * The function authenticates as the sender and only notifies the other
 * participant. `messages.push_notified_at` makes delivery idempotent when the
 * client retries.
 */
Deno.serve(async (request: Request) => {
  if (request.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  try {
    const authorization = request.headers.get('Authorization');
    if (!authorization) return json({ error: 'Unauthorized' }, 401);

    const url = Deno.env.get('SUPABASE_URL');
    const anonKey = Deno.env.get('SUPABASE_ANON_KEY');
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    if (!url || !anonKey || !serviceKey) {
      throw new Error('Supabase function secrets are not configured.');
    }

    const userClient = createClient(url, anonKey, {
      global: { headers: { Authorization: authorization } }
    });
    const { data: userData, error: userError } = await userClient.auth.getUser();
    if (userError || !userData.user) return json({ error: 'Unauthorized' }, 401);
    const userId = userData.user.id;

    const payload = (await request.json().catch(() => null)) as PushPayload | null;
    if (
      typeof payload !== 'object' ||
      payload === null ||
      (typeof payload.messageId !== 'string' && typeof payload.conversationId !== 'string')
    ) {
      return json({ error: 'Invalid request' }, 400);
    }

    const admin = createClient(url, serviceKey, {
      auth: { persistSession: false, autoRefreshToken: false }
    });

    let message: MessageRow | null = null;

    if (typeof payload.messageId === 'string') {
      const { data, error } = await admin
        .from('messages')
        .select('id,conversation_id,sender_id,receiver_id,body,push_notified_at')
        .eq('id', payload.messageId)
        .maybeSingle();
      if (error) throw error;
      if (!data || data.sender_id !== userId) return json({ sent: false });
      message = data as MessageRow;
    } else if (typeof payload.conversationId === 'string') {
      // First-message path. Find the message this user just sent.
      const { data, error } = await admin
        .from('messages')
        .select('id,conversation_id,sender_id,receiver_id,body,push_notified_at')
        .eq('conversation_id', payload.conversationId)
        .eq('sender_id', userId)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();
      if (error) throw error;
      if (!data) return json({ sent: false });
      message = data as MessageRow;
    }

    if (!message) return json({ sent: false });

    const { data: conversation, error: conversationError } = await admin
      .from('conversations')
      .select('id,user_low_id,user_high_id,requested_by,status')
      .eq('id', message.conversation_id)
      .maybeSingle();
    if (conversationError) throw conversationError;
    if (!conversation) return json({ sent: false });

    const isParticipant =
      conversation.user_low_id === userId || conversation.user_high_id === userId;
    if (!isParticipant || conversation.status === 'declined') {
      return json({ sent: false });
    }
    // Only the requester can send while a request is pending.
    if (conversation.status === 'pending' && conversation.requested_by !== userId) {
      return json({ sent: false });
    }

    const recipientId =
      conversation.user_low_id === userId
        ? conversation.user_high_id
        : conversation.user_low_id;
    if (recipientId !== message.receiver_id) return json({ sent: false });

    // Claim this message exactly once so client retries cannot duplicate it.
    if (message.push_notified_at) return json({ sent: false });
    const { data: claimed, error: claimError } = await admin
      .from('messages')
      .update({ push_notified_at: new Date().toISOString() })
      .eq('id', message.id)
      .is('push_notified_at', null)
      .select('id')
      .maybeSingle();
    if (claimError) throw claimError;
    if (!claimed) return json({ sent: false });

    const { data: recipient, error: profileError } = await admin
      .from('profiles')
      .select('push_token')
      .eq('id', recipientId)
      .maybeSingle();
    if (profileError) throw profileError;
    if (!recipient?.push_token) return json({ sent: false });

    const { data: sender } = await admin
      .from('profiles')
      .select('full_name,display_name')
      .eq('id', userId)
      .maybeSingle();
    const senderName = sender?.display_name ?? sender?.full_name ?? 'Someone';
    const isRequest = conversation.status === 'pending';

    const pushResponse = await fetch('https://exp.host/--/api/v2/push/send', {
      method: 'POST',
      headers: { Accept: 'application/json', 'Content-Type': 'application/json' },
      body: JSON.stringify({
        to: recipient.push_token,
        title: isRequest ? 'New message request' : senderName,
        body: isRequest ? `${senderName} sent you a chat request.` : truncate(message.body),
        sound: 'default',
        priority: 'high',
        channelId: 'default',
        data: {
          conversationId: conversation.id,
          messageId: message.id,
          type: isRequest ? 'message_request' : 'chat_message'
        }
      })
    });

    if (!pushResponse.ok) throw new Error('Expo push service rejected the notification.');

    // Expo can return 200 with a per-message error. Clear dead tokens so future
    // messages do not keep targeting an uninstalled app.
    const pushResult = (await pushResponse.json().catch(() => null)) as {
      data?: { status?: string; details?: { error?: string } };
    } | null;
    if (
      pushResult?.data?.status === 'error' &&
      pushResult.data.details?.error === 'DeviceNotRegistered'
    ) {
      await admin.from('profiles').update({ push_token: null }).eq('id', recipientId);
    }

    return json({ sent: true });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unable to send notification.';
    return json({ error: message }, 500);
  }
});
