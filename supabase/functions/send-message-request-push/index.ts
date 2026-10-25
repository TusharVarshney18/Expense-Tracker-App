import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type'
};

Deno.serve(async (request: Request) => {
  if (request.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  try {
    const authorization = request.headers.get('Authorization');
    if (!authorization) return Response.json({ error: 'Unauthorized' }, { status: 401, headers: corsHeaders });
    const url = Deno.env.get('SUPABASE_URL');
    const anonKey = Deno.env.get('SUPABASE_ANON_KEY');
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    if (!url || !anonKey || !serviceKey) throw new Error('Supabase function secrets are not configured.');
    const userClient = createClient(url, anonKey, { global: { headers: { Authorization: authorization } } });
    const { data: userData, error: userError } = await userClient.auth.getUser();
    if (userError || !userData.user) return Response.json({ error: 'Unauthorized' }, { status: 401, headers: corsHeaders });
    const payload: unknown = await request.json();
    if (typeof payload !== 'object' || payload === null || !('conversationId' in payload) || typeof payload.conversationId !== 'string') {
      return Response.json({ error: 'Invalid request' }, { status: 400, headers: corsHeaders });
    }
    const admin = createClient(url, serviceKey, { auth: { persistSession: false, autoRefreshToken: false } });
    const { data: conversation, error: conversationError } = await admin.from('conversations')
      .select('id,user_low_id,user_high_id,requested_by,status,push_notified_at')
      .eq('id', payload.conversationId).maybeSingle();
    if (conversationError) throw conversationError;
    if (!conversation || conversation.requested_by !== userData.user.id || conversation.status !== 'pending') {
      return Response.json({ sent: false }, { headers: corsHeaders });
    }
    const { data: claimed, error: claimError } = await admin.from('conversations').update({ push_notified_at: new Date().toISOString() })
      .eq('id', conversation.id).is('push_notified_at', null).select('id').maybeSingle();
    if (claimError) throw claimError;
    if (!claimed) return Response.json({ sent: false }, { headers: corsHeaders });
    const recipientId = conversation.user_low_id === userData.user.id ? conversation.user_high_id : conversation.user_low_id;
    const { data: recipient, error: profileError } = await admin.from('profiles').select('push_token,full_name').eq('id', recipientId).maybeSingle();
    if (profileError) throw profileError;
    if (!recipient?.push_token) return Response.json({ sent: false }, { headers: corsHeaders });
    const { data: sender } = await admin.from('profiles').select('full_name').eq('id', userData.user.id).maybeSingle();
    const pushResponse = await fetch('https://exp.host/--/api/v2/push/send', {
      method: 'POST',
      headers: { Accept: 'application/json', 'Content-Type': 'application/json' },
      body: JSON.stringify({ to: recipient.push_token, title: 'New message request', body: `${sender?.full_name ?? 'Someone'} sent you a chat request.`, sound: 'default', data: { conversationId: conversation.id, type: 'message_request' } })
    });
    if (!pushResponse.ok) throw new Error('Expo push service rejected the notification.');
    return Response.json({ sent: true }, { headers: corsHeaders });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unable to send notification.';
    return Response.json({ error: message }, { status: 500, headers: corsHeaders });
  }
});
