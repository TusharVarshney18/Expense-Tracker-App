-- Upgrade databases that already ran the original groups migration. Fresh
-- installs already create add_group_expense in that migration.
do $$
declare
  old_rpc regprocedure := to_regprocedure(
    'public.create_group_expense(uuid,uuid,bigint,text,text,date,jsonb)'
  );
  new_rpc regprocedure := to_regprocedure(
    'public.add_group_expense(uuid,uuid,bigint,text,text,date,jsonb)'
  );
begin
  if new_rpc is not null then
    null;
  elsif old_rpc is null then
    raise exception 'Groups migration was not applied: neither group-expense RPC exists';
  else
    alter function public.create_group_expense(uuid, uuid, bigint, text, text, date, jsonb)
      rename to add_group_expense;
  end if;
end;
$$;

alter function public.is_group_member(uuid) security definer;
alter function public.is_group_member(uuid) set search_path to public;

-- Split validity is enforced inside add_group_expense before either table is written.
revoke all on function public.add_group_expense(uuid, uuid, bigint, text, text, date, jsonb) from public, anon;
grant execute on function public.add_group_expense(uuid, uuid, bigint, text, text, date, jsonb) to authenticated;

-- Keep application RPCs available only to authenticated users.
revoke all on function public.is_group_member(uuid) from public, anon;
grant execute on function public.is_group_member(uuid) to authenticated;
revoke all on function public.get_my_upi_id() from public, anon;
grant execute on function public.get_my_upi_id() to authenticated;
revoke all on function public.get_group_member_profiles(uuid) from public, anon;
grant execute on function public.get_group_member_profiles(uuid) to authenticated;
revoke all on function public.create_group(text) from public, anon;
grant execute on function public.create_group(text) to authenticated;
revoke all on function public.join_group(text) from public, anon;
grant execute on function public.join_group(text) to authenticated;
revoke all on function public.leave_group(uuid) from public, anon;
grant execute on function public.leave_group(uuid) to authenticated;
revoke all on function public.create_group_settlement(uuid, uuid, bigint) from public, anon;
grant execute on function public.create_group_settlement(uuid, uuid, bigint) to authenticated;

-- These helpers are only called by policies, RPCs, or triggers.
revoke all on function public.is_group_member_for_user(uuid, uuid) from public, anon, authenticated;
revoke all on function public.is_group_admin(uuid, uuid) from public, anon, authenticated;
revoke all on function public.group_member_balance_paise(uuid, uuid) from public, anon, authenticated;
revoke all on function public.cleanup_group_data_before_profile_delete() from public, anon, authenticated;
revoke all on function public.handle_new_user() from public, anon, authenticated;
revoke all on function public.set_updated_at() from public, anon, authenticated;
revoke all on function public.delete_account() from public, anon;
grant execute on function public.delete_account() to authenticated;
