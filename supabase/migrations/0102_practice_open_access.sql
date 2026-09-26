-- ===========================================================================
-- 0102 — Abre a prática de código a todos os papéis
--
-- ATENÇÃO: esta migração ALTERA POLÍTICAS EXISTENTES do ligia-os. Não rode
-- sem o aval do dono do schema.
--
-- Motivo: a área de aprendizado é de acesso geral — visitante, membro e admin
-- entram igual. Mas as políticas atuais de challenges/submissions (migração
-- 0018) exigem is_member_or_admin(), então um `visitante` hoje:
--   - não lê o catálogo de desafios (fetchChallenges cai silenciosamente no
--     JSON embutido, e o app parece funcionar — o que esconde o problema);
--   - não consegue registrar submissão nenhuma.
--
-- Depois desta migração, ler o catálogo e submeter o próprio código passa a
-- exigir apenas sessão. Continua valendo: cada um só lê as PRÓPRIAS
-- submissões (ou todas, se for admin).
-- ===========================================================================

-- Catálogo: qualquer autenticado lê.
drop policy if exists "Membro le challenges" on public.challenges;
drop policy if exists "challenges_read_authenticated" on public.challenges;
create policy "challenges_read_authenticated" on public.challenges
  for select using (auth.uid() is not null);

-- Submissão: qualquer autenticado cria, desde que em nome próprio.
drop policy if exists "Membro cria submission" on public.submissions;
drop policy if exists "submissions_insert_own" on public.submissions;
-- Official outcomes are inserted exclusively by the authenticated Edge judge.
revoke insert, update, delete, truncate, references, trigger on public.submissions from public, anon, authenticated;
grant select on public.submissions to authenticated;
grant all on public.submissions to service_role;

-- Leitura permanece restrita ao dono (e ao admin). Recriada aqui só para o
-- caso de o nome antigo ter sido removido; o efeito é o mesmo de 0018.
drop policy if exists "Dono le submissions" on public.submissions;
drop policy if exists "submissions_read_own" on public.submissions;
create policy "submissions_read_own" on public.submissions
  for select using (auth.uid() = profile_id or public.is_admin());

-- Remove only the legacy global boundary, if an earlier proposal installed it.
drop policy if exists ligia_internal_boundary on public.challenges;
drop policy if exists ligia_internal_boundary on public.submissions;
revoke all on public.challenges from anon;
revoke truncate, references, trigger on public.challenges from public, authenticated;
grant select, insert, update, delete on public.challenges to authenticated;
