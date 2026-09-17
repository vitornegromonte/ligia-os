import { describe, it, expect } from "vitest";
import raw from "@/content/nivelamento.json";
import type { ResultadoQuestao } from "@/lib/nivelamento";
import { loadNivelamentoContent, type QuestaoMCQ } from "@/lib/nivelamento-content";
import { montarProva } from "@/lib/nivelamento-rodada";
import {
  analisarItens,
  pearson,
  pesoSugerido,
  N_MINIMO,
  type RodadaAnalise,
} from "@/lib/analise-itens";

const conteudo = loadNivelamentoContent(raw);
const prova = montarProva(conteudo, 1, { seed: "fixa" });

/**
 * População sintética: habilidade i/(N−1) em [0, 1]. Por padrão cada questão
 * é acertada por quem tem habilidade acima de um limiar que cresce com a
 * posição — o comportamento de uma questão boa. `regra` troca isso por questão.
 */
function populacao(
  n: number,
  regra: (q: QuestaoMCQ, habilidade: number, i: number) => ResultadoQuestao | undefined = () =>
    undefined,
  escolha?: (q: QuestaoMCQ, res: ResultadoQuestao, i: number) => number,
): RodadaAnalise[] {
  return Array.from({ length: n }, (_, i) => {
    const habilidade = i / (n - 1);
    const resultados: Record<string, ResultadoQuestao> = {};
    const respostas: Record<string, number> = {};
    prova.forEach((q, k) => {
      const limiar = (k % 5) / 5;
      const res = regra(q, habilidade, i) ?? (habilidade >= limiar ? "acerto" : "erro");
      resultados[q.id] = res;
      if (escolha) respostas[q.id] = escolha(q, res, i);
    });
    return { resultados, respostas: escolha ? respostas : undefined };
  });
}

describe("pearson e peso sugerido", () => {
  it("correlação conhecida, e null sem variância ou com poucos pares", () => {
    expect(pearson([1, 2, 3, 4], [2, 4, 6, 8])).toBeCloseTo(1, 10);
    expect(pearson([1, 2, 3, 4], [8, 6, 4, 2])).toBeCloseTo(-1, 10);
    expect(pearson([1, 1, 1, 1], [1, 2, 3, 4])).toBeNull();
    expect(pearson([1, 2], [1, 2])).toBeNull();
  });

  it("peso pela taxa de acerto: ≥0,70 → 1; ≥0,40 → 2; abaixo → 3", () => {
    expect([pesoSugerido(0.95), pesoSugerido(0.7), pesoSugerido(0.5), pesoSugerido(0.39)]).toEqual([
      1, 1, 2, 3,
    ]);
  });
});

describe("analisarItens", () => {
  it("amostra pequena só recebe esse alerta", () => {
    const a = analisarItens(conteudo, populacao(N_MINIMO - 1));
    const vista = a.itens.find((it) => it.id === prova[0].id)!;
    expect(vista.n).toBe(N_MINIMO - 1);
    expect(vista.alertas).toEqual(["amostra-pequena"]);
    // Forma que não apareceu em rodada nenhuma: n = 0, sem taxa.
    const naoVista = a.itens.find((it) => it.slot === prova[0].slot && it.id !== prova[0].id)!;
    expect(naoVista).toMatchObject({ n: 0, p: null, rpb: null });
  });

  it("questão boa discrimina: correlação alta, sem alerta de gabarito", () => {
    const a = analisarItens(conteudo, populacao(120));
    const q = a.itens.find((it) => it.id === prova[2].id)!;
    expect(q.rpb!).toBeGreaterThan(0.5);
    expect(q.alertas).not.toContain("gabarito-suspeito");
    expect(q.alertas).not.toContain("discrimina-pouco");
  });

  it("gabarito trocado: quem vai mal no resto acerta esta → correlação negativa", () => {
    const alvo = prova[3];
    const a = analisarItens(
      conteudo,
      populacao(120, (q, h) => (q.id === alvo.id ? (h < 0.5 ? "acerto" : "erro") : undefined)),
    );
    const q = a.itens.find((it) => it.id === alvo.id)!;
    expect(q.rpb!).toBeLessThan(0);
    expect(q.alertas).toContain("gabarito-suspeito");
  });

  it("todo mundo acerta a questão de peso 3 → fácil demais e peso diferente", () => {
    const alvo = prova.find((q) => q.dificuldade === 3)!;
    const a = analisarItens(
      conteudo,
      populacao(60, (q) => (q.id === alvo.id ? "acerto" : undefined)),
    );
    const q = a.itens.find((it) => it.id === alvo.id)!;
    expect(q.p).toBe(1);
    expect(q.pesoSugerido).toBe(1);
    expect(q.alertas).toEqual(expect.arrayContaining(["facil-demais", "peso-diferente"]));
  });

  it("conta as alternativas marcadas e acusa distrator que ninguém escolhe", () => {
    const alvo = prova[0];
    const errada = alvo.opcoes.findIndex((o, i) => i !== alvo.correta && !o.naoSei);
    const a = analisarItens(
      conteudo,
      populacao(40, undefined, (q, res) => (res === "acerto" ? q.correta : errada)),
    );
    const q = a.itens.find((it) => it.id === alvo.id)!;
    expect(q.nComEscolha).toBe(40);
    expect(q.escolhas[q.escolhas.length - 1]).toBe(0);
    expect(q.escolhas.reduce((s, v) => s + v, 0)).toBe(40);
    expect(q.alertas).toContain("distrator-morto");
  });

  it("'Não sei' é contado à parte", () => {
    const alvo = prova[1];
    const a = analisarItens(
      conteudo,
      populacao(40, (q, _h, i) => (q.id === alvo.id && i % 4 === 0 ? "nao-sei" : undefined)),
    );
    expect(a.itens.find((it) => it.id === alvo.id)!.taxaNaoSei).toBe(10 / 40);
  });

  it("variantes com taxas de acerto muito diferentes são apontadas", () => {
    const slot = prova[0].slot;
    const [f1, f2] = conteudo.mcq.filter((q) => q.slot === slot);
    const rodadas: RodadaAnalise[] = Array.from({ length: 80 }, (_, i) => {
      const forma = i % 2 === 0 ? f1 : f2;
      // f1: todos acertam; f2: metade acerta.
      const res: ResultadoQuestao = forma === f1 || i % 4 === 1 ? "acerto" : "erro";
      return { resultados: { [forma.id]: res } };
    });
    const a = analisarItens(conteudo, rodadas);
    expect(a.formasDesiguais).toEqual([
      { slot, formas: [{ id: f1.id, n: 40, p: 1 }, { id: f2.id, n: 40, p: 0.5 }] },
    ]);
  });
});
