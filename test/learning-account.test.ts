import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { setLearningAccount, learningStorage } from "@/lib/learning-storage";
import { loadUserStatus, saveUserStatus } from "@/lib/progress";
import { saveLoopResult, loadLoopResults } from "@/lib/loop-progress";
import { lerLocal, sincronizar } from "@/lib/sync";

beforeEach(() => { localStorage.clear(); setLearningAccount(null); });
afterEach(() => setLearningAccount(null));

describe("learning account isolation", () => {
  it("does not adopt legacy progress and keeps each account's learning state", () => {
    saveUserStatus({ legacy: "done" });
    setLearningAccount("A");
    expect(loadUserStatus()).toEqual({});
    saveUserStatus({ algebra: "done" });
    saveLoopResult("algebra", { acertei: 1, parcial: 0, errei: 0 }, 1);
    learningStorage.setItem("ligia-pretest:result:v2", JSON.stringify({ version: 2, ts: "2026-01-01" }));
    setLearningAccount("B");
    expect(loadUserStatus()).toEqual({});
    expect(loadLoopResults()).toEqual({});
    expect(lerLocal("B").nivelamento).toBeNull();
    expect(lerLocal("B").eventos).toEqual([]);
    saveUserStatus({ calculus: "in-progress" });
    setLearningAccount("A");
    expect(loadUserStatus()).toEqual({ algebra: "done" });
    expect(loadLoopResults().algebra.acertei).toBe(1);
  });

  it("discards a pull completed after account change, including A to B to A", async () => {
    setLearningAccount("A");
    let finish!: () => void;
    const gate = new Promise<void>(resolve => { finish = resolve; });
    const upsert = vi.fn();
    const sb = { from: (table: string) => {
      const data = table === "student_progress" ? [{ node_id: "stale", status: "done" }] :
        ["pretest_results", "learner_profiles", "nivelamento_rascunhos"].includes(table) ? null : [];
      const chain: Record<string, unknown> = { then: (resolve: (value: unknown) => void) => gate.then(() => resolve({ data, error: null })), upsert };
      for (const method of ["select", "eq", "order", "limit", "maybeSingle"]) chain[method] = () => chain;
      return chain;
    } };
    const pending = sincronizar(sb as never, "A");
    setLearningAccount("B");
    setLearningAccount("A");
    finish();
    expect((await pending).ok).toBe(false);
    expect(loadUserStatus()).toEqual({});
    expect(upsert).not.toHaveBeenCalled();
  });
});
