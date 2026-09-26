import { describe, it, expect } from "vitest";
import { getLLM } from "../supabase/functions/_shared/llm/index.ts";
import { llmConfigured } from "../supabase/functions/_shared/llm/config.ts";
import { toGeminiBody, fromGeminiResponse } from "../supabase/functions/_shared/llm/providers/gemini.ts";
import { sseDataText, streamResponsePrimed, isQuotaError } from "../supabase/functions/_shared/llm/stream.ts";

describe("camada LLM", () => {
  it("getLLM() devolve um provider com complete()", () => {
    const llm = getLLM();
    expect(typeof llm.complete).toBe("function");
    expect(typeof llm.name).toBe("string");
  });

  it("llmConfigured é boolean (false sem chave no ambiente de teste)", () => {
    expect(typeof llmConfigured).toBe("boolean");
  });

  it("o mock responde de forma determinística", async () => {
    const out = await getLLM().complete([{ role: "user", content: "oi" }]);
    expect(out).toContain("[mock]");
    expect(out).toContain("user:oi");
  });
});

describe("adapter Gemini (helpers puros)", () => {
  it("toGeminiBody separa system→systemInstruction e user→contents", () => {
    const body = toGeminiBody([
      { role: "system", content: "regras" },
      { role: "user", content: "pergunta" },
    ]);
    expect(body.systemInstruction).toEqual({ parts: [{ text: "regras" }] });
    expect(body.contents).toEqual([{ role: "user", parts: [{ text: "pergunta" }] }]);
    expect(body.generationConfig.thinkingConfig).toEqual({ thinkingBudget: 0 });
  });

  it("toGeminiBody mapeia assistant→model e mantém a ordem", () => {
    const body = toGeminiBody([
      { role: "system", content: "regras" },
      { role: "user", content: "oi" },
      { role: "assistant", content: "olá" },
      { role: "user", content: "e agora?" },
    ]);
    expect(body.contents).toEqual([
      { role: "user", parts: [{ text: "oi" }] },
      { role: "model", parts: [{ text: "olá" }] },
      { role: "user", parts: [{ text: "e agora?" }] },
    ]);
  });

  it("fromGeminiResponse concatena o texto das parts", () => {
    const data = { candidates: [{ content: { parts: [{ text: "Oi" }, { text: " mundo" }] } }] };
    expect(fromGeminiResponse(data)).toBe("Oi mundo");
  });

  it("fromGeminiResponse devolve '' quando a forma é inesperada", () => {
    expect(fromGeminiResponse({})).toBe("");
    expect(fromGeminiResponse(null)).toBe("");
  });
});

describe("streaming", () => {
  it("mock.stream() emite deltas que concatenam", async () => {
    let acc = "";
    for await (const d of getLLM().stream([{ role: "user", content: "oi" }])) acc += d;
    expect(acc).toContain("[mock]");
    expect(acc).toContain("user:oi");
  });

  it("sseDataText extrai o texto de uma linha data: do Gemini", () => {
    const line = 'data: {"candidates":[{"content":{"parts":[{"text":"oi"}]}}]}';
    expect(sseDataText(line)).toBe("oi");
    expect(sseDataText("event: x")).toBeNull();
    expect(sseDataText("data: [DONE]")).toBeNull();
  });

  it("streamResponsePrimed streama 1º chunk + resto quando ok", async () => {
    async function* g() {
      yield "a";
      yield "b";
      yield "c";
    }
    const res = await streamResponsePrimed(g());
    expect(await res.text()).toBe("abc");
  });

  it("streamResponsePrimed PROPAGA erro do 1º chunk (ex.: 429) em vez de 200 vazio", async () => {
    // Gerador sem yield é o cenário: a cota estoura antes do 1º chunk.
    // eslint-disable-next-line require-yield
    async function* boom(): AsyncGenerator<string> {
      throw new Error("Gemini 429");
    }
    await expect(streamResponsePrimed(boom())).rejects.toThrow("429");
  });

  it("isQuotaError reconhece 429 / RESOURCE_EXHAUSTED / quota", () => {
    expect(isQuotaError(new Error("Gemini 429"))).toBe(true);
    expect(isQuotaError(new Error("RESOURCE_EXHAUSTED"))).toBe(true);
    expect(isQuotaError(new Error("Gemini 503"))).toBe(false);
    expect(isQuotaError("rate limit hit")).toBe(true);
  });
});
