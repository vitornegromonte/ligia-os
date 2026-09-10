/**
 * Contrato do conteúdo do nivelamento v2 (content/nivelamento.json), no mesmo
 * padrão fail-fast de lib/content.ts e lib/pretest-content.ts.
 *
 * Coexiste com o v1 (content/pretest.json + lib/pretest-content.ts): a UI só
 * migra numa wave posterior. Duas normalizações acontecem no parse:
 *
 * - opções aceitam `"texto"` ou `{texto, ...flags}` e sempre saem como objeto;
 * - `naoSei` marca a opção honesta das MCQ (última posição, peso zero na
 *   engine) e `exclusiva` marca o "Nenhum destes" do auto-relato (selecioná-la
 *   desmarca as demais — mecanismo no QuestionCard).
 *
 * O gabarito (`correta`) NÃO é repassado à engine: questoesParaEngine() expõe
 * só id/competência/dificuldade/conceitos. Corrigir é papel da UI; pontuar é
 * papel de lib/nivelamento.ts.
 */

import { z } from "zod";
import { COMPETENCIAS, type CompetenciaId } from "./competencias";
import type { PriorAutoRelato, QuestaoNivelamento } from "./nivelamento";

const COMPETENCIA_IDS = COMPETENCIAS.map((c) => c.id) as [CompetenciaId, ...CompetenciaId[]];
const CompetenciaSchema = z.enum(COMPETENCIA_IDS);

/** Opção de MCQ já normalizada. `naoSei` = a opção honesta ("Não sei"). */
export type OpcaoConteudo = { texto: string; naoSei: boolean };

/** Opção de auto-relato normalizada: pode declarar competência (prior) ou ser exclusiva. */
export type OpcaoAutoRelato = {
  texto: string;
  competencia: CompetenciaId | null;
  exclusiva: boolean;
};

const OpcaoConteudoSchema = z
  .union([
    z.string().min(1),
    z.object({ texto: z.string().min(1), naoSei: z.boolean().optional() }),
  ])
  .transform((op): OpcaoConteudo =>
    typeof op === "string"
      ? { texto: op, naoSei: false }
      : { texto: op.texto, naoSei: op.naoSei ?? false },
  );

const OpcaoAutoRelatoSchema = z
  .union([
    z.string().min(1),
    z.object({
      texto: z.string().min(1),
      competencia: CompetenciaSchema.optional(),
      exclusiva: z.boolean().optional(),
    }),
  ])
  .transform((op): OpcaoAutoRelato =>
    typeof op === "string"
      ? { texto: op, competencia: null, exclusiva: false }
      : {
          texto: op.texto,
          competencia: op.competencia ?? null,
          exclusiva: op.exclusiva ?? false,
        },
  );

export const PerguntaAutoRelatoSchema = z.object({
  id: z.string().min(1),
  tipo: z.enum(["single", "multi"]),
  pergunta: z.string().min(1),
  opcoes: z.array(OpcaoAutoRelatoSchema).min(2),
});

export const QuestaoMCQSchema = z.object({
  id: z.string().min(1),
  competencia: CompetenciaSchema,
  dificuldade: z.union([z.literal(1), z.literal(2), z.literal(3)]),
  conceitos: z.array(z.string().min(1)).min(1),
  pergunta: z.string().min(1),
  opcoes: z.array(OpcaoConteudoSchema).min(2),
  correta: z.number().int().nonnegative(),
});

export const ColabSchema = z.object({
  pergunta: z.string().min(1),
  url: z.url(),
});

export const NivelamentoContentSchema = z.object({
  version: z.string().min(1),
  note: z.string().optional(),
  auto_relato: z.array(PerguntaAutoRelatoSchema).min(1),
  mcq: z.array(QuestaoMCQSchema).min(1),
  colab: ColabSchema,
});

export type PerguntaAutoRelato = z.infer<typeof PerguntaAutoRelatoSchema>;
export type QuestaoMCQ = z.infer<typeof QuestaoMCQSchema>;
export type NivelamentoContent = z.infer<typeof NivelamentoContentSchema>;

/**
 * Integridade que o schema sozinho não pega: `correta` precisa existir e não
 * pode apontar pra opção "Não sei" (senão o gabarito premiaria a desistência).
 */
function checarConteudo(c: NivelamentoContent): void {
  for (const q of c.mcq) {
    if (q.correta >= q.opcoes.length) {
      throw new Error(`Questão ${q.id}: correta=${q.correta} fora do intervalo de opções.`);
    }
    if (q.opcoes[q.correta].naoSei) {
      throw new Error(`Questão ${q.id}: correta aponta pra opção "Não sei".`);
    }
  }
}

/** Parse + integridade, fail-fast (padrão do repo). */
export function loadNivelamentoContent(raw: unknown): NivelamentoContent {
  const c = NivelamentoContentSchema.parse(raw);
  checarConteudo(c);
  return c;
}

/**
 * Converte os índices marcados em ar1 no prior de auto-relato consumido pela
 * engine. A opção exclusiva ("Nenhum destes") e índices inválidos são
 * ignorados — o prior só afirma o que o aluno declarou de fato.
 */
export function priorDeAr1(ar1: PerguntaAutoRelato, selecionados: number[]): PriorAutoRelato {
  const prior: PriorAutoRelato = {};
  for (const i of selecionados) {
    const op = ar1.opcoes[i];
    if (!op || op.exclusiva || !op.competencia) continue;
    prior[op.competencia] = true;
  }
  return prior;
}

/** Projeta as MCQ no contrato da engine — sem gabarito, sem enunciado. */
export function questoesParaEngine(c: NivelamentoContent): QuestaoNivelamento[] {
  return c.mcq.map((q) => ({
    id: q.id,
    competencia: q.competencia,
    dificuldade: q.dificuldade,
    conceitos: q.conceitos,
  }));
}
