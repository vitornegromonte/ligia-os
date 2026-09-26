import { describe, it, expect } from "vitest";
import { buildGradingPrompt, parseGrading } from "../supabase/functions/_shared/loop-grading.ts";

describe("loop-grading", () => {
  it("buildGradingPrompt inclui pergunta, rubrica, resposta, contexto e pede o formato", () => {
    const msgs = buildGradingPrompt("P?", "R.", "resp", "BASE XYZ");
    const all = msgs.map((m) => m.content).join("\n");
    expect(all).toContain("P?");
    expect(all).toContain("BASE XYZ");
    expect(msgs[0].content.toLowerCase()).toContain("primeira linha"); // formato streamável
  });

  it("buildGradingPrompt funciona sem contexto", () => {
    const msgs = buildGradingPrompt("P?", "R.", "resp");
    expect(msgs.map((m) => m.content).join("\n")).not.toContain("CONTEXTO DE REFERÊNCIA");
  });

  it("parseGrading lê o veredito da 1ª linha e o feedback do resto", () => {
    expect(parseGrading("acertei\nMuito bem, **isso**!")).toEqual({
      veredito: "acertei",
      feedback: "Muito bem, **isso**!",
      matched: true,
    });
    expect(parseGrading("parcial\nFaltou X.").veredito).toBe("parcial");
    expect(parseGrading("errei\n...").veredito).toBe("errei");
  });

  it("parseGrading sinaliza matched=false no header desconhecido (sem 'parcial' fantasma)", () => {
    expect(parseGrading("Veredito: acertei!\nbom").veredito).toBe("acertei");
    expect(parseGrading("Veredito: acertei!\nbom").matched).toBe(true);
    // header sem nenhuma das 3 palavras: veredito default 'parcial' MAS matched=false
    expect(parseGrading("sei lá\nx").veredito).toBe("parcial");
    expect(parseGrading("sei lá\nx").matched).toBe(false);
    expect(parseGrading("parcial\nok").matched).toBe(true);
    expect(parseGrading("acertei").feedback).toBe("");
  });
});
