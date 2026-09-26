-- ===========================================================================
-- 0100 — Núcleo da área de aprendizado (Trilha LigIA)
--
-- Estado por aluno da trilha. O CONTEÚDO continua no Git (content/), aqui só
-- mora o que é do usuário: progresso, práticas, nivelamento e eventos.
--
-- Adaptado do schema da plataforma Next.js. Quatro coisas mudaram, e cada
-- uma por um motivo específico:
--
--   1. NÃO cria public.profiles nem trigger em auth.users.
--      O ligia-os cria o perfil no cliente (AuthContext.fetchProfile), e só
--      quando a linha FALTA. Um trigger nosso criando `(id, email)` faria
--      esse enriquecimento nunca rodar — name, role, avatar_url, team e
--      affiliation ficariam vazios para sempre. E se profiles tiver alguma
--      coluna NOT NULL sem default, o insert do trigger lança, o trigger
--      falha, e o insert em auth.users falha junto: NINGUÉM se cadastra.
--
--   2. FK aponta para auth.users(id), não profiles(id).
--      Elimina a corrida com a criação client-side do perfil: um aluno pode
--      gravar progresso antes de a linha de profiles existir.
--
--   3. is_staff() virou is_learning_staff() e fala o vocabulário de papéis
--      daqui (visitante | membro | admin). A original testava
--      role in ('mentor','diretoria'), que não existe neste banco — não daria
--      erro, apenas nunca concederia nada. Falha silenciosa é a pior espécie.
--
--   4. export_student_v1 não seleciona p.cohort: a coluna não existe aqui.
--
-- Idempotente de ponta a ponta.
-- ===========================================================================

-- Progresso por nó da trilha (espelha ligia-skill-tree:status:v1).
create table if not exists public.student_progress (
  user_id     uuid not null references auth.users(id) on delete cascade,
  node_id     text not null,
  status      text not null check (status in ('in-progress', 'done')),
  updated_at  timestamptz not null default now(),
  primary key (user_id, node_id)
);

-- Placar das práticas conceituais (espelha ligia-loop:results:v1).
-- Guarda o RESULTADO, não só "fez": o streak alimenta o agendamento espaçado.
-- O nível de domínio NÃO é coluna — a fórmula vive em loopMastery() (TS), e
-- duplicá-la em SQL criaria duas verdades que divergem na primeira mudança.
create table if not exists public.loop_results (
  user_id       uuid not null references auth.users(id) on delete cascade,
  concept_id    text not null,
  practiced_at  timestamptz not null,
  times         int not null default 1,
  streak        int not null default 0,
  acertei       int not null default 0,
  parcial       int not null default 0,
  errei         int not null default 0,
  total         int not null default 0,
  primary key (user_id, concept_id)
);

-- Rodadas de nivelamento (espelha ligia-pretest:result:v2).
-- O jsonb é a VERDADE; as colunas geradas existem só para indexar e agregar
-- sem reimplementar a fórmula.
create table if not exists public.pretest_results (
  id               uuid primary key default gen_random_uuid(),
  user_id          uuid not null references auth.users(id) on delete cascade,
  taken_at         timestamptz not null,
  schema_version   int  not null default 2,
  content_version  text not null,
  matriz           jsonb not null,
  resultados       jsonb not null,
  auto_relato      jsonb,
  recomendacao     jsonb not null,
  -- Intenção do aluno, não derivado do score: sem persistir, trocar de
  -- dispositivo re-trava os módulos que ele já dispensou.
  dispensas_confirmadas jsonb not null default '[]'::jsonb,
  score_matematica         numeric generated always as ((matriz->'matematica'->>'score')::numeric) stored,
  score_ml_classico        numeric generated always as ((matriz->'ml-classico'->>'score')::numeric) stored,
  score_dl_fundamentos     numeric generated always as ((matriz->'dl-fundamentos'->>'score')::numeric) stored,
  score_dl_aplicado        numeric generated always as ((matriz->'dl-aplicado'->>'score')::numeric) stored,
  score_transformers_llms  numeric generated always as ((matriz->'transformers-llms'->>'score')::numeric) stored
);

create index if not exists pretest_results_user_taken_idx
  on public.pretest_results (user_id, taken_at desc);

-- Uma rodada por (aluno, instante). Sem isto o upsert do sync insere a MESMA
-- rodada a cada sincronização, já que a PK é um uuid do default.
create unique index if not exists pretest_results_user_taken_uniq
  on public.pretest_results (user_id, taken_at);

-- Log append-only de aprendizagem (espelha ligia-events:v1).
create table if not exists public.learning_events (
  id           uuid primary key,
  user_id      uuid not null references auth.users(id) on delete cascade,
  type         text not null check (type in
                 ('pretest_completed','node_status_changed','loop_completed','dispensa_confirmada')),
  object       text not null,
  data         jsonb,
  occurred_at  timestamptz not null
);

create index if not exists learning_events_user_time_idx
  on public.learning_events (user_id, occurred_at desc);

-- ---------------------------------------------------------------------------
-- RLS: o aluno manda nos próprios dados; staff só lê.
--
-- Nenhuma política olha PAPEL para conceder acesso de aluno: a área de
-- aprendizado é aberta a visitante, membro e admin igualmente. `auth.uid() =
-- user_id` é o contrato inteiro.
-- ---------------------------------------------------------------------------
alter table public.student_progress  enable row level security;
alter table public.pretest_results   enable row level security;
alter table public.learning_events   enable row level security;
alter table public.loop_results      enable row level security;

create or replace function public.is_learning_staff()
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and role = 'admin'
  );
$$;

comment on function public.is_learning_staff() is
  'Quem pode LER o progresso de outros alunos. Deliberadamente separada de is_admin(): se um dia surgir um papel de mentor, ele entra aqui sem virar admin do resto do sistema.';

do $$
declare t text;
begin
  foreach t in array array['student_progress', 'pretest_results', 'learning_events', 'loop_results'] loop
    execute format('drop policy if exists %I_own on public.%I', t, t);
    execute format(
      'create policy %I_own on public.%I for all using (auth.uid() = user_id) with check (auth.uid() = user_id)',
      t, t);
    execute format('drop policy if exists %I_staff_read on public.%I', t, t);
    execute format(
      'create policy %I_staff_read on public.%I for select using (public.is_learning_staff())', t, t);
  end loop;
end $$;

-- ---------------------------------------------------------------------------
-- CONTRATO ESTÁVEL para monitoramento externo.
-- Espelha StudentDataExport (src/lib/student-data.ts, schema_version 1).
-- Mudança incompatível => criar export_student_v2. NUNCA alterar o significado
-- das colunas da v1: existe consumidor do outro lado.
-- ---------------------------------------------------------------------------
create or replace view public.export_student_v1
with (security_invoker = true) as
select
  p.id                                   as user_id,
  p.email,
  p.name,
  p.role,
  1                                      as schema_version,
  pr.taken_at                            as pretest_taken_at,
  pr.content_version                     as pretest_content_version,
  pr.matriz                              as pretest_matriz,
  pr.recomendacao                        as pretest_recomendacao,
  pr.score_matematica,
  pr.score_ml_classico,
  pr.score_dl_fundamentos,
  pr.score_dl_aplicado,
  pr.score_transformers_llms,
  coalesce(pg.nos_concluidos, 0)         as nos_concluidos,
  coalesce(ev.total_eventos, 0)          as total_eventos,
  ev.ultimo_evento_em,
  -- Coluna nova entra SEMPRE no fim: `create or replace view` recusa inserir
  -- coluna no meio ("cannot change name of view column"), e acrescentar no
  -- fim não quebra consumidor que lê por nome.
  coalesce(lp.loops_praticados, 0)       as loops_praticados,
  lp.ultima_pratica_em
from public.profiles p
left join lateral (
  select * from public.pretest_results r
  where r.user_id = p.id
  order by r.taken_at desc
  limit 1
) pr on true
left join lateral (
  select count(*) filter (where s.status = 'done') as nos_concluidos
  from public.student_progress s where s.user_id = p.id
) pg on true
left join lateral (
  select count(*) as loops_praticados, max(l.practiced_at) as ultima_pratica_em
  from public.loop_results l where l.user_id = p.id
) lp on true
left join lateral (
  select count(*) as total_eventos, max(e.occurred_at) as ultimo_evento_em
  from public.learning_events e where e.user_id = p.id
) ev on true;

-- security_invoker: a view herda a RLS das tabelas-base. Sem isso ela roda
-- como o dono e expõe a coorte inteira a qualquer aluno.

-- ---------------------------------------------------------------------------
-- Colunas que entram em projeto que já rodou versão anterior deste arquivo.
-- `create table if not exists` não adiciona coluna em tabela existente.
-- ---------------------------------------------------------------------------
alter table public.pretest_results
  add column if not exists dispensas_confirmadas jsonb not null default '[]'::jsonb;
