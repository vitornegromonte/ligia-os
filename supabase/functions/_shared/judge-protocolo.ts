/**
 * Protocolo do juiz de código — as partes puras, para serem testáveis.
 *
 * O entry point (functions/judge/index.ts) faz rede e I/O; aqui ficam as duas
 * decisões que precisam estar certas: o que sai da resposta antes de ela
 * chegar ao aluno, e como se lê o envelope do Gradio.
 */

export type TesteJuiz = {
  name: string;
  /** CÓDIGO-FONTE do teste. É o gabarito — removido antes de sair daqui. */
  code?: string;
  passed: boolean;
  time_ms: number;
  error_msg: string | null;
  error_traceback: string | null;
  stdout: string;
  stderr: string;
};

export type ResultadoJuiz = {
  success: boolean;
  passed?: number;
  total?: number;
  total_time_ms?: number;
  tests?: TesteJuiz[];
  stdout?: string;
  stderr?: string;
  error?: string;
  traceback?: string;
};

/**
 * Remove o código-fonte dos testes.
 *
 * O juiz devolve `tests[].code` com o teste inteiro. Chamado direto do
 * browser, isso punha o gabarito no devtools a cada execução — e o cliente
 * ainda o gravava em `submissions.results`, então o banco acumulava cópias.
 */
export function semGabarito(r: ResultadoJuiz): ResultadoJuiz {
  if (!Array.isArray(r.tests)) return r;
  return {
    ...r,
    tests: r.tests.map(({ code: _code, ...resto }) => resto as TesteJuiz),
  };
}

export type EventoSSE = { evento: string | null; dado: unknown };

/**
 * Lê o último `event:`/`data:` de um corpo SSE do Gradio.
 *
 * Último-vence: o stream termina num evento terminal, e é ele que interessa.
 */
export function lerEventoSSE(texto: string): EventoSSE {
  let evento: string | null = null;
  let dado: unknown = null;
  for (const linha of texto.split("\n")) {
    if (linha.startsWith("event: ")) evento = linha.slice(7).trim();
    if (linha.startsWith("data: ")) {
      const cru = linha.slice(6);
      try {
        dado = JSON.parse(cru);
      } catch {
        dado = cru;
      }
    }
  }
  return { evento, dado };
}

/**
 * Extrai o resultado de um evento `complete`.
 *
 * O Gradio embrulha o retorno num array cujo item 0 é uma STRING JSON.
 */
export function lerResultadoCompleto(dado: unknown): ResultadoJuiz {
  const bruto = Array.isArray(dado) ? dado[0] : dado;
  if (!bruto) throw new Error("resposta vazia do juiz");
  return (typeof bruto === "string" ? JSON.parse(bruto) : bruto) as ResultadoJuiz;
}

/**
 * Mensagem de um evento `error` do Gradio.
 *
 * O envelope de erro é um OBJETO, não um array — e é exatamente aí que o
 * cliente antigo tropeçava: `Array.isArray` dava false, o objeto passava
 * adiante como se fosse resultado do juiz, `parsed.success` vinha
 * `undefined`, e a tela mostrava "Wrong Answer — undefined/undefined em 0ms",
 * gravando uma linha lixo em submissions.
 */
export function lerErroGradio(dado: unknown): string {
  const msg = (dado as { error?: string } | null)?.error;
  return typeof msg === "string" && msg ? msg : "o juiz recusou esta submissão";
}

/** A cota do ZeroGPU estourou? O juiz só sinaliza isso por substring. */
export function ehCotaEsgotada(r: ResultadoJuiz): boolean {
  return !r.success && String(r.error ?? "").includes("ZeroGPU");
}
