import type { SupabaseClient } from "@supabase/supabase-js";
import type { UserStatus, UserState } from "./status";
import type { LearningEvent } from "./events";
import type { LoopResult } from "./loop-progress";
import type { PretestResultV2 } from "./pretest-storage";
import { loadUserStatus, saveUserStatus } from "./progress";
import { loadEvents, replaceEvents } from "./events";
import { loadLoopResults, replaceLoopResults } from "./loop-progress";
import { loadPretestV2, savePretestV2 } from "./pretest-storage";
import { mergeEstado, eventosNovos, type EstadoSincronizavel } from "./sync-merge";

/**
 * Sync do estado do aluno entre localStorage e Supabase (F6).
 *
 * Local-first: o localStorage continua sendo o caminho de leitura síncrono da
 * UI. Este módulo só faz pull → merge → grava local → push, e **nunca** pode
 * quebrar o app: qualquer falha de rede degrada pra "segue offline", porque o
 * dado local permanece intacto e íntegro. As regras de merge (e o porquê de
 * cada uma) vivem em sync-merge.ts.
 *
 * Roda quando há sessão. Anônimo nem chama.
 */

// ---------------------------------------------------------------------------
// Mapeadores linha ↔ tipo local. Puros e exportados: são o contrato com o
// schema SQL, e é onde um rename de coluna quebra — então têm teste próprio.
// ---------------------------------------------------------------------------

export type ProgressRow = { node_id: string; status: UserState; updated_at?: string };
export type LoopRow = {
  concept_id: string;
  practiced_at: string;
  times: number;
  streak: number;
  acertei: number;
  parcial: number;
  errei: number;
  total: number;
};
export type EventRow = {
  id: string;
  type: LearningEvent["type"];
  object: string;
  data: Record<string, unknown> | null;
  occurred_at: string;
};
export type PretestRow = {
  taken_at: string;
  schema_version: number;
  content_version: string;
  matriz: PretestResultV2["matriz"];
  resultados: PretestResultV2["resultados"];
  auto_relato: PretestResultV2["autoRelato"] | null;
  recomendacao: PretestResultV2["recomendacao"];
  dispensas_confirmadas?: PretestResultV2["dispensasConfirmadas"] | null;
};

export function progressoDeLinhas(rows: ProgressRow[]): UserStatus {
  const out: UserStatus = {};
  for (const r of rows) out[r.node_id] = r.status;
  return out;
}

/**
 * `updated_at` fica DE FORA de propósito: o estado local não guarda quando cada
 * nó mudou, então carimbar `now()` a cada sync transformaria a coluna em "hora
 * do último sync" — um dado que parece um histórico e não é. Omitindo, o
 * default do Postgres marca a inserção e o upsert-update preserva o valor.
 */
export function linhasDeProgresso(userId: string, status: UserStatus) {
  return Object.entries(status).map(([node_id, s]) => ({
    user_id: userId,
    node_id,
    status: s,
  }));
}

export function loopsDeLinhas(rows: LoopRow[]): Record<string, LoopResult> {
  const out: Record<string, LoopResult> = {};
  for (const r of rows) {
    out[r.concept_id] = {
      at: r.practiced_at,
      times: r.times,
      streak: r.streak,
      acertei: r.acertei,
      parcial: r.parcial,
      errei: r.errei,
      total: r.total,
    };
  }
  return out;
}

export function linhasDeLoops(userId: string, loops: Record<string, LoopResult>) {
  return Object.entries(loops).map(([concept_id, l]) => ({
    user_id: userId,
    concept_id,
    practiced_at: l.at,
    times: l.times,
    streak: l.streak,
    acertei: l.acertei,
    parcial: l.parcial,
    errei: l.errei,
    total: l.total,
  }));
}

export function eventosDeLinhas(rows: EventRow[]): LearningEvent[] {
  return rows.map((r) => ({
    id: r.id,
    at: r.occurred_at,
    type: r.type,
    object: r.object,
    ...(r.data != null ? { data: r.data } : {}),
  }));
}

export function linhasDeEventos(userId: string, eventos: LearningEvent[]) {
  return eventos.map((e) => ({
    id: e.id,
    user_id: userId,
    type: e.type,
    object: e.object,
    data: e.data ?? null,
    occurred_at: e.at,
  }));
}

export function nivelamentoDeLinha(row: PretestRow | null): PretestResultV2 | null {
  if (!row) return null;
  return {
    version: 2,
    contentVersion: row.content_version,
    matriz: row.matriz,
    resultados: row.resultados,
    autoRelato: row.auto_relato ?? {},
    recomendacao: row.recomendacao,
    dispensasConfirmadas: row.dispensas_confirmadas ?? [],
    ts: row.taken_at,
  };
}

export function linhaDeNivelamento(userId: string, n: PretestResultV2) {
  return {
    user_id: userId,
    taken_at: n.ts,
    schema_version: 2,
    content_version: n.contentVersion,
    matriz: n.matriz,
    resultados: n.resultados,
    auto_relato: n.autoRelato,
    recomendacao: n.recomendacao,
    dispensas_confirmadas: n.dispensasConfirmadas,
  };
}

// ---------------------------------------------------------------------------
// I/O
// ---------------------------------------------------------------------------

/**
 * O client do Supabase RESOLVE com `{ data, error }` em vez de lançar. Sem este
 * desembrulho, um pull/push que falhou inteiro passaria batido pelo try/catch e
 * o sync reportaria sucesso — a pior falha possível aqui, porque o aluno
 * acharia que o progresso subiu.
 */
function ou<T>(r: { data: T; error: { message: string } | null }, onde: string): T {
  if (r.error) throw new Error(`${onde}: ${r.error.message}`);
  return r.data;
}

/** Lê o estado do aluno no servidor. */
export async function pull(
  sb: SupabaseClient,
  userId: string,
): Promise<EstadoSincronizavel> {
  const [prog, loops, evts, pre] = await Promise.all([
    sb.from("student_progress").select("node_id,status,updated_at").eq("user_id", userId),
    sb
      .from("loop_results")
      .select("concept_id,practiced_at,times,streak,acertei,parcial,errei,total")
      .eq("user_id", userId),
    sb
      .from("learning_events")
      .select("id,type,object,data,occurred_at")
      .eq("user_id", userId)
      .order("occurred_at", { ascending: true }),
    sb
      .from("pretest_results")
      .select(
        "taken_at,schema_version,content_version,matriz,resultados,auto_relato,recomendacao,dispensas_confirmadas",
      )
      .eq("user_id", userId)
      .order("taken_at", { ascending: false })
      .limit(1)
      .maybeSingle(),
  ]);

  return {
    progresso: progressoDeLinhas((ou(prog, "pull progresso") ?? []) as ProgressRow[]),
    loops: loopsDeLinhas((ou(loops, "pull práticas") ?? []) as LoopRow[]),
    eventos: eventosDeLinhas((ou(evts, "pull eventos") ?? []) as EventRow[]),
    nivelamento: nivelamentoDeLinha((ou(pre, "pull nivelamento") ?? null) as PretestRow | null),
  };
}

/** Lê o estado do aluno neste dispositivo. */
export function lerLocal(): EstadoSincronizavel {
  return {
    progresso: loadUserStatus(),
    loops: loadLoopResults(),
    eventos: loadEvents(),
    nivelamento: loadPretestV2(),
  };
}

/** Grava o estado mesclado neste dispositivo. */
export function gravarLocal(estado: EstadoSincronizavel): void {
  saveUserStatus(estado.progresso);
  replaceLoopResults(estado.loops);
  replaceEvents(estado.eventos);
  if (estado.nivelamento) savePretestV2(estado.nivelamento);
}

/**
 * Envia o estado mesclado. Upserts são idempotentes; eventos só sobem os que o
 * servidor ainda não tem, e a rodada de nivelamento colide em
 * (user_id, taken_at) — daí o índice único no schema.
 */
export async function push(
  sb: SupabaseClient,
  userId: string,
  estado: EstadoSincronizavel,
  remoto: EstadoSincronizavel,
): Promise<void> {
  const progresso = linhasDeProgresso(userId, estado.progresso);
  const loops = linhasDeLoops(userId, estado.loops);
  const novos = linhasDeEventos(userId, eventosNovos(estado.eventos, remoto.eventos));

  const [rProg, rLoops, rEvts, rPre] = await Promise.all([
    progresso.length
      ? sb.from("student_progress").upsert(progresso, { onConflict: "user_id,node_id" })
      : null,
    loops.length ? sb.from("loop_results").upsert(loops, { onConflict: "user_id,concept_id" }) : null,
    novos.length
      ? sb.from("learning_events").upsert(novos, { onConflict: "id", ignoreDuplicates: true })
      : null,
    estado.nivelamento
      ? sb
          .from("pretest_results")
          .upsert(linhaDeNivelamento(userId, estado.nivelamento), {
            onConflict: "user_id,taken_at",
          })
      : null,
  ]);

  // Cada upsert falha por conta própria (RLS, coluna faltando, rede): reportar
  // todas de uma vez diz qual tabela está fora do ar, em vez de só a primeira.
  const falhas = [
    [rProg, "progresso"],
    [rLoops, "práticas"],
    [rEvts, "eventos"],
    [rPre, "nivelamento"],
  ]
    .filter(([r]) => r && (r as { error: unknown }).error)
    .map(([r, nome]) => `${nome}: ${((r as { error: { message: string } }).error).message}`);

  if (falhas.length) throw new Error(`push falhou — ${falhas.join(" | ")}`);
}

export type ResultadoSync =
  | { ok: true; estado: EstadoSincronizavel }
  | { ok: false; erro: string };

/**
 * Ciclo completo: pull → merge → grava local → push. Nunca lança — o chamador
 * é UI, e uma falha de sync não pode derrubar a tela nem tocar no dado local
 * (que continua sendo a fonte de leitura).
 */
export async function sincronizar(sb: SupabaseClient, userId: string): Promise<ResultadoSync> {
  try {
    const local = lerLocal();
    const remoto = await pull(sb, userId);
    const merged = mergeEstado(local, remoto);
    gravarLocal(merged);
    await push(sb, userId, merged, remoto);
    return { ok: true, estado: merged };
  } catch (e) {
    const erro = e instanceof Error ? e.message : String(e);
    console.warn("[trilha] sync falhou, seguindo com o estado local:", erro);
    return { ok: false, erro };
  }
}
