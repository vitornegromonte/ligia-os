import { env } from "../env.ts";

/**
 * Config da camada de LLM. A chave é SEGREDO — mora em
 * `supabase secrets set GEMINI_API_KEY=...` e nunca numa variável `VITE_*`,
 * que iria para o bundle do browser.
 *
 * `llmConfigured` decide se a correção ao vivo está disponível; sem provedor
 * real, a UI cai na auto-avaliação contra a rubrica.
 */
export const GEMINI_API_KEY = env("GEMINI_API_KEY");
export const GEMINI_MODEL = env("GEMINI_MODEL", "gemini-flash-latest");
export const LLM_PROVIDER = env("LLM_PROVIDER", GEMINI_API_KEY ? "gemini" : "mock");

/** Há um provedor REAL de LLM utilizável? (mock não conta) */
export const llmConfigured = LLM_PROVIDER === "gemini" && GEMINI_API_KEY.length > 0;
