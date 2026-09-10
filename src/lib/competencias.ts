/**
 * As 5 competências contínuas do nivelamento v2 — substituem os 4 perfis-
 * arquétipo rígidos (zero-ia/base-matematica/viu-ml/viu-dl) por eixos de uma
 * matriz de competências, um por módulo de Fundamentos (M0–M4). M5 (Capstone)
 * não tem competência própria: é destino, não eixo avaliado.
 *
 * Módulo puro (sem I/O) — consumido pela engine em lib/nivelamento.ts e pela
 * UI (rótulos dos eixos do radar).
 */

import type { ModuleId } from "./content";

export type CompetenciaId =
  | "matematica"
  | "ml-classico"
  | "dl-fundamentos"
  | "dl-aplicado"
  | "transformers-llms";

export type Competencia = {
  id: CompetenciaId;
  /** Rótulo PT-BR completo (listas, diálogos, textos). */
  label: string;
  /**
   * Rótulo curto pros eixos do radar. O SVG tem largura fixa e o texto do eixo
   * não quebra linha: nome longo ("Transformers & LLMs") sai cortado na borda.
   * O nome completo aparece na legenda logo abaixo do gráfico.
   */
  labelCurto: string;
  /** Módulo de Fundamentos coberto pela competência. */
  modulo: ModuleId;
};

/** Ordem canônica = ordem dos módulos (M0→M4) = ordem de exibição no radar. */
export const COMPETENCIAS: Competencia[] = [
  { id: "matematica", label: "Matemática", labelCurto: "Matemática", modulo: "M0" },
  { id: "ml-classico", label: "ML Clássico", labelCurto: "ML", modulo: "M1" },
  { id: "dl-fundamentos", label: "Fundamentos de DL", labelCurto: "DL base", modulo: "M2" },
  { id: "dl-aplicado", label: "DL Aplicado", labelCurto: "DL aplic.", modulo: "M3" },
  { id: "transformers-llms", label: "Transformers & LLMs", labelCurto: "Transf.", modulo: "M4" },
];

/**
 * Competência que cobre um módulo, ou null se o módulo não tem eixo próprio
 * (M5) ou não existe. Aceita string solta de propósito: a chamada típica vem
 * de dados (JSON de conteúdo, rota), não de literais.
 */
export function competenciaDoModulo(modulo: string): CompetenciaId | null {
  return COMPETENCIAS.find((c) => c.modulo === modulo)?.id ?? null;
}
