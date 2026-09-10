/**
 * Config da camada de LLM (server-side). A chave é SEGREDO — nunca NEXT_PUBLIC_,
 * nunca exposta ao cliente. `llmConfigured` decide se a feature usa grading ao
 * vivo; sem provedor real, a UI cai na autoavaliação (Fatia 1).
 */
export const GEMINI_API_KEY = process.env.GEMINI_API_KEY ?? "";
export const GEMINI_MODEL = process.env.GEMINI_MODEL ?? "gemini-flash-latest";
export const LLM_PROVIDER = process.env.LLM_PROVIDER ?? (GEMINI_API_KEY ? "gemini" : "mock");

/** Há um provedor REAL de LLM utilizável? (mock não conta) */
export const llmConfigured = LLM_PROVIDER === "gemini" && GEMINI_API_KEY.length > 0;
