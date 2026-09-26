import { describe, it, expect } from "vitest";
import { streamText } from "@/lib/stream";

/** Monta um Response cujo corpo entrega os pedaços na ordem dada. */
function respostaEmPedacos(pedacos: string[]): Response {
  const enc = new TextEncoder();
  const body = new ReadableStream<Uint8Array>({
    start(controller) {
      for (const p of pedacos) controller.enqueue(enc.encode(p));
      controller.close();
    },
  });
  return new Response(body);
}

describe("streamText", () => {
  it("devolve o texto completo e chama onAcc com o acumulado a cada chunk", async () => {
    const vistos: string[] = [];
    const full = await streamText(respostaEmPedacos(["oi", " ", "mundo"]), (acc) =>
      vistos.push(acc),
    );

    expect(full).toBe("oi mundo");
    // acumulado, não incremental — é o que os componentes renderizam direto
    expect(vistos).toEqual(["oi", "oi ", "oi mundo"]);
  });

  it("corpo vazio devolve string vazia sem chamar onAcc", async () => {
    const vistos: string[] = [];
    const full = await streamText(respostaEmPedacos([]), (acc) => vistos.push(acc));

    expect(full).toBe("");
    expect(vistos).toEqual([]);
  });

  it("não parte caracteres multibyte partidos entre dois chunks", async () => {
    // "ç" em UTF-8 é 0xC3 0xA7 — aqui os bytes chegam em chunks diferentes.
    const body = new ReadableStream<Uint8Array>({
      start(c) {
        c.enqueue(new Uint8Array([0x61, 0xc3])); // "a" + 1º byte do ç
        c.enqueue(new Uint8Array([0xa7, 0x6f])); // 2º byte do ç + "o"
        c.close();
      },
    });

    expect(await streamText(new Response(body), () => {})).toBe("aço");
  });
});
