import { learningStorage } from "./learning-storage";
/**
 * Resultado das práticas "Praticar" por membro. Na Fatia 1 (sem auth) é
 * localStorage anônimo; na F6 migra pro Supabase. Guarda o PLACAR real (não só
 * "fez/não fez") pra "concluído" significar aprendizagem — e habilitar a futura
 * revisão espaçada. Espelha o padrão de lib/progress.ts.
 */
import { logEvent } from "./events";

const STORAGE_KEY = "ligia-loop:results:v1";

export type LoopResult = {
  at: string; // ISO da última prática concluída
  times: number; // quantas vezes praticou (dominadas ou não)
  streak: number; // domínios CONSECUTIVOS até esta prática (reinicia em 0 se não dominou)
  acertei: number;
  parcial: number;
  errei: number;
  total: number;
};

export type Mastery = "dominado" | "praticado";

export type LoopScore = { acertei: number; parcial: number; errei: number };

export function loadLoopResults(): Record<string, LoopResult> {
  if (typeof window === "undefined") return {};
  try {
    const raw = learningStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as Record<string, LoopResult>) : {};
  } catch {
    return {};
  }
}

export function getLoopResult(conceptId: string): LoopResult | null {
  return loadLoopResults()[conceptId] ?? null;
}

/** Salva (ou sobrescreve) o placar da prática de um conceito. */
export function saveLoopResult(conceptId: string, score: LoopScore, total: number): void {
  if (typeof window === "undefined") return;
  const all = loadLoopResults();
  const prev = all[conceptId];
  // Streak de DOMÍNIOS consecutivos: cresce se dominou agora, reinicia se não.
  const dominou = loopMastery(score, total) === "dominado";
  const streak = dominou ? (prev?.streak ?? 0) + 1 : 0;
  all[conceptId] = {
    at: new Date().toISOString(),
    times: (prev?.times ?? 0) + 1,
    streak,
    ...score,
    total,
  };
  learningStorage.setItem(STORAGE_KEY, JSON.stringify(all));
  // Mesmo caso de node_status_changed: o tipo existia e nunca era emitido.
  // Só é registrado aqui, na conclusão explícita — nunca em replaceLoopResults,
  // que aplica um merge e inventaria prática que não aconteceu.
  logEvent("loop_completed", conceptId, {
    dominio: dominou ? "dominado" : "praticado",
    streak,
    ...score,
    total,
  });
}

/**
 * Substitui o mapa inteiro — usado pelo sync ao gravar o estado mesclado.
 * Diferente de `saveLoopResult`, NÃO recalcula times/streak: os registros que
 * chegam do merge já são resultados fechados, e recontar inflaria o streak.
 */
export function replaceLoopResults(all: Record<string, LoopResult>): void {
  if (typeof window === "undefined") return;
  try {
    learningStorage.setItem(STORAGE_KEY, JSON.stringify(all));
  } catch {
    // storage indisponível: degrada em silêncio (padrão progress.ts)
  }
}

/**
 * Nível de domínio a partir do placar. "dominado" exige rigor: NENHUMA checagem
 * "errei" E pontuação ponderada ≥80% (parcial conta meio ponto). Um 60% com
 * erros confessos não é domínio — inflar isso adia a revisão e alimenta a
 * ilusão de competência. Puro.
 */
export function loopMastery(score: LoopScore, total: number): Mastery {
  if (total <= 0) return "praticado";
  const ponderado = score.acertei + 0.5 * score.parcial;
  return score.errei === 0 && ponderado / total >= 0.8 ? "dominado" : "praticado";
}

/** Já praticou (concluiu ao menos uma vez) este conceito? */
export function isLoopCompleted(conceptId: string): boolean {
  return getLoopResult(conceptId) != null;
}

const DAY_MS = 24 * 60 * 60 * 1000;
// Schedule expansivo estilo Leitner, indexado pelo STREAK de domínios consecutivos.
// 1º domínio → 3 dias, 2º seguido → 7, depois 16, 35, 90 (teto). Não-domínio
// reinicia o streak (e a revisão volta a 1 dia), como em qualquer SR real.
const REVIEW_STEPS_DAYS = [3, 7, 16, 35, 90];

/** Dias recomendados até a próxima revisão, a partir do último resultado. Puro. */
export function reviewIntervalDays(result: LoopResult): number {
  if (loopMastery(result, result.total) === "praticado") return 1;
  const i = Math.min(Math.max((result.streak ?? 1) - 1, 0), REVIEW_STEPS_DAYS.length - 1);
  return REVIEW_STEPS_DAYS[i];
}

/** Timestamp (ms) da próxima revisão recomendada. */
export function nextReviewAt(result: LoopResult): number {
  return Date.parse(result.at) + reviewIntervalDays(result) * DAY_MS;
}

/** O conceito está vencido para revisão? */
export function dueForReview(result: LoopResult, now: number = Date.now()): boolean {
  return now >= nextReviewAt(result);
}

/** Dias inteiros desde uma data ISO. */
export function daysSince(iso: string, now: number = Date.now()): number {
  return Math.max(0, Math.floor((now - Date.parse(iso)) / DAY_MS));
}
