# Supabase — schema e Edge Functions

## Migrações

```
migrations/
  0018_challenges_submissions.sql   recuperado do histórico (challenges + submissions)
  0100_learning_core.sql            tabelas da trilha, RLS, export_student_v1
  0101_rate_limit.sql               consume_rate_limit()
  0102_practice_open_access.sql     ⚠️ ALTERA policies existentes
  0103_practice_progress.sql        view minhas_praticas_codigo
seed/
  challenges.sql                    os 41 desafios Torch
```

**Falta o baseline.** As 16 tabelas do ligia-os só existem dentro do projeto
Supabase; não há dump versionado. Antes de aplicar qualquer coisa:

```bash
supabase db dump --schema-only > supabase/migrations/0000_baseline.sql
```

Sem isso não dá para saber se `profiles` tem coluna `NOT NULL` sem default,
nem como `is_admin()` / `is_member_or_admin()` estão definidas.

**A 0102 precisa de aval.** Ela troca as policies de `challenges` e
`submissions` para que qualquer usuário autenticado leia o catálogo e submeta
o próprio código. Hoje ambas exigem `is_member_or_admin()`, e por isso um
`visitante` não consegue praticar — o que contradiz o acesso geral da área de
aprendizado. É uma mudança no modelo de segurança do ligia-os, não no nosso.

## Edge Functions

| Função | O que faz |
|---|---|
| `loop-avaliar` | Corrige uma resposta aberta contra a rubrica |
| `loop-perguntar` | Tutor do conceito, para dúvidas durante a prática |

Substituem as rotas `/api/loop/*` do Next.js. Duas diferenças importantes:
as rotas antigas eram **abertas**, freadas só por um limitador em memória por
IP (ficção em serverless — cada instância tem o próprio balde); aqui exigem
sessão e o limite é por usuário, numa linha do Postgres.

### Segredos

```bash
supabase secrets set GEMINI_API_KEY=...
supabase secrets set GEMINI_MODEL=gemini-flash-latest   # opcional
```

Nunca numa variável `VITE_*`: isso a mandaria para o bundle do browser.
`SUPABASE_URL`, `SUPABASE_ANON_KEY` e `SUPABASE_SERVICE_ROLE_KEY` já vêm
injetadas pela plataforma.

Sem `GEMINI_API_KEY`, a função responde 503 e a prática cai na auto-avaliação
contra a rubrica — que continua sendo prática legítima, só sem feedback.

### Deploy

O `contexto` dos loops (material de fundamentação com respostas de
referência) vive em `_shared/generated/loops.full.json`, gerado por
`scripts/build-content.mjs`. **Rode `npm run content` antes de publicar**,
senão a função sobe com conteúdo velho.

```bash
npm run content
supabase functions deploy loop-avaliar
supabase functions deploy loop-perguntar
```

Local:

```bash
supabase functions serve --env-file supabase/.env.local
```

### Contrato de resposta

Ambas devolvem `text/plain` em **streaming**. Em `loop-avaliar` a primeira
linha é `acertei`, `parcial` ou `errei`, e o resto é o feedback em markdown.
O parser está em `_shared/verdict.ts`, importado pelos dois lados.

Quando o veredito não é reconhecido, o cliente trata como falha e cai na
auto-avaliação. Ele **nunca** assume `parcial`: um veredito fantasma
contaminaria o agendamento de revisão e a matriz de competências.
