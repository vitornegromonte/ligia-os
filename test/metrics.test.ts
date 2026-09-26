import { describe, it, expect } from "vitest";
import {
  MODULOS,
  BASE_RETENCAO,
  normalizarModulo,
  aggregateCheckpoints,
  type CheckpointResponse,
} from "@/lib/metrics";

const r = (
  email: string,
  modulo: CheckpointResponse["modulo"],
  usouSkillTree = false,
  satisfacao: number | null = null,
): CheckpointResponse => ({ email, modulo, usouSkillTree, satisfacao });

describe("normalizarModulo", () => {
  it("extrai M0–M5 de texto livre e normaliza pra maiúscula", () => {
    expect(normalizarModulo("M3")).toBe("M3");
    expect(normalizarModulo("conclui o m2 essa semana")).toBe("M2");
    expect(normalizarModulo("M0 — refresher")).toBe("M0");
  });
  it("devolve null pra módulo ausente ou fora da faixa", () => {
    expect(normalizarModulo("xyz")).toBeNull();
    expect(normalizarModulo("M6")).toBeNull();
    expect(normalizarModulo("")).toBeNull();
  });
});

describe("aggregateCheckpoints", () => {
  it("é vazio/nulo sem respostas", () => {
    const s = aggregateCheckpoints([]);
    expect(s.membrosUnicos).toBe(0);
    expect(s.pctConsultouTree).toBeNull();
    expect(s.porModulo).toHaveLength(MODULOS.length);
    expect(s.porModulo.every((m) => m.concluintes === 0)).toBe(true);
    expect(s.porModulo.every((m) => m.retencao === null)).toBe(true);
  });

  it("deduplica concluintes por e-mail (mesmo membro 2x no módulo = 1)", () => {
    const s = aggregateCheckpoints([r("a@x", "M1"), r("a@x", "M1"), r("b@x", "M1")]);
    const m1 = s.porModulo.find((m) => m.modulo === "M1")!;
    expect(m1.concluintes).toBe(2);
  });

  it("calcula retenção de cada módulo relativa ao M1", () => {
    const s = aggregateCheckpoints([
      r("a@x", "M1"),
      r("b@x", "M1"),
      r("c@x", "M1"),
      r("d@x", "M1"),
      r("a@x", "M2"),
      r("b@x", "M2"),
    ]);
    expect(BASE_RETENCAO).toBe("M1");
    const m2 = s.porModulo.find((m) => m.modulo === "M2")!;
    expect(m2.retencao).toBeCloseTo(0.5, 10); // 2 de 4
    const m1 = s.porModulo.find((m) => m.modulo === "M1")!;
    expect(m1.retencao).toBeCloseTo(1, 10);
  });

  it("% que usou o skill tree é sobre concluintes únicos do módulo", () => {
    const s = aggregateCheckpoints([
      r("a@x", "M1", true),
      r("b@x", "M1", true),
      r("c@x", "M1", false),
      r("d@x", "M1", false),
    ]);
    const m1 = s.porModulo.find((m) => m.modulo === "M1")!;
    expect(m1.pctUsouTree).toBeCloseTo(0.5, 10);
  });

  it("satisfação média ignora valores ausentes", () => {
    const s = aggregateCheckpoints([
      r("a@x", "M1", false, 4),
      r("b@x", "M1", false, 5),
      r("c@x", "M1", false, null),
    ]);
    const m1 = s.porModulo.find((m) => m.modulo === "M1")!;
    expect(m1.satisfacaoMedia).toBeCloseTo(4.5, 10);
  });

  it("agrega membros únicos e % global de consulta ao skill tree", () => {
    const s = aggregateCheckpoints([
      r("a@x", "M1", true),
      r("a@x", "M2", false), // mesmo membro, outro módulo
      r("b@x", "M1", false),
    ]);
    expect(s.membrosUnicos).toBe(2); // a e b
    expect(s.pctConsultouTree).toBeCloseTo(0.5, 10); // só 'a' usou → 1/2
  });

  it("retenção é null quando não há base (nenhum M1)", () => {
    const s = aggregateCheckpoints([r("a@x", "M2"), r("b@x", "M3")]);
    expect(s.porModulo.every((m) => m.retencao === null)).toBe(true);
  });

  it("pctUsouTree e satisfacaoMedia são null quando o módulo não tem concluintes", () => {
    const s = aggregateCheckpoints([r("a@x", "M1")]);
    const m5 = s.porModulo.find((m) => m.modulo === "M5")!;
    expect(m5.pctUsouTree).toBeNull();
    expect(m5.satisfacaoMedia).toBeNull();
  });
});
