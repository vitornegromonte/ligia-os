/**
 * Pipeline de contribuição de conteúdo (F.3) — máquina de estados + rubric de
 * peer review, em lógica pura. Fonte da verdade: CONTRIBUTING.md e RUBRIC.md
 * (specs aprovadas no repo).
 *
 * Isto é só o núcleo testável das transições e do julgamento. A integração
 * (form de proposta, PR/webhook do GitHub da Liga, persistência em Supabase,
 * publicação da página /aula) depende de infra externa e fica pra fases
 * posteriores — todas vão chamar estas funções pra decidir o próximo estado.
 */

export type ContributionState =
  | "PROPOSTO"
  | "DRAFT_ACEITO"
  | "PEER_REVIEW"
  | "APROVADO"
  | "GRAVADO"
  | "PUBLICADO"
  | "REPROVADO";

export const CONTRIBUTION_STATES: ContributionState[] = [
  "PROPOSTO",
  "DRAFT_ACEITO",
  "PEER_REVIEW",
  "APROVADO",
  "GRAVADO",
  "PUBLICADO",
  "REPROVADO",
];

/**
 * Transições permitidas. Fluxo feliz linear + duas saídas do review:
 * reformular (volta a DRAFT_ACEITO) e reprovar (REPROVADO, terminal).
 * A triagem inicial da diretoria também pode reprovar direto de PROPOSTO.
 */
export const CONTRIBUTION_TRANSITIONS: Record<ContributionState, ContributionState[]> = {
  PROPOSTO: ["DRAFT_ACEITO", "REPROVADO"],
  DRAFT_ACEITO: ["PEER_REVIEW"],
  PEER_REVIEW: ["APROVADO", "DRAFT_ACEITO", "REPROVADO"],
  APROVADO: ["GRAVADO"],
  GRAVADO: ["PUBLICADO"],
  PUBLICADO: [],
  REPROVADO: [],
};

export const STATE_META: Record<ContributionState, { label: string }> = {
  PROPOSTO: { label: "Proposto" },
  DRAFT_ACEITO: { label: "Draft aceito" },
  PEER_REVIEW: { label: "Em peer review" },
  APROVADO: { label: "Aprovado (a gravar)" },
  GRAVADO: { label: "Gravado" },
  PUBLICADO: { label: "Publicado" },
  REPROVADO: { label: "Reprovado" },
};

export function canTransition(from: ContributionState, to: ContributionState): boolean {
  return CONTRIBUTION_TRANSITIONS[from].includes(to);
}

/** Aplica a transição; lança se for inválida (guarda a integridade do fluxo). */
export function transition(from: ContributionState, to: ContributionState): ContributionState {
  if (!canTransition(from, to)) {
    throw new Error(`Transição inválida: ${from} → ${to}`);
  }
  return to;
}

/** Terminal = sem transições de saída. */
export function isTerminal(state: ContributionState): boolean {
  return CONTRIBUTION_TRANSITIONS[state].length === 0;
}

// ── Peer review ────────────────────────────────────────────────────────────

/** Os 3 critérios da RUBRIC, avaliados por 1 revisor. */
export type ReviewCriteria = {
  prereqs: boolean;
  motivacao: boolean;
  exemplo: boolean;
};

/** Veredito de 1 revisor: 3/3 aprova · 2/3 reformula · ≤1/3 rejeita. */
export type ReviewVerdict = "APROVADO" | "REFORMULAR" | "REJEITADA";

export function reviewVerdict(c: ReviewCriteria): ReviewVerdict {
  const acertos = [c.prereqs, c.motivacao, c.exemplo].filter(Boolean).length;
  if (acertos === 3) return "APROVADO";
  if (acertos === 2) return "REFORMULAR";
  return "REJEITADA";
}

/** Resultado agregado dos 2 revisores → ação no fluxo. */
export type ReviewOutcome = "GRAVA" | "REFORMULA" | "REJEITA";

/**
 * Concordância de 2 revisores (RUBRIC): conta quantos deram APROVADO —
 * 2 → grava · 1 → reformula · 0 → rejeita. Exige exatamente 2 revisores
 * (responsabilidade não difusa).
 */
export function aggregateReviews(verdicts: ReviewVerdict[]): ReviewOutcome {
  if (verdicts.length !== 2) {
    throw new Error(`Peer review exige exatamente 2 revisores (recebeu ${verdicts.length}).`);
  }
  const aprovados = verdicts.filter((v) => v === "APROVADO").length;
  if (aprovados === 2) return "GRAVA";
  if (aprovados === 1) return "REFORMULA";
  return "REJEITA";
}

/** Traduz o resultado do review no próximo estado (a partir de PEER_REVIEW). */
export function outcomeToState(outcome: ReviewOutcome): ContributionState {
  switch (outcome) {
    case "GRAVA":
      return "APROVADO";
    case "REFORMULA":
      return "DRAFT_ACEITO";
    case "REJEITA":
      return "REPROVADO";
  }
}
