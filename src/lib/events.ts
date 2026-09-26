import { learningStorage } from "./learning-storage";
/**
 * Trilha de eventos de aprendizagem — ring buffer em localStorage.
 *
 * Registro append-only dos marcos do aluno (nivelamento concluído, nó da
 * trilha mudou de estado, loop de prática fechado, dispensa confirmada) pra
 * alimentar histórico/analytics locais. Na F4 é localStorage anônimo; migra
 * pro Supabase quando o login entrar (padrão de lib/progress.ts).
 *
 * Multi-tab é last-write-wins: duas abas gravando ao mesmo tempo podem perder
 * eventos uma da outra — aceito e documentado (trilha é best-effort, não
 * fonte de verdade de progresso). NENHUMA UI emite eventos ainda; a emissão
 * chega nas waves seguintes.
 */

export type LearningEvent = {
  id: string;
  at: string; // ISO
  type: "pretest_completed" | "node_status_changed" | "loop_completed" | "dispensa_confirmada";
  /** Identificador do alvo do evento (id de nó/conceito, módulo, "nivelamento"…). */
  object: string;
  data?: Record<string, unknown>;
};

const KEY = "ligia-events:v1";

/** Capacidade do ring buffer: passou disso, os eventos mais antigos caem. */
export const MAX_EVENTS = 500;

/**
 * id único, sempre no formato UUID v4. O fallback (contexto não-seguro, sem
 * crypto.randomUUID) TAMBÉM precisa ser um uuid válido: `learning_events.id` é
 * coluna `uuid` no Postgres, e um id fora do formato faria o sync rejeitar a
 * linha inteira em vez de só degradar a unicidade.
 */
export function novoId(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    return (c === "x" ? r : (r & 0x3) | 0x8).toString(16);
  });
}

/** Lê a trilha inteira (mais antigo → mais recente). Sem window ou storage inválido → []. */
export function loadEvents(): LearningEvent[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = learningStorage.getItem(KEY);
    const parsed = raw ? (JSON.parse(raw) as unknown) : [];
    return Array.isArray(parsed) ? (parsed as LearningEvent[]) : [];
  } catch {
    return [];
  }
}

/**
 * Appenda um evento e persiste, descartando os mais antigos além de
 * MAX_EVENTS. Devolve o evento criado, ou null quando degradou em no-op
 * (SSR ou storage indisponível).
 */
export function logEvent(
  type: LearningEvent["type"],
  object: string,
  data?: Record<string, unknown>,
): LearningEvent | null {
  if (typeof window === "undefined") return null;
  const evento: LearningEvent = {
    id: novoId(),
    at: new Date().toISOString(),
    type,
    object,
    ...(data !== undefined ? { data } : {}),
  };
  try {
    const eventos = [...loadEvents(), evento].slice(-MAX_EVENTS);
    learningStorage.setItem(KEY, JSON.stringify(eventos));
    return evento;
  } catch {
    return null;
  }
}

export function clearEvents(): void {
  if (typeof window === "undefined") return;
  try {
    learningStorage.removeItem(KEY);
  } catch {
    // storage indisponível: degrada em silêncio (padrão progress.ts)
  }
}

/**
 * Substitui a trilha inteira — usado pelo sync ao gravar o estado mesclado.
 * Aplica o teto do ring buffer, então o invariante vale seja qual for a origem.
 */
export function replaceEvents(eventos: LearningEvent[]): void {
  if (typeof window === "undefined") return;
  try {
    learningStorage.setItem(KEY, JSON.stringify(eventos.slice(-MAX_EVENTS)));
  } catch {
    // storage indisponível: degrada em silêncio
  }
}
