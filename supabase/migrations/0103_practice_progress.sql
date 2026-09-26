-- ===========================================================================
-- 0103 — Estado resolvido da prática de código
--
-- Hoje não existe camada de progresso nenhuma no /pratica: Practice.jsx nunca
-- chama fetchMySubmissions, então os 41 cards ficam idênticos independente do
-- que o aluno já resolveu. Derivar isso de submissions é barato — os dois
-- índices necessários já existem desde a 0018.
--
-- Une as duas modalidades de prática num só painel: loop_results (conceitual,
-- com domínio e revisão espaçada) e submissions (código, append-only).
-- ===========================================================================

create or replace view public.minhas_praticas_codigo
with (security_invoker = true) as
select
  s.profile_id                                              as user_id,
  c.slug,
  bool_or(s.status = 'passed')                              as resolvido,
  count(*)::int                                             as tentativas,
  min(s.created_at) filter (where s.status = 'passed')      as resolvido_em,
  max(s.created_at)                                         as ultima_tentativa
from public.submissions s
join public.challenges c on c.id = s.challenge_id
group by s.profile_id, c.slug;

comment on view public.minhas_praticas_codigo is
  'Estado resolvido por tarefa. security_invoker herda a RLS de submissions: sem isso a view rodaria como dono e exporia a submissão de todo mundo.';
