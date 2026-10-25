begin;
create table if not exists public.conversations (
  id uuid primary key default gen_random_uuid(),
  user_low_id uuid not null references public.profiles(id) on delete cascade,
  user_high_id uuid not null references public.profiles(id) on delete cascade,
  status text not null default 'accepted' check (status in ('pending','accepted','declined')),
  requested_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(), push_notified_at timestamptz,
  constraint conversations_distinct_users check (user_low_id < user_high_id),
  constraint conversations_pair_unique unique (user_low_id,user_high_id)
);
alter table public.conversations add column if not exists status text not null default 'accepted';
alter table public.conversations add column if not exists requested_by uuid references public.profiles(id) on delete set null;
alter table public.conversations add column if not exists push_notified_at timestamptz;
do $$ begin
  if not exists (select 1 from pg_constraint where conname='conversations_status_check') then
    alter table public.conversations add constraint conversations_status_check check(status in ('pending','accepted','declined'));
  end if;
end $$;
alter table public.messages add column if not exists conversation_id uuid references public.conversations(id) on delete cascade;
insert into public.conversations(user_low_id,user_high_id,status)
select least(sender_id,receiver_id),greatest(sender_id,receiver_id),'accepted' from public.messages
group by least(sender_id,receiver_id),greatest(sender_id,receiver_id)
on conflict(user_low_id,user_high_id) do nothing;
update public.messages m set conversation_id=c.id from public.conversations c
where c.user_low_id=least(m.sender_id,m.receiver_id) and c.user_high_id=greatest(m.sender_id,m.receiver_id)
and m.conversation_id is null;
alter table public.messages alter column conversation_id set not null;
create index if not exists idx_conversations_user_low on public.conversations(user_low_id);
create index if not exists idx_conversations_user_high on public.conversations(user_high_id);
create index if not exists idx_messages_conversation_created on public.messages(conversation_id,created_at desc);
alter table public.conversations enable row level security;
grant select on public.conversations to authenticated;
drop policy if exists conversations_select_participants on public.conversations;
create policy conversations_select_participants on public.conversations for select to authenticated
using(auth.uid() in (user_low_id,user_high_id));
do $$ begin
  if exists(select 1 from pg_publication where pubname='supabase_realtime') and not exists(
    select 1 from pg_publication_tables where pubname='supabase_realtime' and schemaname='public' and tablename='conversations'
  ) then alter publication supabase_realtime add table public.conversations; end if;
end $$;

create or replace function public.enforce_conversation_message_rules() returns trigger
language plpgsql security definer set search_path=public as $$
declare c public.conversations%rowtype;
begin
  select * into c from public.conversations where id=new.conversation_id for update;
  if not found or least(new.sender_id,new.receiver_id)<>c.user_low_id or greatest(new.sender_id,new.receiver_id)<>c.user_high_id then
    raise exception 'Message participants do not match the conversation';
  end if;
  if exists(select 1 from public.blocks b where (b.blocker_id=new.sender_id and b.blocked_id=new.receiver_id) or (b.blocker_id=new.receiver_id and b.blocked_id=new.sender_id)) then
    raise exception 'Messaging is unavailable because one user blocked the other';
  end if;
  if c.status='declined' then raise exception 'This conversation request was declined'; end if;
  if c.status='pending' then
    if new.sender_id<>c.requested_by then raise exception 'Only the requester may send while a request is pending'; end if;
    if exists(select 1 from public.messages m where m.conversation_id=c.id) then raise exception 'Only one message may be sent while a request is pending'; end if;
  end if;
  return new;
end $$;
drop trigger if exists messages_enforce_conversation_rules on public.messages;
create trigger messages_enforce_conversation_rules before insert on public.messages for each row execute function public.enforce_conversation_message_rules();

create or replace function public.start_conversation(p_other_user uuid,p_first_message text)
returns table(conversation_id uuid,created boolean) language plpgsql security definer set search_path=public as $$
declare uid uuid:=auth.uid(); low_id uuid; high_id uuid; c_id uuid; c_status text; auto_accept boolean; first_text text:=btrim(coalesce(p_first_message,''));
begin
  if uid is null then raise exception 'Not authenticated'; end if;
  if p_other_user is null or p_other_user=uid then raise exception 'Cannot start a conversation with yourself'; end if;
  if char_length(first_text) not between 1 and 2000 then raise exception 'First message must contain 1 to 2000 characters'; end if;
  if exists(select 1 from public.blocks b where (b.blocker_id=uid and b.blocked_id=p_other_user) or (b.blocker_id=p_other_user and b.blocked_id=uid)) then raise exception 'Messaging is unavailable because one user blocked the other'; end if;
  low_id:=least(uid,p_other_user); high_id:=greatest(uid,p_other_user);
  select id,status into c_id,c_status from public.conversations where user_low_id=low_id and user_high_id=high_id for update;
  if c_id is not null then
    if c_status='declined' then raise exception 'This conversation request was declined'; end if;
    return query select c_id,false; return;
  end if;
  select exists(select 1 from public.group_members a join public.group_members b using(group_id) where a.user_id=uid and b.user_id=p_other_user) into auto_accept;
  insert into public.conversations(user_low_id,user_high_id,status,requested_by)
    values(low_id,high_id,case when auto_accept then 'accepted' else 'pending' end,uid)
    on conflict(user_low_id,user_high_id) do nothing returning id into c_id;
  if c_id is null then
    select id,status into c_id,c_status from public.conversations where user_low_id=low_id and user_high_id=high_id for update;
    if c_status='declined' then raise exception 'This conversation request was declined'; end if;
    return query select c_id,false; return;
  end if;
  insert into public.messages(conversation_id,sender_id,receiver_id,body) values(c_id,uid,p_other_user,first_text);
  return query select c_id,true;
end $$;

create or replace function public.send_conversation_message(p_conversation_id uuid,p_body text)
returns uuid language plpgsql security definer set search_path=public as $$
declare uid uuid:=auth.uid(); c public.conversations%rowtype; other_id uuid; message_id uuid;
begin
  if uid is null then raise exception 'Not authenticated'; end if;
  select * into c from public.conversations where id=p_conversation_id for update;
  if not found or uid not in(c.user_low_id,c.user_high_id) then raise exception 'Conversation not found'; end if;
  other_id:=case when c.user_low_id=uid then c.user_high_id else c.user_low_id end;
  insert into public.messages(conversation_id,sender_id,receiver_id,body) values(c.id,uid,other_id,btrim(coalesce(p_body,''))) returning id into message_id;
  return message_id;
end $$;

create or replace function public.respond_to_conversation(p_conversation_id uuid,p_accept boolean)
returns text language plpgsql security definer set search_path=public as $$
declare uid uuid:=auth.uid(); c public.conversations%rowtype;
begin
  if uid is null then raise exception 'Not authenticated'; end if;
  select * into c from public.conversations where id=p_conversation_id for update;
  if not found then raise exception 'Conversation not found'; end if;
  if uid=c.requested_by then raise exception 'Only the recipient may respond to this request'; end if;
  if uid not in(c.user_low_id,c.user_high_id) then raise exception 'Conversation not found'; end if;
  if c.status<>'pending' then raise exception 'Conversation request is not pending'; end if;
  update public.conversations set status=case when p_accept then 'accepted' else 'declined' end where id=c.id returning status into c.status;
  return c.status;
end $$;

alter table public.reports add column if not exists conversation_id uuid references public.conversations(id) on delete set null;
alter table public.reports enable row level security;
grant insert on public.reports to authenticated;
create index if not exists idx_reports_conversation on public.reports(conversation_id);
drop policy if exists reports_select_own on public.reports;
drop policy if exists "reports_select_own" on public.reports;
drop policy if exists reports_insert_own on public.reports;
drop policy if exists "reports_insert_own" on public.reports;
create policy reports_insert_own on public.reports for insert to authenticated with check(reporter_id=auth.uid() and reporter_id<>reported_user_id);
create or replace function public.report_user(p_reported_user uuid,p_conversation_id uuid,p_reason text,p_details text default null)
returns uuid language plpgsql security definer set search_path=public as $$
declare uid uuid:=auth.uid(); report_id uuid;
begin
  if uid is null then raise exception 'Not authenticated'; end if;
  if p_reported_user is null or p_reported_user=uid then raise exception 'Invalid reported user'; end if;
  if p_conversation_id is not null and not exists(select 1 from public.conversations c where c.id=p_conversation_id and uid in(c.user_low_id,c.user_high_id) and p_reported_user in(c.user_low_id,c.user_high_id)) then raise exception 'You can report only a participant in your conversation'; end if;
  if p_reason not in('spam','harassment','hate','scam','other') then raise exception 'Invalid report reason'; end if;
  insert into public.reports(reporter_id,reported_user_id,conversation_id,reason,details) values(uid,p_reported_user,p_conversation_id,p_reason,nullif(btrim(p_details),'')) returning id into report_id;
  return report_id;
end $$;

create or replace function public.decline_blocked_pending_request() returns trigger
language plpgsql security definer set search_path=public as $$
begin
  update public.conversations set status='declined' where status='pending' and user_low_id=least(new.blocker_id,new.blocked_id) and user_high_id=greatest(new.blocker_id,new.blocked_id);
  return new;
end $$;
drop trigger if exists blocks_decline_pending_conversation on public.blocks;
create trigger blocks_decline_pending_conversation after insert on public.blocks for each row execute function public.decline_blocked_pending_request();

revoke all on function public.start_conversation(uuid,text) from public,anon;
grant execute on function public.start_conversation(uuid,text) to authenticated;
revoke all on function public.respond_to_conversation(uuid,boolean) from public,anon;
grant execute on function public.respond_to_conversation(uuid,boolean) to authenticated;
revoke all on function public.send_conversation_message(uuid,text) from public,anon;
grant execute on function public.send_conversation_message(uuid,text) to authenticated;
revoke all on function public.report_user(uuid,uuid,text,text) from public,anon;
grant execute on function public.report_user(uuid,uuid,text,text) to authenticated;
revoke all on function public.enforce_conversation_message_rules() from public,anon,authenticated;
revoke all on function public.decline_blocked_pending_request() from public,anon,authenticated;
commit;
