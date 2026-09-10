/**
 * Engine pura do nivelamento v2 — matriz de competências contínua.
 *
 * Substitui a seleção de perfil-arquétipo (lib/pretest.ts) por dois passos:
 *
 *   1. scoreCompetencias(): resultados por questão → CompetencyMatrix
 *      (score 0–100 por competência + confiança + conceitos fracos);
 *   2. recomendar(): matriz → estado por módulo (dispensável / revisão
 *      dirigida / começar aqui / sem evidência), fronteira da trilha,
 *      nós-estrela e sugestões de dispensa.
 *
 * Contratos importantes:
 * - A engine NÃO vê gabarito (`correta`): recebe só o resultado já julgado
 *   por questão ("acerto" | "erro" | "nao-sei"). Corrigir é papel da UI/
 *   conteúdo; pontuar é papel daqui.
 * - Funções puras, zero I/O/DOM/localStorage. Fixtures sintéticas nos testes.
 * - REGRA ANTI-FALSO-POSITIVO: os gates de dispensa usam SÓ o mcqScore.
 *   priorBoost e colabBonus são cosméticos/motivacionais (entram apenas no
 *   `score` exibido no radar) e jamais promovem dispensa de módulo.
 */

import { COMPETENCIAS, type CompetenciaId } from "./competencias";
import type { ModuleId } from "./content";

// ---------------------------------------------------------------------------
// Tipos de entrada — a engine define o contrato; o conteúdo (outra wave)
// seguirá estes tipos.
// ---------------------------------------------------------------------------

export type QuestaoNivelamento = {
  id: string;
  competencia: CompetenciaId;
  /** Peso da questão no score (1 = básica, 3 = avançada). */
  dificuldade: 1 | 2 | 3;
  /** Ids de conceitos (content/concepts.json) cobertos pela questão. */
  conceitos: string[];
};

/** "nao-sei" = aluno escolheu a opção honesta "Não sei" (≠ chute errado só no diagnóstico, igual no score). */
export type ResultadoQuestao = "acerto" | "erro" | "nao-sei";

/** Competências que o aluno declarou já ter visto no auto-relato. */
export type PriorAutoRelato = Partial<Record<CompetenciaId, boolean>>;

// ---------------------------------------------------------------------------
// Constantes nomeadas (pinadas em teste)
// ---------------------------------------------------------------------------

/**
 * Bônus cosmético no score exibido quando o aluno declarou a competência no
 * auto-relato E o mcqScore confirma sinal (≥ PRIOR_MIN_MCQ). Nunca cria
 * proficiência do nada e nunca entra em gate de dispensa.
 */
export const PRIOR_BOOST = 5;

/** mcqScore mínimo pro auto-relato valer o boost — prior sem evidência não conta. */
export const PRIOR_MIN_MCQ = 50;

/**
 * Bônus cosmético por ter feito o notebook Colab (regressão logística no
 * Iris) — por isso vale SÓ em ml-classico. Também jamais promove dispensa.
 */
export const COLAB_BONUS = 8;

/** Gate de dispensa de módulo: exige mcqScore ≥ 75 (mais as condições de confiança/prior). */
export const GATE_DISPENSA = 75;

/** Piso da revisão dirigida: mcqScore em [40, 75) marca os conceitos fracos com estrela. */
export const GATE_REVISAO = 40;

/**
 * Meia-largura da zona ambígua da confiança: fração de acertos a menos de
 * 0.25 do meio (0.5) é sinal ambíguo → "baixa".
 */
export const AMBIGUIDADE_BAIXA = 0.25;

// ---------------------------------------------------------------------------
// Matriz de competências
// ---------------------------------------------------------------------------

export type Confianca = "alta" | "media" | "baixa" | "sem-evidencia";

export type CompetencyEntry = {
  /** Score exibido no radar: clamp(mcqScore + boosts, 0, 100). Null sem questão. */
  score: number | null;
  /** Score "duro" 0–100, média ponderada por dificuldade. Único usado em gates. */
  mcqScore: number | null;
  /** PRIOR_BOOST aplicado (0 ou 5). */
  priorBoost: number;
  /** COLAB_BONUS aplicado (0 ou 8; só ml-classico). */
  colabBonus: number;
  confianca: Confianca;
  /** Nº de questões com "acerto" (contagem simples, sem peso — base da confiança). */
  acertos: number;
  /** Nº de questões da competência apresentadas. */
  total: number;
  /** Conceitos das questões com "erro"/"nao-sei" (dedup, ordem de 1ª aparição). */
  conceitosFracos: string[];
};

export type CompetencyMatrix = Record<CompetenciaId, CompetencyEntry>;

const clamp0a100 = (n: number): number => Math.min(100, Math.max(0, n));

/**
 * Confiança pela ambiguidade do sinal (fração de acertos sobre o total),
 * genérica pra N questões (N=4 no conteúdo real, fixtures variam):
 * - "alta": tudo-ou-nada (acertos == 0 ou acertos == total);
 * - "baixa": fração a menos de AMBIGUIDADE_BAIXA do meio (ex.: 2/4);
 * - "media": o resto (1 desvio do extremo, ex.: 1/4 ou 3/4).
 */
function confiancaDe(acertos: number, total: number): Confianca {
  if (total === 0) return "sem-evidencia";
  if (acertos === 0 || acertos === total) return "alta";
  if (Math.abs(acertos / total - 0.5) < AMBIGUIDADE_BAIXA) return "baixa";
  return "media";
}

/**
 * Pontua a matriz de competências a partir dos resultados por questão.
 *
 * - mcqScore = Σ(dificuldade das acertadas) / Σ(dificuldade de todas) × 100.
 *   "nao-sei" (e questão sem resultado registrado) conta como errada.
 * - Competência sem NENHUMA questão → score/mcqScore null, "sem-evidencia"
 *   (caso da migração de dados antigos) — boosts não se aplicam (bônus nunca
 *   cria proficiência do nada).
 */
export function scoreCompetencias(
  questoes: QuestaoNivelamento[],
  resultados: Record<string, ResultadoQuestao>,
  opts: { prior?: PriorAutoRelato; fezColab?: boolean } = {},
): CompetencyMatrix {
  const matriz = {} as CompetencyMatrix;

  for (const { id } of COMPETENCIAS) {
    const qs = questoes.filter((q) => q.competencia === id);
    const total = qs.length;

    if (total === 0) {
      matriz[id] = {
        score: null,
        mcqScore: null,
        priorBoost: 0,
        colabBonus: 0,
        confianca: "sem-evidencia",
        acertos: 0,
        total: 0,
        conceitosFracos: [],
      };
      continue;
    }

    let pesoTotal = 0;
    let pesoAcertado = 0;
    let acertos = 0;
    const fracos: string[] = [];
    const vistos = new Set<string>();

    for (const q of qs) {
      pesoTotal += q.dificuldade;
      if (resultados[q.id] === "acerto") {
        pesoAcertado += q.dificuldade;
        acertos += 1;
      } else {
        // "erro", "nao-sei" ou sem resposta registrada: zero ponto + conceitos fracos
        for (const c of q.conceitos) {
          if (!vistos.has(c)) {
            vistos.add(c);
            fracos.push(c);
          }
        }
      }
    }

    const mcqScore = (pesoAcertado / pesoTotal) * 100;
    const priorBoost = opts.prior?.[id] && mcqScore >= PRIOR_MIN_MCQ ? PRIOR_BOOST : 0;
    const colabBonus = id === "ml-classico" && opts.fezColab ? COLAB_BONUS : 0;

    matriz[id] = {
      score: clamp0a100(mcqScore + priorBoost + colabBonus),
      mcqScore,
      priorBoost,
      colabBonus,
      confianca: confiancaDe(acertos, total),
      acertos,
      total,
      conceitosFracos: fracos,
    };
  }

  return matriz;
}

// ---------------------------------------------------------------------------
// Recomendação de trilha
// ---------------------------------------------------------------------------

export type EstadoModulo = "dispensavel" | "revisao-dirigida" | "comecar-aqui" | "sem-evidencia";

export type SugestaoDispensa = "pre-marcada" | "desmarcada";

export type DispensavelSugerido = {
  modulo: ModuleId;
  competencia: CompetenciaId;
  /** "pre-marcada" (acertou tudo) ou "desmarcada" (aluno confirma no diálogo, vendo o que errou). */
  sugestao: SugestaoDispensa;
  conceitosFracos: string[];
};

export type Recomendacao = {
  /** Primeiro módulo não-dispensável (M0→M4); tudo dispensável → "M5". */
  fronteira: ModuleId;
  estados: Record<CompetenciaId, EstadoModulo>;
  /** Conceitos fracos da competência da fronteira (⭐ na trilha); M5 → []. */
  starNodes: string[];
  dispensaveisSugeridos: DispensavelSugerido[];
  mensagem: string;
};

/**
 * Mensagens por fronteira — curtas, motivadoras, sem jargão de arquétipo.
 * A de M5 substitui a copy do perfil viu-dl.
 */
export const MENSAGENS_FRONTEIRA: Record<ModuleId, string> = {
  M0: "Todo mundo começa de algum lugar — sua trilha parte da base de matemática, no seu ritmo.",
  M1: "Matemática em dia! Sua trilha começa no ML Clássico, a fundação de todos os modelos.",
  M2: "Base sólida de ML — hora de mergulhar nos fundamentos de Deep Learning.",
  M3: "Fundamentos dominados. Agora é aplicar Deep Learning em problemas de verdade.",
  M4: "Você chegou à fronteira: Transformers e LLMs são o seu próximo passo.",
  M5: "Você já domina os Fundamentos — seu caminho são os Eixos (Acadêmico / Profissional / Fronteira) e o projeto final.",
};

/**
 * Estado do módulo a partir da entrada da competência. Gates usam SÓ o
 * mcqScore (nunca o score com boosts):
 * - "dispensavel": mcqScore ≥ 75 E confiança alta/media E (gabaritou OU
 *   declarou a competência no auto-relato);
 * - "revisao-dirigida": mcqScore ≥ 40 — inclui quem passou de 75 mas falhou
 *   as condições extras do gate (decisão: sinal forte com dúvida vira
 *   revisão dirigida, nunca "começar do zero");
 * - "comecar-aqui": mcqScore < 40;
 * - "sem-evidencia": sem questão da competência (score null).
 */
function estadoDe(entry: CompetencyEntry, priorDeclarado: boolean): EstadoModulo {
  if (entry.mcqScore === null) return "sem-evidencia";
  const dispensavel =
    entry.mcqScore >= GATE_DISPENSA &&
    (entry.confianca === "alta" || entry.confianca === "media") &&
    (entry.acertos === entry.total || priorDeclarado);
  if (dispensavel) return "dispensavel";
  if (entry.mcqScore >= GATE_REVISAO) return "revisao-dirigida";
  return "comecar-aqui";
}

/** Deriva estados por módulo, fronteira, ⭐ e sugestões de dispensa da matriz. */
export function recomendar(
  matriz: CompetencyMatrix,
  opts: { prior?: PriorAutoRelato } = {},
): Recomendacao {
  const estados = {} as Record<CompetenciaId, EstadoModulo>;
  const dispensaveisSugeridos: DispensavelSugerido[] = [];
  let fronteira: ModuleId = "M5";
  let starNodes: string[] = [];

  for (const { id, modulo } of COMPETENCIAS) {
    const entry = matriz[id];
    const estado = estadoDe(entry, opts.prior?.[id] === true);
    estados[id] = estado;

    if (estado === "dispensavel") {
      dispensaveisSugeridos.push({
        modulo,
        competencia: id,
        sugestao: entry.acertos === entry.total ? "pre-marcada" : "desmarcada",
        conceitosFracos: entry.conceitosFracos,
      });
    } else if (fronteira === "M5") {
      // primeiro módulo (M0→M4) que não dá pra dispensar = onde a trilha começa
      fronteira = modulo;
      starNodes = entry.conceitosFracos;
    }
  }

  return {
    fronteira,
    estados,
    starNodes,
    dispensaveisSugeridos,
    mensagem: MENSAGENS_FRONTEIRA[fronteira],
  };
}
