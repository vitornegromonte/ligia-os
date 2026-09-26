/**
 * Estado da sessão "Praticar" (lógica pura — sem DOM/localStorage; alvo de testes).
 * Fluxo: o aluno responde a checagem atual, revela a rubrica, autoavalia
 * (acertei/parcial/errei) e avança. A orientação fica sempre visível na UI.
 */

// Fonte canônica no lado servidor: é a Edge Function que emite o veredito.
export type { Verdict } from "../../supabase/functions/_shared/verdict.ts";
import type { Verdict } from "../../supabase/functions/_shared/verdict.ts";

export type LoopSession = {
  index: number; // checagem atual (0-based)
  revealed: boolean; // rubrica revelada pra checagem atual?
  verdicts: Verdict[]; // autoavaliações, em ordem
};

export function initSession(): LoopSession {
  return { index: 0, revealed: false, verdicts: [] };
}

export function revealRubric(s: LoopSession): LoopSession {
  return { ...s, revealed: true };
}

export function recordVerdict(s: LoopSession, v: Verdict): LoopSession {
  return { index: s.index + 1, revealed: false, verdicts: [...s.verdicts, v] };
}

export function isComplete(s: LoopSession, total: number): boolean {
  return s.index >= total;
}

export type LoopScore = { acertei: number; parcial: number; errei: number };

export function scoreOf(s: LoopSession): LoopScore {
  return {
    acertei: s.verdicts.filter((v) => v === "acertei").length,
    parcial: s.verdicts.filter((v) => v === "parcial").length,
    errei: s.verdicts.filter((v) => v === "errei").length,
  };
}
