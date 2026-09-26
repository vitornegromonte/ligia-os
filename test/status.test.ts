import { describe, it, expect } from "vitest";
import {
  effectiveState,
  doneSetFrom,
  STATE_META,
  type UserStatus,
} from "@/lib/status";

const node = (id: string, prereqs: string[] = []) => ({ id, prereqs });

describe("doneSetFrom", () => {
  it("coleta só os ids marcados como done", () => {
    const us: UserStatus = { a: "done", b: "in-progress", c: "done" };
    expect(doneSetFrom(us)).toEqual(new Set(["a", "c"]));
  });

  it("é vazio quando nada está done", () => {
    expect(doneSetFrom({})).toEqual(new Set());
    expect(doneSetFrom({ a: "in-progress" })).toEqual(new Set());
  });
});

describe("effectiveState", () => {
  it("respeita o estado explícito (done / in-progress) acima dos prereqs", () => {
    const us: UserStatus = { a: "done", b: "in-progress" };
    expect(effectiveState(node("a"), us, doneSetFrom(us))).toBe("done");
    // 'b' tem prereq não-done, mas o explícito in-progress prevalece
    expect(effectiveState(node("b", ["x"]), us, doneSetFrom(us))).toBe("in-progress");
  });

  it("é 'available' quando não tem prereqs e nada foi marcado", () => {
    expect(effectiveState(node("a"), {}, new Set())).toBe("available");
  });

  it("é 'available' quando todos os prereqs estão done", () => {
    const us: UserStatus = { p1: "done", p2: "done" };
    expect(effectiveState(node("a", ["p1", "p2"]), us, doneSetFrom(us))).toBe("available");
  });

  it("é 'locked' quando algum prereq não está done", () => {
    const us: UserStatus = { p1: "done" };
    expect(effectiveState(node("a", ["p1", "p2"]), us, doneSetFrom(us))).toBe("locked");
    // in-progress de um prereq NÃO conta como done → continua locked
    const us2: UserStatus = { p1: "in-progress" };
    expect(effectiveState(node("a", ["p1"]), us2, doneSetFrom(us2))).toBe("locked");
  });
});

describe("STATE_META", () => {
  it("cobre os 4 estados com emoji + label", () => {
    for (const k of ["done", "in-progress", "available", "locked"] as const) {
      expect(STATE_META[k]).toMatchObject({ emoji: expect.any(String), label: expect.any(String) });
    }
  });
});
