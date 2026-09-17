/**
 * Teste adaptativo pelo grafo de pré-requisitos — AINDA NÃO LIGADO.
 *
 * A ideia vem do ALEKS (knowledge space theory): quem não domina o
 * pré-requisito provavelmente não domina o que depende dele, então dá para
 * pular essas questões e encurtar o teste. Hoje um iniciante que erra toda a
 * matemática ainda responde as questões de Transformers.
 *
 * A premissa é empírica e pode ser falsa no nosso público: há quem use LLMs
 * e PyTorch sem ter visto cálculo. Por isso este módulo só SIMULA a regra
 * sobre rodadas reais, completas, e mede o custo: quantas vezes a competência
 * pulada teria nota de revisão dirigida ou de candidata à dispensa. Ligar a
 * regra é decisão para quando houver dados (liga-011).
 *
 * Regra simulada: a competência é pulada se algum pré-requisito direto (pelo
 * DAG de conceitos da trilha) ficou abaixo de GATE_REVISAO ou também foi
 * pulado. A fronteira nunca muda com essa regra — o pré-requisito fraco vem
 * antes e já segura a fronteira —, então o custo é só o que ela esconde.
 */

import { COMPETENCIAS, type CompetenciaId } from "./competencias";
import type { ModuleId } from "./content";
import {
  GATE_DISPENSA,
  GATE_REVISAO,
  scoreCompetencias,
  type ResultadoQuestao,
} from "./nivelamento";
import { questoesParaEngine, type NivelamentoContent } from "./nivelamento-content";

/** Com menos rodadas completas (ou casos de pulo) que isto, a simulação não recomenda nada. */
export const RODADAS_MINIMAS = 100;
export const CASOS_MINIMOS = 30;
/** Custo aceitável: fração dos pulos que esconderia uma candidata à dispensa. */
export const ESCONDIDO_CANDIDATA_MAX = 0.05;
/** Custo aceitável: fração dos pulos que esconderia nota de revisão dirigida (≥ GATE_REVISAO). */
export const ESCONDIDO_REVISAO_MAX = 0.15;

export type PrereqsCompetencia = Record<CompetenciaId, CompetenciaId[]>;

/**
 * Pré-requisitos entre competências, derivados dos conceitos: a competência
 * do módulo B depende da de A quando algum conceito de B tem pré-requisito em A.
 */
export function prereqsPorCompetencia(
  conceitos: readonly { module: string; prereqs: readonly string[]; id: string }[],
): PrereqsCompetencia {
  const moduloDe = new Map(conceitos.map((c) => [c.id, c.module]));
  const competenciaDe = new Map<string, CompetenciaId>(
    COMPETENCIAS.map((c) => [c.modulo as ModuleId, c.id]),
  );
  const saida = Object.fromEntries(COMPETENCIAS.map((c) => [c.id, [] as CompetenciaId[]])) as PrereqsCompetencia;
  for (const c of conceitos) {
    const destino = competenciaDe.get(c.module);
    if (!destino) continue;
    for (const p of c.prereqs) {
      const origem = competenciaDe.get(moduloDe.get(p) ?? "");
      if (origem && origem !== destino && !saida[destino].includes(origem)) saida[destino].push(origem);
    }
  }
  return saida;
}

/** Competências que a regra pularia, dado o mcqScore de cada uma (na ordem M0→M4). */
export function competenciasPuladas(
  scores: Partial<Record<CompetenciaId, number | null>>,
  prereqs: PrereqsCompetencia,
): Set<CompetenciaId> {
  const puladas = new Set<CompetenciaId>();
  for (const { id } of COMPETENCIAS) {
    const bloqueia = prereqs[id].some((p) => puladas.has(p) || (scores[p] ?? 0) < GATE_REVISAO);
    if (bloqueia) puladas.add(id);
  }
  return puladas;
}

export type SimulacaoAdaptativa = {
  /** Rodadas com as 5 competências respondidas na etapa 1 — as únicas que dá para simular. */
  rodadasCompletas: number;
  /** Rodadas em que a regra pularia ao menos uma competência. */
  rodadasComPulo: number;
  /** Média de questões que a regra pouparia por rodada completa. */
  questoesPoupadas: number;
  /** Competências puladas, somando todas as rodadas. */
  casosPulados: number;
  /** Fração dos casos pulados em que a nota real era ≥ GATE_REVISAO. */
  escondidoRevisao: number | null;
  /** Fração dos casos pulados em que a nota real era ≥ GATE_DISPENSA. */
  escondidoCandidata: number | null;
  veredito: "dados-insuficientes" | "regra-segura" | "regra-esconde-demais";
};

export function simularAdaptativo(
  conteudo: NivelamentoContent,
  rodadas: readonly { resultados: Record<string, ResultadoQuestao> }[],
  prereqs: PrereqsCompetencia,
): SimulacaoAdaptativa {
  const etapa1 = conteudo.mcq.filter((q) => q.etapa === 1);
  let rodadasCompletas = 0;
  let rodadasComPulo = 0;
  let poupadas = 0;
  let casosPulados = 0;
  let escondidoRevisao = 0;
  let escondidoCandidata = 0;

  for (const r of rodadas) {
    const vistas = etapa1.filter((q) => r.resultados[q.id] !== undefined);
    const matriz = scoreCompetencias(questoesParaEngine(vistas), r.resultados, {});
    if (COMPETENCIAS.some((c) => matriz[c.id].mcqScore === null)) continue;
    rodadasCompletas += 1;

    const scores = Object.fromEntries(COMPETENCIAS.map((c) => [c.id, matriz[c.id].mcqScore]));
    const puladas = competenciasPuladas(scores, prereqs);
    if (puladas.size > 0) rodadasComPulo += 1;
    for (const id of puladas) {
      casosPulados += 1;
      poupadas += matriz[id].total;
      const real = matriz[id].mcqScore ?? 0;
      if (real >= GATE_REVISAO) escondidoRevisao += 1;
      if (real >= GATE_DISPENSA) escondidoCandidata += 1;
    }
  }

  const fr = (v: number) => (casosPulados ? v / casosPulados : null);
  const revisao = fr(escondidoRevisao);
  const candidata = fr(escondidoCandidata);
  const suficiente = rodadasCompletas >= RODADAS_MINIMAS && casosPulados >= CASOS_MINIMOS;

  return {
    rodadasCompletas,
    rodadasComPulo,
    questoesPoupadas: rodadasCompletas ? poupadas / rodadasCompletas : 0,
    casosPulados,
    escondidoRevisao: revisao,
    escondidoCandidata: candidata,
    veredito: !suficiente
      ? "dados-insuficientes"
      : candidata! <= ESCONDIDO_CANDIDATA_MAX && revisao! <= ESCONDIDO_REVISAO_MAX
        ? "regra-segura"
        : "regra-esconde-demais",
  };
}
