import { describe, it, expect } from "vitest";
import { buildChatMessages } from "../supabase/functions/_shared/loop-chat.ts";

describe("loop-chat", () => {
  it("monta system com o conceito + freio + contexto e anexa o histórico", () => {
    const msgs = buildChatMessages("Mecanismo de Atenção", "BASE XYZ", [
      { role: "user", content: "o que é a key?" },
      { role: "assistant", content: "a key é..." },
      { role: "user", content: "e a query?" },
    ]);
    expect(msgs[0].role).toBe("system");
    const sys = msgs[0].content;
    expect(sys).toContain("Mecanismo de Atenção");
    expect(sys.toLowerCase()).toContain("não entregue"); // freio anti-vazamento
    expect(sys).toContain("BASE XYZ"); // grounding
    expect(msgs.slice(1)).toEqual([
      { role: "user", content: "o que é a key?" },
      { role: "assistant", content: "a key é..." },
      { role: "user", content: "e a query?" },
    ]);
  });

  it("funciona sem contexto (não quebra)", () => {
    const msgs = buildChatMessages("KNN", undefined, [{ role: "user", content: "oi" }]);
    expect(msgs[0].content).not.toContain("CONTEXTO DE REFERÊNCIA");
    expect(msgs).toHaveLength(2);
  });
});
