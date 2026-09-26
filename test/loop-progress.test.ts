import { describe, it, expect, beforeEach } from "vitest";
import {
  loadLoopResults,
  getLoopResult,
  saveLoopResult,
  loopMastery,
  isLoopCompleted,
  reviewIntervalDays,
  dueForReview,
  daysSince,
} from "@/lib/loop-progress";

describe("loop-progress", () => {
  beforeEach(() => localStorage.clear());

  it("começa vazio", () => {
    expect(loadLoopResults()).toEqual({});
    expect(getLoopResult("x")).toBeNull();
    expect(isLoopCompleted("x")).toBe(false);
  });

  it("salva e lê o placar real de um conceito", () => {
    saveLoopResult("regressao-linear", { acertei: 3, parcial: 1, errei: 0 }, 4);
    const r = getLoopResult("regressao-linear");
    expect(r).toMatchObject({ acertei: 3, parcial: 1, errei: 0, total: 4 });
    expect(typeof r!.at).toBe("string");
    expect(isLoopCompleted("regressao-linear")).toBe(true);
  });

  it("sobrescreve no replay (último placar vence)", () => {
    saveLoopResult("a", { acertei: 0, parcial: 0, errei: 2 }, 2);
    saveLoopResult("a", { acertei: 2, parcial: 0, errei: 0 }, 2);
    expect(getLoopResult("a")).toMatchObject({ acertei: 2, errei: 0 });
  });

  it("loopMastery: dominado exige ≥80% ponderado E nenhum 'errei'", () => {
    expect(loopMastery({ acertei: 4, parcial: 0, errei: 0 }, 4)).toBe("dominado"); // 100%
    expect(loopMastery({ acertei: 4, parcial: 1, errei: 0 }, 5)).toBe("dominado"); // (4+0.5)/5 = 0.9
    expect(loopMastery({ acertei: 4, parcial: 0, errei: 1 }, 5)).toBe("praticado"); // tem 'errei'
    expect(loopMastery({ acertei: 2, parcial: 3, errei: 0 }, 5)).toBe("praticado"); // 0.7 < 0.8
    expect(loopMastery({ acertei: 0, parcial: 0, errei: 0 }, 0)).toBe("praticado");
  });

  it("saveLoopResult incrementa 'times' a cada prática", () => {
    saveLoopResult("a", { acertei: 1, parcial: 0, errei: 1 }, 2);
    saveLoopResult("a", { acertei: 2, parcial: 0, errei: 0 }, 2);
    expect(getLoopResult("a")!.times).toBe(2);
  });

  it("saveLoopResult acumula streak de domínios consecutivos e reinicia se não dominar", () => {
    saveLoopResult("a", { acertei: 4, parcial: 0, errei: 0 }, 4); // dominou → streak 1
    expect(getLoopResult("a")!.streak).toBe(1);
    saveLoopResult("a", { acertei: 4, parcial: 0, errei: 0 }, 4); // dominou → streak 2
    expect(getLoopResult("a")!.streak).toBe(2);
    saveLoopResult("a", { acertei: 1, parcial: 0, errei: 3 }, 4); // não dominou → reinicia
    expect(getLoopResult("a")!.streak).toBe(0);
  });

  it("reviewIntervalDays: não-dominado=1 dia; dominado expande pelo streak", () => {
    const dom = (streak: number) => ({
      at: "",
      times: streak,
      streak,
      acertei: 4,
      parcial: 0,
      errei: 0,
      total: 4,
    });
    const fraco = { at: "", times: 1, streak: 0, acertei: 1, parcial: 0, errei: 3, total: 4 };
    expect(reviewIntervalDays(fraco)).toBe(1); // praticado
    expect(reviewIntervalDays(dom(1))).toBe(3); // 1º domínio
    expect(reviewIntervalDays(dom(2))).toBe(7); // 2º seguido
    expect(reviewIntervalDays(dom(99))).toBe(90); // teto
  });

  it("dueForReview compara com o intervalo desde a última prática", () => {
    const DAY = 24 * 60 * 60 * 1000;
    const now = 1_000_000_000_000;
    const base = { times: 1, streak: 1, acertei: 4, parcial: 0, errei: 0, total: 4 };
    const fresh = { at: new Date(now - 1 * DAY).toISOString(), ...base };
    const stale = { at: new Date(now - 10 * DAY).toISOString(), ...base };
    expect(dueForReview(fresh, now)).toBe(false); // 1 dia < intervalo 3
    expect(dueForReview(stale, now)).toBe(true); // 10 dias > 3
  });

  it("daysSince conta dias inteiros", () => {
    const DAY = 24 * 60 * 60 * 1000;
    const now = 1_000_000_000_000;
    expect(daysSince(new Date(now - 5 * DAY).toISOString(), now)).toBe(5);
  });
});
