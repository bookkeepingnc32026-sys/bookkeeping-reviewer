-- Restore account records without recreating Auth users or resetting profiles.
begin;

insert into public.profiles(id, full_name, display_name)
select id,
       left(btrim(coalesce(raw_user_meta_data->>'full_name', '')), 80),
       case when length(btrim(coalesce(raw_user_meta_data->>'full_name', ''))) >= 3
            then left(btrim(raw_user_meta_data->>'full_name'), 20)
            else 'Learner' end
from auth.users
on conflict (id) do nothing;

insert into public.onboarding(user_id)
select id from public.profiles
on conflict (user_id) do nothing;

-- No caller-supplied user ID or role: repair is restricted to auth.uid().
create function public.ensure_learner_profile()
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_id uuid := auth.uid();
  v_name text;
  v_profile jsonb;
begin
  if v_id is null then
    raise exception 'Authentication required' using errcode = '42501';
  end if;

  select left(btrim(coalesce(raw_user_meta_data->>'full_name', '')), 80)
    into v_name from auth.users where id = v_id;
  if not found then
    raise exception 'Authentication required' using errcode = '42501';
  end if;

  insert into public.profiles(id, full_name, display_name)
  values(v_id, v_name,
    case when length(v_name) >= 3 then left(v_name, 20) else 'Learner' end)
  on conflict (id) do nothing;

  insert into public.onboarding(user_id) values(v_id)
  on conflict (user_id) do nothing;

  select to_jsonb(p) into v_profile from public.profiles p where p.id = v_id;
  return v_profile;
end;
$$;

revoke all on function public.ensure_learner_profile() from public, anon;
grant execute on function public.ensure_learner_profile() to authenticated;
notify pgrst, 'reload schema';
commit;
