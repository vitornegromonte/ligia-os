import { describe, it, expect, beforeEach } from "vitest";
import { setNodeStatus } from "@/lib/progress";
import { saveLoopResult, replaceLoopResults } from "@/lib/loop-progress";
import { loadEvents, clearEvents } from "@/lib/events";

/**
 * `node_status_changed` e `loop_completed` estavam DECLARADOS em lib/events.ts
 * desde o início e nunca eram emitidos — é por isso que o export de progresso
 * do aluno reportava `at: null` em toda linha. Estes testes travam a emissão.
 */
describe("eventos de aprendizagem", () => {
  beforeEach(() => {
    localStorage.clear();
    clearEvents();
  });

  it("marcar um conceito emite node_status_changed com origem e destino", () => {
    setNodeStatus({}, "regressao-linear", "done");
    const eventos = loadEvents();
    expect(eventos).toHaveLength(1);
    expect(eventos[0].type).toBe("node_status_changed");
    expect(eventos[0].object).toBe("regressao-linear");
    expect(eventos[0].data).toMatchObject({ de: null, para: "done" });
  });

  it("desmarcar também emite, com para: null", () => {
    const depois = setNodeStatus({}, "knn", "in-progress");
    clearEvents();
    setNodeStatus(depois, "knn", null);
    expect(loadEvents()[0].data).toMatchObject({ de: "in-progress", para: null });
  });

  it("não emite quando o estado não muda", () => {
    const depois = setNodeStatus({}, "mlp", "done");
    clearEvents();
    setNodeStatus(depois, "mlp", "done");
    expect(loadEvents()).toHaveLength(0);
  });

  it("concluir uma prática emite loop_completed com o domínio", () => {
    saveLoopResult("atencao", { acertei: 5, parcial: 0, errei: 0 }, 5);
    const eventos = loadEvents();
    expect(eventos).toHaveLength(1);
    expect(eventos[0].type).toBe("loop_completed");
    expect(eventos[0].object).toBe("atencao");
    expect(eventos[0].data).toMatchObject({ dominio: "dominado", streak: 1, acertei: 5, total: 5 });
  });

  it("prática com erro registra domínio 'praticado'", () => {
    saveLoopResult("cnn", { acertei: 3, parcial: 1, errei: 1 }, 5);
    expect(loadEvents()[0].data).toMatchObject({ dominio: "praticado", streak: 0 });
  });

  it("replaceLoopResults NÃO emite — é merge, não prática", () => {
    // Emitir aqui inventaria prática que o aluno não fez, e o evento subiria
    // ao banco pelo sync como se fosse real.
    replaceLoopResults({
      atencao: { at: new Date().toISOString(), times: 3, streak: 2, acertei: 5, parcial: 0, errei: 0, total: 5 },
    });
    expect(loadEvents()).toHaveLength(0);
  });

  it("todo evento emitido tem id uuid v4 — learning_events.id é uuid no Postgres", () => {
    setNodeStatus({}, "gradiente", "done");
    saveLoopResult("gradiente", { acertei: 4, parcial: 0, errei: 0 }, 4);
    for (const e of loadEvents()) {
      expect(e.id).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i);
    }
  });
});
