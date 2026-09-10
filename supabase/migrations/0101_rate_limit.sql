-- ===========================================================================
-- 0101 — Limitador de taxa por usuário autenticado
--
-- Substitui lib/rate-limit.ts da plataforma Next.js, que contava em memória
-- por IP. Em serverless aquilo é ficção: cada instância tem o próprio balde,
-- e o teto real vira (instâncias × limite). Aqui o balde é uma linha.
--
-- Chamado pelas Edge Functions com a chave service-role. Não há política de
-- acesso: security definer + nenhuma policy = ninguém lê ou escreve direto.
-- ===========================================================================

create table if not exists public.rate_limits (
  user_id       uuid not null references auth.users(id) on delete cascade,
  bucket        text not null,
  window_start  timestamptz not null default now(),
  count         int not null default 0,
  primary key (user_id, bucket)
);

alter table public.rate_limits enable row level security;
-- Sem policy: nenhum cliente enxerga ou altera o próprio balde.

/**
 * Consome uma unidade do balde. Devolve true se liberado.
 *
 * A janela é deslizante por reinício: passado p_window desde window_start, o
 * contador zera. Não é um sliding window exato — é barato, é uma linha por
 * (usuário, balde), e resolve o problema real, que é impedir que um aluno
 * queime a cota do Gemini ou do ZeroGPU sozinho.
 *
 * O upsert com `on conflict do update` é atômico, então duas requisições
 * simultâneas não passam as duas pelo limite.
 */
create or replace function public.consume_rate_limit(
  p_bucket text,
  p_limit int,
  p_window interval
) returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user uuid := auth.uid();
  v_count int;
begin
  if v_user is null then
    return false;  -- sem sessão não há balde; a função chamadora nega.
  end if;

  insert into public.rate_limits as rl (user_id, bucket, window_start, count)
  values (v_user, p_bucket, now(), 1)
  on conflict (user_id, bucket) do update
    set count = case
          when rl.window_start < now() - p_window then 1
          else rl.count + 1
        end,
        window_start = case
          when rl.window_start < now() - p_window then now()
          else rl.window_start
        end
  returning rl.count into v_count;

  return v_count <= p_limit;
end;
$$;

comment on function public.consume_rate_limit(text, int, interval) is
  'Consome uma unidade do balde do usuário atual. true = liberado. Chamada pelas Edge Functions; falha fechada quando não há sessão.';

revoke all on function public.consume_rate_limit(text, int, interval) from public, anon;
grant execute on function public.consume_rate_limit(text, int, interval) to service_role;
