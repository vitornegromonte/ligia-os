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

/**
 * Opção de MCQ já normalizada. `naoSei` = a opção honesta ("Não sei").
 * `equivoco` = o engano típico de quem marca esta alternativa errada, mostrado
 * na revisão do resultado (concept inventories: cada distrator corresponde a
 * um equívoco conhecido).
 */
export type OpcaoConteudo = { texto: string; naoSei: boolean; equivoco: string | null };

/** Opção de auto-relato normalizada: pode declarar competência (prior) ou ser exclusiva. */
export type OpcaoAutoRelato = {
  texto: string;
  competencia: CompetenciaId | null;
  exclusiva: boolean;
};

const OpcaoConteudoSchema = z
  .union([
    z.string().min(1),
    z.object({
      texto: z.string().min(1),
      naoSei: z.boolean().optional(),
      equivoco: z.string().min(1).optional(),
    }),
  ])
  .transform((op): OpcaoConteudo =>
    typeof op === "string"
      ? { texto: op, naoSei: false, equivoco: null }
      : { texto: op.texto, naoSei: op.naoSei ?? false, equivoco: op.equivoco ?? null },
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

/** O que muda entre as formas de uma mesma questão: o texto e o gabarito. */
const FormaSchema = z.object({
  id: z.string().min(1),
  pergunta: z.string().min(1),
  /** Trecho de código mostrado abaixo do enunciado (questões de leitura de código). */
  codigo: z.string().min(1).optional(),
  opcoes: z.array(OpcaoConteudoSchema).min(2),
  correta: z.number().int().nonnegative(),
  /** Por que a certa é certa, em 1–3 frases — mostrada na revisão do resultado. */
  explicacao: z.string().min(1),
});

/**
 * Questão como escrita no JSON: a forma principal mais `variantes`, formas
 * alternativas que medem o mesmo (mesma competência, etapa, dificuldade e
 * conceitos). Refazer o nivelamento sorteia outra forma, para a nota medir
 * domínio do assunto e não memória da questão.
 */
export const QuestaoMCQSchema = FormaSchema.extend({
  competencia: CompetenciaSchema,
  /** 1 = matriz (todo aluno); 2 = confirmação de dispensa (opcional). */
  etapa: z.union([z.literal(1), z.literal(2)]).default(1),
  dificuldade: z.union([z.literal(1), z.literal(2), z.literal(3)]),
  conceitos: z.array(z.string().min(1)).min(1),
  /**
   * Questão fora de uso: não entra em prova nova, mas continua no banco para
   * rodadas antigas e para a análise de itens. Aposentar em vez de apagar
   * garante que um id nunca muda de significado.
   */
  aposentada: z.boolean().default(false),
  variantes: z.array(FormaSchema).default([]),
});

/**
 * Leitura de código: mede se o aluno lê Python, NumPy e PyTorch, no lugar da
 * antiga pergunta "fiz o notebook do Colab?", que dependia da palavra do aluno.
 * Não tem competência: fica fora da matriz e só orienta por qual nível de
 * prática de código começar.
 */
export const QuestaoCodigoSchema = FormaSchema.extend({
  dificuldade: z.union([z.literal(1), z.literal(2), z.literal(3)]),
  aposentada: z.boolean().default(false),
  variantes: z.array(FormaSchema).default([]),
});

export const CodigoSchema = z.object({
  nota: z.string().optional(),
  /** Notebook de prática (regressão logística no Iris), oferecido no resultado. */
  notebook: z.url(),
  questoes: z.array(QuestaoCodigoSchema).min(1),
});

export const NivelamentoContentSchema = z.object({
  version: z.string().min(1),
  note: z.string().optional(),
  auto_relato: z.array(PerguntaAutoRelatoSchema).min(1),
  mcq: z.array(QuestaoMCQSchema).min(1),
  codigo: CodigoSchema,
});

export type PerguntaAutoRelato = z.infer<typeof PerguntaAutoRelatoSchema>;

/**
 * Uma forma de questão, já achatada: `mcq` do conteúdo carregado lista todas as
 * formas de todas as questões. `slot` é o id da questão (o da forma principal)
 * e agrupa as formas intercambiáveis.
 */
export type QuestaoMCQ = Omit<z.infer<typeof QuestaoMCQSchema>, "variantes"> & { slot: string };

/** Forma de questão de leitura de código, achatada como as MCQ. */
export type QuestaoCodigo = Omit<z.infer<typeof QuestaoCodigoSchema>, "variantes"> & { slot: string };

/** O mínimo que corrigir e sortear precisam — vale para MCQ e leitura de código. */
export type FormaQuestao = QuestaoMCQ | QuestaoCodigo;

export type NivelamentoContent = Omit<z.infer<typeof NivelamentoContentSchema>, "mcq" | "codigo"> & {
  mcq: QuestaoMCQ[];
  codigo: { nota?: string; notebook: string; questoes: QuestaoCodigo[] };
};

/**
 * MCQ de competência? Guarda de tipo pelo lado da MCQ: toda MCQ também
 * satisfaz o tipo da questão de código (tem os mesmos campos e mais alguns),
 * então a guarda inversa estreitaria o outro ramo para `never`.
 */
export function ehQuestaoMCQ(q: FormaQuestao): q is QuestaoMCQ {
  return "competencia" in q;
}

/** Questão de leitura de código? (não tem competência). */
export function ehQuestaoCodigo(q: FormaQuestao): boolean {
  return !ehQuestaoMCQ(q);
}

/**
 * Integridade que o schema sozinho não pega: `correta` precisa existir e não
 * pode apontar pra opção "Não sei" (senão o gabarito premiaria a desistência);
 * ids são únicos; e toda competência avaliada na etapa 1 tem etapa 2 (senão a
 * tela ofereceria confirmar a dispensa com zero questões).
 */
function checarConteudo(c: NivelamentoContent): void {
  const ids = new Set<string>();
  for (const q of [...c.mcq, ...c.codigo.questoes]) {
    if (ids.has(q.id)) throw new Error(`Questão ${q.id}: id repetido.`);
    ids.add(q.id);
    if (q.correta >= q.opcoes.length) {
      throw new Error(`Questão ${q.id}: correta=${q.correta} fora do intervalo de opções.`);
    }
    if (q.opcoes[q.correta].naoSei) {
      throw new Error(`Questão ${q.id}: correta aponta pra opção "Não sei".`);
    }
    if (q.opcoes[q.correta].equivoco || q.opcoes.some((o) => o.naoSei && o.equivoco)) {
      throw new Error(`Questão ${q.id}: equívoco só cabe em alternativa errada.`);
    }
  }
  const ativas = c.mcq.filter((q) => !q.aposentada);
  for (const { id } of COMPETENCIAS) {
    const temEtapa1 = ativas.some((q) => q.competencia === id && q.etapa === 1);
    const temEtapa2 = ativas.some((q) => q.competencia === id && q.etapa === 2);
    if (temEtapa1 && !temEtapa2) {
      throw new Error(`Competência ${id}: tem questões na etapa 1 e nenhuma na etapa 2.`);
    }
  }
}

/** Parse + achatamento das variantes + integridade, fail-fast (padrão do repo). */
export function loadNivelamentoContent(raw: unknown): NivelamentoContent {
  const { mcq, codigo, ...resto } = NivelamentoContentSchema.parse(raw);
  const formas = mcq.flatMap(({ variantes, ...principal }) => {
    const comum = {
      slot: principal.id,
      competencia: principal.competencia,
      etapa: principal.etapa,
      dificuldade: principal.dificuldade,
      conceitos: principal.conceitos,
      aposentada: principal.aposentada,
    };
    return [{ ...principal, slot: principal.id }, ...variantes.map((v) => ({ ...comum, ...v }))];
  });
  const formasCodigo = codigo.questoes.flatMap(({ variantes, ...principal }) => [
    { ...principal, slot: principal.id },
    ...variantes.map((v) => ({
      slot: principal.id,
      dificuldade: principal.dificuldade,
      aposentada: principal.aposentada,
      ...v,
    })),
  ]);
  const c = { ...resto, mcq: formas, codigo: { ...codigo, questoes: formasCodigo } };
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

/**
 * Todas as formas das questões ativas de uma etapa, opcionalmente só das
 * competências dadas, na ordem do conteúdo. Aposentadas ficam de fora (use
 * `c.mcq` para ler rodadas antigas). Para a prova de um aluno (uma forma por
 * questão), use montarProva() em lib/nivelamento-rodada.
 */
export function questoesDaEtapa(
  c: NivelamentoContent,
  etapa: 1 | 2,
  competencias?: readonly CompetenciaId[],
): QuestaoMCQ[] {
  return c.mcq.filter(
    (q) =>
      !q.aposentada &&
      q.etapa === etapa &&
      (!competencias || competencias.includes(q.competencia)),
  );
}

/** Projeta as MCQ no contrato da engine — sem gabarito, sem enunciado. */
export function questoesParaEngine(questoes: readonly QuestaoMCQ[]): QuestaoNivelamento[] {
  return questoes.map((q) => ({
    id: q.id,
    competencia: q.competencia,
    dificuldade: q.dificuldade,
    conceitos: q.conceitos,
    etapa: q.etapa,
  }));
}
