begin;

-- Record explicit acceptance for UGC and keep profile email private from the
-- general authenticated profile directory.
alter table public.profiles
  add column if not exists terms_accepted_at timestamptz,
  add column if not exists terms_version text;

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  accepted_version text := new.raw_user_meta_data ->> 'terms_version';
begin
  insert into public.profiles (
    id, email, full_name, display_name, terms_accepted_at, terms_version
  ) values (
    new.id,
    new.email,
    new.raw_user_meta_data ->> 'full_name',
    coalesce(new.raw_user_meta_data ->> 'display_name', new.raw_user_meta_data ->> 'full_name'),
    case when accepted_version = '2026-10-21' then now() else null end,
    case when accepted_version = '2026-10-21' then accepted_version else null end
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

create or replace function public.accept_current_terms(p_terms_version text)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  uid uuid := auth.uid();
begin
  if uid is null then raise exception 'Not authenticated'; end if;
  if p_terms_version is distinct from '2026-10-21' then
    raise exception 'Unsupported Terms of Service version';
  end if;
  update public.profiles
  set terms_accepted_at = now(), terms_version = p_terms_version
  where id = uid;
  if not found then raise exception 'Profile not found'; end if;
end;
$$;

revoke all on function public.accept_current_terms(text) from public, anon;
grant execute on function public.accept_current_terms(text) to authenticated;

-- Enforce the current Terms server-side for chat messages, including the first
-- message created by start_conversation().
create or replace function public.enforce_conversation_message_rules()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  c public.conversations%rowtype;
begin
  if not exists (
    select 1 from public.profiles p
    where p.id = new.sender_id and p.terms_version = '2026-10-21'
  ) then
    raise exception 'Accept the current Terms of Service before sending messages';
  end if;
  select * into c from public.conversations where id = new.conversation_id for update;
  if not found or least(new.sender_id, new.receiver_id) <> c.user_low_id
     or greatest(new.sender_id, new.receiver_id) <> c.user_high_id then
    raise exception 'Message participants do not match the conversation';
  end if;
  if exists (
    select 1 from public.blocks b
    where (b.blocker_id = new.sender_id and b.blocked_id = new.receiver_id)
       or (b.blocker_id = new.receiver_id and b.blocked_id = new.sender_id)
  ) then
    raise exception 'Messaging is unavailable because one user blocked the other';
  end if;
  if c.status = 'declined' then raise exception 'This conversation request was declined'; end if;
  if c.status = 'pending' then
    if new.sender_id <> c.requested_by then raise exception 'Only the requester may send while a request is pending'; end if;
    if exists (select 1 from public.messages m where m.conversation_id = c.id) then
      raise exception 'Only one message may be sent while a request is pending';
    end if;
  end if;
  return new;
end;
$$;

drop function if exists public.get_group_member_profiles(uuid);
create function public.get_group_member_profiles(p_group_id uuid)
returns table (id uuid, full_name text, upi_id text)
language plpgsql
stable
security definer
set search_path = public
as $$
begin
  if auth.uid() is null or not public.is_group_member(p_group_id) then
    raise exception 'You are not a member of this group';
  end if;
  return query
  select p.id, p.full_name, p.upi_id
  from public.group_members gm
  join public.profiles p on p.id = gm.user_id
  where gm.group_id = p_group_id
  order by gm.joined_at asc;
end;
$$;

create or replace function public.search_profiles(p_query text)
returns table (id uuid, full_name text, avatar_url text)
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  uid uuid := auth.uid();
  q text := btrim(coalesce(p_query, ''));
  escaped_q text;
begin
  if uid is null then raise exception 'Not authenticated'; end if;
  if char_length(q) not between 2 and 100 then return; end if;
  escaped_q := replace(
    replace(replace(q, chr(92), chr(92) || chr(92)), '%', chr(92) || '%'),
    '_', chr(92) || '_'
  );
  return query
  select p.id, p.full_name, p.avatar_url
  from public.profiles p
  where p.id <> uid
    and (
      coalesce(p.full_name, '') ilike '%' || escaped_q || '%'
      or lower(p.email) = lower(q)
    )
  order by p.full_name nulls last, p.id
  limit 20;
end;
$$;

revoke all on function public.search_profiles(text) from public, anon;
grant execute on function public.search_profiles(text) to authenticated;
revoke all on function public.get_group_member_profiles(uuid) from public, anon;
grant execute on function public.get_group_member_profiles(uuid) to authenticated;

revoke select on public.profiles from public, anon, authenticated;
grant select (id, full_name, display_name, avatar_url, created_at, updated_at,
              terms_accepted_at, terms_version)
  on public.profiles to authenticated;
revoke insert, delete on public.profiles from public, anon, authenticated;
revoke update on public.profiles from public, anon, authenticated;
grant update (display_name, upi_id, push_token) on public.profiles to authenticated;

revoke all on function public.enforce_conversation_message_rules() from public, anon, authenticated;
revoke all on function public.handle_new_user() from public, anon, authenticated;
notify pgrst, 'reload schema';
commit;
