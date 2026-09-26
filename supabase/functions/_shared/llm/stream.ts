import { fromGeminiResponse } from "./providers/gemini.ts";

/** Extrai o texto de uma linha SSE (`data: {...}`) do Gemini. null se não-dado. Puro. */
export function sseDataText(line: string): string | null {
  const t = line.trim();
  if (!t.startsWith("data:")) return null;
  const json = t.slice(5).trim();
  if (!json || json === "[DONE]") return null;
  try {
    return fromGeminiResponse(JSON.parse(json)) || null;
  } catch {
    return null;
  }
}

/** Embrulha um AsyncIterable<string> num Response de texto em streaming. */
export function streamResponse(iter: AsyncIterable<string>): Response {
  const encoder = new TextEncoder();
  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      try {
        for await (const delta of iter) controller.enqueue(encoder.encode(delta));
      } catch {
        // erro no meio do stream: o que já saiu fica; encerra.
      } finally {
        controller.close();
      }
    },
  });
  return new Response(stream, {
    headers: { "Content-Type": "text/plain; charset=utf-8", "Cache-Control": "no-store" },
  });
}

/**
 * Como `streamResponse`, mas PUXA o 1º chunk antes de devolver o Response. Assim
 * erros "lazy" (a fetch do provedor só dispara na 1ª iteração — ex.: 429/quota)
 * viram uma rejeição que a ROTA trata como status HTTP real, em vez de um 200 com
 * corpo vazio (indistinguível de sucesso). Erros DEPOIS do 1º chunk encerram o
 * stream com o que já saiu, como antes.
 */
export async function streamResponsePrimed(iter: AsyncIterable<string>): Promise<Response> {
  const iterator = iter[Symbol.asyncIterator]();
  const first = await iterator.next(); // pode lançar (ex.: 429) → a rota trata
  const encoder = new TextEncoder();
  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      try {
        if (!first.done) controller.enqueue(encoder.encode(first.value));
        for (;;) {
          const { done, value } = await iterator.next();
          if (done) break;
          controller.enqueue(encoder.encode(value));
        }
      } catch {
        // erro no meio do stream (após o 1º chunk): o que já saiu fica; encerra.
      } finally {
        controller.close();
      }
    },
  });
  return new Response(stream, {
    headers: { "Content-Type": "text/plain; charset=utf-8", "Cache-Control": "no-store" },
  });
}

/** Reconhece erro de cota/limite de taxa (429) a partir da mensagem do provedor. */
export function isQuotaError(err: unknown): boolean {
  const m = err instanceof Error ? err.message : String(err);
  return /\b429\b|RESOURCE_EXHAUSTED|quota|rate.?limit/i.test(m);
}
