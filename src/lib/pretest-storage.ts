import type { EixoScores, EixoNiveis } from "./pretest";
import { loadUserStatus, saveUserStatus } from "./progress";
import type { ModuleId } from "./content";
import {
  recomendar,
  type CompetencyEntry,
  type CompetencyMatrix,
  type Recomendacao,
  type ResultadoQuestao,
} from "./nivelamento";

/**
 * Resultado do nivelamento por usuário. Na F4 é localStorage (anônimo); migra pro
 * Supabase (pretest_scores) quando o login entrar (Fauth/F6).
 */
export type PretestResult = {
  scores: EixoScores;
  niveis: EixoNiveis;
  perfil: string; // id do perfil
  dispensados: string[]; // módulos pulados (M0…)
  autoRelato?: Record<string, number[]>;
  ts: number;
};

const KEY = "ligia-pretest:result:v1";

export function loadPretest(): PretestResult | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as PretestResult) : null;
  } catch {
    return null;
  }
}

export function savePretest(result: PretestResult): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(KEY, JSON.stringify(result));
}

export function clearPretest(): void {
  if (typeof window === "undefined") return;
  localStorage.removeItem(KEY);
}

/** Marca os nós dos módulos dispensados como concluídos no progresso da trilha. */
export function markDispensadosDone(nodeIds: string[]): void {
  if (typeof window === "undefined") return;
  const status = loadUserStatus();
  for (const id of nodeIds) status[id] = "done";
  saveUserStatus(status);
}

// ---------------------------------------------------------------------------
// v2 — matriz de competências contínua + trilha de log de eventos.
//
// Coexiste com o v1 acima: a UI atual continua no v1 até outra wave migrar o
// fluxo do nivelamento. Este bloco só ADICIONA o caminho v2 (chave própria,
// sem tocar em KEY/loadPretest/savePretest/clearPretest/markDispensadosDone).
// ---------------------------------------------------------------------------

export type PretestResultV2 = {
  version: 2;
  /** Versão do content/nivelamento.json usado nesta rodada ("v1-migrado" pra dados convertidos do v1). */
  contentVersion: string;
  matriz: CompetencyMatrix;
  /** Resultado por questão desta rodada. Migração do v1 não tem o detalhe por questão → {}. */
  resultados: Record<string, ResultadoQuestao>;
  autoRelato: Record<string, number[]>;
  recomendacao: Recomendacao;
  dispensasConfirmadas: ModuleId[];
  ts: string; // ISO
};

const KEY_V2 = "ligia-pretest:result:v2";

/**
 * Máximos de contagem bruta do v1 por eixo (content/pretest.json + o bônus do
 * Colab embutido no score de dl_pratico via score-to-nodes.json). Usados só
 * pra reconstruir mcqScore (contagem/máximo × 100) na migração best-effort.
 */
const V1_MAX_SCORE: Record<keyof EixoScores, number> = {
  matematica: 6,
  ml_classico: 3,
  dl_pratico: 4, // 3 questões + colab_bonus 1
};

/** Entrada "sem-evidencia" — usada nos eixos que o v1 nunca cobriu. */
function entradaSemEvidencia(): CompetencyEntry {
  return {
    score: null,
    mcqScore: null,
    priorBoost: 0,
    colabBonus: 0,
    confianca: "sem-evidencia",
    acertos: 0,
    total: 0,
    conceitosFracos: [],
  };
}

/**
 * Entrada migrada de um eixo v1 (matematica/ml_classico/dl_pratico): reconstrói
 * mcqScore a partir da contagem bruta / máximo do v1. Não há detalhe por
 * questão no v1, então:
 * - confiança é sempre "baixa" (não sabemos onde errou, só o total);
 * - acertos/total usam a contagem bruta e o máximo do v1 como melhor
 *   aproximação disponível — NÃO é o "nº de questões" real da competência v2
 *   (que tem outro nº de questões / dificuldades);
 * - boosts (priorBoost/colabBonus) ficam zerados: o bônus do Colab já está
 *   embutido na contagem bruta de dl_pratico, e não sabemos o auto-relato por
 *   eixo v2 pra reaplicar PRIOR_BOOST com segurança.
 */
function entradaMigrada(contagem: number, maximo: number): CompetencyEntry {
  const mcqScore = (contagem / maximo) * 100;
  return {
    score: mcqScore,
    mcqScore,
    priorBoost: 0,
    colabBonus: 0,
    confianca: "baixa",
    acertos: contagem,
    total: maximo,
    conceitosFracos: [],
  };
}

/**
 * Converte um PretestResult (v1) num PretestResultV2 best-effort. Pura —
 * não lê/grava storage; quem chama decide se e quando persistir.
 *
 * Mapeamento de eixos: matematica→matematica, ml_classico→ml-classico,
 * dl_pratico→dl-fundamentos (as questões v1 de DL eram conteúdo do módulo M2,
 * não M3/M4). dl-aplicado e transformers-llms não existiam no v1 → sem-evidencia.
 */
export function migrarV1ParaV2(v1: PretestResult): PretestResultV2 {
  const matriz: CompetencyMatrix = {
    matematica: entradaMigrada(v1.scores.matematica, V1_MAX_SCORE.matematica),
    "ml-classico": entradaMigrada(v1.scores.ml_classico, V1_MAX_SCORE.ml_classico),
    "dl-fundamentos": entradaMigrada(v1.scores.dl_pratico, V1_MAX_SCORE.dl_pratico),
    "dl-aplicado": entradaSemEvidencia(),
    "transformers-llms": entradaSemEvidencia(),
  } as CompetencyMatrix;

  return {
    version: 2,
    contentVersion: "v1-migrado",
    matriz,
    resultados: {},
    autoRelato: v1.autoRelato ?? {},
    recomendacao: recomendar(matriz),
    dispensasConfirmadas: v1.dispensados as ModuleId[],
    ts: new Date(v1.ts).toISOString(),
  };
}

/**
 * Lê o resultado v2. Se não há v2 salvo mas há v1, migra best-effort e
 * devolve — SEM gravar v2 automaticamente (gravação é sempre explícita via
 * savePretestV2) e sem jamais apagar o v1. Ausência de ambos → null.
 */
export function loadPretestV2(): PretestResultV2 | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(KEY_V2);
    if (raw) return JSON.parse(raw) as PretestResultV2;
  } catch {
    // storage indisponível/corrompido pro v2: cai pro fallback de migração abaixo
  }
  const v1 = loadPretest();
  return v1 ? migrarV1ParaV2(v1) : null;
}

export function savePretestV2(result: PretestResultV2): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(KEY_V2, JSON.stringify(result));
}

export function clearPretestV2(): void {
  if (typeof window === "undefined") return;
  localStorage.removeItem(KEY_V2);
}

/**
 * Política de re-teste: o resultado novo vale, exceto `dispensasConfirmadas`
 * — dispensas já confirmadas antes NUNCA são removidas por um re-teste
 * (só se acrescenta, nunca se tira). Pura; quem chama decide se grava.
 */
export function aplicarRetake(
  anterior: PretestResultV2 | null,
  novo: PretestResultV2,
): PretestResultV2 {
  if (!anterior) return novo;
  const dispensasConfirmadas = Array.from(
    new Set([...anterior.dispensasConfirmadas, ...novo.dispensasConfirmadas]),
  );
  return { ...novo, dispensasConfirmadas };
}
