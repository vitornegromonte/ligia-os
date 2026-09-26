import { describe, it, expect } from "vitest";
import {
  CONTRIBUTION_STATES,
  CONTRIBUTION_TRANSITIONS,
  canTransition,
  transition,
  isTerminal,
  reviewVerdict,
  aggregateReviews,
  outcomeToState,
  type ContributionState,
  type ReviewCriteria,
} from "@/lib/contribution";

const crit = (over: Partial<ReviewCriteria> = {}): ReviewCriteria => ({
  prereqs: false,
  motivacao: false,
  exemplo: false,
  ...over,
});

describe("máquina de estados (CONTRIBUTING.md)", () => {
  it("o mapa de transições cobre todos os estados declarados", () => {
    for (const s of CONTRIBUTION_STATES) {
      expect(CONTRIBUTION_TRANSITIONS[s]).toBeDefined();
    }
    // e nenhum destino aponta pra um estado inexistente
    for (const dests of Object.values(CONTRIBUTION_TRANSITIONS)) {
      for (const d of dests) expect(CONTRIBUTION_STATES).toContain(d);
    }
  });

  it("segue o fluxo feliz PROPOSTO→…→PUBLICADO", () => {
    const caminho: ContributionState[] = [
      "PROPOSTO",
      "DRAFT_ACEITO",
      "PEER_REVIEW",
      "APROVADO",
      "GRAVADO",
      "PUBLICADO",
    ];
    for (let i = 0; i < caminho.length - 1; i++) {
      expect(canTransition(caminho[i], caminho[i + 1])).toBe(true);
    }
  });

  it("PEER_REVIEW pode reformular (volta a DRAFT_ACEITO) ou reprovar", () => {
    expect(canTransition("PEER_REVIEW", "DRAFT_ACEITO")).toBe(true);
    expect(canTransition("PEER_REVIEW", "REPROVADO")).toBe(true);
  });

  it("rejeita transições inválidas", () => {
    expect(canTransition("PROPOSTO", "PUBLICADO")).toBe(false);
    expect(canTransition("APROVADO", "PEER_REVIEW")).toBe(false);
    expect(canTransition("PUBLICADO", "GRAVADO")).toBe(false);
  });

  it("transition() devolve o novo estado e lança em transição inválida", () => {
    expect(transition("PROPOSTO", "DRAFT_ACEITO")).toBe("DRAFT_ACEITO");
    expect(() => transition("PROPOSTO", "PUBLICADO")).toThrow();
  });

  it("PUBLICADO e REPROVADO são terminais", () => {
    expect(isTerminal("PUBLICADO")).toBe(true);
    expect(isTerminal("REPROVADO")).toBe(true);
    expect(isTerminal("PROPOSTO")).toBe(false);
    expect(isTerminal("PEER_REVIEW")).toBe(false);
  });
});

describe("reviewVerdict (rubric de 3 critérios, RUBRIC.md)", () => {
  it("3/3 → APROVADO", () => {
    expect(reviewVerdict(crit({ prereqs: true, motivacao: true, exemplo: true }))).toBe("APROVADO");
  });
  it("2/3 → REFORMULAR", () => {
    expect(reviewVerdict(crit({ prereqs: true, motivacao: true }))).toBe("REFORMULAR");
  });
  it("1/3 → REJEITADA", () => {
    expect(reviewVerdict(crit({ prereqs: true }))).toBe("REJEITADA");
  });
  it("0/3 → REJEITADA", () => {
    expect(reviewVerdict(crit())).toBe("REJEITADA");
  });
});

describe("aggregateReviews (2 revisores, RUBRIC.md)", () => {
  it("2/2 aprovados → GRAVA", () => {
    expect(aggregateReviews(["APROVADO", "APROVADO"])).toBe("GRAVA");
  });
  it("1/2 aprovado → REFORMULA", () => {
    expect(aggregateReviews(["APROVADO", "REFORMULAR"])).toBe("REFORMULA");
    expect(aggregateReviews(["APROVADO", "REJEITADA"])).toBe("REFORMULA");
  });
  it("0/2 aprovados → REJEITA", () => {
    expect(aggregateReviews(["REFORMULAR", "REJEITADA"])).toBe("REJEITA");
    expect(aggregateReviews(["REJEITADA", "REJEITADA"])).toBe("REJEITA");
  });
  it("exige exatamente 2 revisores", () => {
    expect(() => aggregateReviews(["APROVADO"])).toThrow();
    expect(() => aggregateReviews(["APROVADO", "APROVADO", "APROVADO"])).toThrow();
  });
});

describe("outcomeToState (ponte review→máquina)", () => {
  it("mapeia o resultado agregado pro próximo estado a partir de PEER_REVIEW", () => {
    expect(outcomeToState("GRAVA")).toBe("APROVADO");
    expect(outcomeToState("REFORMULA")).toBe("DRAFT_ACEITO");
    expect(outcomeToState("REJEITA")).toBe("REPROVADO");
  });

  it("o estado destino é sempre uma transição válida de PEER_REVIEW", () => {
    for (const outcome of ["GRAVA", "REFORMULA", "REJEITA"] as const) {
      expect(canTransition("PEER_REVIEW", outcomeToState(outcome))).toBe(true);
    }
  });
});
