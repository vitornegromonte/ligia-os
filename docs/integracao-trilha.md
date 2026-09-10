# Integração da Trilha LigIA no ligia-os

Branch: `feat/trilha-integrada` (base marcada na tag `base-trilha-integrada`).

A plataforma de ensino "Trilha LigIA" (Next.js) está sendo absorvida por este
repositório. O ligia-os é a base; a área de aprendizado passa a ser a trilha,
e a prática com o judge acontece dentro das lições.

## Onde o código novo mora

Todo código da integração fica em diretórios novos, para manter a superfície
de conflito pequena enquanto a branch é longa:

```
src/styles/    camada de estilo (tokens, base, utilitários, shell, ui)
src/ui/        primitivas de UI em TypeScript
src/pages/aprender/   páginas da área de aprendizado
supabase/      migrações e seeds versionados
test/          Vitest
```

**Cinco arquivos existentes concentram o conflito**: `src/App.jsx`,
`src/components/Layout.jsx`, `src/components/Sidebar.jsx`, `src/index.css` e
`src/contexts/AuthContext.jsx`. Avise antes de mexer neles no `main`.

## Fase 1 — concluída

Fundação, sem tocar em funcionalidade:

- TypeScript incremental (`allowJs`, `checkJs: false`) — os `.jsx` existentes
  compilam sem serem type-checked; código novo é `.ts`/`.tsx` em modo estrito.
- Vitest + Testing Library; ESLint 9 (flat config) com parser de TS; CI no
  GitHub Actions (typecheck, lint, testes, build).
- Alias `@` → `src`; chunks separados para `monaco` e `katex`.
- Camada de estilo extraída de `index.css` (164 linhas) para `src/styles/`.
  `index.css` virou cinco `@import`.
- Primitivas em `src/ui/`: Button, IconButton, Card, Field/Input/Textarea,
  Chip, Alert, Skeleton, EmptyState, Topbar, PageHeader, Modal.
- Referência viva em `/aprender/styleguide`.

### Correções que vieram junto

| O que estava quebrado | Onde |
|---|---|
| `.nav-item` / `.nav-item.active` não tinham **nenhuma** regra CSS — o item ativo da sidebar era visualmente idêntico aos outros | `styles/shell.css`, `Sidebar.jsx` |
| O drawer mobile nunca abria: `transform: translateX(-100%) !important` vencia o `translateX(0)` inline | `styles/shell.css`, `Sidebar.jsx` |
| `display: "grid"` inline no `Layout` vencia o `display: block` da media query, empurrando o conteúdo 244px no mobile | `Layout.jsx` |
| `ProtectedRoute` falhava **aberto**: com `profile` null a checagem de papel era pulada e a rota liberava | `ProtectedRoute.jsx` |
| Sem rota `*`: endereço desconhecido renderizava tela em branco | `App.jsx`, `pages/NotFound.jsx` |
| Login sempre despejava em `/inicio`, ignorando a página pretendida | `ProtectedRoute.jsx`, `Login.jsx` |
| `copyCode` declarado duas vezes (a segunda depois do `return`) | `PracticeDetail.jsx` |
| `supabase-migration-18.sql` e o seed dos 41 desafios só existiam no histórico do git, e `.gitignore` tinha um `*.sql` cru | `supabase/`, `.gitignore` |

### Desvio de marca corrigido

As cores de módulo da trilha (`--m0`..`--m5`) eram seis hues vivos e
azulados (`#8b5cf6`, `#2563eb`, `#0891b2`, `#059669`, `#d97706`, `#dc2626`).
`style.md` §4.2 proíbe inventar acentos e exige semânticas dessaturadas, para
que o laranja siga sendo a cor mais saturada da tela. Foram retonadas para o
registro quente da casa. Há teste travando a regressão
(`test/design-system.test.ts`).

## Bloqueado no Vitor

- **Dump do schema** (`supabase db dump --schema-only`). As 16 tabelas só
  existem dentro do projeto Supabase; sem isso não dá para escrever as
  migrações com segurança. Em particular: `profiles` tem coluna `NOT NULL`
  sem default? E qual a definição de `is_admin()` / `is_member_or_admin()`?
- **Acesso ao projeto Supabase** para aplicar migrações num branch.
- **Aval numa mudança de policy dele**: hoje `challenges` exige
  `is_member_or_admin()`, então um `visitante` não lê o catálogo de código.
  A área de aprendizado precisa ser aberta a todos os papéis.
- `GEMINI_API_KEY` como secret do Supabase (nunca `VITE_*`).

## Fase 2 — conteúdo e libs (backend escrito, não aplicado)

### Conteúdo

A fonte continua versionada em Git. `scripts/build-content.mjs` (roda em
`predev`/`prebuild`/`pretest`) gera os artefatos:

| Fonte | Artefato | Quem importa |
|---|---|---|
| `content/loops/*.json` | `src/content/generated/loops.public.json` | só o cliente — **sem `contexto`** |
| `content/loops/*.json` | `supabase/functions/_shared/generated/loops.full.json` | só as Edge Functions |
| `content/aulas/*.md` | `src/content/generated/aulas.json` | cliente (frontmatter já parseado) |
| `src/data/torch_tasks.json` | `src/content/generated/torch-tasks.index.json` | validação de `praticas.json` |

**Onde cada coisa mora, e por quê.** O que tem segredo fica FORA de `src/`:
`content/loops/` guarda o campo `contexto`, o material de fundamentação do
avaliador LLM, que contém respostas de referência. Ficar fora de `src/` é uma
salvaguarda estrutural — nenhum import de cliente alcança o diretório por
acidente. O que não tem segredo (`concepts.json`, `nivelamento.json`,
`praticas.json`) vive direto em `src/content/`.

`rubrica` continua indo ao cliente de propósito: é o que permite a
auto-avaliação quando o avaliador está fora do ar ou o aluno estourou a cota.

**Três camadas guardam o invariante:**

1. o gerador aborta se `contexto` sobreviver ao artefato público;
2. `test/content-secret.test.ts` confere chave e conteúdo do artefato;
3. `scripts/check-bundle-secrets.mjs` varre o `dist/` construído — a prova
   real, porque pega também um import direto de `content/loops/`. Rodou
   contra um bundle deliberadamente contaminado e acusou as 28 ocorrências.

### Mapeamento conceito ↔ tarefa Torch

`src/content/praticas.json` + `src/lib/praticas.ts`. Os 29 conceitos estão
mapeados e as 41 tarefas do catálogo foram usadas — nenhuma órfã. Quatro
tarefas servem a mais de um conceito (ex.: `cross_entropy` em
`regressao-logistica` e `loss-functions`).

**Nove conceitos não têm prática de código.** Os cinco de M0/M5 são
conceituais por natureza. Os outros quatro são lacunas reais do catálogo e
estão marcados com nota no arquivo: `train-val-test`, `knn`, `dataloaders`,
`transfer-learning`. Valem tarefas novas.

As tarefas de M4 são quase todas `Hard`, então `tarefasDoConceito()` ordena
por dificuldade — senão o aluno encontra `flash_attention` antes de `mha`.

### Libs portadas

24 módulos de `lib/` viraram `src/lib/`. Três precisaram de mudança real:

- `aulas.ts` e `loops.ts` liam o disco com `node:fs` a cada request. Agora
  leem o artefato gerado; `gray-matter` saiu do bundle.
- `utils.ts` tinha `cn()` sobre `tailwind-merge`. Sem Tailwind não há conflito
  de utilitários a resolver; sobrou a concatenação condicional.
- `Verdict` foi para `supabase/functions/_shared/verdict.ts`, e
  `loop-session.ts` reexporta de lá. **Regra de direção**: `_shared` nunca
  importa de `src/` — o bundle do Deno só enxerga `supabase/functions/`, então
  um import assim quebraria o deploy. O inverso é livre.

O `llm/` e os construtores de prompt foram para `supabase/functions/_shared/`
com imports relativos e extensão `.ts` explícita, que Deno exige e o Vitest
aceita. As três suítes continuam rodando sem duplicar código.

### Testes

313 testes em 27 arquivos. Um foi **invertido**: o que exigia preservar
`contexto` no parse agora exige que ele seja descartado — lá havia servidor
para removê-lo, aqui o schema de cliente é a fronteira.

`rate-limit.test.ts` foi removido (o limitador em memória virou RPC no
banco). Quatro testes de componente estão parqueados em `test/_fase3/` até os
componentes chegarem.

### Migrações — escritas, ainda não aplicadas

| Arquivo | O que faz |
|---|---|
| `0018_challenges_submissions.sql` | recuperado do histórico |
| `0100_learning_core.sql` | as 4 tabelas de aprendizado, RLS, `is_learning_staff()`, `export_student_v1` |
| `0101_rate_limit.sql` | tabela + `consume_rate_limit()` |
| `0102_practice_open_access.sql` | ⚠️ **altera policies do ligia-os** |
| `0103_practice_progress.sql` | view `minhas_praticas_codigo` |

As quatro adaptações em relação ao schema original da plataforma:

1. **Sem trigger em `auth.users` e sem tocar em `profiles`.** O nosso criava
   `(id, email)` no signup, o que faria o enriquecimento client-side do
   `AuthContext` nunca rodar. E se `profiles` tiver `NOT NULL` sem default, o
   insert lança, o trigger falha, e o cadastro inteiro falha junto.
2. **FK em `auth.users(id)`**, não `profiles(id)` — elimina a corrida com a
   criação client-side do perfil.
3. **`is_learning_staff()`** fala `admin`, o vocabulário deste banco. A
   original testava `('mentor','diretoria')`: não daria erro, apenas nunca
   concederia nada.
4. **`export_student_v1` sem `p.cohort`** — a coluna não existe aqui.

Validação possível daqui: as cinco migrações passam no parser real do
PostgreSQL (`libpg-query`), e `test/migrations.test.ts` trava os invariantes
de segurança (nada em `auth.users`, FK correta, RLS em todas, views com
`security_invoker`). O que **não** dá para verificar sem o dump: se as colunas
e funções referenciadas existem.

## Fase 3 — a trilha dentro do ligia-os

Rotas novas, todas dentro do `Layout` e **sem gate de papel**:

| Rota | Página |
|---|---|
| `/aprender` | Trilha — skill tree, progresso, banner do nivelamento |
| `/aprender/nivelamento` | Wizard + resultado (matriz, estrelas, dispensa) |
| `/aprender/c/:conceptId` | **Hub da lição** |
| `/aprender/styleguide` | Referência viva do design system |

O grupo "Aprender" da sidebar perdeu o `roles: ["membro","admin"]` e ganhou o
item "Trilha".

### O hub da lição

É o centro da integração. Numa tela só: cabeçalho com módulo e estado,
pré-requisitos pendentes como links, **a aula embutida** (vídeo + markdown),
os materiais, a prática de recuperação e as tarefas de código mapeadas com
estado resolvido. O aluno não sai do sistema para praticar.

**O `SidePanel` foi descartado** (269 linhas). Ele era um preview lateral do
conceito; o hub faz tudo o que ele fazia e mais. Manter os dois seria duas
telas para a mesma coisa.

**A conclusão continua sendo declaração do aluno.** É sobre ela que o modelo
de pré-requisito e desbloqueio inteiro é construído, e marcar automaticamente
seria paternalista. O que a evidência (loop dominado + código resolvido) muda
é o convite, não a permissão.

### Correções

**O shell tinha um terceiro bug, e é do ligia-os.** `.app-shell` era um grid
de duas colunas, mas `.sidebar` é `position: fixed` — está fora de fluxo e
**não ocupa** a coluna reservada. Quem a ocupava era o primeiro filho em fluxo
da página. Medido na `Notas` do próprio repo: o `<header>` sticky renderizava
com **244px de largura, escondido atrás da sidebar**. As páginas só não
pareciam quebradas porque devolvem um fragmento, e o corpo caía na segunda
coluna por acidente. Uma página com wrapper único — como as nossas — tinha o
conteúdo inteiro espremido nos 244px.

O deslocamento virou `padding-left: var(--sidebar-width)`. Agora qualquer
estrutura de página se posiciona certo, e os topbars do Vitor aparecem.

Outras duas:

- `MODULE_HEX` era o terceiro lugar onde as cores de módulo viviam. Agora há
  `corDoModulo()`, que devolve `var(--mN)` — um lugar só.
- O `<style>` de `MarkdownViewer` era reinjetado a cada instância montada.
  Virou `src/styles/markdown.css`.

### Eventos

`node_status_changed` e `loop_completed` estavam declarados em `lib/events.ts`
desde o início e **nunca eram emitidos** — daí o export do aluno reportar
`at: null` em toda linha de progresso. Agora saem de `setNodeStatus` e
`saveLoopResult`. Nunca de `replaceLoopResults`, que aplica merge e
inventaria prática que não aconteceu.

### Ordenação das tarefas de código

Descoberto na verificação visual: dentro da mesma dificuldade a ordem era
alfabética, então `flash_attention` vinha antes de `mha` — exatamente o que a
ordenação existia para evitar. A ordem escrita em `praticas.json` é intenção
didática, e `sort` é estável desde ES2019, então basta comparar dificuldade.

### Verificação

345 testes em 31 arquivos. A verificação visual da área autenticada usou um
harness temporário (`preview.html` + `src/preview.jsx`, já removidos) que
montava as páginas sem `ProtectedRoute` — não temos sessão do Supabase para
navegar o app de verdade.

Confirmado no browser: estado ativo da sidebar visível, drawer mobile abrindo
e fechando, topbar em largura cheia, trilha com os 29 conceitos e estados
derivados, hub com as sete tarefas de `multi-head-attention` na ordem certa.
