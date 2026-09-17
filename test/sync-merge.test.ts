import { describe, it, expect } from "vitest";
import {
  mergeProgresso,
  mergeEventos,
  mergeLoops,
  mergeNivelamento,
  mergeEstado,
  eventosNovos,
  type EstadoSincronizavel,
} from "@/lib/sync-merge";
import { MAX_EVENTS, type LearningEvent } from "@/lib/events";
import type { LoopResult } from "@/lib/loop-progress";
import type { PretestResultV2 } from "@/lib/pretest-storage";

const evt = (id: string, at: string): LearningEvent => ({
  id,
  at,
  type: "node_status_changed",
  object: "regressao-linear",
});

const loop = (at: string, extra: Partial<LoopResult> = {}): LoopResult => ({
  at,
  times: 1,
  streak: 1,
  acertei: 5,
  parcial: 0,
  errei: 0,
  total: 5,
  ...extra,
});

const nivelamento = (ts: string): PretestResultV2 =>
  ({
    version: 2,
    contentVersion: "2",
    matriz: {},
    resultados: {},
    autoRelato: {},
    recomendacao: { fronteira: "M1", estados: {}, starNodes: [], dispensaveisSugeridos: [], mensagem: "" },
    dispensasConfirmadas: [],
    ts,
  }) as unknown as PretestResultV2;

describe("mergeProgresso — monotônico", () => {
  it("une os nós dos dois lados", () => {
    expect(mergeProgresso({ a: "done" }, { b: "in-progress" })).toEqual({
      a: "done",
      b: "in-progress",
    });
  });

  it("done vence in-progress, venha de qual lado vier", () => {
    expect(mergeProgresso({ a: "done" }, { a: "in-progress" })).toEqual({ a: "done" });
    expect(mergeProgresso({ a: "in-progress" }, { a: "done" })).toEqual({ a: "done" });
  });

  it("nunca apaga um nó que existe só de um lado (sync não regride progresso)", () => {
    expect(mergeProgresso({ a: "done" }, {})).toEqual({ a: "done" });
    expect(mergeProgresso({}, { a: "done" })).toEqual({ a: "done" });
  });
});

describe("mergeEventos — união por id", () => {
  it("une sem duplicar o mesmo id", () => {
    const a = [evt("1", "2026-08-01T10:00:00.000Z"), evt("2", "2026-08-01T11:00:00.000Z")];
    const b = [evt("2", "2026-08-01T11:00:00.000Z"), evt("3", "2026-08-01T12:00:00.000Z")];
    expect(mergeEventos(a, b).map((e) => e.id)).toEqual(["1", "2", "3"]);
  });

  it("ordena do mais antigo pro mais recente", () => {
    const a = [evt("tarde", "2026-08-02T10:00:00.000Z")];
    const b = [evt("cedo", "2026-08-01T10:00:00.000Z")];
    expect(mergeEventos(a, b).map((e) => e.id)).toEqual(["cedo", "tarde"]);
  });

  it("respeita o teto do ring buffer, descartando os mais antigos", () => {
    const muitos = Array.from({ length: MAX_EVENTS + 10 }, (_, i) =>
      evt(`e${i}`, new Date(Date.UTC(2026, 0, 1, 0, i)).toISOString()),
    );
    const merged = mergeEventos(muitos, []);
    expect(merged).toHaveLength(MAX_EVENTS);
    // sobraram os MAIS RECENTES
    expect(merged[merged.length - 1].id).toBe(`e${MAX_EVENTS + 9}`);
  });

  it("eventosNovos devolve só o que o remoto ainda não tem", () => {
    const merged = [evt("1", "2026-08-01T10:00:00.000Z"), evt("2", "2026-08-01T11:00:00.000Z")];
    const remoto = [evt("1", "2026-08-01T10:00:00.000Z")];
    expect(eventosNovos(merged, remoto).map((e) => e.id)).toEqual(["2"]);
  });
});

describe("mergeLoops — placar mais recente vence", () => {
  it("mantém o registro com o 'at' mais novo", () => {
    const local = { overfitting: loop("2026-08-02T10:00:00.000Z", { times: 3 }) };
    const remoto = { overfitting: loop("2026-08-01T10:00:00.000Z", { times: 9 }) };
    expect(mergeLoops(local, remoto).overfitting.times).toBe(3);
    expect(mergeLoops(remoto, local).overfitting.times).toBe(3);
  });

  it("une conceitos praticados só de um lado", () => {
    const merged = mergeLoops(
      { a: loop("2026-08-01T10:00:00.000Z") },
      { b: loop("2026-08-01T10:00:00.000Z") },
    );
    expect(Object.keys(merged).sort()).toEqual(["a", "b"]);
  });
});

describe("mergeNivelamento — rodada mais recente vence", () => {
  it("escolhe a de ts maior", () => {
    const velho = nivelamento("2026-08-01T10:00:00.000Z");
    const novo = nivelamento("2026-08-05T10:00:00.000Z");
    expect(mergeNivelamento(velho, novo)?.ts).toBe(novo.ts);
    expect(mergeNivelamento(novo, velho)?.ts).toBe(novo.ts);
  });

  it("tolera lado ausente", () => {
    const n = nivelamento("2026-08-01T10:00:00.000Z");
    expect(mergeNivelamento(n, null)).toBe(n);
    expect(mergeNivelamento(null, n)).toBe(n);
    expect(mergeNivelamento(null, null)).toBeNull();
  });

  it("mesma rodada: vence a versão com mais resultados (a etapa 2 só acrescenta)", () => {
    const antes = { ...nivelamento("2026-09-17T10:00:00.000Z"), resultados: { a: "acerto" } };
    const depois = {
      ...antes,
      resultados: { a: "acerto", b: "erro" },
    } as unknown as PretestResultV2;
    expect(mergeNivelamento(antes as PretestResultV2, depois)?.resultados).toEqual(depois.resultados);
    expect(mergeNivelamento(depois, antes as PretestResultV2)?.resultados).toEqual(depois.resultados);
  });

  it("mesma rodada: dispensas confirmadas se unem, em ordem estável", () => {
    const base = nivelamento("2026-09-17T10:00:00.000Z");
    const a = { ...base, dispensasConfirmadas: ["M1"] } as PretestResultV2;
    const b = { ...base, dispensasConfirmadas: ["M0"] } as PretestResultV2;
    expect(mergeNivelamento(a, b)).toEqual(mergeNivelamento(b, a));
    expect(mergeNivelamento(a, b)?.dispensasConfirmadas).toEqual(["M0", "M1"]);
  });
});

describe("mergeEstado", () => {
  it("é comutativo no resultado (a ordem dos lados não muda o estado final)", () => {
    const a: EstadoSincronizavel = {
      progresso: { x: "done" },
      nivelamento: nivelamento("2026-08-02T10:00:00.000Z"),
      eventos: [evt("1", "2026-08-01T10:00:00.000Z")],
      loops: { c: loop("2026-08-02T10:00:00.000Z", { times: 2 }) },
    };
    const b: EstadoSincronizavel = {
      progresso: { x: "in-progress", y: "done" },
      nivelamento: nivelamento("2026-08-01T10:00:00.000Z"),
      eventos: [evt("2", "2026-08-03T10:00:00.000Z")],
      loops: { c: loop("2026-08-01T10:00:00.000Z", { times: 7 }) },
    };
    expect(mergeEstado(a, b)).toEqual(mergeEstado(b, a));
  });

  it("é idempotente: mesclar com o próprio resultado não muda nada", () => {
    const e: EstadoSincronizavel = {
      progresso: { x: "done" },
      nivelamento: nivelamento("2026-08-02T10:00:00.000Z"),
      eventos: [evt("1", "2026-08-01T10:00:00.000Z")],
      loops: { c: loop("2026-08-02T10:00:00.000Z") },
    };
    expect(mergeEstado(e, e)).toEqual(e);
  });
});
