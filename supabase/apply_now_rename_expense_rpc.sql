begin;

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
  elsif old_rpc is not null then
    alter function public.create_group_expense(uuid, uuid, bigint, text, text, date, jsonb)
      rename to add_group_expense;
  else
    raise exception 'Groups migration was not applied: neither public.create_group_expense nor public.add_group_expense exists with the expected signature';
  end if;
end;
$$;

alter function public.add_group_expense(uuid, uuid, bigint, text, text, date, jsonb)
  security definer;
alter function public.add_group_expense(uuid, uuid, bigint, text, text, date, jsonb)
  set search_path to public;

revoke all on function public.add_group_expense(uuid, uuid, bigint, text, text, date, jsonb)
  from public, anon, authenticated;
grant execute on function public.add_group_expense(uuid, uuid, bigint, text, text, date, jsonb)
  to authenticated;

do $$
declare
  function_oid regprocedure := to_regprocedure(
    'public.add_group_expense(uuid,uuid,bigint,text,text,date,jsonb)'
  );
  function_is_definer boolean;
  function_config text[];
  function_definition text;
begin
  select p.prosecdef, p.proconfig, pg_get_functiondef(p.oid)
  into function_is_definer, function_config, function_definition
  from pg_proc p
  where p.oid = function_oid;

  if function_is_definer is distinct from true then
    raise exception 'add_group_expense must be SECURITY DEFINER';
  end if;
  if not coalesce(array_to_string(function_config, ','), '') like '%search_path=public%' then
    raise exception 'add_group_expense must use search_path=public';
  end if;
  if position('split_total <> p_amount_paise' in lower(function_definition)) = 0
     or position('split shares must add up to the expense amount' in lower(function_definition)) = 0 then
    raise exception 'add_group_expense is missing the server-side split-sum validation';
  end if;
end;
$$;

select p.proname,
       pg_get_function_identity_arguments(p.oid) as identity_arguments,
       p.prosecdef,
       p.proconfig
from pg_proc p
join pg_namespace n on n.oid = p.pronamespace
where n.nspname = 'public'
  and (p.proname ilike '%expense%' or p.proname ilike '%group%' or p.proname ilike '%settlement%')
order by p.proname, identity_arguments;

commit;
