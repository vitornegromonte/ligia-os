import rawConcepts from "@/content/concepts.json";
import { loadConcepts } from "@/lib/content";
import { conceptToAulaMap } from "@/lib/aulas";
import { getLoopConceptIds } from "@/lib/loops";

/**
 * Conteúdo da trilha, validado uma vez na carga do módulo.
 *
 * `loadConcepts` faz Zod + integridade (id duplicado, módulo desconhecido,
 * pré-requisito inexistente, ciclo no DAG) e LANÇA se algo estiver errado.
 * Falha de conteúdo precisa quebrar cedo, não virar card fantasma na tela.
 */
export const CONTEUDO = loadConcepts(rawConcepts);
export const CONCEITOS = CONTEUDO.concepts;
export const MODULOS = CONTEUDO.modules;
export const CONCEITO_POR_ID = Object.fromEntries(CONCEITOS.map((c) => [c.id, c]));
export const CONCEITO_PARA_AULA = conceptToAulaMap();
export const CONCEITOS_COM_LOOP = new Set(getLoopConceptIds());

import rawNivelamento from "@/content/nivelamento.json";
import { loadNivelamentoContent } from "@/lib/nivelamento-content";

/** Conteúdo do nivelamento, validado (inclui a checagem do gabarito). */
export const NIVELAMENTO = loadNivelamentoContent(rawNivelamento);

/** Conceitos por módulo — usado ao confirmar dispensa de módulo inteiro. */
export const CONCEITOS_POR_MODULO: Record<string, string[]> = CONCEITOS.reduce(
  (acc, c) => {
    (acc[c.module] ??= []).push(c.id);
    return acc;
  },
  {} as Record<string, string[]>,
);

export const ROTULO_CONCEITO: Record<string, string> = Object.fromEntries(
  CONCEITOS.map((c) => [c.id, c.label]),
);
