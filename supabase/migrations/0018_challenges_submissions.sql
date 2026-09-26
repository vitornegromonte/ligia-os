-- ============================================
-- Ligia OS — Migration #18: Prática Torch (membros)
-- Desafios internos + submissões para fase B
-- ============================================

create table if not exists public.challenges (
  id uuid primary key default gen_random_uuid(),
  slug text unique not null,
  title text not null,
  difficulty text not null check (difficulty in ('Easy','Medium','Hard')),
  tags text[] default '{}',
  visibility text not null default 'internal' check (visibility in ('internal','selection')),
  description text not null default '',
  hint text default '',
  starter_code text not null default '',
  function_name text not null,
  tests jsonb not null default '[]'::jsonb,
  order_index int default 0,
  created_by uuid references public.profiles(id),
  created_at timestamptz default now()
);

create table if not exists public.submissions (
  id uuid primary key default gen_random_uuid(),
  challenge_id uuid references public.challenges(id) on delete cascade not null,
  profile_id uuid references public.profiles(id) on delete cascade not null,
  code text not null,
  status text not null check (status in ('passed','failed')) default 'failed',
  passed int default 0,
  total int default 0,
  time_ms float default 0,
  results jsonb default '[]'::jsonb,
  stdout text default '',
  stderr text default '',
  created_at timestamptz default now()
);

create index if not exists idx_challenges_slug on public.challenges(slug);
create index if not exists idx_challenges_difficulty on public.challenges(difficulty);
create index if not exists idx_submissions_challenge on public.submissions(challenge_id);
create index if not exists idx_submissions_profile on public.submissions(profile_id);
create index if not exists idx_submissions_created on public.submissions(created_at desc);

alter table public.challenges enable row level security;
alter table public.submissions enable row level security;

-- Challenges: só membro/admin vê internal
drop policy if exists "Membro le challenges" on public.challenges;
create policy "Membro le challenges"
  on public.challenges for select using (public.is_member_or_admin());

drop policy if exists "Admin cria challenges" on public.challenges;
create policy "Admin cria challenges"
  on public.challenges for insert with check (public.is_admin());

drop policy if exists "Admin edita challenges" on public.challenges;
create policy "Admin edita challenges"
  on public.challenges for update using (public.is_admin());

drop policy if exists "Admin deleta challenges" on public.challenges;
create policy "Admin deleta challenges"
  on public.challenges for delete using (public.is_admin());

-- Submissions: dono + admin
drop policy if exists "Dono le submissions" on public.submissions;
create policy "Dono le submissions"
  on public.submissions for select using (auth.uid() = profile_id or public.is_admin());

drop policy if exists "Membro cria submission" on public.submissions;
create policy "Membro cria submission"
  on public.submissions for insert with check (public.is_member_or_admin() and auth.uid() = profile_id);

-- Realtime
do $$ declare tbl text; begin
  if exists(select 1 from pg_publication where pubname='supabase_realtime') then
    foreach tbl in array array['challenges','submissions'] loop
      if not exists(select 1 from pg_publication_tables where pubname='supabase_realtime' and schemaname='public' and tablename=tbl) then
        execute format('alter publication supabase_realtime add table public.%I',tbl);
      end if;
    end loop;
  end if;
end $$;
