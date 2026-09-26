import { describe, it, expect } from "vitest";
import fs from "node:fs";
import path from "node:path";
import rawConcepts from "@/content/concepts.json";
import { loadConcepts } from "@/lib/content";
import { parseLoopContent, checkLoopIntegrity, getLoopConceptIds } from "@/lib/loops";

const concepts = loadConcepts(rawConcepts);

describe("loops — schema + integridade", () => {
  const valido = {
    conceptId: "regressao-linear",
    orientacao: "Texto de orientação.",
    checagens: [{ pergunta: "P?", rubrica: "R." }],
    ponteiros: ["ISL cap. 3"],
  };

  it("parseLoopContent aceita um loop válido e aplica default de ponteiros", () => {
    const { ponteiros } = parseLoopContent({ ...valido, ponteiros: undefined });
    expect(ponteiros).toEqual([]);
  });

  it("parseLoopContent rejeita checagem sem rubrica", () => {
    expect(() =>
      parseLoopContent({ ...valido, checagens: [{ pergunta: "P?" }] }),
    ).toThrow();
  });

  it("parseLoopContent rejeita lista de checagens vazia", () => {
    expect(() => parseLoopContent({ ...valido, checagens: [] })).toThrow();
  });

  it("checkLoopIntegrity acusa conceptId inexistente", () => {
    const loop = parseLoopContent({ ...valido, conceptId: "nao-existe" });
    expect(checkLoopIntegrity(loop, concepts)).toEqual([
      'loop: conceptId inexistente "nao-existe"',
    ]);
  });

  it("checkLoopIntegrity passa pra conceptId real", () => {
    expect(checkLoopIntegrity(parseLoopContent(valido), concepts)).toEqual([]);
  });

  it("parseLoopContent DESCARTA contexto — ele nunca pode chegar ao cliente", () => {
    // Inversão deliberada do teste original, que exigia preservar o campo.
    // Lá havia servidor para removê-lo por request; aqui o schema de cliente
    // é a fronteira, e `contexto` (material de fundamentação do avaliador,
    // com respostas de referência) precisa morrer no parse.
    const r = parseLoopContent({ ...valido, contexto: "base teórica" });
    expect(r).not.toHaveProperty("contexto");
    expect(JSON.stringify(r)).not.toContain("base teórica");
  });
});

describe("loops — arquivos reais de content/loops/", () => {
  const LOOPS_DIR = path.join(process.cwd(), "content", "loops");
  const ids = getLoopConceptIds();

  it("existe ao menos um loop", () => {
    expect(ids.length).toBeGreaterThan(0);
  });

  for (const id of ids) {
    it(`${id}: shape válido, filename === conceptId, integridade ok`, () => {
      const raw = JSON.parse(
        fs.readFileSync(path.join(LOOPS_DIR, `${id}.json`), "utf8"),
      );
      const loop = parseLoopContent(raw);
      expect(loop.conceptId).toBe(id);
      expect(checkLoopIntegrity(loop, concepts)).toEqual([]);
    });
  }
});
