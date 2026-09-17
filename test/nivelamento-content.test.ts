import { describe, it, expect } from "vitest";
import raw from "@/content/nivelamento.json";
import rawConcepts from "@/content/concepts.json";
import {
  loadNivelamentoContent,
  priorDeAr1,
  questoesDaEtapa,
  questoesParaEngine,
} from "@/lib/nivelamento-content";
import { COMPETENCIAS, type CompetenciaId } from "@/lib/competencias";

const content = loadNivelamentoContent(raw);

/** Mapa conceito → módulo, a partir do conteúdo real da trilha. */
const moduloDoConceito = new Map<string, string>(
  (rawConcepts as { concepts: { id: string; module: string }[] }).concepts.map((c) => [
    c.id,
    c.module,
  ]),
);

const moduloDaCompetencia = new Map<CompetenciaId, string>(
  COMPETENCIAS.map((c) => [c.id, c.modulo]),
);

/** Uma forma por questão (a principal): a prova tem a mesma estrutura, só troca o texto. */
function principais(etapa: 1 | 2, competencia?: CompetenciaId) {
  return questoesDaEtapa(content, etapa, competencia && [competencia]).filter((q) => q.id === q.slot);
}

describe("banco de questões — estrutura", () => {
  it.each([1, 2] as const)("etapa %i tem 20 questões, 4 por competência", (etapa) => {
    expect(principais(etapa)).toHaveLength(20);
    for (const { id } of COMPETENCIAS) {
      expect(principais(etapa, id), `competência ${id}`).toHaveLength(4);
    }
  });

  it.each([1, 2] as const)(
    "etapa %i: cada competência tem o multiset de dificuldades {1,2,2,3}",
    (etapa) => {
      // Mesmo multiset nas duas etapas: a nota acumulada pesa as duas por igual.
      for (const { id } of COMPETENCIAS) {
        const difs = principais(etapa, id).map((q) => q.dificuldade).sort();
        expect(difs, `competência ${id}`).toEqual([1, 2, 2, 3]);
      }
    },
  );

  it("toda questão tem ao menos uma variante, que herda competência, etapa, dificuldade e conceitos", () => {
    for (const p of content.mcq.filter((q) => q.id === q.slot)) {
      const formas = content.mcq.filter((q) => q.slot === p.slot);
      expect(formas.length, p.id).toBeGreaterThanOrEqual(2);
      for (const f of formas) {
        expect([f.competencia, f.etapa, f.dificuldade, f.conceitos], f.id).toEqual([
          p.competencia,
          p.etapa,
          p.dificuldade,
          p.conceitos,
        ]);
        if (f !== p) expect(f.pergunta, f.id).not.toBe(p.pergunta);
      }
    }
  });

  it("ids são únicos e seguem o padrão n-<competencia>-[e2-]<n>, com letra nas variantes", () => {
    const ids = content.mcq.map((q) => q.id);
    expect(new Set(ids).size).toBe(ids.length);
    for (const q of content.mcq) {
      const etapa = q.etapa === 2 ? "e2-" : "";
      const variante = q.id === q.slot ? "" : "[b-z]";
      expect(q.id, q.id).toMatch(new RegExp(`^n-${q.competencia}-${etapa}[1-9]${variante}$`));
    }
  });

  it("questão sem etapa no JSON é da etapa 1", () => {
    expect(content.mcq.find((q) => q.id === "n-matematica-1")?.etapa).toBe(1);
  });
});

describe("banco de questões — opções e gabarito", () => {
  it('toda MCQ tem exatamente uma opção "Não sei", na última posição', () => {
    for (const q of content.mcq) {
      const marcadas = q.opcoes.filter((o) => o.naoSei);
      expect(marcadas, q.id).toHaveLength(1);
      expect(q.opcoes[q.opcoes.length - 1].naoSei, q.id).toBe(true);
    }
  });

  it("toda MCQ tem 4 opções de conteúdo além do 'Não sei'", () => {
    for (const q of content.mcq) {
      expect(q.opcoes, q.id).toHaveLength(5);
    }
  });

  it("correta é índice válido e nunca aponta pro 'Não sei'", () => {
    for (const q of content.mcq) {
      expect(q.correta, q.id).toBeGreaterThanOrEqual(0);
      expect(q.correta, q.id).toBeLessThan(q.opcoes.length);
      expect(q.opcoes[q.correta].naoSei, q.id).toBe(false);
    }
  });

  it("gabarito não é degenerado: nenhum índice concentra mais de 40% das respostas", () => {
    const contagem = new Map<number, number>();
    for (const q of content.mcq) {
      contagem.set(q.correta, (contagem.get(q.correta) ?? 0) + 1);
    }
    for (const [indice, n] of contagem) {
      expect(n / content.mcq.length, `índice ${indice}`).toBeLessThanOrEqual(0.4);
    }
  });
});

describe("questões aposentadas", () => {
  const aposentadas = () => content.mcq.filter((q) => q.aposentada);

  it("continuam no banco (rodadas antigas e análise de itens), com as variantes", () => {
    expect(aposentadas().map((q) => q.id)).toEqual(
      expect.arrayContaining([
        "n-dl-fundamentos-2",
        "n-dl-fundamentos-2b",
        "n-transformers-llms-1",
        "n-transformers-llms-1b",
      ]),
    );
  });

  it("não entram em prova nova", () => {
    const ids = new Set(aposentadas().map((q) => q.id));
    expect(questoesDaEtapa(content, 1).some((q) => ids.has(q.id))).toBe(false);
  });
});

describe("cobertura de conceitos na etapa 1", () => {
  it("todo conceito de M0–M4 é avaliado por alguma questão ativa da etapa 1", () => {
    // Conceito sem questão nunca vira ⭐ na trilha, porque ⭐ sai das questões erradas.
    const cobertos = new Set(questoesDaEtapa(content, 1).flatMap((q) => q.conceitos));
    for (const { modulo } of COMPETENCIAS) {
      const doModulo = [...moduloDoConceito].filter(([, m]) => m === modulo).map(([c]) => c);
      for (const c of doModulo) expect(cobertos.has(c), `${modulo} → ${c}`).toBe(true);
    }
  });

  it("geracao-de-texto é avaliado na etapa 1 (liga-014), sem perder tokenizacao", () => {
    const conceitos = new Set(questoesDaEtapa(content, 1).flatMap((q) => q.conceitos));
    expect(conceitos.has("geracao-de-texto")).toBe(true);
    expect(conceitos.has("tokenizacao")).toBe(true);
  });

  it("batchnorm é avaliado na etapa 1 (liga-013)", () => {
    const conceitos = new Set(questoesDaEtapa(content, 1).flatMap((q) => q.conceitos));
    expect(conceitos.has("batchnorm")).toBe(true);
    // A questão aposentada era a segunda de gradient-descent; o conceito segue coberto.
    expect(conceitos.has("gradient-descent")).toBe(true);
  });
});

describe("leitura de código", () => {
  const principaisCodigo = () => content.codigo.questoes.filter((q) => q.id === q.slot);

  it("4 questões com dificuldades {1,2,2,3}, cada uma com variante", () => {
    expect(principaisCodigo().map((q) => q.dificuldade).sort()).toEqual([1, 2, 2, 3]);
    for (const p of principaisCodigo()) {
      const formas = content.codigo.questoes.filter((q) => q.slot === p.slot);
      expect(formas.length, p.id).toBeGreaterThanOrEqual(2);
      expect(new Set(formas.map((f) => f.dificuldade)).size, p.id).toBe(1);
    }
  });

  it("toda forma mostra código, tem 'Não sei' no fim, gabarito válido e explicação", () => {
    for (const q of content.codigo.questoes) {
      expect(q.id, q.id).toMatch(/^n-codigo-[1-4][b-z]?$/);
      expect(q.codigo, q.id).toBeTruthy();
      expect(q.opcoes[q.opcoes.length - 1].naoSei, q.id).toBe(true);
      expect(q.opcoes[q.correta].naoSei, q.id).toBe(false);
      expect(q.explicacao.length, q.id).toBeGreaterThan(40);
    }
  });

  it("nenhum id repete entre MCQ e leitura de código", () => {
    const ids = [...content.mcq, ...content.codigo.questoes].map((q) => q.id);
    expect(new Set(ids).size).toBe(ids.length);
  });
});

describe("banco de questões — explicações", () => {
  it("toda MCQ explica a resposta em texto curto", () => {
    for (const q of content.mcq) {
      expect(q.explicacao.trim().length, q.id).toBeGreaterThan(40);
      expect(q.explicacao.length, q.id).toBeLessThanOrEqual(320);
    }
  });
});

describe("banco de questões — ancoragem nos conceitos", () => {
  it("todo conceito citado existe em concepts.json", () => {
    for (const q of content.mcq) {
      expect(q.conceitos.length, q.id).toBeGreaterThan(0);
      for (const c of q.conceitos) {
        expect(moduloDoConceito.has(c), `${q.id} → ${c}`).toBe(true);
      }
    }
  });

  it("todo conceito citado pertence ao módulo da competência da questão", () => {
    for (const q of content.mcq) {
      const esperado = moduloDaCompetencia.get(q.competencia);
      for (const c of q.conceitos) {
        expect(moduloDoConceito.get(c), `${q.id} → ${c}`).toBe(esperado);
      }
    }
  });
});

describe("auto-relato", () => {
  it("ar1 mapeia opções em competências válidas e termina com a exclusiva", () => {
    const ar1 = content.auto_relato.find((p) => p.id === "ar1")!;
    expect(ar1).toBeDefined();
    const ids = new Set(COMPETENCIAS.map((c) => c.id));
    const ultima = ar1.opcoes[ar1.opcoes.length - 1];
    expect(ultima.exclusiva).toBe(true);
    expect(ultima.competencia).toBeNull();
    for (const op of ar1.opcoes.slice(0, -1)) {
      expect(op.competencia, op.texto).not.toBeNull();
      expect(ids.has(op.competencia as CompetenciaId), op.texto).toBe(true);
    }
    // toda competência aparece ao menos uma vez (senão o prior nunca a cobre)
    const cobertas = new Set(ar1.opcoes.map((o) => o.competencia).filter(Boolean));
    expect(cobertas.size).toBe(COMPETENCIAS.length);
  });

  it("ar2 e ar3 também têm opção exclusiva no fim", () => {
    for (const id of ["ar2", "ar3"]) {
      const p = content.auto_relato.find((x) => x.id === id)!;
      expect(p, id).toBeDefined();
      expect(p.opcoes[p.opcoes.length - 1].exclusiva, id).toBe(true);
    }
  });

  it("perguntas single (ar4/ar5) não têm opção exclusiva", () => {
    for (const id of ["ar4", "ar5"]) {
      const p = content.auto_relato.find((x) => x.id === id)!;
      expect(p.tipo, id).toBe("single");
      expect(p.opcoes.some((o) => o.exclusiva), id).toBe(false);
    }
  });
});

describe("priorDeAr1", () => {
  const ar1 = () => content.auto_relato.find((p) => p.id === "ar1")!;

  it("converte índices marcados nas competências correspondentes", () => {
    const opcoes = ar1().opcoes;
    const iMat = opcoes.findIndex((o) => o.competencia === "matematica");
    const iTrf = opcoes.findIndex((o) => o.competencia === "transformers-llms");
    const prior = priorDeAr1(ar1(), [iMat, iTrf]);
    expect(prior.matematica).toBe(true);
    expect(prior["transformers-llms"]).toBe(true);
    expect(prior["ml-classico"]).toBeUndefined();
  });

  it('"Nenhum destes" não declara competência alguma', () => {
    const opcoes = ar1().opcoes;
    const iNenhum = opcoes.findIndex((o) => o.exclusiva);
    expect(priorDeAr1(ar1(), [iNenhum])).toEqual({});
  });

  it("seleção vazia e índices inválidos são ignorados", () => {
    expect(priorDeAr1(ar1(), [])).toEqual({});
    expect(priorDeAr1(ar1(), [999, -1])).toEqual({});
  });
});

describe("questoesParaEngine", () => {
  it("expõe só o que a engine precisa — sem gabarito", () => {
    const qs = questoesParaEngine(content.mcq);
    expect(qs).toHaveLength(content.mcq.length);
    for (const q of qs) {
      expect(Object.keys(q).sort()).toEqual(["competencia", "conceitos", "dificuldade", "etapa", "id"]);
    }
  });
});

describe("loadNivelamentoContent", () => {
  it("é fail-fast em conteúdo inválido", () => {
    expect(() => loadNivelamentoContent({ version: "2" })).toThrow();
    expect(() =>
      loadNivelamentoContent({ ...(raw as object), mcq: [{ id: "x" }] }),
    ).toThrow();
  });

  const mcqCru = (raw as { mcq: { id: string; competencia: string; etapa?: number }[] }).mcq;

  it("recusa competência com etapa 1 e sem etapa 2", () => {
    const semEtapa2 = mcqCru.filter((q) => !(q.competencia === "dl-aplicado" && q.etapa === 2));
    expect(() => loadNivelamentoContent({ ...(raw as object), mcq: semEtapa2 })).toThrow(
      /dl-aplicado.*etapa 2/,
    );
  });

  it("recusa id repetido", () => {
    const repetido = [...mcqCru, mcqCru[0]];
    expect(() => loadNivelamentoContent({ ...(raw as object), mcq: repetido })).toThrow(/repetido/);
  });
});
