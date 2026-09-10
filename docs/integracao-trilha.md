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
