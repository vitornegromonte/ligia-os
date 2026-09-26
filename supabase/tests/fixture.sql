-- Representative schema for SQL behavior tests, NOT a dump of the live project.
create role anon nologin;
create role authenticated nologin;
create schema auth;
create table auth.users(id uuid primary key, email text, raw_user_meta_data jsonb default '{}');
create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid $$;
grant usage on schema auth to anon, authenticated;
grant execute on function auth.uid() to anon, authenticated;
create table public.profiles(
  id uuid primary key references auth.users(id), name text not null, email text,
  role text not null default 'membro', category text default 'membro', director_role text default '',
  initials text, team text, discipline text, affiliation text, avatar_url text,
  lattes text, github text, linkedin text, kaggle text, bio text, skills text[],
  research_interests text, project text, capacity text, color text, cv text,
  history jsonb, calendar_url text, resume_text text
);
insert into auth.users(id,email) values
 ('00000000-0000-0000-0000-000000000001','visitor@test'),
 ('00000000-0000-0000-0000-000000000002','member@test'),
 ('00000000-0000-0000-0000-000000000003','admin@test'),
 ('00000000-0000-0000-0000-000000000004','missing@test');
insert into profiles(id,name,email,role) select id,email,email,case when email='admin@test' then 'admin' when email='member@test' then 'membro' else 'visitante' end from auth.users where email <> 'missing@test';
grant all on public.profiles to anon, authenticated;
grant update(role) on public.profiles to authenticated;
alter table profiles enable row level security;
create policy old_unsafe_profiles on profiles for all to public using(true) with check(true);

do $$ declare tbl text;
begin
  foreach tbl in array array['projects','project_members','milestones','milestone_members','tasks','notes','project_docs','guides','research_docs','notifications','event_participants','challenges','submissions'] loop
    execute format('create table public.%I(id int primary key, profile_id uuid, project_id int, title text)',tbl);
    execute format('insert into public.%I(id,title) values(1,''Internal data'')',tbl);
    execute format('alter table public.%I enable row level security',tbl);
    -- Deliberately permissive: the new restrictive boundary must still deny visitors.
    execute format('create policy baseline on public.%I for all to public using(true) with check(true)',tbl);
    execute format('grant all on public.%I to anon,authenticated',tbl);
  end loop;
end $$;
create table events(id int primary key, visibility text, title text);
insert into events values(1,'public','Public event'),(2,'internal','Internal event');
alter table events enable row level security;
create policy baseline on events for all to public using(true) with check(true);
grant all on events to anon,authenticated;

create function public.test_assert(condition boolean, label text) returns void language plpgsql as $$
begin if condition is distinct from true then raise exception 'FAILED: %',label; end if; end $$;
create function public.test_denied(statement text) returns void language plpgsql as $$
begin
  begin execute statement;
  exception when insufficient_privilege then return; end;
  raise exception 'FAILED: operation was permitted: %',statement;
end $$;
