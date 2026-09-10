/**
 * Contrato de exportação dos dados do aluno — a FUNDAÇÃO pro futuro sistema
 * externo de monitoramento da diretoria.
 *
 * Princípios que valem mais que a implementação:
 *
 * 1. **Versionado.** `schema_version` é o contrato. Mudança incompatível vira
 *    v2 (novo schema, nova view SQL) — nunca se altera o significado da v1.
 * 2. **Auto-validado.** O próprio export passa por Zod antes de sair. Se o
 *    formato quebrar, quebra aqui e não no consumidor.
 * 3. **Coleções são arrays**, não mapas por id: ingestão externa (JSONL, COPY
 *    de SQL, planilha) lê array direto; mapa exigiria transformação.
 * 4. **Honesto sobre o que não sabe.** Progresso anterior ao event log sai com
 *    `at: null` em vez de um timestamp inventado.
 *
 * Funciona hoje 100% com localStorage (aluno anônimo, identity nula) e é o
 * mesmo shape que a view `export_student_v1` devolverá quando o Supabase
 * entrar — ver supabase/schema.sql.
 */

import { z } from "zod";
import { COMPETENCIAS, type CompetenciaId } from "./competencias";
import { loadPretestV2, type PretestResultV2 } from "./pretest-storage";
import { loadUserStatus } from "./progress";
import { loadLoopResults, type LoopResult } from "./loop-progress";
import { loadEvents, type LearningEvent } from "./events";
import type { UserStatus } from "./status";

export const SCHEMA_VERSION = 1;

const CompetenciaResumoSchema = z.object({
  score: z.number().nullable(),
  estado: z.string().nullable(),
});

export const StudentDataExportSchema = z.object({
  schema_version: z.literal(SCHEMA_VERSION),
  exported_at: z.string(),
  /** Nulo enquanto o aluno é anônimo (sem Supabase); preenchido após o login. */
  identity: z.object({ user_id: z.string().nullable(), email: z.string().nullable() }),
  /** Rodada de nivelamento vigente (formato v2), ou null se nunca fez. */
  pretest: z.unknown().nullable(),
  progress: z.array(
    z.object({
      node_id: z.string(),
      status: z.enum(["in-progress", "done"]),
      /** ISO do evento que mudou o status; null = anterior ao event log. */
      at: z.string().nullable(),
    }),
  ),
  loops: z.array(
    z.object({
      concept_id: z.string(),
      at: z.string(),
      times: z.number(),
      streak: z.number(),
      acertei: z.number(),
      parcial: z.number(),
      errei: z.number(),
      total: z.number(),
    }),
  ),
  events: z.array(
    z.object({
      id: z.string(),
      at: z.string(),
      type: z.string(),
      object: z.string(),
      data: z.record(z.string(), z.unknown()).optional(),
    }),
  ),
  /** Derivado — conveniência do consumidor, nunca fonte da verdade. */
  resumo: z.object({
    por_competencia: z.record(z.string(), CompetenciaResumoSchema),
    nos_concluidos: z.number(),
    conceitos_praticados: z.number(),
  }),
});

export type StudentDataExport = z.infer<typeof StudentDataExportSchema>;

export type ExportInputs = {
  pretest: PretestResultV2 | null;
  progress: UserStatus;
  loops: Record<string, LoopResult>;
  events: LearningEvent[];
  now: string;
  identity?: { user_id: string | null; email: string | null };
};

/**
 * Último ISO em que o nó mudou de status, segundo o event log. Null quando o
 * progresso é anterior ao log (o snapshot de progresso não guarda timestamp).
 */
function ultimaMudanca(events: LearningEvent[], nodeId: string): string | null {
  let ultima: string | null = null;
  for (const e of events) {
    if (e.type !== "node_status_changed" || e.object !== nodeId) continue;
    if (!ultima || Date.parse(e.at) > Date.parse(ultima)) ultima = e.at;
  }
  return ultima;
}

/** Monta o export (puro e testável) e valida contra o schema antes de devolver. */
export function montarExport(inputs: ExportInputs): StudentDataExport {
  const { pretest, progress, loops, events, now } = inputs;

  const por_competencia: Record<string, { score: number | null; estado: string | null }> = {};
  for (const { id } of COMPETENCIAS) {
    const entry = pretest?.matriz?.[id as CompetenciaId];
    por_competencia[id] = {
      score: entry?.score ?? null,
      estado: pretest?.recomendacao?.estados?.[id as CompetenciaId] ?? null,
    };
  }

  const progressArr = Object.entries(progress).map(([node_id, status]) => ({
    node_id,
    status,
    at: ultimaMudanca(events, node_id),
  }));

  const loopsArr = Object.entries(loops).map(([concept_id, r]) => ({ concept_id, ...r }));

  const bruto: StudentDataExport = {
    schema_version: SCHEMA_VERSION,
    exported_at: now,
    identity: inputs.identity ?? { user_id: null, email: null },
    pretest: pretest ?? null,
    progress: progressArr,
    loops: loopsArr,
    events,
    resumo: {
      por_competencia,
      nos_concluidos: progressArr.filter((p) => p.status === "done").length,
      conceitos_praticados: loopsArr.length,
    },
  };

  return StudentDataExportSchema.parse(bruto);
}

/** Lê os storages do navegador e monta o export. Só no cliente. */
export function coletarExport(identity?: {
  user_id: string | null;
  email: string | null;
}): StudentDataExport {
  return montarExport({
    pretest: loadPretestV2(),
    progress: loadUserStatus(),
    loops: loadLoopResults(),
    events: loadEvents(),
    now: new Date().toISOString(),
    identity,
  });
}

/** Nome de arquivo estável e ordenável por data. */
export function nomeDoArquivo(now = new Date()): string {
  return `trilha-ligia-dados-${now.toISOString().slice(0, 10)}.json`;
}
