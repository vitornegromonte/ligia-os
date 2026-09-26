import { describe, it, expect } from "vitest";
import rawConcepts from "@/content/concepts.json";
import {
  parseConcepts,
  checkIntegrity,
  loadConcepts,
  MODULES,
  type ConceptsFile,
} from "@/lib/content";

/**
 * Validador de contrato do conteúdo (gate de CI da F0): se concepts.json mudar
 * de forma incompatível — shape errado ou DAG quebrado — o build quebra aqui.
 */
describe("contrato do concepts.json (dados reais)", () => {
  it("passa no schema Zod", () => {
    expect(() => parseConcepts(rawConcepts)).not.toThrow();
  });

  it("tem integridade de DAG limpa (prereqs, módulos, ciclos, quizzes)", () => {
    expect(checkIntegrity(parseConcepts(rawConcepts))).toEqual([]);
  });

  it("carrega via loadConcepts sem lançar", () => {
    expect(() => loadConcepts(rawConcepts)).not.toThrow();
  });

  it("só usa módulos M0–M5", () => {
    for (const c of parseConcepts(rawConcepts).concepts) {
      expect(MODULES).toContain(c.module);
    }
  });

  it("aceita os dois formatos de validation (quiz e rubric)", () => {
    const tipos = new Set(
      parseConcepts(rawConcepts)
        .concepts.map((c) => c.validation?.type)
        .filter(Boolean),
    );
    // o conteúdo seed tem quiz + project (e report); todos devem validar
    expect(tipos.has("quiz")).toBe(true);
    expect(tipos.has("project")).toBe(true);
  });
});

// fábrica de um arquivo mínimo válido pra testar o validador isoladamente
function minimal(concepts: unknown[]): unknown {
  return { version: "test", modules: { M0: "m0", M1: "m1" }, concepts };
}

describe("o validador tem dentes (rejeita conteúdo inválido)", () => {
  it("acusa prereq inexistente com a mensagem do id faltante", () => {
    const file = minimal([
      { id: "raiz", label: "x", module: "M0", prereqs: [], materials: [] },
      { id: "folha", label: "y", module: "M1", prereqs: ["nao-existe-xyz"], materials: [] },
    ]);
    const errs = checkIntegrity(parseConcepts(file));
    expect(errs.some((e) => e.includes("nao-existe-xyz"))).toBe(true);
  });

  it("acusa ciclo de prereqs", () => {
    const file = minimal([
      { id: "a", label: "a", module: "M0", prereqs: ["b"], materials: [] },
      { id: "b", label: "b", module: "M0", prereqs: ["a"], materials: [] },
    ]);
    const errs = checkIntegrity(parseConcepts(file) as ConceptsFile);
    expect(errs.some((e) => e.startsWith("ciclo de prereqs"))).toBe(true);
  });

  it("acusa quiz com passing > questions", () => {
    const file = minimal([
      {
        id: "q",
        label: "q",
        module: "M0",
        prereqs: [],
        materials: [],
        validation: { type: "quiz", questions: 5, passing: 8 },
      },
    ]);
    expect(checkIntegrity(parseConcepts(file)).some((e) => e.startsWith("quiz inválido"))).toBe(
      true,
    );
  });

  it("rejeita ids que não são kebab-case", () => {
    for (const bad of ["Maiuscula", "com espaco", "under_score", "-borda", "borda-", "a--b"]) {
      expect(() =>
        parseConcepts(minimal([{ id: bad, label: "x", module: "M0", prereqs: [], materials: [] }])),
      ).toThrow();
    }
  });

  it("aceita ids kebab-case válidos", () => {
    for (const ok of ["a", "a-b-c", "node1", "transformer-atencao"]) {
      expect(() =>
        parseConcepts(minimal([{ id: ok, label: "x", module: "M0", prereqs: [], materials: [] }])),
      ).not.toThrow();
    }
  });

  it("rejeita url de material sem http(s) ou com espaço", () => {
    for (const url of ["", "ftp://x", "/relativo", "http://", "https://a b"]) {
      expect(() =>
        parseConcepts(
          minimal([
            {
              id: "n",
              label: "x",
              module: "M0",
              prereqs: [],
              materials: [{ type: "video", title: "t", url }],
            },
          ]),
        ),
      ).toThrow();
    }
  });
});
