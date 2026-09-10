import type { UserStatus } from "./status";
import { MAX_EVENTS, type LearningEvent } from "./events";
import type { LoopResult } from "./loop-progress";
import type { PretestResultV2 } from "./pretest-storage";

/**
 * Regras de merge do sync local ↔ Supabase. Tudo puro: sem storage, sem rede —
 * quem faz I/O é lib/sync.ts. Aqui mora a única parte com julgamento de verdade.
 *
 * O modelo é **local-first**: o localStorage segue sendo o caminho de leitura
 * síncrono (nada de ripple async pelo SkillTree/Praticar, e offline continua
 * funcionando); o banco é a cópia durável que deixa o aluno retomar em outro
 * dispositivo. Toda sessão faz pull → merge → push.
 *
 * Invariantes que os testes prendem: o merge é **comutativo** e **idempotente**.
 * Sem isso, sincronizar duas vezes ou em ordens diferentes daria estados
 * diferentes, e o aluno veria progresso "piscar" entre dispositivos.
 */

export type EstadoSincronizavel = {
  progresso: UserStatus;
  nivelamento: PretestResultV2 | null;
  eventos: LearningEvent[];
  loops: Record<string, LoopResult>;
};

/**
 * Progresso da trilha: merge **monotônico** — `done` > `in-progress` > ausente.
 *
 * O `UserStatus` local não guarda timestamp por nó, então não há como fazer um
 * last-write-wins honesto. Monotônico é o casamento certo com o domínio:
 * progresso de aprendizagem só avança, e a política de re-teste do nivelamento
 * já garante que refazer o quiz nunca des-marca um nó concluído.
 *
 * Custo assumido: se o aluno DESmarcar um nó no dispositivo A, o estado velho do
 * dispositivo B ressuscita o `done` no próximo sync. Desfazer é raro e manual;
 * o conserto (formato local v2 com timestamp por nó) custa uma migração de
 * storage que não se paga agora.
 */
export function mergeProgresso(local: UserStatus, remoto: UserStatus): UserStatus {
  const out: UserStatus = { ...remoto, ...local };
  for (const id of Object.keys(out)) {
    if (local[id] === "done" || remoto[id] === "done") out[id] = "done";
  }
  return out;
}

/** Eventos: união por id, em ordem cronológica, respeitando o teto do ring buffer. */
export function mergeEventos(local: LearningEvent[], remoto: LearningEvent[]): LearningEvent[] {
  const porId = new Map<string, LearningEvent>();
  for (const e of [...remoto, ...local]) porId.set(e.id, e);
  const todos = [...porId.values()].sort((a, b) => a.at.localeCompare(b.at));
  // Passou do teto, os mais antigos caem — mesma regra do buffer local.
  return todos.slice(Math.max(0, todos.length - MAX_EVENTS));
}

/** Eventos do estado mesclado que o servidor ainda não conhece. */
export function eventosNovos(merged: LearningEvent[], remoto: LearningEvent[]): LearningEvent[] {
  const conhecidos = new Set(remoto.map((e) => e.id));
  return merged.filter((e) => !conhecidos.has(e.id));
}

/**
 * Práticas: por conceito, vence o registro com o `at` mais recente — inteiro.
 *
 * `times` e `streak` são contadores cumulativos; somar dois históricos
 * divergentes inventaria prática que não houve, e o streak do Leitner
 * agendaria revisão longe demais. O registro é o retrato da última prática,
 * então o retrato mais novo ganha. Praticar o mesmo conceito em dois
 * dispositivos ao mesmo tempo perde uma contagem — aceito.
 */
export function mergeLoops(
  local: Record<string, LoopResult>,
  remoto: Record<string, LoopResult>,
): Record<string, LoopResult> {
  const out: Record<string, LoopResult> = { ...remoto };
  for (const [id, l] of Object.entries(local)) {
    const r = out[id];
    if (!r || l.at.localeCompare(r.at) > 0) out[id] = l;
  }
  return out;
}

/**
 * Nivelamento: o local guarda só a rodada corrente, e vence a de `ts` mais
 * recente. O banco mantém o histórico de todas as rodadas (`pretest_results` é
 * append-only), então nada se perde do lado durável.
 */
export function mergeNivelamento(
  local: PretestResultV2 | null,
  remoto: PretestResultV2 | null,
): PretestResultV2 | null {
  if (!local) return remoto;
  if (!remoto) return local;
  return local.ts.localeCompare(remoto.ts) >= 0 ? local : remoto;
}

/** Aplica as quatro regras acima de uma vez. */
export function mergeEstado(
  local: EstadoSincronizavel,
  remoto: EstadoSincronizavel,
): EstadoSincronizavel {
  return {
    progresso: mergeProgresso(local.progresso, remoto.progresso),
    nivelamento: mergeNivelamento(local.nivelamento, remoto.nivelamento),
    eventos: mergeEventos(local.eventos, remoto.eventos),
    loops: mergeLoops(local.loops, remoto.loops),
  };
}
