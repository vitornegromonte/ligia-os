-- PROPOSAL, NOT A DEPLOYED MIGRATION.
-- Existing schema is unavailable. This file assumes profiles.id UUID and role TEXT.
-- Fails on unknown auth triggers rather than silently composing unsafe provisioning.
begin;
do $$
begin
  if not exists(select 1 from information_schema.columns where table_schema='public' and table_name='profiles' and column_name='id' and udt_name='uuid')
     or not exists(select 1 from information_schema.columns where table_schema='public' and table_name='profiles' and column_name='role' and udt_name='text') then
    raise exception 'Inspect the real schema: profiles.id UUID and profiles.role TEXT required';
  end if;
  if exists(select 1 from public.profiles where role is null or role not in ('visitante','membro','admin')) then
    raise exception 'Review existing null/unknown roles manually before migration';
  end if;
  if exists(select 1 from pg_trigger where tgrelid='auth.users'::regclass and not tgisinternal and tgname <> 'ligia_provision_profile') then
    raise exception 'Review existing auth.users triggers before replacing provisioning';
  end if;
end $$;

create schema if not exists private;
revoke all on schema private from public;
grant usage on schema private to authenticated, anon;

alter table public.profiles alter column role set default 'visitante';
alter table public.profiles alter column role set not null;
alter table public.profiles drop constraint if exists ligia_profiles_role_check;
alter table public.profiles add constraint ligia_profiles_role_check check(role in ('visitante','membro','admin'));
alter table public.profiles enable row level security;

-- Owner must be a trusted database role with BYPASSRLS (postgres in Supabase).
create or replace function private.current_global_role() returns text
language sql stable security definer set search_path = '' as $$
  select p.role from public.profiles p where p.id=(select auth.uid())
$$;
revoke all on function private.current_global_role() from public, anon, authenticated;
grant execute on function private.current_global_role() to anon, authenticated;

-- Authenticated clients cannot INSERT/DELETE profiles or UPDATE role/id/email.
-- Remove both table-level and any inherited PUBLIC/column-level application grants.
revoke all on public.profiles from public, anon, authenticated;
do $$ declare col record;
begin
  for col in select column_name from information_schema.columns where table_schema='public' and table_name='profiles' loop
    execute format('revoke all (%I) on public.profiles from public, anon, authenticated', col.column_name);
  end loop;
end $$;
grant select on public.profiles to authenticated;
do $$ declare col record;
begin
  for col in select column_name from information_schema.columns where table_schema='public' and table_name='profiles'
    and column_name = any(array['name','initials','team','discipline','skills','project','affiliation','capacity','research_interests','color','lattes','github','linkedin','kaggle','cv','bio','history','avatar_url','category','director_role','calendar_url','resume_text']) loop
    execute format('grant update (%I) on public.profiles to authenticated', col.column_name);
  end loop;
end $$;

-- Replace only profile policies, after inventory/review. Other tables keep theirs.
do $$ declare pol record;
begin
  for pol in select policyname from pg_policies where schemaname='public' and tablename='profiles' loop
    execute format('drop policy %I on public.profiles', pol.policyname);
  end loop;
end $$;
create policy ligia_profiles_read on public.profiles for select to authenticated
using (id=(select auth.uid()) or (select private.current_global_role())='admin'
  or ((select private.current_global_role())='membro' and role in ('membro','admin')));
create policy ligia_profiles_update on public.profiles for update to authenticated
using (id=(select auth.uid()) or (select private.current_global_role())='admin')
with check (id=(select auth.uid()) or (select private.current_global_role())='admin');

-- Category/director_role remain organizational fields, editable only by admins.
-- INvoker privileges here are deliberate; security-definer role RPC runs as owner.
create or replace function private.guard_profile_fields() returns trigger
language plpgsql set search_path = '' as $$
begin
  if current_user in ('anon','authenticated') then
    if new.id is distinct from old.id or new.email is distinct from old.email or new.role is distinct from old.role then
      raise exception 'Protected identity fields' using errcode='42501';
    end if;
    if (to_jsonb(new)->'category' is distinct from to_jsonb(old)->'category'
       or to_jsonb(new)->'director_role' is distinct from to_jsonb(old)->'director_role')
       and private.current_global_role() is distinct from 'admin' then
      raise exception 'Only admins manage organizational classification' using errcode='42501';
    end if;
  end if;
  return new;
end $$;
revoke all on function private.guard_profile_fields() from public, anon, authenticated;
drop trigger if exists ligia_guard_profile_fields on public.profiles;
create trigger ligia_guard_profile_fields before update on public.profiles for each row execute function private.guard_profile_fields();

create or replace function private.provision_profile(user_id uuid) returns void
language plpgsql security definer set search_path = '' as $$
begin
  insert into public.profiles(id,name,email,role,team,affiliation,avatar_url,lattes,github,linkedin,kaggle)
    select u.id, coalesce(nullif(u.raw_user_meta_data->>'name',''), split_part(u.email,'@',1), 'Usuário'), u.email, 'visitante',
      u.raw_user_meta_data->>'team', u.raw_user_meta_data->>'affiliation', u.raw_user_meta_data->>'avatar_url',
      u.raw_user_meta_data->>'lattes', u.raw_user_meta_data->>'github', u.raw_user_meta_data->>'linkedin', u.raw_user_meta_data->>'kaggle'
    from auth.users u where u.id=user_id
  on conflict (id) do nothing;
end $$;
revoke all on function private.provision_profile(uuid) from public, anon, authenticated;

create or replace function private.on_auth_user() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  perform private.provision_profile(new.id);
  if tg_op='UPDATE' then update public.profiles set email=new.email where id=new.id; end if;
  return new;
end $$;
revoke all on function private.on_auth_user() from public, anon, authenticated;
drop trigger if exists ligia_provision_profile on auth.users;
create trigger ligia_provision_profile after insert or update of email on auth.users
for each row execute function private.on_auth_user();

-- Backfill only missing identities; never overwrite an existing member/admin.
select private.provision_profile(id) from auth.users;

create or replace function public.change_profile_role(target_id uuid, new_role text) returns public.profiles
language plpgsql security definer set search_path = '' as $$
declare actor_role text; updated public.profiles;
begin
  -- Serialize against concurrent demotion of the caller.
  select p.role into actor_role from public.profiles p where p.id=(select auth.uid()) for update;
  if actor_role is distinct from 'admin' then raise exception 'Admin required' using errcode='42501'; end if;
  if target_id=(select auth.uid()) then raise exception 'Cannot change your own role' using errcode='42501'; end if;
  if new_role is null or new_role not in ('visitante','membro','admin') then raise exception 'Invalid role' using errcode='22023'; end if;
  update public.profiles set role=new_role where id=target_id returning * into updated;
  if not found then raise exception 'Profile not found' using errcode='P0002'; end if;
  return updated;
end $$;
revoke all on function public.change_profile_role(uuid,text) from public, anon, authenticated;
grant execute on function public.change_profile_role(uuid,text) to authenticated;
commit;
