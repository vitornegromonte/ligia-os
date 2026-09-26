import { describe, it, expect } from "vitest";
import {
  MATRIX_WEIGHTS,
  MATRIX_DIMENSIONS,
  NIVEL_META,
  compositeScore,
  nivelFromScore,
  summarizeMatrix,
  emptyComponents,
  type MatrixComponents,
} from "@/lib/matrix";

const comp = (over: Partial<MatrixComponents> = {}): MatrixComponents => ({
  ...emptyComponents(),
  ...over,
});

describe("MATRIX_WEIGHTS", () => {
  it("segue os pesos do briefing (30/30/15/10/15) e soma exatamente 1", () => {
    expect(MATRIX_WEIGHTS).toEqual({
      aulas: 0.3,
      projetos: 0.3,
      agora: 0.15,
      auto: 0.1,
      peer: 0.15,
    });
    const soma = MATRIX_DIMENSIONS.reduce((s, d) => s + MATRIX_WEIGHTS[d], 0);
    expect(soma).toBeCloseTo(1, 10);
  });
});

describe("compositeScore", () => {
  it("é 0 quando todas as dimensões são 0", () => {
    expect(compositeScore(emptyComponents())).toBe(0);
  });

  it("é 100 quando todas as dimensões são 100", () => {
    expect(compositeScore(comp({ aulas: 100, projetos: 100, agora: 100, auto: 100, peer: 100 }))).toBe(100);
  });

  it("aplica o peso de cada dimensão (só aulas=100 → 30)", () => {
    expect(compositeScore(comp({ aulas: 100 }))).toBeCloseTo(30, 10);
    expect(compositeScore(comp({ projetos: 100 }))).toBeCloseTo(30, 10);
    expect(compositeScore(comp({ agora: 100 }))).toBeCloseTo(15, 10);
    expect(compositeScore(comp({ auto: 100 }))).toBeCloseTo(10, 10);
    expect(compositeScore(comp({ peer: 100 }))).toBeCloseTo(15, 10);
  });

  it("soma ponderada de exemplo realista", () => {
    // aulas 80, projetos 70, agora 60, auto 90, peer 50
    // 0.3*80 + 0.3*70 + 0.15*60 + 0.1*90 + 0.15*50 = 24 + 21 + 9 + 9 + 7.5 = 70.5
    expect(compositeScore(comp({ aulas: 80, projetos: 70, agora: 60, auto: 90, peer: 50 }))).toBeCloseTo(70.5, 10);
  });

  it("faz clamp de valores fora de [0,100]", () => {
    expect(compositeScore(comp({ aulas: 150 }))).toBeCloseTo(30, 10); // clamp 150→100
    expect(compositeScore(comp({ aulas: -50 }))).toBe(0); // clamp -50→0
  });
});

describe("nivelFromScore (thresholds 40/70)", () => {
  it("S < 40 → iniciante", () => {
    expect(nivelFromScore(0)).toBe("iniciante");
    expect(nivelFromScore(39.99)).toBe("iniciante");
  });

  it("40 ≤ S < 70 → intermediario (limites inclusivos embaixo)", () => {
    expect(nivelFromScore(40)).toBe("intermediario");
    expect(nivelFromScore(69.99)).toBe("intermediario");
  });

  it("S ≥ 70 → avancado", () => {
    expect(nivelFromScore(70)).toBe("avancado");
    expect(nivelFromScore(100)).toBe("avancado");
  });
});

describe("NIVEL_META", () => {
  it("cobre os 3 níveis com label + gatilho", () => {
    for (const k of ["iniciante", "intermediario", "avancado"] as const) {
      expect(NIVEL_META[k]).toMatchObject({
        label: expect.any(String),
        gatilho: expect.any(String),
      });
    }
  });
});

describe("summarizeMatrix", () => {
  it("junta componentes, score e nível num objeto só", () => {
    const c = comp({ aulas: 100, projetos: 100 }); // S = 60
    expect(summarizeMatrix(c)).toEqual({
      components: c,
      score: 60,
      nivel: "intermediario",
    });
  });
});
