# Área de aprendizado

A trilha de fundamentos de IA da Ligia, dentro do ligia-os. Substitui a
plataforma Next.js que vivia em repositório separado.

## Rotas

| Rota | O que é |
|---|---|
| `/aprender` | A trilha: 29 conceitos em 6 módulos, com estado e progresso |
| `/aprender/nivelamento` | Wizard de nivelamento e o resultado (matriz, dispensa) |
| `/aprender/c/:conceptId` | **Hub da lição** — material, aula, prática conceitual e de código |
| `/aprender/c/:conceptId/praticar` | Prática de recuperação, corrigida pelo avaliador |
| `/aprender/codar` | Catálogo dos 41 exercícios de PyTorch |
| `/aprender/codar/:slug` | Bancada: enunciado + Monaco + juiz |
| `/aprender/styleguide` | Referência viva do design system |

**Acesso geral**: exige sessão, mas nenhum papel. `visitante`, `membro` e
`admin` entram igual — estudar não é privilégio.

## O modelo

**O conteúdo mora no Git**, não no banco: `content/` e `src/content/`. Isso o
torna revisável por PR e versionável junto do código. O banco guarda só o que
é do aluno.

**O estado do aluno é local-first.** O `localStorage` continua sendo a leitura
síncrona da UI; o Postgres é a cópia durável. `SyncEstado` (montado no
`Layout`) sincroniza na montagem, no `SIGNED_IN` e ao sair da aba. O merge é
**comutativo e idempotente** — sincronizar duas vezes, ou em ordens
diferentes, dá o mesmo estado. Isso é invariante fixado em teste, não
aspiração.

**Estados de conceito são derivados, não guardados.** Só `in-progress` e
`done` são explícitos; `available` e `locked` saem dos pré-requisitos. Marcar
um conceito destranca quem depende dele, sem nenhuma escrita extra.

**A conclusão é declaração do aluno.** O sistema mostra a evidência (loop
dominado, exercícios resolvidos) e muda o convite — nunca marca por ele.

## As duas práticas

| | Recuperação | Código |
|---|---|---|
| O que faz | Perguntas abertas sobre o conceito | Implementar a peça em PyTorch |
| Correção | LLM contra a rubrica | Juiz remoto, bateria de testes |
| Guarda em | `loop_results` | `submissions` |
| Agenda revisão | Sim (Leitner: 3, 7, 16, 35, 90 dias) | Não |
| Cobre | 28 dos 29 conceitos | 20 dos 29 |

O mapeamento conceito ↔ exercício está em `src/content/praticas.json`. Nove
conceitos não têm exercício de código: cinco são conceituais por natureza
(M0 e o capstone); `train-val-test`, `knn`, `dataloaders` e
`transfer-learning` são lacunas reais do catálogo e estão marcadas com nota.

## Regras que não se negociam

**Nunca inventar veredito.** Se a correção falha — stream vazio, formato
inesperado, rede caída —, a UI cai na auto-avaliação contra a rubrica. Um
`parcial` fantasma contaminaria o agendamento de revisão e a matriz de
competências.

**O `contexto` dos loops nunca chega ao browser.** É o material de
fundamentação do avaliador e contém respostas de referência. Três camadas
guardam isso: o gerador aborta se vazar, os testes conferem o artefato, e
`scripts/check-bundle-secrets.mjs` varre o `dist` construído.

**O gabarito dos testes nunca chega ao browser.** O juiz devolve
`tests[].code` com o teste inteiro; a Edge Function remove antes de responder.

## Rodando

```bash
npm run dev          # gera o conteúdo e sobe o Vite
npm run verify       # typecheck, lint, testes, build e a varredura do bundle
npm run test:e2e     # Playwright
```

Os fluxos e2e com sessão pedem `E2E_EMAIL` e `E2E_SENHA` de um usuário de
teste; sem eles, pulam.

Sobre o schema e as Edge Functions, ver [`supabase/README.md`](../supabase/README.md).
