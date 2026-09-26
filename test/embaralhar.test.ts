import { describe, it, expect } from "vitest";
import { ordemDasOpcoes, hashSeed } from "@/lib/embaralhar";

type Op = { texto: string; naoSei?: boolean };
const ops: Op[] = [
  { texto: "a" },
  { texto: "b" },
  { texto: "c" },
  { texto: "d" },
  { texto: "Não sei", naoSei: true },
];
const ancora = (o: Op) => o.naoSei === true;

describe("ordemDasOpcoes", () => {
  it("é uma permutação completa dos índices", () => {
    const ordem = ordemDasOpcoes(ops, "sessao-1:q1", ancora);
    expect([...ordem].sort((x, y) => x - y)).toEqual([0, 1, 2, 3, 4]);
  });

  it("mantém a âncora ('Não sei') sempre na última posição", () => {
    for (const seed of ["a", "b", "c", "d", "e", "f"]) {
      const ordem = ordemDasOpcoes(ops, seed, ancora);
      expect(ordem[ordem.length - 1], seed).toBe(4);
    }
  });

  it("é determinística: mesma seed → mesma ordem", () => {
    expect(ordemDasOpcoes(ops, "x:q1", ancora)).toEqual(ordemDasOpcoes(ops, "x:q1", ancora));
  });

  it("varia entre seeds diferentes", () => {
    const ordens = new Set(
      ["s1:q1", "s2:q1", "s3:q1", "s4:q1", "s5:q1", "s6:q1"].map((s) =>
        ordemDasOpcoes(ops, s, ancora).join(","),
      ),
    );
    expect(ordens.size).toBeGreaterThan(1);
  });

  it("funciona sem âncora nenhuma", () => {
    const semAncora = ops.slice(0, 4);
    const ordem = ordemDasOpcoes(semAncora, "s:q", ancora);
    expect([...ordem].sort((x, y) => x - y)).toEqual([0, 1, 2, 3]);
  });

  it("hashSeed é estável e não-negativo", () => {
    expect(hashSeed("abc")).toBe(hashSeed("abc"));
    expect(hashSeed("abc")).toBeGreaterThanOrEqual(0);
    expect(hashSeed("abc")).not.toBe(hashSeed("abd"));
  });
});
