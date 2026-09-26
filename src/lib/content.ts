import { z } from "zod";

/**
 * Contrato do conteúdo do skill tree (content/concepts.json).
 * O conteúdo vive no Git e é validado pelo app/CI — nunca duplicado no DB.
 * Funções puras (sem import do JSON) pra serem reusáveis no runtime do Next,
 * nos testes e num validador de CI.
 */

export const MODULES = ["M0", "M1", "M2", "M3", "M4", "M5"] as const;
export type ModuleId = (typeof MODULES)[number];

const KEBAB = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const HTTP = /^https?:\/\/[^\s]+$/;

export const MaterialSchema = z.object({
  type: z.string().min(1),
  title: z.string().min(1),
  url: z.string().regex(HTTP, "url deve começar com http(s)://"),
  duration_min: z.number().int().nonnegative().optional(),
});

/**
 * `validation` tem dois formatos no conteúdo:
 *  - quiz: nota mínima objetiva (questions/passing)
 *  - project | report: avaliação por rubric textual
 */
export const ValidationSchema = z.discriminatedUnion("type", [
  z.object({
    type: z.literal("quiz"),
    questions: z.number().int().positive(),
    passing: z.number().int().positive(),
  }),
  z.object({ type: z.literal("project"), rubric: z.string().min(1) }),
  z.object({ type: z.literal("report"), rubric: z.string().min(1) }),
]);

export const ConceptSchema = z.object({
  id: z.string().regex(KEBAB, "id deve ser kebab-case"),
  label: z.string().min(1),
  module: z.enum(MODULES),
  prereqs: z.array(z.string()),
  materials: z.array(MaterialSchema),
  validation: ValidationSchema.optional(),
});

export const ConceptsFileSchema = z.object({
  $schema_note: z.string().optional(),
  version: z.string().min(1),
  modules: z.record(z.string(), z.string()),
  concepts: z.array(ConceptSchema).min(1),
});

export type Material = z.infer<typeof MaterialSchema>;
export type Concept = z.infer<typeof ConceptSchema>;
export type ConceptsFile = z.infer<typeof ConceptsFileSchema>;

/** Parse + valida o shape. Lança ZodError com mensagens úteis se inválido. */
export function parseConcepts(raw: unknown): ConceptsFile {
  return ConceptsFileSchema.parse(raw);
}

/**
 * Detecta ciclos no grafo de prereqs (DFS com cores). O conteúdo é um DAG:
 * um laço (a→b→a) tornaria a trilha impossível de topologizar (F3).
 */
function findCycles(data: ConceptsFile): string[] {
  const adj = new Map<string, string[]>(data.concepts.map((c) => [c.id, c.prereqs]));
  const state = new Map<string, "visitando" | "ok">();
  const errors: string[] = [];
  const path: string[] = [];

  function dfs(id: string) {
    state.set(id, "visitando");
    path.push(id);
    for (const next of adj.get(id) ?? []) {
      if (!adj.has(next)) continue; // prereq inexistente já é reportado à parte
      if (state.get(next) === "visitando") {
        const from = path.indexOf(next);
        errors.push(`ciclo de prereqs: ${[...path.slice(from), next].join(" → ")}`);
      } else if (!state.has(next)) {
        dfs(next);
      }
    }
    path.pop();
    state.set(id, "ok");
  }

  for (const c of data.concepts) if (!state.has(c.id)) dfs(c.id);
  return errors;
}

/**
 * Integridade do DAG (além do shape): ids únicos, todo prereq aponta pra um id
 * existente, sem auto-referência/duplicata, sem ciclos, todo módulo referenciado
 * existe em `modules`, e quiz com `passing <= questions`.
 * Retorna a lista de erros (vazia = ok).
 */
export function checkIntegrity(data: ConceptsFile): string[] {
  const errors: string[] = [];
  const ids = new Set<string>();

  for (const c of data.concepts) {
    if (ids.has(c.id)) errors.push(`id duplicado: ${c.id}`);
    ids.add(c.id);
  }

  for (const c of data.concepts) {
    if (!Object.hasOwn(data.modules, c.module)) {
      errors.push(`módulo desconhecido: ${c.id} → ${c.module}`);
    }

    const seen = new Set<string>();
    for (const p of c.prereqs) {
      if (p === c.id) errors.push(`prereq aponta pra si mesmo: ${c.id}`);
      else if (!ids.has(p)) errors.push(`prereq inexistente: ${c.id} → "${p}"`);
      if (seen.has(p)) errors.push(`prereq duplicado: ${c.id} → "${p}"`);
      seen.add(p);
    }

    const v = c.validation;
    if (v?.type === "quiz" && v.passing > v.questions) {
      errors.push(
        `quiz inválido: ${c.id} exige passing(${v.passing}) > questions(${v.questions})`,
      );
    }
  }

  errors.push(...findCycles(data));
  return errors;
}

/** Parse + integridade num passo. Lança se algo estiver inválido. */
export function loadConcepts(raw: unknown): ConceptsFile {
  const data = parseConcepts(raw);
  const errors = checkIntegrity(data);
  if (errors.length > 0) {
    throw new Error(`concepts.json viola integridade:\n- ${errors.join("\n- ")}`);
  }
  return data;
}
