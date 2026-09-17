/**
 * Engine pura do nivelamento v2 — matriz de competências contínua.
 *
 * Substitui a seleção de perfil-arquétipo (lib/pretest.ts) por dois passos:
 *
 *   1. scoreCompetencias(): resultados por questão → CompetencyMatrix
 *      (score 0–100 por competência + confiança + conceitos fracos);
 *   2. recomendar(): matriz → estado por módulo (dispensável / dispensa a
 *      confirmar / revisão dirigida / começar aqui / sem evidência), fronteira
 *      da trilha, nós-estrela e sugestões de dispensa.
 *
 * A dispensa é em duas etapas (multistage testing): as 4 questões da etapa 1
 * só *candidatam* o módulo; pular exige a etapa 2, opcional, com mais questões
 * do módulo. avaliarEtapa2() decide pela nota acumulada das duas etapas.
 *
 * Contratos importantes:
 * - A engine NÃO vê gabarito (`correta`): recebe só o resultado já julgado
 *   por questão ("acerto" | "erro" | "nao-sei"). Corrigir é papel da UI/
 *   conteúdo; pontuar é papel daqui.
 * - Funções puras, zero I/O/DOM/localStorage. Fixtures sintéticas nos testes.
 * - REGRA ANTI-FALSO-POSITIVO: os gates de dispensa usam SÓ o desempenho nas
 *   questões. priorBoost e colabBonus são cosméticos/motivacionais (entram
 *   apenas no `score` exibido no radar) e jamais promovem dispensa de módulo.
 *   O auto-relato também não desempata mais nada: quem desempata é a etapa 2.
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
  /**
   * 1 = entra na matriz (todo aluno responde); 2 = confirmação de dispensa
   * (só quem pede). Ausente = 1.
   */
  etapa?: 1 | 2;
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

/**
 * Gate de dispensa, usado duas vezes: mcqScore da etapa 1 ≥ 75 candidata o
 * módulo; nota acumulada (etapa 1 + etapa 2) ≥ 75 confirma a dispensa.
 */
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

const ehEtapa2 = (q: QuestaoNivelamento): boolean => q.etapa === 2;

/**
 * Pontua a matriz de competências a partir dos resultados por questão.
 *
 * - Só a etapa 1 entra: as questões da etapa 2 são ignoradas aqui, para o
 *   radar de quem confirmou dispensa continuar comparável ao de quem não
 *   confirmou.
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
    const qs = questoes.filter((q) => q.competencia === id && !ehEtapa2(q));
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
// Etapa 2 — confirmação de dispensa
// ---------------------------------------------------------------------------

export type ResultadoEtapa2 = {
  /** Nota acumulada das duas etapas ≥ GATE_DISPENSA, com a etapa 1 também ≥ GATE_DISPENSA. */
  aprovada: boolean;
  /** 0–100, ponderada por dificuldade sobre as questões das duas etapas. */
  mcqScoreAcumulado: number;
  acertos: number;
  total: number;
  /** Conceitos das questões não acertadas nas duas etapas (dedup, ordem de 1ª aparição). */
  conceitosFracos: string[];
};

/**
 * Avalia a etapa 2 das competências que a fizeram — as que têm alguma
 * questão de etapa 2 na lista recebida. Quem chama passa só as questões que
 * o aluno de fato viu.
 *
 * A decisão usa a nota acumulada das 8 questões, não a da etapa 2 sozinha:
 * teste mais longo, decisão mais confiável. Simulado com pesos {1,2,2,3} por
 * etapa, quem chuta tudo passa em 0,31% das vezes (antes: 3,9% com o
 * auto-relato desempatando) e quem só sabe a questão fácil, em 1,5% (antes:
 * 10,9%). Um aluno que acerta ~90% das questões passa em ~91% das vezes que
 * chega à etapa 2.
 */
export function avaliarEtapa2(
  questoes: QuestaoNivelamento[],
  resultados: Record<string, ResultadoQuestao>,
): Partial<Record<CompetenciaId, ResultadoEtapa2>> {
  const saida: Partial<Record<CompetenciaId, ResultadoEtapa2>> = {};

  for (const { id } of COMPETENCIAS) {
    const qs = questoes.filter((q) => q.competencia === id);
    if (!qs.some(ehEtapa2)) continue;

    let peso1 = 0;
    let acertado1 = 0;
    let pesoTotal = 0;
    let pesoAcertado = 0;
    let acertos = 0;
    const fracos: string[] = [];
    const vistos = new Set<string>();

    for (const q of qs) {
      const acertou = resultados[q.id] === "acerto";
      pesoTotal += q.dificuldade;
      if (!ehEtapa2(q)) peso1 += q.dificuldade;
      if (acertou) {
        pesoAcertado += q.dificuldade;
        acertos += 1;
        if (!ehEtapa2(q)) acertado1 += q.dificuldade;
      } else {
        for (const c of q.conceitos) {
          if (!vistos.has(c)) {
            vistos.add(c);
            fracos.push(c);
          }
        }
      }
    }

    const mcqScoreAcumulado = (pesoAcertado / pesoTotal) * 100;
    // Sem etapa 1 na lista não há candidatura: nunca aprova só com a etapa 2.
    const etapa1Candidata = peso1 > 0 && (acertado1 / peso1) * 100 >= GATE_DISPENSA;

    saida[id] = {
      aprovada: etapa1Candidata && mcqScoreAcumulado >= GATE_DISPENSA,
      mcqScoreAcumulado,
      acertos,
      total: qs.length,
      conceitosFracos: fracos,
    };
  }

  return saida;
}

// ---------------------------------------------------------------------------
// Recomendação de trilha
// ---------------------------------------------------------------------------

export type EstadoModulo =
  | "dispensavel"
  | "dispensa-a-confirmar"
  | "revisao-dirigida"
  | "comecar-aqui"
  | "sem-evidencia";

export type DispensavelSugerido = {
  modulo: ModuleId;
  competencia: CompetenciaId;
  /** Conceitos que o aluno errou nas duas etapas — a trilha os mantém no radar mesmo com o módulo pulado. */
  conceitosFracos: string[];
};

/** Módulo que passou na etapa 1 e pode ser confirmado na etapa 2. */
export type CandidataDispensa = {
  modulo: ModuleId;
  competencia: CompetenciaId;
  conceitosFracos: string[];
};

export type Recomendacao = {
  /** Primeiro módulo não-dispensável (M0→M4); tudo dispensável → "M5". */
  fronteira: ModuleId;
  estados: Record<CompetenciaId, EstadoModulo>;
  /** Conceitos fracos da competência da fronteira (⭐ na trilha); M5 → []. */
  starNodes: string[];
  /** Módulos aprovados na etapa 2 — o aluno ainda confirma se quer pular. */
  dispensaveisSugeridos: DispensavelSugerido[];
  /** Módulos candidatos que ainda não fizeram a etapa 2. */
  candidatasDispensa: CandidataDispensa[];
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
 * Mensagem quando a fronteira cai num módulo candidato: o aluno foi bem, mas
 * a trilha só o pula depois da confirmação.
 */
export const MENSAGEM_A_CONFIRMAR =
  "Você foi bem neste módulo. Responda a rodada curta de confirmação para pulá-lo — ou comece por aqui.";

/**
 * Estado do módulo. Gates usam SÓ o desempenho nas questões (nunca o score
 * com boosts nem o auto-relato):
 * - com etapa 2 feita: aprovada → "dispensavel"; reprovada → segue a regra
 *   da etapa 1 abaixo, sem a candidatura (na prática, "revisao-dirigida");
 * - "dispensa-a-confirmar": mcqScore da etapa 1 ≥ 75 com confiança
 *   alta/média, etapa 2 ainda não feita;
 * - "revisao-dirigida": mcqScore ≥ 40;
 * - "comecar-aqui": mcqScore < 40;
 * - "sem-evidencia": sem questão da competência (score null).
 */
function estadoDe(entry: CompetencyEntry, etapa2: ResultadoEtapa2 | undefined): EstadoModulo {
  if (entry.mcqScore === null) return "sem-evidencia";
  if (etapa2?.aprovada) return "dispensavel";
  const candidata =
    !etapa2 &&
    entry.mcqScore >= GATE_DISPENSA &&
    (entry.confianca === "alta" || entry.confianca === "media");
  if (candidata) return "dispensa-a-confirmar";
  if (entry.mcqScore >= GATE_REVISAO) return "revisao-dirigida";
  return "comecar-aqui";
}

/**
 * Deriva estados por módulo, fronteira, ⭐ e sugestões de dispensa da matriz.
 *
 * Candidata não pula nada: a fronteira para no primeiro módulo que não foi
 * aprovado na etapa 2. É o que a trilha de fato permite, já que os conceitos
 * só destravam quando os pré-requisitos estão concluídos.
 */
export function recomendar(
  matriz: CompetencyMatrix,
  opts: { etapa2?: Partial<Record<CompetenciaId, ResultadoEtapa2>> } = {},
): Recomendacao {
  const estados = {} as Record<CompetenciaId, EstadoModulo>;
  const dispensaveisSugeridos: DispensavelSugerido[] = [];
  const candidatasDispensa: CandidataDispensa[] = [];
  let fronteira: ModuleId = "M5";
  let starNodes: string[] = [];
  let mensagem: string | null = null;

  for (const { id, modulo } of COMPETENCIAS) {
    const entry = matriz[id];
    const etapa2 = opts.etapa2?.[id];
    const estado = estadoDe(entry, etapa2);
    estados[id] = estado;
    // Com a etapa 2 feita, os fracos das duas etapas valem; sem ela, só os da 1.
    const fracos = etapa2 ? etapa2.conceitosFracos : entry.conceitosFracos;

    if (estado === "dispensavel") {
      dispensaveisSugeridos.push({ modulo, competencia: id, conceitosFracos: fracos });
      continue;
    }
    if (estado === "dispensa-a-confirmar") {
      candidatasDispensa.push({ modulo, competencia: id, conceitosFracos: fracos });
    }
    if (fronteira === "M5") {
      // primeiro módulo (M0→M4) que não dá pra dispensar = onde a trilha começa
      fronteira = modulo;
      starNodes = fracos;
      if (estado === "dispensa-a-confirmar") mensagem = MENSAGEM_A_CONFIRMAR;
    }
  }

  return {
    fronteira,
    estados,
    starNodes,
    dispensaveisSugeridos,
    candidatasDispensa,
    mensagem: mensagem ?? MENSAGENS_FRONTEIRA[fronteira],
  };
}
