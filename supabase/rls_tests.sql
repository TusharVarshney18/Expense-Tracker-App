-- Run on a staging project. If run on production, it must end in ROLLBACK.
-- All fixture rows are created inside this transaction and rolled back below.
begin;

do $$
begin
  if exists (
    select 1 from auth.users
    where id in (
      'a1000000-0000-4000-8000-000000000001'::uuid,
      'b2000000-0000-4000-8000-000000000002'::uuid
    )
  ) then
    raise exception 'RLS test fixture user ID already exists; use fresh fixture IDs before running';
  end if;
end;
$$;

insert into auth.users (id, aud, role, email, encrypted_password, email_confirmed_at,
                        raw_app_meta_data, raw_user_meta_data, created_at, updated_at)
values
  ('a1000000-0000-4000-8000-000000000001', 'authenticated', 'authenticated', 'groups-rls-a@example.test', '', now(), '{}', '{}', now(), now()),
  ('b2000000-0000-4000-8000-000000000002', 'authenticated', 'authenticated', 'groups-rls-b@example.test', '', now(), '{}', '{}', now(), now());

insert into public.groups (id, name, created_by, invite_code)
values ('c3000000-0000-4000-8000-000000000003', 'RLS test group', 'a1000000-0000-4000-8000-000000000001', 'rls-test-private-code');

insert into public.group_members (group_id, user_id, role)
values ('c3000000-0000-4000-8000-000000000003', 'a1000000-0000-4000-8000-000000000001', 'admin');

insert into public.group_expenses (id, group_id, paid_by, amount_paise, description, created_by)
values ('d4000000-0000-4000-8000-000000000004', 'c3000000-0000-4000-8000-000000000003',
        'a1000000-0000-4000-8000-000000000001', 100, 'private test expense', 'a1000000-0000-4000-8000-000000000001');

insert into public.expense_splits (expense_id, user_id, share_paise)
values ('d4000000-0000-4000-8000-000000000004', 'a1000000-0000-4000-8000-000000000001', 100);

set local role authenticated;
select set_config('request.jwt.claim.sub', 'b2000000-0000-4000-8000-000000000002', true);

do $$
declare
  visible_rows integer;
  affected_rows integer;
begin
  select count(*) into visible_rows from public.groups;
  if visible_rows <> 0 then raise exception 'User B can read user A group'; end if;
  select count(*) into visible_rows from public.group_members;
  if visible_rows <> 0 then raise exception 'User B can read user A membership'; end if;
  select count(*) into visible_rows from public.group_expenses;
  if visible_rows <> 0 then raise exception 'User B can read user A expense'; end if;
  select count(*) into visible_rows from public.expense_splits;
  if visible_rows <> 0 then raise exception 'User B can read user A split'; end if;

  begin
    insert into public.group_expenses (group_id, paid_by, amount_paise, created_by)
    values ('c3000000-0000-4000-8000-000000000003',
            'b2000000-0000-4000-8000-000000000002', 50,
            'b2000000-0000-4000-8000-000000000002');
    raise exception 'User B unexpectedly inserted into user A group';
  exception when insufficient_privilege then
    if sqlerrm not like '%row-level security policy%' then raise; end if;
  end;

  update public.group_expenses set description = 'tampered'
  where id = 'd4000000-0000-4000-8000-000000000004';
  get diagnostics affected_rows = row_count;
  if affected_rows <> 0 then raise exception 'User B modified user A expense'; end if;

  begin
    insert into public.group_members (group_id, user_id, role)
    values ('c3000000-0000-4000-8000-000000000003',
            'b2000000-0000-4000-8000-000000000002', 'member');
    raise exception 'User B unexpectedly joined without the invite code';
  exception when insufficient_privilege then
    if sqlerrm not like '%row-level security policy%' then raise; end if;
  end;

  begin
    perform public.join_group('not-the-invite-code'::text);
    raise exception 'User B unexpectedly joined with an invalid code';
  exception when others then
    if sqlerrm not like '%Invite code not found%' then raise; end if;
  end;
end;
$$;

reset role;
set local role authenticated;
select set_config('request.jwt.claim.sub', 'a1000000-0000-4000-8000-000000000001', true);

do $$
begin
  begin
    perform public.add_group_expense(
      'c3000000-0000-4000-8000-000000000003',
      'a1000000-0000-4000-8000-000000000001',
      100,
      'invalid split test',
      'general',
      current_date,
      '[{"user_id":"a1000000-0000-4000-8000-000000000001","share_paise":99}]'::jsonb
    );
    raise exception 'add_group_expense unexpectedly accepted a split total mismatch';
  exception when others then
    if sqlerrm not like '%Split shares must add up%' then raise; end if;
  end;
end;
$$;

rollback;
