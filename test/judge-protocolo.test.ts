import { describe, it, expect } from "vitest";
import {
  semGabarito,
  lerEventoSSE,
  lerResultadoCompleto,
  lerErroGradio,
  ehCotaEsgotada,
  type ResultadoJuiz,
} from "../supabase/functions/_shared/judge-protocolo.ts";

const TESTE_COM_CODIGO = {
  name: "Basic values",
  code: "import torch\nx = torch.tensor([-2., 1.])\nassert torch.allclose(relu(x), torch.tensor([0., 1.]))",
  passed: true,
  time_ms: 0.65,
  error_msg: null,
  error_traceback: null,
  stdout: "",
  stderr: "",
};

describe("semGabarito — o invariante do proxy", () => {
  it("remove o código-fonte de todo teste", () => {
    const limpo = semGabarito({ success: true, tests: [TESTE_COM_CODIGO, { ...TESTE_COM_CODIGO, name: "2-D" }] });
    for (const t of limpo.tests!) expect(t).not.toHaveProperty("code");
  });

  it("nenhum trecho do teste sobrevive à serialização", () => {
    // Checagem por conteúdo, não por chave: pega o caso em que o código foi
    // copiado para outro campo em vez de removido.
    const limpo = semGabarito({ success: true, tests: [TESTE_COM_CODIGO] });
    expect(JSON.stringify(limpo)).not.toContain("torch.allclose");
  });

  it("preserva tudo o que o aluno precisa ver", () => {
    const limpo = semGabarito({
      success: false,
      passed: 1,
      total: 4,
      total_time_ms: 103,
      stdout: "saída",
      stderr: "erro",
      tests: [{ ...TESTE_COM_CODIGO, passed: false, error_msg: "Wrong Answer", error_traceback: "Traceback..." }],
    });
    expect(limpo.passed).toBe(1);
    expect(limpo.total).toBe(4);
    expect(limpo.total_time_ms).toBe(103);
    const t = limpo.tests![0];
    expect(t.name).toBe("Basic values");
    expect(t.error_msg).toBe("Wrong Answer");
    // O traceback é a informação mais útil ao aluno e a UI antiga o descartava.
    expect(t.error_traceback).toBe("Traceback...");
  });

  it("tolera resultado sem lista de testes (falha de compilação)", () => {
    const r: ResultadoJuiz = { success: false, error: "SyntaxError", traceback: "..." };
    expect(semGabarito(r)).toEqual(r);
  });
});

describe("lerEventoSSE", () => {
  it("lê o último evento e dado do corpo", () => {
    const { evento, dado } = lerEventoSSE('event: complete\ndata: ["{\\"success\\":true}"]\n');
    expect(evento).toBe("complete");
    expect(dado).toEqual(['{"success":true}']);
  });

  it("último vence quando há vários eventos", () => {
    const corpo = "event: generating\ndata: null\n\nevent: complete\ndata: [\"x\"]\n";
    expect(lerEventoSSE(corpo).evento).toBe("complete");
  });

  it("data não-JSON vira string crua em vez de explodir", () => {
    expect(lerEventoSSE("event: error\ndata: texto solto\n").dado).toBe("texto solto");
  });

  it("corpo sem SSE devolve evento nulo", () => {
    expect(lerEventoSSE("<!doctype html>").evento).toBeNull();
  });
});

describe("lerResultadoCompleto", () => {
  it("desembrulha o array cujo item 0 é string JSON", () => {
    expect(lerResultadoCompleto(['{"success":true,"passed":4,"total":4}'])).toMatchObject({
      success: true,
      passed: 4,
    });
  });

  it("aceita objeto direto", () => {
    expect(lerResultadoCompleto({ success: false })).toEqual({ success: false });
  });

  it("recusa resposta vazia em vez de devolver lixo", () => {
    expect(() => lerResultadoCompleto(null)).toThrow(/vazia/);
    expect(() => lerResultadoCompleto([])).toThrow(/vazia/);
  });
});

describe("lerErroGradio — o bug do envelope de erro", () => {
  it("extrai a mensagem do objeto de erro", () => {
    // Este envelope é OBJETO, não array. O cliente antigo o devolvia como se
    // fosse resultado do juiz: `success` vinha undefined e a tela mostrava
    // "Wrong Answer — undefined/undefined em 0ms", gravando linha lixo.
    const envelope = { error: "Value: nao_existe is not in the list of choices", duration: 10, visible: true };
    expect(lerErroGradio(envelope)).toBe("Value: nao_existe is not in the list of choices");
  });

  it("tem mensagem de fallback quando o envelope não traz uma", () => {
    expect(lerErroGradio({})).toMatch(/recusou/);
    expect(lerErroGradio(null)).toMatch(/recusou/);
  });
});

describe("ehCotaEsgotada", () => {
  it("reconhece o estouro de ZeroGPU", () => {
    expect(ehCotaEsgotada({ success: false, error: "ZeroGPU quota exceeded" })).toBe(true);
  });

  it("não confunde falha comum de teste com cota", () => {
    expect(ehCotaEsgotada({ success: false, error: "Wrong Answer" })).toBe(false);
    expect(ehCotaEsgotada({ success: true })).toBe(false);
  });
});
