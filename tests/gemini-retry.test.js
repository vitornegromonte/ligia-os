import { afterEach, expect, it, vi } from "vitest";
import { geminiProvider } from "../supabase/functions/_shared/llm/providers/gemini.ts";

afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

it("repete um 503 transitório antes de devolver a resposta em streaming", async () => {
  vi.useFakeTimers();
  const fetchMock = vi.fn()
    .mockResolvedValueOnce(new Response(null, { status: 503 }))
    .mockResolvedValueOnce(new Response('data: {"candidates":[{"content":{"parts":[{"text":"acertei"}]}}]}\n\n', { status: 200 }));
  vi.stubGlobal("fetch", fetchMock);

  const chunks = [];
  const run = (async () => {
    for await (const chunk of geminiProvider.stream([{ role: "user", content: "teste" }])) {
      chunks.push(chunk);
    }
  })();
  await vi.advanceTimersByTimeAsync(2_000);
  await run;

  expect(fetchMock).toHaveBeenCalledTimes(2);
  expect(chunks).toEqual(["acertei"]);
});
