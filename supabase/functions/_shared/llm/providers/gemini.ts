import type { LLMProvider, LLMMessage, LLMOptions } from "../types.ts";
import { GEMINI_API_KEY, GEMINI_MODEL } from "../config.ts";

const ENDPOINT = (model: string) =>
  `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`;

const ENDPOINT_STREAM = (model: string) =>
  `https://generativelanguage.googleapis.com/v1beta/models/${model}:streamGenerateContent?alt=sse`;

/** Mapeia mensagens (system/user) → corpo da API Gemini. Puro/testável. */
export function toGeminiBody(messages: LLMMessage[], opts?: LLMOptions) {
  const system = messages
    .filter((m) => m.role === "system")
    .map((m) => m.content)
    .join("\n\n");
  const contents = messages
    .filter((m) => m.role !== "system")
    .map((m) => ({
      role: m.role === "assistant" ? "model" : "user",
      parts: [{ text: m.content }],
    }));
  return {
    ...(system ? { systemInstruction: { parts: [{ text: system }] } } : {}),
    contents,
    generationConfig: {
      temperature: opts?.temperature ?? 0.2,
      maxOutputTokens: opts?.maxOutputTokens ?? 512,
      thinkingConfig: { thinkingBudget: 0 }, // sem "thinking" — validado, ~13× mais barato
    },
  };
}

/** Extrai o texto concatenado da resposta do Gemini. Puro/testável. */
export function fromGeminiResponse(data: unknown): string {
  const parts = (data as { candidates?: { content?: { parts?: { text?: string }[] } }[] })
    ?.candidates?.[0]?.content?.parts;
  if (!Array.isArray(parts)) return "";
  return parts.map((p) => (typeof p?.text === "string" ? p.text : "")).join("");
}

export const geminiProvider: LLMProvider = {
  name: "gemini",
  async complete(messages, opts) {
    const res = await fetch(ENDPOINT(GEMINI_MODEL), {
      method: "POST",
      headers: { "Content-Type": "application/json", "X-goog-api-key": GEMINI_API_KEY },
      body: JSON.stringify(toGeminiBody(messages, opts)),
    });
    if (!res.ok) {
      throw new Error(`Gemini ${res.status}: ${(await res.text()).slice(0, 300)}`);
    }
    return fromGeminiResponse(await res.json());
  },
  async *stream(messages, opts) {
    const res = await fetch(ENDPOINT_STREAM(GEMINI_MODEL), {
      method: "POST",
      headers: { "Content-Type": "application/json", "X-goog-api-key": GEMINI_API_KEY },
      body: JSON.stringify(toGeminiBody(messages, opts)),
    });
    if (!res.ok || !res.body) throw new Error(`Gemini ${res.status}`);
    const { sseDataText } = await import("../stream.ts");
    const reader = res.body.getReader();
    const decoder = new TextDecoder();
    let buf = "";
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      buf += decoder.decode(value, { stream: true });
      const lines = buf.split("\n");
      buf = lines.pop() ?? "";
      for (const line of lines) {
        const text = sseDataText(line);
        if (text) yield text;
      }
    }
    const tail = sseDataText(buf);
    if (tail) yield tail;
  },
};
