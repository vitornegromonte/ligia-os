/**
 * Métricas de instrumentação (E8 / F8) — agregação pura do checkpoint de
 * módulo. Porte de metrics/aggregate.gs (Apps Script) pra TS testável, pra
 * alimentar o painel de métricas da diretoria (/admin/metricas numa fase
 * posterior) sem depender do Sheets.
 *
 * Retorna FRAÇÕES (0–1); a formatação em "%" é responsabilidade da UI. O
 * .gs continua sendo a fonte hoje (stack Forms+Sheets); este módulo é o
 * núcleo pro futuro view/admin no app. A satisfação é média por RESPOSTA;
 * concluintes e uso do skill tree são deduplicados por e-mail — igual ao .gs.
 */

export type Modulo = "M0" | "M1" | "M2" | "M3" | "M4" | "M5";

export const MODULOS: Modulo[] = ["M0", "M1", "M2", "M3", "M4", "M5"];

/** Retenção é medida relativa ao M1 (M0 é opcional). */
export const BASE_RETENCAO: Modulo = "M1";

export type CheckpointResponse = {
  email: string;
  modulo: Modulo;
  usouSkillTree: boolean;
  satisfacao?: number | null;
};

export type ModuleMetrics = {
  modulo: Modulo;
  concluintes: number;
  /** Fração vs M1 (0–1), ou null se não há base. */
  retencao: number | null;
  /** Fração de concluintes que usou a árvore (0–1), ou null se 0 concluintes. */
  pctUsouTree: number | null;
  /** Média da satisfação por resposta, ou null se não houve nota. */
  satisfacaoMedia: number | null;
};

export type MetricsSummary = {
  porModulo: ModuleMetrics[];
  membrosUnicos: number;
  /** Fração global de membros que consultou o skill tree (0–1), ou null. */
  pctConsultouTree: number | null;
};

/** Extrai M0–M5 de texto livre; null se ausente/fora da faixa (porte de moduloNormalizado). */
export function normalizarModulo(valor: string): Modulo | null {
  const m = String(valor).match(/M[0-5]/i);
  return m ? (m[0].toUpperCase() as Modulo) : null;
}

export function aggregateCheckpoints(respostas: CheckpointResponse[]): MetricsSummary {
  const concluintes = new Map<Modulo, Set<string>>();
  const usouTree = new Map<Modulo, Set<string>>();
  const satSoma = new Map<Modulo, number>();
  const satN = new Map<Modulo, number>();
  for (const m of MODULOS) {
    concluintes.set(m, new Set());
    usouTree.set(m, new Set());
    satSoma.set(m, 0);
    satN.set(m, 0);
  }

  for (const resp of respostas) {
    if (!MODULOS.includes(resp.modulo)) continue;
    concluintes.get(resp.modulo)!.add(resp.email);
    if (resp.usouSkillTree) usouTree.get(resp.modulo)!.add(resp.email);
    if (typeof resp.satisfacao === "number" && !Number.isNaN(resp.satisfacao)) {
      satSoma.set(resp.modulo, satSoma.get(resp.modulo)! + resp.satisfacao);
      satN.set(resp.modulo, satN.get(resp.modulo)! + 1);
    }
  }

  const baseN = concluintes.get(BASE_RETENCAO)!.size;

  const porModulo: ModuleMetrics[] = MODULOS.map((m) => {
    const n = concluintes.get(m)!.size;
    const nSat = satN.get(m)!;
    return {
      modulo: m,
      concluintes: n,
      retencao: baseN ? n / baseN : null,
      pctUsouTree: n ? usouTree.get(m)!.size / n : null,
      satisfacaoMedia: nSat ? satSoma.get(m)! / nSat : null,
    };
  });

  // Globais: união de e-mails entre módulos.
  const todos = new Set<string>();
  const todosTree = new Set<string>();
  for (const m of MODULOS) {
    for (const e of concluintes.get(m)!) todos.add(e);
    for (const e of usouTree.get(m)!) todosTree.add(e);
  }

  return {
    porModulo,
    membrosUnicos: todos.size,
    pctConsultouTree: todos.size ? todosTree.size / todos.size : null,
  };
}
