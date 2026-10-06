# Agent guidelines

## Project

Ligia OS is a React/Vite application backed by Supabase. Its main areas include
authentication, profiles, roles, membership, Aprender, Torch, Judge, AI-powered
functions, and administration. Keep changes focused on the requested task.

## Package manager

- npm is the official package manager.
- `package.json` and the tracked `package-lock.json` are the sources of truth.
- Official commands include `npm ci`, `npm run dev`, `npm run test`,
  `npm run build`, and `npm run verify`.
- Do not introduce pnpm, yarn, or another lockfile without an explicit project
  decision. Do not generate or commit `pnpm-lock.yaml`, `pnpm-workspace.yaml`,
  or `yarn.lock`.

## Git and local work

- Work in the current checkout. Do not create a worktree unless explicitly
  requested.
- Run `git status` before making changes. Preserve preexisting local changes and
  never overwrite the user's work.
- Keep changes within scope; do not mix unrelated edits. Do not merge
  automatically, and do not require a new branch for every small task.

## Scope discipline

Do not turn a bug fix into a broad refactor, cleanup into a redesign,
documentation into a functional change, an audit into implementation, or a
small task into an architectural migration. Report out-of-scope findings rather
than fixing them automatically.

## Verification

- Use `npm run verify` as the main verification command when safe and relevant.
- Some npm lifecycle scripts regenerate tracked content: `predev`, `prebuild`,
  and `pretest` run `npm run content`. Check `git status` first, identify
  preexisting edits, and do not overwrite user-modified generated files.
- If full verification is unsafe, run appropriate non-generating checks
  separately and explain what was not run.

## Tests

Tests are part of the system contract. Do not remove tests just because they
look old, narrow, or rare. Before removing any test, establish the behavior it
protects, the equivalent remaining coverage, and how that regression remains
protected.

Treat authentication, roles, membership, RLS, migrations, Aprender, placement
and leveling, progress and sync, Torch, Judge, AI, submissions, and private
test protection as sensitive coverage areas.

## Roles and authorization

- The active roles are `externo`, `membro`, `diretor`, and `coordenador`.
- `profiles.role` is the authorization source of truth; follow the current
  policies and role helpers when changing access.
- `admin` and `visitante` occur in historical migrations but are not active
  roles. Do not reintroduce them as active roles.
- Organizational metadata is not a substitute for authorization.

## Supabase

- Treat applied, versioned migrations as history. Do not edit an old migration
  to change the current schema; create a new migration instead.
- Do not remove or consolidate historical migrations.
- Destructive operations against remote environments require explicit
  authorization.
- RLS, grants, RPCs, and `SECURITY DEFINER` functions require security analysis
  and access tests as part of the change.

## Secrets

- Never commit, print, or expose secrets. This includes `.env`, `.env.local`,
  `DATABASE_URL`, `SUPABASE_ACCESS_TOKEN`, service role keys, database
  passwords, `GEMINI_API_KEY`, and Judge credentials.
- `VITE_*` variables are public client values only; never put secrets in them.
- Do not put real secret values in repository documentation.

## Generated content

`scripts/build-content.mjs` generates committed artifacts. The current sources
and outputs are:

| Source of truth | Generated output |
| --- | --- |
| `content/loops/*.json` | `src/content/generated/loops.public.json` |
| `content/loops/*.json` | `supabase/functions/_shared/generated/loops.full.json` |
| `content/aulas/*.md` | `src/content/generated/aulas.json` |
| `src/data/torch_tasks.json` | `src/content/generated/torch-tasks.index.json` |
| `src/content/concepts.json` | `supabase/functions/_shared/generated/conceitos.json` |

Do not edit generated files manually when a source of truth exists. Before
regenerating, check `git status`, identify preexisting changes, preserve user
work, and review the generated diff afterward.

## Aprender and Torch

- Analyze the full flow before changing progress, unlock, or completion rules.
- Do not treat partially used pedagogical content as dead code based only on
  usage or coverage.
- Understand the purpose of the Torch fallback before removing it; do not
  dismiss it as a mock without tracing its consumers.

## Judge and Edge Functions

- Code submissions flow from the browser through a Supabase Edge Function to
  the Judge service. Keep the internal Judge, service role credentials, private
  tests, and credentials inaccessible to the frontend.
- `challenges.tests` must remain private.
- The sensitive functions are `judge`, `loop-avaliar`, and `loop-perguntar`.
  Changes to authentication, rate limits, persistence, or shared helpers require
  consumer analysis and relevant tests.

## Scripts

Do not remove a script merely because it runs rarely. Bootstrap, authentication,
database, RLS, migration, and maintenance scripts may be operational tools.
Before removing one, search `package.json`, CI, documentation, Git history, and
other scripts for references and determine its effects.

## Documentation

When a change affects setup, commands, architecture, operational flows, or
stable rules, update the relevant documentation. Keep this file focused on
permanent agent guidance; the README remains the main human introduction to the
product.

## Definition of done

As applicable, a task is complete when the requested scope is met, preexisting
work is preserved, no secrets are exposed, relevant checks are run, generated
files are consistent, and `git diff` contains only task-related changes. Report
what changed and which checks were not run.
