import type { LLMProvider } from "../types.ts";

/** Adapter determinístico p/ dev e testes (não faz rede). */
export const mockProvider: LLMProvider = {
  name: "mock",
  async complete(messages) {
    return `[mock] ${messages.map((m) => `${m.role}:${m.content}`).join(" | ")}`;
  },
  async *stream(messages) {
    yield "[mock] ";
    yield messages.map((m) => `${m.role}:${m.content}`).join(" | ");
  },
};
