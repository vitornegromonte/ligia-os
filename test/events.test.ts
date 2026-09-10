import { describe, it, expect, beforeEach, vi } from "vitest";
import {
  logEvent,
  loadEvents,
  clearEvents,
  novoId,
  MAX_EVENTS,
  type LearningEvent,
} from "@/lib/events";

describe("events", () => {
  beforeEach(() => localStorage.clear());

  it("começa vazio", () => {
    expect(loadEvents()).toEqual([]);
  });

  it("logEvent devolve o evento com shape completo (id, at ISO, type, object, data)", () => {
    const e = logEvent("pretest_completed", "nivelamento", { fronteira: "M1" });
    expect(e).toMatchObject({
      type: "pretest_completed",
      object: "nivelamento",
      data: { fronteira: "M1" },
    });
    expect(typeof e!.id).toBe("string");
    expect(e!.id.length).toBeGreaterThan(0);
    expect(new Date(e!.at).toISOString()).toBe(e!.at); // ISO válido
  });

  it("data é opcional", () => {
    const e = logEvent("dispensa_confirmada", "M0");
    expect(e!.data).toBeUndefined();
    expect(loadEvents()[0].object).toBe("M0");
  });

  it("appenda em ordem de chegada", () => {
    logEvent("pretest_completed", "nivelamento");
    logEvent("node_status_changed", "gradiente", { to: "done" });
    logEvent("loop_completed", "regressao-linear");
    expect(loadEvents().map((e) => e.type)).toEqual([
      "pretest_completed",
      "node_status_changed",
      "loop_completed",
    ]);
  });

  it("ids são únicos entre eventos", () => {
    const ids = new Set(
      Array.from({ length: 50 }, () => logEvent("loop_completed", "x")!.id),
    );
    expect(ids.size).toBe(50);
  });

  it(`ring buffer: estoura MAX_EVENTS (${500}) → descarta os mais antigos`, () => {
    expect(MAX_EVENTS).toBe(500);
    for (let i = 0; i < MAX_EVENTS + 2; i++) {
      logEvent("node_status_changed", `n${i}`);
    }
    const eventos = loadEvents();
    expect(eventos).toHaveLength(MAX_EVENTS);
    expect(eventos[0].object).toBe("n2"); // n0 e n1 caíram
    expect(eventos[eventos.length - 1].object).toBe(`n${MAX_EVENTS + 1}`);
  });

  it("clearEvents zera a trilha", () => {
    logEvent("pretest_completed", "nivelamento");
    clearEvents();
    expect(loadEvents()).toEqual([]);
  });

  it("storage corrompido degrada pra lista vazia", () => {
    localStorage.setItem("ligia-events:v1", "{nao-e-json");
    expect(loadEvents()).toEqual([]);
    expect(() => logEvent("loop_completed", "x")).not.toThrow();
  });

  it("SSR-safe: sem window → loadEvents [] e logEvent/clearEvents no-op", () => {
    vi.stubGlobal("window", undefined);
    try {
      expect(loadEvents()).toEqual([]);
      expect(logEvent("pretest_completed", "nivelamento")).toBeNull();
      expect(() => clearEvents()).not.toThrow();
    } finally {
      vi.unstubAllGlobals();
    }
  });

  it("tipos de evento cobrem o contrato da spec", () => {
    const tipos: LearningEvent["type"][] = [
      "pretest_completed",
      "node_status_changed",
      "loop_completed",
      "dispensa_confirmada",
    ];
    for (const t of tipos) expect(logEvent(t, "obj")).not.toBeNull();
    expect(loadEvents()).toHaveLength(tipos.length);
  });
});

describe("novoId — formato uuid", () => {
  const UUID_V4 = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;

  it("gera uuid v4 válido pelo crypto", () => {
    expect(novoId()).toMatch(UUID_V4);
  });

  it("o fallback sem crypto.randomUUID também é uuid v4 (learning_events.id é coluna uuid)", () => {
    const orig = crypto.randomUUID;
    // @ts-expect-error — simula contexto não-seguro
    crypto.randomUUID = undefined;
    try {
      const ids = Array.from({ length: 50 }, () => novoId());
      for (const id of ids) expect(id).toMatch(UUID_V4);
      expect(new Set(ids).size).toBe(50);
    } finally {
      crypto.randomUUID = orig;
    }
  });
});
