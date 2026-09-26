-- ===========================================================================
-- 0104 — Alternativa escolhida por questão no nivelamento
--
-- `resultados` guarda só acerto / erro / "Não sei". Para a análise de itens
-- achar distrator que ninguém marca, e para o resultado apontar o equívoco da
-- alternativa errada, é preciso saber QUAL alternativa o aluno marcou.
--
-- Chave = id da forma da questão; valor = índice da opção no conteúdo, antes
-- do embaralhamento. Rodadas anteriores ficam com '{}'.
--
-- Precisa ser aplicada antes do deploy do front que lê e grava a coluna: o
-- sync seleciona `respostas` explicitamente.
-- ===========================================================================

alter table public.pretest_results
  add column if not exists respostas jsonb not null default '{}'::jsonb;

comment on column public.pretest_results.respostas is
  'Alternativa escolhida por questão: {id_da_forma: índice da opção original}. Lida pela análise de itens (staff).';
