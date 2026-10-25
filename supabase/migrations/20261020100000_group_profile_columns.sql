-- Keep the group profile RPC compatible with profiles tables that do not have
-- display_name. upi_id remains optional and is read from the row JSON when set.
drop function if exists public.get_group_member_profiles(uuid);

create function public.get_group_member_profiles(p_group_id uuid)
returns table (
  id uuid,
  email text,
  full_name text,
  upi_id text
)
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
  select p.id, p.email, p.full_name, to_jsonb(p) ->> 'upi_id'
  from public.group_members gm
  join public.profiles p on p.id = gm.user_id
  where gm.group_id = p_group_id
  order by gm.joined_at asc;
end;
$$;

create or replace function public.get_my_upi_id()
returns text
language sql
stable
security definer
set search_path = public
as $$
  select to_jsonb(p) ->> 'upi_id'
  from public.profiles p
  where p.id = auth.uid();
$$;

revoke all on function public.get_group_member_profiles(uuid) from public, anon;
grant execute on function public.get_group_member_profiles(uuid) to authenticated;
revoke all on function public.get_my_upi_id() from public, anon;
grant execute on function public.get_my_upi_id() to authenticated;

notify pgrst, 'reload schema';
