import { describe, it, expect } from "vitest";
import raw from "@/content/nivelamento.json";
import rawConcepts from "@/content/concepts.json";
import type { CompetenciaId } from "@/lib/competencias";
import type { ResultadoQuestao } from "@/lib/nivelamento";
import { loadNivelamentoContent } from "@/lib/nivelamento-content";
import { corrigir, montarProva } from "@/lib/nivelamento-rodada";
import {
  competenciasPuladas,
  prereqsPorCompetencia,
  simularAdaptativo,
  RODADAS_MINIMAS,
} from "@/lib/adaptativo";

const conteudo = loadNivelamentoContent(raw);
const conceitos = (rawConcepts as { concepts: { id: string; module: string; prereqs: string[] }[] }).concepts;
const prereqs = prereqsPorCompetencia(conceitos);
const prova = montarProva(conteudo, 1, { seed: "sim" });

/** Rodada completa: competências em `fracas` erram tudo, as outras acertam tudo. */
function rodada(fracas: CompetenciaId[]): { resultados: Record<string, ResultadoQuestao> } {
  const escolhas = Object.fromEntries(
    prova.map((q) => [
      q.id,
      fracas.includes(q.competencia) ? q.opcoes.findIndex((o) => o.naoSei) : q.correta,
    ]),
  );
  return { resultados: corrigir(prova, escolhas) };
}

describe("prereqsPorCompetencia", () => {
  it("segue o DAG de conceitos da trilha", () => {
    const ordenado = Object.fromEntries(Object.entries(prereqs).map(([k, v]) => [k, [...v].sort()]));
    expect(ordenado).toEqual({
      matematica: [],
      "ml-classico": ["matematica"],
      "dl-fundamentos": ["matematica", "ml-classico"],
      "dl-aplicado": ["dl-fundamentos"],
      "transformers-llms": ["dl-aplicado", "dl-fundamentos"],
    });
  });
});

describe("competenciasPuladas", () => {
  it("pré-requisito abaixo de 40 pula o que depende dele, em cascata", () => {
    const puladas = competenciasPuladas(
      { matematica: 100, "ml-classico": 100, "dl-fundamentos": 25, "dl-aplicado": 100, "transformers-llms": 100 },
      prereqs,
    );
    expect([...puladas]).toEqual(["dl-aplicado", "transformers-llms"]);
  });

  it("40 exato não pula; nota baixa na última competência não pula nada depois dela", () => {
    const scores = { matematica: 50, "ml-classico": 40, "dl-fundamentos": 40, "dl-aplicado": 0, "transformers-llms": 0 };
    expect([...competenciasPuladas(scores, prereqs)]).toEqual(["transformers-llms"]);
    expect(competenciasPuladas({ ...scores, "dl-aplicado": 40 }, prereqs).size).toBe(0);
  });
});

describe("simularAdaptativo", () => {
  it("conta questões poupadas e o que a regra esconderia", () => {
    const s = simularAdaptativo(conteudo, [rodada([]), rodada(["matematica"])], prereqs);
    expect(s.rodadasCompletas).toBe(2);
    expect(s.rodadasComPulo).toBe(1);
    expect(s.casosPulados).toBe(4); // M1..M4 caem em cascata
    expect(s.questoesPoupadas).toBe(16 / 2);
    // Quem errou matemática gabaritou o resto: a regra esconderia 4 candidatas.
    expect(s.escondidoCandidata).toBe(1);
    expect(s.veredito).toBe("dados-insuficientes");
  });

  it("rodada incompleta fica fora da simulação", () => {
    const incompleta = rodada([]);
    for (const q of prova.filter((x) => x.competencia === "dl-aplicado")) delete incompleta.resultados[q.id];
    expect(simularAdaptativo(conteudo, [incompleta], prereqs).rodadasCompletas).toBe(0);
  });

  it("com dados suficientes, decide se a regra é segura", () => {
    const n = RODADAS_MINIMAS;
    // Quem vai mal em matemática vai mal em tudo: a premissa vale.
    const coerentes = Array.from({ length: n }, (_, i) =>
      i % 2 ? rodada([]) : rodada(["matematica", "ml-classico", "dl-fundamentos", "dl-aplicado", "transformers-llms"]),
    );
    expect(simularAdaptativo(conteudo, coerentes, prereqs).veredito).toBe("regra-segura");
    // Quem vai mal em matemática sabe DL: a premissa falha.
    const autodidatas = Array.from({ length: n }, () => rodada(["matematica"]));
    expect(simularAdaptativo(conteudo, autodidatas, prereqs).veredito).toBe("regra-esconde-demais");
  });
});
