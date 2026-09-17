import { COMPETENCIAS, type CompetenciaId } from "@/lib/competencias";
import type { CompetencyMatrix, CompetencyEntry } from "@/lib/nivelamento";

/**
 * Matriz de competências sintética pra fixtures: tudo sem-evidência, exceto os
 * scores passados. Evita repetir as 5 entradas completas em cada teste.
 */
export function emptyMatrix(scores: Partial<Record<CompetenciaId, number>> = {}): CompetencyMatrix {
  const m = {} as CompetencyMatrix;
  for (const { id } of COMPETENCIAS) {
    const score = scores[id];
    const entry: CompetencyEntry =
      score === undefined
        ? {
            score: null,
            mcqScore: null,
            priorBoost: 0,
            confianca: "sem-evidencia",
            acertos: 0,
            total: 0,
            conceitosFracos: [],
          }
        : {
            score,
            mcqScore: score,
            priorBoost: 0,
            confianca: "alta",
            acertos: 4,
            total: 4,
            conceitosFracos: [],
          };
    m[id] = entry;
  }
  return m;
}
