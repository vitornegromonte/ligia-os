import { describe, it, expect } from "vitest";
import rawConcepts from "@/content/concepts.json";
import { loadConcepts } from "@/lib/content";
import {
  checkPraticasIntegrity,
  lacunas,
  tarefasDoConceito,
  conceitosDaTarefa,
  catalogoDeTarefas,
  getPraticas,
  PraticasSchema,
} from "@/lib/praticas";

const concepts = loadConcepts(rawConcepts);
const praticas = getPraticas();

describe("praticas — integridade do mapeamento real", () => {
  it("não tem erro de integridade", () => {
    expect(checkPraticasIntegrity(praticas, concepts)).toEqual([]);
  });

  it("cobre todos os 29 conceitos da trilha", () => {
    expect(Object.keys(praticas.mapeamento).sort()).toEqual(
      concepts.concepts.map((c) => c.id).sort(),
    );
  });

  it("usa todas as 41 tarefas do catálogo — nenhuma órfã", () => {
    expect(lacunas().tasksSemConceito).toEqual([]);
    expect(catalogoDeTarefas()).toHaveLength(41);
  });
});

describe("praticas — detecção de erro", () => {
  const catalogoFake = {
    version: "1",
    tasks: [{ slug: "relu", title: "ReLU", difficulty: "Easy" as const }],
  };

  it("acusa conceito inexistente", () => {
    const p = PraticasSchema.parse({ version: "1", mapeamento: { "nao-existe": { tasks: [] } } });
    expect(checkPraticasIntegrity(p, concepts, catalogoFake)).toContain(
      'praticas: conceito inexistente "nao-existe"',
    );
  });

  it("acusa task inexistente no catálogo", () => {
    const p = PraticasSchema.parse({ version: "1", mapeamento: { relu: { tasks: ["fantasma"] } } });
    expect(checkPraticasIntegrity(p, concepts, catalogoFake)).toContain(
      'praticas: task inexistente "fantasma" em "relu"',
    );
  });

  it("acusa task duplicada dentro do mesmo conceito", () => {
    const p = PraticasSchema.parse({
      version: "1",
      mapeamento: { "ativacoes": { tasks: ["relu", "relu"] } },
    });
    expect(checkPraticasIntegrity(p, concepts, catalogoFake)).toContain(
      'praticas: task duplicada "relu" em "ativacoes"',
    );
  });

  it("acusa conceito não mapeado — ausência é diferente de lista vazia", () => {
    const p = PraticasSchema.parse({ version: "1", mapeamento: {} });
    const erros = checkPraticasIntegrity(p, concepts, catalogoFake);
    expect(erros.some((e) => e.includes("não foi mapeado"))).toBe(true);
  });
});

describe("praticas — consultas", () => {
  it("ordena as tarefas por dificuldade crescente", () => {
    // multi-head-attention tem sete tasks, quase todas Hard: sem ordenação o
    // aluno cai em flash_attention antes de mha.
    const peso = { Easy: 0, Medium: 1, Hard: 2 } as const;
    for (const c of concepts.concepts) {
      const ts = tarefasDoConceito(c.id);
      for (let i = 1; i < ts.length; i++) {
        expect(peso[ts[i].difficulty]).toBeGreaterThanOrEqual(peso[ts[i - 1].difficulty]);
      }
    }
  });

  it("a porta de entrada de pytorch começa no Easy", () => {
    const ts = tarefasDoConceito("pytorch");
    expect(ts.length).toBeGreaterThan(0);
    expect(ts[0].difficulty).toBe("Easy");
  });

  it("uma tarefa pode servir a mais de um conceito", () => {
    expect(conceitosDaTarefa("cross_entropy").sort()).toEqual([
      "loss-functions",
      "regressao-logistica",
    ]);
  });

  it("devolve vazio para conceito sem prática de código", () => {
    expect(tarefasDoConceito("algebra-linear-basica")).toEqual([]);
    expect(tarefasDoConceito("conceito-que-nao-existe")).toEqual([]);
  });

  it("as lacunas de cobertura são as esperadas e estão documentadas", () => {
    // M0 inteiro é conceitual por natureza; as outras quatro são lacunas
    // reais do catálogo, e cada uma carrega uma nota dizendo isso.
    const { conceitosSemCodigo } = lacunas();
    expect(conceitosSemCodigo.sort()).toEqual([
      "algebra-linear-basica",
      "calculo-vetorial",
      "dataloaders",
      "gradiente",
      "knn",
      "probabilidade-basica",
      "projeto-final",
      "train-val-test",
      "transfer-learning",
    ]);
    for (const id of conceitosSemCodigo) {
      expect(praticas.mapeamento[id].tasks).toEqual([]);
    }
  });
});
