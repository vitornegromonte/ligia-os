/**
 * Operações sobre uma rodada do nivelamento que precisam do conteúdo E da
 * engine ao mesmo tempo: montar a prova, corrigir respostas, aplicar a etapa 2
 * a uma rodada já salva. Puras — a página decide quando ler e gravar storage.
 */

import type { CompetenciaId } from "./competencias";
import { hashSeed } from "./embaralhar";
import {
  avaliarEtapa2,
  recomendar,
  type ResultadoEtapa2,
  type ResultadoQuestao,
} from "./nivelamento";
import {
  questoesDaEtapa,
  questoesParaEngine,
  type NivelamentoContent,
  type QuestaoMCQ,
} from "./nivelamento-content";
import type { PretestResultV2, QuestoesVistas } from "./pretest-storage";

/**
 * Prova de uma etapa: uma forma por questão, na ordem do conteúdo.
 *
 * Entre as formas de cada questão, fica a vista há mais tempo (nunca vista
 * conta como a mais antiga); empate se resolve pela seed da rodada. Com duas
 * formas, refazer o nivelamento alterna entre elas.
 */
export function montarProva(
  conteudo: NivelamentoContent,
  etapa: 1 | 2,
  opts: { seed: string; vistas?: QuestoesVistas; competencias?: readonly CompetenciaId[] },
): QuestaoMCQ[] {
  const vistas = opts.vistas ?? {};
  const porSlot = new Map<string, QuestaoMCQ[]>();
  for (const q of questoesDaEtapa(conteudo, etapa, opts.competencias)) {
    porSlot.set(q.slot, [...(porSlot.get(q.slot) ?? []), q]);
  }

  return [...porSlot.entries()].map(([slot, formas]) => {
    const ultimaVez = (f: QuestaoMCQ) => vistas[f.id] ?? "";
    const maisAntiga = formas.map(ultimaVez).sort()[0];
    const candidatas = formas.filter((f) => ultimaVez(f) === maisAntiga);
    return candidatas[hashSeed(`${opts.seed}:${slot}`) % candidatas.length];
  });
}

/** Reconstrói a lista de questões a partir dos ids (ids que não existem mais são ignorados). */
export function questoesPorIds(conteudo: NivelamentoContent, ids: readonly string[]): QuestaoMCQ[] {
  const porId = new Map(conteudo.mcq.map((q) => [q.id, q]));
  return ids.map((id) => porId.get(id)).filter((q): q is QuestaoMCQ => q !== undefined);
}

/**
 * Corrige as respostas (índice da opção ORIGINAL, antes do embaralhamento).
 * Sem resposta ou "Não sei" → "nao-sei".
 */
export function corrigir(
  questoes: readonly QuestaoMCQ[],
  respostas: Record<string, number | undefined>,
): Record<string, ResultadoQuestao> {
  const resultados: Record<string, ResultadoQuestao> = {};
  for (const q of questoes) {
    const escolhida = respostas[q.id];
    if (escolhida === undefined || q.opcoes[escolhida]?.naoSei) {
      resultados[q.id] = "nao-sei";
    } else {
      resultados[q.id] = escolhida === q.correta ? "acerto" : "erro";
    }
  }
  return resultados;
}

/** Competências da rodada que já têm resposta registrada na etapa 2. */
export function competenciasComEtapa2(
  conteudo: NivelamentoContent,
  rodada: Pick<PretestResultV2, "resultados">,
): CompetenciaId[] {
  const feitas = new Set<CompetenciaId>();
  for (const q of questoesDaEtapa(conteudo, 2)) {
    if (rodada.resultados[q.id] !== undefined) feitas.add(q.competencia);
  }
  return [...feitas];
}

/**
 * Resultado da etapa 2 por competência que a fez nesta rodada — inclusive as
 * reprovadas, que a recomendação só registra como "revisao-dirigida".
 */
export function resumoEtapa2(
  conteudo: NivelamentoContent,
  rodada: Pick<PretestResultV2, "resultados">,
): Partial<Record<CompetenciaId, ResultadoEtapa2>> {
  // Só as questões que o aluno viu: as ids presentes nos resultados.
  const vistas = conteudo.mcq.filter((q) => rodada.resultados[q.id] !== undefined);
  return avaliarEtapa2(questoesParaEngine(vistas), rodada.resultados);
}

/**
 * Uma rodada salva só pode ser reaberta (para ver o resultado ou confirmar
 * dispensa) se todas as questões dela ainda existem no conteúdo atual. Rodada
 * migrada do v1 não tem resultados por questão e nunca é compatível.
 */
export function rodadaCompativel(
  conteudo: NivelamentoContent,
  rodada: PretestResultV2 | null,
): rodada is PretestResultV2 {
  if (!rodada || rodada.version !== 2) return false;
  const ids = Object.keys(rodada.resultados ?? {});
  if (ids.length === 0) return false;
  const existentes = new Set(conteudo.mcq.map((q) => q.id));
  return ids.every((id) => existentes.has(id));
}

/**
 * Aplica a etapa 2 a uma rodada: corrige as respostas da prova apresentada
 * (montarProva), junta aos resultados da rodada e recalcula a recomendação.
 *
 * A matriz (radar) não muda — ela é só da etapa 1. Competência que já fez a
 * etapa 2 nesta rodada é ignorada: refazer a confirmação depois de ver as
 * próprias respostas mediria memória, não domínio.
 */
export function aplicarEtapa2(
  conteudo: NivelamentoContent,
  rodada: PretestResultV2,
  prova: readonly QuestaoMCQ[],
  respostas: Record<string, number | undefined>,
): PretestResultV2 {
  const jaFeitas = new Set(competenciasComEtapa2(conteudo, rodada));
  const novas = prova.filter((q) => q.etapa === 2 && !jaFeitas.has(q.competencia));
  const resultados = { ...rodada.resultados, ...corrigir(novas, respostas) };

  const etapa2 = resumoEtapa2(conteudo, { resultados });
  return { ...rodada, resultados, recomendacao: recomendar(rodada.matriz, { etapa2 }) };
}
