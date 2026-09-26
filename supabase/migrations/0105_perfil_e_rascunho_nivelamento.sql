-- ===========================================================================
-- 0105 — "Quem é você" e rascunho do nivelamento, por conta
--
-- learner_profiles: as respostas do auto-relato do aluno, a versão mais
-- recente. Até aqui elas só existiam dentro de uma rodada CONCLUÍDA
-- (pretest_results.auto_relato), então quem parava no meio não deixava
-- registro, e nenhum admin via essas respostas. Staff lê (Membros e análise
-- do nivelamento).
--
-- nivelamento_rascunhos: o teste em andamento ("terminar depois"), para
-- continuar em qualquer dispositivo. Uma linha por aluno; o sync apaga a
-- linha quando a rodada termina. Staff NÃO lê: é trabalho em curso.
--
-- `updated_at` vem do cliente, como `taken_at` em pretest_results: o merge
-- local-first compara os carimbos dos dois lados.
-- ===========================================================================

create table if not exists public.learner_profiles (
  user_id          uuid primary key references auth.users(id) on delete cascade,
  auto_relato      jsonb not null,                -- {ar1: [0, 3], ...} (índices das opções)
  textos_outro     jsonb not null default '{}'::jsonb,  -- {ar2: "Rust", ...}
  content_version  text not null,
  updated_at       timestamptz not null
);

create table if not exists public.nivelamento_rascunhos (
  user_id          uuid primary key references auth.users(id) on delete cascade,
  estado           jsonb not null,                -- passo, respostas, autoRelato, textosOutro, seed, prova
  content_version  text not null,
  updated_at       timestamptz not null
);

alter table public.learner_profiles      enable row level security;
alter table public.nivelamento_rascunhos enable row level security;

-- Mesmo contrato da 0100: o aluno manda no próprio registro.
do $$
declare t text;
begin
  foreach t in array array['learner_profiles', 'nivelamento_rascunhos'] loop
    execute format('drop policy if exists %I_own on public.%I', t, t);
    execute format(
      'create policy %I_own on public.%I for all using (auth.uid() = user_id) with check (auth.uid() = user_id)',
      t, t);
  end loop;
end $$;

-- Só o perfil é lido por staff.
drop policy if exists learner_profiles_staff_read on public.learner_profiles;
create policy learner_profiles_staff_read on public.learner_profiles
  for select using (public.is_learning_staff());

comment on table public.learner_profiles is
  'Respostas mais recentes do "quem é você" do nivelamento. Lida por staff em Membros e na análise do nivelamento.';
comment on table public.nivelamento_rascunhos is
  'Nivelamento em andamento, para continuar em outro dispositivo. Apagado pelo sync quando a rodada termina.';
