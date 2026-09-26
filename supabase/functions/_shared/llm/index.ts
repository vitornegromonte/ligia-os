import { LLM_PROVIDER } from "./config.ts";
import type { LLMProvider } from "./types.ts";
import { mockProvider } from "./providers/mock.ts";
import { geminiProvider } from "./providers/gemini.ts";

/** Resolve o adapter ativo por env. Default: mock (sem chave). */
export function getLLM(): LLMProvider {
  return LLM_PROVIDER === "gemini" ? geminiProvider : mockProvider;
}

export { llmConfigured } from "./config.ts";
