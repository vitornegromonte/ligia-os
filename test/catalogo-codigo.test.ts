import { describe, it, expect } from "vitest";
import tasks from "@/data/torch_tasks.json";
import indice from "@/content/generated/torch-tasks.index.json";
import { catalogoDeTarefas } from "@/lib/praticas";

type Tarefa = {
  id: string;
  slug: string;
  title: string;
  difficulty: string;
  function_name: string;
  hint: string;
  tests_count: number;
  description: string;
  initial_code: string;
};

const CATALOGO = tasks as Tarefa[];

describe("catálogo de exercícios de código", () => {
  it("tem 41 tarefas e nenhum slug repetido", () => {
    expect(CATALOGO).toHaveLength(41);
    expect(new Set(CATALOGO.map((t) => t.slug)).size).toBe(41);
  });

  it("toda tarefa tem enunciado e código inicial", () => {
    // `mha` vinha com description: "" e sem initial_code — o exercício abria
    // com editor vazio e sem instrução nenhuma.
    const quebradas = CATALOGO.filter((t) => !t.description?.trim() || !t.initial_code?.trim());
    expect(quebradas.map((t) => t.slug)).toEqual([]);
  });

  it("o código inicial segue a convenção da casa", () => {
    for (const t of CATALOGO) {
      expect(t.initial_code).toContain("import torch");
      expect(t.initial_code).toContain("# ✏️ YOUR IMPLEMENTATION HERE");
      // O stub precisa citar o símbolo que o juiz vai procurar.
      expect(t.initial_code).toContain(t.function_name);
    }
  });

  it("dificuldade é sempre um dos três valores conhecidos", () => {
    for (const t of CATALOGO) {
      expect(["Easy", "Medium", "Hard"]).toContain(t.difficulty);
    }
  });

  it("o índice gerado está em sincronia com o catálogo", () => {
    expect(indice.tasks).toHaveLength(CATALOGO.length);
    expect(catalogoDeTarefas().map((t) => t.slug).sort()).toEqual(
      CATALOGO.map((t) => t.slug).sort(),
    );
  });

  it("tests_count é positivo — é o que a UI mostra no card", () => {
    for (const t of CATALOGO) expect(t.tests_count).toBeGreaterThan(0);
  });
});
