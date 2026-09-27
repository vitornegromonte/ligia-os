-- Four access roles and an atomic membership approval flow.
begin;
set local lock_timeout = '5s';
set local statement_timeout = '60s';

-- Fill this explicit mapping only after the current administrators are reviewed.
-- Organizational category/director_role does not distinguish all future roles.
create temporary table role_migration_decisions (
  profile_id uuid primary key,
  new_role text not null check (new_role in ('diretor','coordenador'))
) on commit drop;
-- Reviewed profile_id/new_role values belong here before remote application.

do $$ begin
  if exists (select 1 from public.profiles p left join role_migration_decisions d on d.profile_id = p.id
    where p.role = 'admin' and d.profile_id is null) then
    raise exception 'Unclassified legacy administrators: explicit mapping required';
  end if;
  if exists (select 1 from role_migration_decisions d left join public.profiles p on p.id = d.profile_id
    where p.id is null or p.role <> 'admin') then
    raise exception 'Role migration decision does not match a legacy administrator';
  end if;
  if exists (select 1 from public.profiles where role not in ('visitante','membro','admin')) then
    raise exception 'Unexpected legacy role';
  end if;
end $$;

alter table public.profiles drop constraint if exists profiles_role_check;
alter table public.profiles drop constraint if exists ligia_profiles_role_check;
alter table public.profiles add column status_membro text not null default 'none';
update public.profiles set role = 'externo' where role = 'visitante';
update public.profiles p set role = d.new_role from role_migration_decisions d where p.id = d.profile_id and p.role = 'admin';
update public.profiles set status_membro = 'approved' where role in ('membro','diretor','coordenador');
alter table public.profiles alter column role set default 'externo';
alter table public.profiles add constraint profiles_role_check check (role in ('externo','membro','diretor','coordenador'));
alter table public.profiles add constraint profiles_status_membro_check check (
  (role = 'externo' and status_membro in ('none','pending','rejected')) or
  (role in ('membro','diretor','coordenador') and status_membro = 'approved'));

create table public.membership_requests (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references public.profiles(id) on delete cascade,
  details jsonb not null,
  status text not null default 'pending' check (status in ('pending','approved','rejected')),
  requested_at timestamptz not null default now(),
  reviewed_by uuid references public.profiles(id),
  reviewed_at timestamptz,
  check (jsonb_typeof(details) = 'object'),
  check ((status = 'pending' and reviewed_by is null and reviewed_at is null) or
         (status <> 'pending' and reviewed_by is not null and reviewed_at is not null))
);
create unique index membership_requests_one_pending on public.membership_requests(profile_id) where status = 'pending';
create index membership_requests_status_date on public.membership_requests(status, requested_at desc);
alter table public.membership_requests enable row level security;
revoke all on public.membership_requests from public, anon, authenticated;
grant select on public.membership_requests to authenticated;

create or replace function private.current_global_role() returns text
language sql stable security definer set search_path = '' as $$
  select p.role from public.profiles p where p.id = (select auth.uid())
$$;
create or replace function public.get_my_role() returns text
language sql stable security definer set search_path = '' as $$
  select p.role from public.profiles p where p.id = (select auth.uid())
$$;
create or replace function public.is_admin() returns boolean
language sql stable security definer set search_path = '' as $$
  select coalesce(public.get_my_role() in ('diretor','coordenador'), false)
$$;
create or replace function public.is_member_or_admin() returns boolean
language sql stable security definer set search_path = '' as $$
  select coalesce(public.get_my_role() in ('membro','diretor','coordenador'), false)
$$;
create or replace function public.is_learning_staff() returns boolean
language sql stable security definer set search_path = '' as $$
  select public.is_admin()
$$;

create policy membership_requests_read on public.membership_requests for select to authenticated
  using (profile_id = (select auth.uid()) or (select private.current_global_role()) in ('diretor','coordenador'));

-- Signup metadata never controls role or approval status.
create or replace function private.provision_profile(user_id uuid) returns void
language plpgsql security definer set search_path = '' as $$
begin
  insert into public.profiles(id,name,email,role,status_membro,team,affiliation,avatar_url,lattes,github,linkedin,kaggle)
    select u.id, coalesce(nullif(u.raw_user_meta_data->>'name',''), split_part(u.email,'@',1), 'Usuário'),
      u.email, 'externo', 'none', u.raw_user_meta_data->>'team', u.raw_user_meta_data->>'affiliation',
      u.raw_user_meta_data->>'avatar_url', u.raw_user_meta_data->>'lattes', u.raw_user_meta_data->>'github',
      u.raw_user_meta_data->>'linkedin', u.raw_user_meta_data->>'kaggle'
    from auth.users u where u.id = user_id
  on conflict (id) do nothing;
end $$;

create or replace function private.guard_profile_fields() returns trigger
language plpgsql set search_path = '' as $$
begin
  if current_user in ('anon','authenticated') then
    if new.id is distinct from old.id or new.email is distinct from old.email
       or new.role is distinct from old.role or new.status_membro is distinct from old.status_membro then
      raise exception 'Protected identity fields' using errcode='42501';
    end if;
    if (to_jsonb(new)->'category' is distinct from to_jsonb(old)->'category'
       or to_jsonb(new)->'director_role' is distinct from to_jsonb(old)->'director_role')
       and private.current_global_role() not in ('diretor','coordenador') then
      raise exception 'Only administrators manage organizational classification' using errcode='42501';
    end if;
  end if;
  return new;
end $$;

drop policy if exists ligia_profiles_read on public.profiles;
drop policy if exists ligia_profiles_update on public.profiles;
create policy ligia_profiles_read on public.profiles for select to authenticated
using (id = (select auth.uid()) or (select private.current_global_role()) in ('diretor','coordenador')
  or ((select private.current_global_role()) = 'membro' and role in ('membro','diretor','coordenador')));
create policy ligia_profiles_update on public.profiles for update to authenticated
using (id = (select auth.uid()) or (select private.current_global_role()) in ('diretor','coordenador'))
with check (id = (select auth.uid()) or (select private.current_global_role()) in ('diretor','coordenador'));

do $$ declare tbl text;
begin
  foreach tbl in array array['projects','project_members','milestones','milestone_members','tasks','notes',
    'project_docs','guides','research_docs','notifications','event_participants','certificates'] loop
    execute format('drop policy ligia_internal_boundary on public.%I', tbl);
    execute format('create policy ligia_internal_boundary on public.%I as restrictive for all to public using ((select private.current_global_role()) in (''membro'',''diretor'',''coordenador'')) with check ((select private.current_global_role()) in (''membro'',''diretor'',''coordenador''))', tbl);
  end loop;
end $$;
drop policy if exists ligia_events_read_boundary on public.events;
create policy ligia_events_read_boundary on public.events as restrictive for select to public
using (visibility = 'public' or (select private.current_global_role()) in ('membro','diretor','coordenador'));
do $$ declare op text;
begin
  foreach op in array array['insert','update','delete'] loop
    execute format('drop policy ligia_events_%s_boundary on public.events', op);
    execute format('create policy ligia_events_%s_boundary on public.events as restrictive for %s to public %s %s', op, op,
      case when op <> 'insert' then 'using ((select private.current_global_role()) in (''membro'',''diretor'',''coordenador''))' else '' end,
      case when op <> 'delete' then 'with check ((select private.current_global_role()) in (''membro'',''diretor'',''coordenador''))' else '' end);
  end loop;
end $$;
do $$ declare tbl text; op text;
begin
  foreach tbl in array array['projects','guides','research_docs'] loop
    foreach op in array array['insert','update','delete'] loop
      if tbl = 'projects' and op = 'update' then continue; end if;
      execute format('drop policy ligia_admin_%s on public.%I', op, tbl);
      execute format('create policy ligia_admin_%s on public.%I as restrictive for %s to public %s %s', op, tbl, op,
        case when op <> 'insert' then 'using ((select private.current_global_role()) in (''diretor'',''coordenador''))' else '' end,
        case when op <> 'delete' then 'with check ((select private.current_global_role()) in (''diretor'',''coordenador''))' else '' end);
    end loop;
  end loop;
end $$;

-- Reconcile manually assigned roles with the workflow state; pending applications
-- must be reviewed before a direct administrative role change.
create or replace function public.change_profile_role(target_id uuid, new_role text) returns public.profiles
language plpgsql security definer set search_path = '' as $$
declare actor_role text; updated public.profiles;
begin
  select p.role into actor_role from public.profiles p where p.id = (select auth.uid()) for update;
  if actor_role not in ('diretor','coordenador') or actor_role is null then
    raise exception 'Administrator required' using errcode='42501';
  end if;
  if target_id = (select auth.uid()) then raise exception 'Cannot change your own role' using errcode='42501'; end if;
  if new_role not in ('externo','membro','diretor','coordenador') or new_role is null then
    raise exception 'Invalid role' using errcode='22023';
  end if;
  if exists (select 1 from public.membership_requests where profile_id = target_id and status = 'pending') then
    raise exception 'Review the pending membership request first' using errcode='23514';
  end if;
  update public.profiles set role = new_role,
    status_membro = case when new_role = 'externo' then 'none' else 'approved' end
    where id = target_id returning * into updated;
  if not found then raise exception 'Profile not found' using errcode='P0002'; end if;
  return updated;
end $$;

create or replace function public.submit_membership_request(member_details jsonb) returns public.membership_requests
language plpgsql security definer set search_path = '' as $$
declare actor_id uuid := auth.uid(); actor public.profiles; created public.membership_requests;
begin
  if actor_id is null then raise exception 'Authentication required' using errcode='42501'; end if;
  select * into actor from public.profiles where id = actor_id for update;
  if actor.id is null or actor.role <> 'externo' or actor.status_membro = 'pending' then
    raise exception 'Not eligible to submit a membership request' using errcode='42501';
  end if;
  if jsonb_typeof(member_details) is distinct from 'object'
    or length(trim(coalesce(member_details->>'name',''))) < 2
    or length(trim(coalesce(member_details->>'team',''))) < 2
    or length(trim(coalesce(member_details->>'discipline',''))) < 2
    or length(trim(coalesce(member_details->>'motivation',''))) < 20 then
    raise exception 'Complete name, team, discipline and motivation' using errcode='22023';
  end if;
  insert into public.membership_requests(profile_id, details)
    values (actor_id, jsonb_build_object(
      'name', trim(member_details->>'name'), 'team', trim(member_details->>'team'),
      'discipline', trim(member_details->>'discipline'), 'motivation', trim(member_details->>'motivation'),
      'affiliation', trim(coalesce(member_details->>'affiliation','')),
      'bio', trim(coalesce(member_details->>'bio','')),
      'github', trim(coalesce(member_details->>'github','')),
      'linkedin', trim(coalesce(member_details->>'linkedin','')))) returning * into created;
  update public.profiles set status_membro = 'pending' where id = actor_id;
  return created;
end $$;

create or replace function public.review_membership_request(request_id uuid, approve boolean) returns public.membership_requests
language plpgsql security definer set search_path = '' as $$
declare actor_id uuid := auth.uid(); actor_role text; target public.membership_requests; result public.membership_requests;
begin
  if approve is null then raise exception 'Review decision required' using errcode='22023'; end if;
  select role into actor_role from public.profiles where id = actor_id for update;
  if actor_role not in ('diretor','coordenador') or actor_role is null then
    raise exception 'Administrator required' using errcode='42501';
  end if;
  select * into target from public.membership_requests where id = request_id for update;
  if target.id is null or target.status <> 'pending' then
    raise exception 'Pending request not found' using errcode='P0002';
  end if;
  if target.profile_id = actor_id then raise exception 'Cannot review your own request' using errcode='42501'; end if;
  if not exists (select 1 from public.profiles where id = target.profile_id and role = 'externo' and status_membro = 'pending' for update) then
    raise exception 'Applicant state changed' using errcode='23514';
  end if;
  if approve then
    update public.profiles set role = 'membro', status_membro = 'approved',
      name = target.details->>'name', team = target.details->>'team',
      discipline = target.details->>'discipline', affiliation = target.details->>'affiliation',
      bio = target.details->>'bio', github = target.details->>'github', linkedin = target.details->>'linkedin'
      where id = target.profile_id;
  else
    update public.profiles set status_membro = 'rejected' where id = target.profile_id;
  end if;
  update public.membership_requests set status = case when approve then 'approved' else 'rejected' end,
    reviewed_by = actor_id, reviewed_at = now() where id = request_id returning * into result;
  return result;
end $$;
revoke all on function public.submit_membership_request(jsonb), public.review_membership_request(uuid,boolean) from public,anon,authenticated;
grant execute on function public.submit_membership_request(jsonb), public.review_membership_request(uuid,boolean) to authenticated;

-- A table-level SELECT would expose the private judge tests, regardless of the UI.
alter table public.challenges add column tests_count integer generated always as (jsonb_array_length(tests)) stored;
revoke select on public.challenges from public, anon, authenticated;
do $$ declare cols text;
begin
  select string_agg(quote_ident(column_name), ',') into cols
  from information_schema.columns where table_schema = 'public' and table_name = 'challenges' and column_name <> 'tests';
  execute format('grant select (%s) on public.challenges to authenticated', cols);
end $$;
commit;
