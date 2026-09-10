import { describe, it, expect, beforeEach, vi } from "vitest";
import {
  loadPretest,
  savePretest,
  loadPretestV2,
  savePretestV2,
  clearPretestV2,
  aplicarRetake,
  type PretestResult,
  type PretestResultV2,
} from "@/lib/pretest-storage";
import { recomendar, scoreCompetencias } from "@/lib/nivelamento";

const KEY_V2 = "ligia-pretest:result:v2";

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

function v1Fixture(overrides: Partial<PretestResult> = {}): PretestResult {
  return {
    scores: { matematica: 5, ml_classico: 2, dl_pratico: 3 },
    niveis: { matematica: "alto", ml_classico: "medio", dl_pratico: "alto" },
    perfil: "viu-ml",
    dispensados: ["M0"],
    ts: 1_700_000_000_000,
    ...overrides,
  };
}

function v2Fixture(overrides: Partial<PretestResultV2> = {}): PretestResultV2 {
  const matriz = scoreCompetencias([], {}, {}); // todas sem-evidencia — basta pro roundtrip
  return {
    version: 2,
    contentVersion: "2026-07-19",
    matriz,
    resultados: {},
    autoRelato: {},
    recomendacao: recomendar(matriz, {}),
    dispensasConfirmadas: [],
    ts: new Date("2026-07-19T12:00:00.000Z").toISOString(),
    ...overrides,
  };
}

describe("pretest-storage v2", () => {
  beforeEach(() => localStorage.clear());

  it("roundtrip: savePretestV2 → loadPretestV2 devolve o mesmo resultado", () => {
    const r = v2Fixture({ dispensasConfirmadas: ["M0", "M1"] });
    savePretestV2(r);
    expect(loadPretestV2()).toEqual(r);
  });

  it("ausência de v1 e v2 → null", () => {
    expect(loadPretestV2()).toBeNull();
  });

  it("clearPretestV2 remove só a chave v2 (v1 sobrevive)", () => {
    savePretest(v1Fixture());
    savePretestV2(v2Fixture());
    clearPretestV2();
    expect(localStorage.getItem(KEY_V2)).toBeNull();
    expect(loadPretest()).not.toBeNull();
  });

  describe("migração v1 → v2", () => {
    it("converte escala bruta pros 3 eixos mapeados (mcqScore = contagem/máximo×100)", () => {
      savePretest(v1Fixture({ scores: { matematica: 3, ml_classico: 1, dl_pratico: 2 } }));
      const v2 = loadPretestV2()!;
      expect(v2).not.toBeNull();
      expect(v2.matriz.matematica.mcqScore).toBeCloseTo((3 / 6) * 100);
      expect(v2.matriz["ml-classico"].mcqScore).toBeCloseTo((1 / 3) * 100);
      expect(v2.matriz["dl-fundamentos"].mcqScore).toBeCloseTo((2 / 4) * 100);
    });

    it("gabarito cheio nos 3 eixos → mcqScore 100 (inclui o bônus do Colab já embutido no score v1)", () => {
      savePretest(v1Fixture({ scores: { matematica: 6, ml_classico: 3, dl_pratico: 4 } }));
      const v2 = loadPretestV2()!;
      expect(v2.matriz.matematica.mcqScore).toBe(100);
      expect(v2.matriz["ml-classico"].mcqScore).toBe(100);
      expect(v2.matriz["dl-fundamentos"].mcqScore).toBe(100);
    });

    it("mapeia dl_pratico pra dl-fundamentos, não pra dl-aplicado nem transformers-llms", () => {
      savePretest(v1Fixture());
      const v2 = loadPretestV2()!;
      for (const id of ["dl-aplicado", "transformers-llms"] as const) {
        expect(v2.matriz[id]).toMatchObject({
          score: null,
          mcqScore: null,
          confianca: "sem-evidencia",
          acertos: 0,
          total: 0,
          conceitosFracos: [],
        });
      }
    });

    it("confiança das 3 migradas é sempre 'baixa'; acertos/total = contagem/máximo do v1", () => {
      savePretest(v1Fixture({ scores: { matematica: 4, ml_classico: 3, dl_pratico: 1 } }));
      const v2 = loadPretestV2()!;
      expect(v2.matriz.matematica).toMatchObject({ confianca: "baixa", acertos: 4, total: 6 });
      expect(v2.matriz["ml-classico"]).toMatchObject({ confianca: "baixa", acertos: 3, total: 3 });
      expect(v2.matriz["dl-fundamentos"]).toMatchObject({ confianca: "baixa", acertos: 1, total: 4 });
    });

    it("boosts zerados nas migradas (não inventa priorBoost/colabBonus sem dado por questão)", () => {
      savePretest(v1Fixture());
      const v2 = loadPretestV2()!;
      for (const id of ["matematica", "ml-classico", "dl-fundamentos"] as const) {
        expect(v2.matriz[id].priorBoost).toBe(0);
        expect(v2.matriz[id].colabBonus).toBe(0);
        expect(v2.matriz[id].score).toBe(v2.matriz[id].mcqScore);
        expect(v2.matriz[id].conceitosFracos).toEqual([]);
      }
    });

    it("recomendacao migrada é coerente com recomendar(matriz) recomputada", () => {
      savePretest(v1Fixture({ scores: { matematica: 6, ml_classico: 3, dl_pratico: 4 } }));
      const v2 = loadPretestV2()!;
      expect(v2.recomendacao).toEqual(recomendar(v2.matriz, {}));
    });

    it("dispensasConfirmadas = dispensados do v1; contentVersion e ts marcam a migração", () => {
      savePretest(v1Fixture({ dispensados: ["M0", "M1"], ts: 1_700_000_000_000 }));
      const v2 = loadPretestV2()!;
      expect(v2.dispensasConfirmadas).toEqual(["M0", "M1"]);
      expect(v2.contentVersion).toBe("v1-migrado");
      expect(v2.ts).toBe(new Date(1_700_000_000_000).toISOString());
      expect(v2.version).toBe(2);
    });

    it("NUNCA apaga o v1 no storage e não grava v2 sozinho (só leitura, gravação é explícita)", () => {
      const original = v1Fixture();
      savePretest(original);
      loadPretestV2(); // dispara a migração em memória
      expect(loadPretest()).toEqual(original); // v1 intacto
      expect(localStorage.getItem(KEY_V2)).toBeNull(); // não gravou v2 sozinho
    });

    it("v2 já presente tem prioridade — não remigra por cima", () => {
      savePretest(v1Fixture({ scores: { matematica: 1, ml_classico: 1, dl_pratico: 1 } }));
      const jaSalvo = v2Fixture({ contentVersion: "conteudo-atual" });
      savePretestV2(jaSalvo);
      expect(loadPretestV2()).toEqual(jaSalvo);
    });
  });

  describe("aplicarRetake", () => {
    it("sem anterior: devolve o novo tal qual", () => {
      const novo = v2Fixture({ dispensasConfirmadas: ["M0"] });
      expect(aplicarRetake(null, novo)).toEqual(novo);
    });

    it("preserva dispensas do anterior mesmo se o novo não as repetir (união, nunca remove)", () => {
      const anterior = v2Fixture({ dispensasConfirmadas: ["M0", "M1"] });
      const novo = v2Fixture({ dispensasConfirmadas: ["M2"] });
      const resultado = aplicarRetake(anterior, novo);
      expect(resultado.dispensasConfirmadas).toEqual(expect.arrayContaining(["M0", "M1", "M2"]));
      expect(resultado.dispensasConfirmadas).toHaveLength(3);
    });

    it("o resto do resultado vem do novo, não do anterior", () => {
      const anterior = v2Fixture({ contentVersion: "old", dispensasConfirmadas: ["M0"] });
      const novo = v2Fixture({ contentVersion: "new", dispensasConfirmadas: [] });
      const resultado = aplicarRetake(anterior, novo);
      expect(resultado.contentVersion).toBe("new");
    });
  });

  describe("SSR-safe", () => {
    it("sem window: loadPretestV2/savePretestV2/clearPretestV2 degradam sem quebrar", () => {
      vi.stubGlobal("window", undefined);
      try {
        expect(loadPretestV2()).toBeNull();
        expect(() => savePretestV2(v2Fixture())).not.toThrow();
        expect(() => clearPretestV2()).not.toThrow();
      } finally {
        vi.unstubAllGlobals();
      }
    });
  });
});
