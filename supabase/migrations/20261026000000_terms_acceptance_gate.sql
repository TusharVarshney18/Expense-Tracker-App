-- Enforce the Terms gate server-side. The client keeps the user on the Accept
-- Terms screen, but a stale or modified client must not be able to write
-- expenses, group data or messages before accepting the current Terms.
--
-- Inserts made without an end-user JWT (migrations, fixtures, service-role
-- maintenance) are not gated.

create or replace function public.require_terms_acceptance()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  uid uuid := auth.uid();
begin
  if uid is null then
    return new;
  end if;

  if not exists (
    select 1
    from public.profiles p
    where p.id = uid
      and p.terms_accepted_at is not null
  ) then
    raise exception 'Accept the current Terms of Service before using this feature';
  end if;

  return new;
end;
$$;

do $$
declare
  target_table text;
begin
  foreach target_table in array array[
    'personal_expenses',
    'groups',
    'group_members',
    'group_expenses',
    'expense_splits',
    'settlements',
    'messages'
  ]
  loop
    execute format(
      'drop trigger if exists %I on public.%I',
      'require_terms_' || target_table,
      target_table
    );
    execute format(
      'create trigger %I before insert on public.%I for each row execute function public.require_terms_acceptance()',
      'require_terms_' || target_table,
      target_table
    );
  end loop;
end;
$$;

revoke all on function public.require_terms_acceptance() from public, anon, authenticated;
