import { describe, it, expect } from "vitest";
import raw from "@/content/nivelamento.json";
import type { CompetenciaId } from "@/lib/competencias";
import { recomendar, scoreCompetencias } from "@/lib/nivelamento";
import {
  loadNivelamentoContent,
  questoesDaEtapa,
  questoesParaEngine,
  type QuestaoMCQ,
} from "@/lib/nivelamento-content";
import {
  aplicarEtapa2,
  competenciasComEtapa2,
  corrigir,
  montarProva,
  questoesPorIds,
  resumoEtapa2,
  rodadaCompativel,
} from "@/lib/nivelamento-rodada";
import type { PretestResultV2 } from "@/lib/pretest-storage";

const conteudo = loadNivelamentoContent(raw);
const naoSei = (q: QuestaoMCQ) => q.opcoes.findIndex((o) => o.naoSei);
const errada = (q: QuestaoMCQ) => q.opcoes.findIndex((o, i) => !o.naoSei && i !== q.correta);

/** Rodada da etapa 1 com as competências dadas gabaritadas e o resto em "Não sei". */
function rodadaCom(gabaritadas: CompetenciaId[]): PretestResultV2 {
  const questoes = montarProva(conteudo, 1, { seed: "teste" });
  const respostas = Object.fromEntries(
    questoes.map((q) => [q.id, gabaritadas.includes(q.competencia) ? q.correta : naoSei(q)]),
  );
  const resultados = corrigir(questoes, respostas);
  const matriz = scoreCompetencias(questoesParaEngine(questoes), resultados, {});
  return {
    version: 2,
    contentVersion: conteudo.version,
    matriz,
    resultados,
    autoRelato: {},
    recomendacao: recomendar(matriz),
    dispensasConfirmadas: [],
    ts: "2026-09-17T12:00:00.000Z",
  };
}

/** Prova da etapa 2 de uma competência e as respostas escolhidas para ela. */
function etapa2(competencia: CompetenciaId, escolher: (q: QuestaoMCQ) => number) {
  const prova = montarProva(conteudo, 2, { seed: "teste", competencias: [competencia] });
  const respostas = Object.fromEntries(prova.map((q) => [q.id, escolher(q)]));
  return [prova, respostas] as const;
}

describe("montarProva", () => {
  it("uma forma por questão, na ordem do conteúdo", () => {
    const prova = montarProva(conteudo, 1, { seed: "x" });
    const slots = [...new Set(questoesDaEtapa(conteudo, 1).map((q) => q.slot))];
    expect(prova.map((q) => q.slot)).toEqual(slots);
  });

  it("mesma seed, mesma prova; o sorteio usa as duas formas", () => {
    expect(montarProva(conteudo, 1, { seed: "a" })).toEqual(montarProva(conteudo, 1, { seed: "a" }));
    const usadas = new Set(
      ["a", "b", "c", "d", "e"].flatMap((seed) => montarProva(conteudo, 1, { seed }).map((q) => q.id)),
    );
    expect(usadas.size).toBeGreaterThan(20);
  });

  it("prefere a forma vista há mais tempo: refazer alterna as formas", () => {
    const primeira = montarProva(conteudo, 1, { seed: "a" });
    const vistas = Object.fromEntries(primeira.map((q) => [q.id, "2026-09-17T10:00:00.000Z"]));
    const segunda = montarProva(conteudo, 1, { seed: "a", vistas });
    for (let i = 0; i < primeira.length; i++) {
      expect(segunda[i].slot).toBe(primeira[i].slot);
      expect(segunda[i].id).not.toBe(primeira[i].id);
    }
  });

  it("filtra por competência e reconstrói por ids", () => {
    const prova = montarProva(conteudo, 2, { seed: "a", competencias: ["dl-aplicado"] });
    expect(prova).toHaveLength(4);
    expect(prova.every((q) => q.competencia === "dl-aplicado" && q.etapa === 2)).toBe(true);
    expect(questoesPorIds(conteudo, [...prova.map((q) => q.id), "nao-existe"])).toEqual(prova);
  });
});

describe("corrigir", () => {
  it("acerto, erro e 'Não sei'; sem resposta conta como 'Não sei'", () => {
    const [a, b, c, d] = montarProva(conteudo, 1, { seed: "x", competencias: ["matematica"] });
    const r = corrigir([a, b, c, d], { [a.id]: a.correta, [b.id]: errada(b), [c.id]: naoSei(c) });
    expect(r).toEqual({ [a.id]: "acerto", [b.id]: "erro", [c.id]: "nao-sei", [d.id]: "nao-sei" });
  });
});

describe("aplicarEtapa2", () => {
  it("gabaritar a confirmação torna o módulo dispensável sem mexer no radar", () => {
    const rodada = rodadaCom(["matematica"]);
    expect(rodada.recomendacao.estados.matematica).toBe("dispensa-a-confirmar");

    const nova = aplicarEtapa2(conteudo, rodada, ...etapa2("matematica", (q) => q.correta));
    expect(nova.recomendacao.estados.matematica).toBe("dispensavel");
    expect(nova.recomendacao.dispensaveisSugeridos.map((d) => d.modulo)).toEqual(["M0"]);
    expect(nova.matriz).toEqual(rodada.matriz);
    expect(nova.ts).toBe(rodada.ts);
    expect(competenciasComEtapa2(conteudo, nova)).toEqual(["matematica"]);
  });

  it("'Não sei' na confirmação inteira reprova e aponta os conceitos", () => {
    const nova = aplicarEtapa2(conteudo, rodadaCom(["matematica"]), ...etapa2("matematica", naoSei));
    expect(nova.recomendacao.estados.matematica).toBe("revisao-dirigida");
    expect(nova.recomendacao.fronteira).toBe("M0");
    const resumo = resumoEtapa2(conteudo, nova).matematica!;
    expect(resumo.aprovada).toBe(false);
    expect(nova.recomendacao.starNodes).toEqual(resumo.conceitosFracos);
    expect(resumo.conceitosFracos.length).toBeGreaterThan(0);
  });

  it("não deixa refazer a confirmação na mesma rodada", () => {
    const reprovada = aplicarEtapa2(
      conteudo,
      rodadaCom(["matematica"]),
      ...etapa2("matematica", naoSei),
    );
    const deNovo = aplicarEtapa2(conteudo, reprovada, ...etapa2("matematica", (q) => q.correta));
    expect(deNovo.resultados).toEqual(reprovada.resultados);
    expect(deNovo.recomendacao.estados.matematica).toBe("revisao-dirigida");
  });

  it("confirmar um módulo não mexe nos outros candidatos", () => {
    const rodada = rodadaCom(["matematica", "ml-classico"]);
    const nova = aplicarEtapa2(conteudo, rodada, ...etapa2("ml-classico", (q) => q.correta));
    expect(nova.recomendacao.estados.matematica).toBe("dispensa-a-confirmar");
    expect(nova.recomendacao.estados["ml-classico"]).toBe("dispensavel");
    expect(nova.recomendacao.fronteira).toBe("M0");
  });
});

describe("rodadaCompativel", () => {
  it("aceita rodada cujas questões existem no conteúdo", () => {
    expect(rodadaCompativel(conteudo, rodadaCom([]))).toBe(true);
  });

  it("recusa nulo, rodada migrada do v1 (sem resultados) e questão que saiu do banco", () => {
    expect(rodadaCompativel(conteudo, null)).toBe(false);
    expect(rodadaCompativel(conteudo, { ...rodadaCom([]), resultados: {} })).toBe(false);
    const sumiu = { ...rodadaCom([]), resultados: { "n-inexistente-1": "acerto" as const } };
    expect(rodadaCompativel(conteudo, sumiu)).toBe(false);
  });
});
