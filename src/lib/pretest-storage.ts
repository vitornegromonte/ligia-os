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
  /**
   * Alternativa escolhida por questão (índice da opção ORIGINAL, antes do
   * embaralhamento). É o que a análise de itens usa para achar distrator que
   * ninguém marca e o que permite apontar o equívoco da alternativa errada.
   * Ausente em rodadas anteriores a este campo.
   */
  respostas?: Record<string, number>;
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
 * - priorBoost fica zerado: o bônus do Colab do v1 já está embutido na
 *   contagem bruta de dl_pratico, e não sabemos o auto-relato por eixo v2 pra
 *   reaplicar PRIOR_BOOST com segurança.
 */
function entradaMigrada(contagem: number, maximo: number): CompetencyEntry {
  const mcqScore = (contagem / maximo) * 100;
  return {
    score: mcqScore,
    mcqScore,
    priorBoost: 0,
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

// ---------------------------------------------------------------------------
// Formas de questão já vistas — só neste dispositivo.
//
// Serve para o sorteio das variantes preferir a forma que o aluno viu há mais
// tempo. Não sincroniza: perder isto ao trocar de dispositivo só faz o sorteio
// voltar a ser uniforme, sem dano ao resultado.
// ---------------------------------------------------------------------------

/** id da forma → ISO da última prova em que ela apareceu. */
export type QuestoesVistas = Record<string, string>;

const KEY_VISTAS = "ligia-nivelamento:vistas:v1";

export function loadQuestoesVistas(): QuestoesVistas {
  if (typeof window === "undefined") return {};
  try {
    const raw = localStorage.getItem(KEY_VISTAS);
    const parsed = raw ? (JSON.parse(raw) as unknown) : {};
    return parsed && typeof parsed === "object" && !Array.isArray(parsed)
      ? (parsed as QuestoesVistas)
      : {};
  } catch {
    return {};
  }
}

export function registrarQuestoesVistas(ids: readonly string[], quando: string): void {
  if (typeof window === "undefined") return;
  const vistas = loadQuestoesVistas();
  for (const id of ids) vistas[id] = quando;
  try {
    localStorage.setItem(KEY_VISTAS, JSON.stringify(vistas));
  } catch {
    // storage cheio ou indisponível: o sorteio só perde a preferência
  }
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

// ---------------------------------------------------------------------------
// Perfil do aluno ("quem é você") e rascunho do nivelamento.
//
// Os dois são local-first como o resto e sobem pelo sync (tabelas
// learner_profiles e nivelamento_rascunhos, migração 0105). Levam o id do
// usuário que os gravou: num navegador compartilhado, o rascunho de outra
// conta é ignorado em vez de retomado ou enviado para a conta errada.
// ---------------------------------------------------------------------------

export type PerfilAprendiz = {
  autoRelato: Record<string, number[]>;
  /** Texto livre das opções "Outro", por pergunta. */
  textosOutro: Record<string, string>;
  contentVersion: string;
  atualizadoEm: string; // ISO
  userId?: string | null;
};

export type RascunhoNivelamento = {
  passo: number;
  /** Alternativa escolhida por questão (índice da opção original). */
  respostas: Record<string, number>;
  autoRelato: Record<string, number[]>;
  textosOutro: Record<string, string>;
  seed: string;
  /** Ids das formas sorteadas, na ordem da prova. */
  prova: string[];
  contentVersion: string;
  atualizadoEm: string; // ISO
  userId?: string | null;
};

const KEY_PERFIL = "ligia-nivelamento:perfil:v1";
const KEY_RASCUNHO = "ligia-nivelamento:rascunho:v2";
/** Rascunho antigo, por aba (sessionStorage), sem data nem dono. */
const KEY_RASCUNHO_V1 = "ligia-nivelamento:rascunho:v1";

/** Registro de outra conta? Sem dono gravado (preview local, dado antigo) vale para qualquer um. */
function deOutraConta(registro: { userId?: string | null }, userId?: string | null): boolean {
  return !!registro.userId && !!userId && registro.userId !== userId;
}

function lerJson<T>(chave: string): T | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(chave);
    return raw ? (JSON.parse(raw) as T) : null;
  } catch {
    return null;
  }
}

function gravarJson(chave: string, valor: unknown): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(chave, JSON.stringify(valor));
  } catch {
    // storage cheio ou indisponível: segue sem persistir
  }
}

export function loadPerfil(userId?: string | null): PerfilAprendiz | null {
  const p = lerJson<PerfilAprendiz>(KEY_PERFIL);
  return p && !deOutraConta(p, userId) ? p : null;
}

export function savePerfil(perfil: PerfilAprendiz): void {
  gravarJson(KEY_PERFIL, perfil);
}

/**
 * Rascunho em andamento. Na primeira leitura, traz o rascunho v1 que morava no
 * sessionStorage (sumia ao fechar a aba) para o localStorage.
 */
export function loadRascunho(userId?: string | null): RascunhoNivelamento | null {
  if (typeof window === "undefined") return null;
  let r = lerJson<RascunhoNivelamento>(KEY_RASCUNHO);
  if (!r) {
    try {
      const v1 = sessionStorage.getItem(KEY_RASCUNHO_V1);
      if (v1) {
        const antigo = JSON.parse(v1) as Partial<RascunhoNivelamento>;
        sessionStorage.removeItem(KEY_RASCUNHO_V1);
        if (antigo.seed) {
          r = {
            passo: antigo.passo ?? 0,
            respostas: antigo.respostas ?? {},
            autoRelato: antigo.autoRelato ?? {},
            textosOutro: antigo.textosOutro ?? {},
            seed: antigo.seed,
            prova: antigo.prova ?? [],
            contentVersion: "",
            atualizadoEm: new Date().toISOString(),
            userId: userId ?? null,
          };
          gravarJson(KEY_RASCUNHO, r);
        }
      }
    } catch {
      // rascunho v1 corrompido: descarta
    }
  }
  return r && !deOutraConta(r, userId) ? r : null;
}

export function saveRascunho(rascunho: RascunhoNivelamento): void {
  gravarJson(KEY_RASCUNHO, rascunho);
}

/** Apaga o rascunho — só o desta conta (ou sem dono), nunca o de outra. */
export function clearRascunho(userId?: string | null): void {
  if (typeof window === "undefined") return;
  const r = lerJson<RascunhoNivelamento>(KEY_RASCUNHO);
  if (r && deOutraConta(r, userId)) return;
  try {
    localStorage.removeItem(KEY_RASCUNHO);
  } catch {
    // indisponível: nada a apagar
  }
}

/** Pede ao SyncEstado um sync já, sem esperar a aba ficar escondida. */
export const SYNC_AGORA_EVENT = "ligia:sync-agora";

export function pedirSync(): void {
  if (typeof window !== "undefined") window.dispatchEvent(new Event(SYNC_AGORA_EVENT));
}
