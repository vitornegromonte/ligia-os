import { describe, it, expect } from "vitest";
import {
  initSession,
  revealRubric,
  recordVerdict,
  isComplete,
  scoreOf,
} from "@/lib/loop-session";

describe("loop-session", () => {
  it("começa na checagem 0, sem rubrica revelada e sem veredictos", () => {
    expect(initSession()).toEqual({ index: 0, revealed: false, verdicts: [] });
  });

  it("revealRubric marca a rubrica como revelada", () => {
    expect(revealRubric(initSession()).revealed).toBe(true);
  });

  it("recordVerdict avança, reseta a rubrica e acumula o veredicto", () => {
    const s = recordVerdict(revealRubric(initSession()), "acertei");
    expect(s).toEqual({ index: 1, revealed: false, verdicts: ["acertei"] });
  });

  it("isComplete quando o índice chega ao total", () => {
    let s = initSession();
    s = recordVerdict(s, "acertei");
    s = recordVerdict(s, "parcial");
    expect(isComplete(s, 2)).toBe(true);
    expect(isComplete(initSession(), 2)).toBe(false);
  });

  it("scoreOf conta por categoria", () => {
    let s = initSession();
    s = recordVerdict(s, "acertei");
    s = recordVerdict(s, "acertei");
    s = recordVerdict(s, "errei");
    expect(scoreOf(s)).toEqual({ acertei: 2, parcial: 0, errei: 1 });
  });
});
