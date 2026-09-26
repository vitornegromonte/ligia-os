import { env } from "../_shared/env.ts";
import {
  semGabarito,
  lerEventoSSE,
  lerResultadoCompleto,
  lerErroGradio,
  ehCotaEsgotada,
  type ResultadoJuiz,
} from "../_shared/judge-protocolo.ts";
import { CORS, json, usuarioDaRequisicao, dentroDoLimite, clientDeServico } from "../_shared/http.ts";

/**
 * Proxy do juiz de código (HF Space).
 *
 * O cliente chamava o Space DIRETO, e isso trazia três problemas:
 *
 *   1. O Space é aberto e CORS `*`. Quem descobrisse a URL queimava a cota de
 *      ZeroGPU da Liga inteira.
 *   2. A resposta do juiz inclui `tests[].code` — o CÓDIGO-FONTE DOS TESTES.
 *      O gabarito aparecia no devtools a cada execução, e ainda era gravado
 *      em `submissions.results`.
 *   3. A gravação da submissão era `catch {}` no cliente: falha de banco
 *      mostrava resultado verde e não persistia nada.
 *
 * Aqui: exige sessão, limita por usuário, remove `tests[].code` antes de
 * responder, e grava a submissão do lado do servidor.
 */
const LIMITE = 60;
const JANELA = "1 hour";

/** O Space tem orçamento de 60s por execução; o cliente antigo desistia em 27. */
const TIMEOUT_JUIZ_MS = 65_000;
const POLL_INTERVALO_MS = 700;
const POLL_MAX = 90;

async function chamarJuiz(base: string, slug: string, code: string): Promise<ResultadoJuiz> {
  const ctrl = new AbortController();
  const timeout = setTimeout(() => ctrl.abort(), TIMEOUT_JUIZ_MS);
  try {
    // Caminho A: FastAPI. Hoje o Space serve a SPA do Gradio nessa rota e o
    // caminho nunca vinga, mas continua sendo o preferido se voltar a existir.
    try {
      const res = await fetch(`${base}/api/submit/${encodeURIComponent(slug)}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code }),
        signal: ctrl.signal,
      });
      const texto = await res.text();
      const ehHtml = /^\s*<(!doctype|html)/i.test(texto);
      if (res.ok && !ehHtml) {
        const j = JSON.parse(texto);
        if (typeof j?.success === "boolean") return j as ResultadoJuiz;
      }
    } catch {
      /* cai para o Gradio */
    }

    // Caminho B: Gradio em duas fases.
    const r1 = await fetch(`${base}/gradio_api/call/judge`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ data: [slug, code] }),
      signal: ctrl.signal,
    });
    if (!r1.ok) throw new Error(`juiz recusou a submissão (${r1.status})`);
    const { event_id } = (await r1.json()) as { event_id?: string };
    if (!event_id) throw new Error("juiz não devolveu event_id");

    for (let i = 0; i < POLL_MAX; i++) {
      // Consulta ANTES de dormir: o cliente antigo dormia primeiro e pagava
      // 900ms mesmo quando o resultado já estava pronto.
      const r2 = await fetch(`${base}/gradio_api/call/judge/${event_id}`, { signal: ctrl.signal });
      const texto = await r2.text();

      const { evento, dado } = lerEventoSSE(texto);

      if (evento === "error") throw new Error(lerErroGradio(dado));

      if (evento === "complete") {
        const parsed = lerResultadoCompleto(dado);
        if (ehCotaEsgotada(parsed)) {
          throw new Error("A GPU do juiz está em alta demanda — tente de novo em uns minutos.");
        }
        return parsed;
      }

      await new Promise((r) => setTimeout(r, POLL_INTERVALO_MS));
    }
    throw new Error("o juiz demorou demais para responder — tente de novo");
  } finally {
    clearTimeout(timeout);
  }
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });
  if (req.method !== "POST") return json({ error: "método não suportado" }, 405);

  const base = env("JUDGE_URL").replace(/\/$/, "");
  if (!base) return json({ error: "juiz não configurado" }, 503);

  const userId = await usuarioDaRequisicao(req);
  if (!userId) return json({ error: "não autenticado" }, 401);

  if (!(await dentroDoLimite(userId, "judge", LIMITE, JANELA))) {
    return json({ error: "muitas execuções seguidas — tente de novo em instantes" }, 429, {
      "Retry-After": "600",
    });
  }

  const corpo = (await req.json().catch(() => null)) as { slug?: unknown; code?: unknown } | null;
  const slug = typeof corpo?.slug === "string" ? corpo.slug : "";
  const code = typeof corpo?.code === "string" ? corpo.code : "";
  if (!slug || !code.trim()) return json({ error: "requisição inválida" }, 400);

  let resultado: ResultadoJuiz;
  try {
    resultado = await chamarJuiz(base, slug, code);
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    if (msg.includes("aborted") || msg.includes("demorou")) {
      return json({ error: "o juiz demorou demais para responder — tente de novo" }, 504);
    }
    return json({ error: msg }, 502);
  }

  const limpo = semGabarito(resultado);

  // Grava do lado do servidor. No cliente isto era `catch {}`: um erro de
  // banco mostrava resultado verde e não persistia nada.
  let persistido = false;
  try {
    const sb = clientDeServico();
    const { data: desafio } = await sb.from("challenges").select("id").eq("slug", slug).single();
    if (desafio?.id) {
      const { error } = await sb.from("submissions").insert({
        challenge_id: desafio.id,
        profile_id: userId,
        code,
        status: limpo.success ? "passed" : "failed",
        passed: limpo.passed ?? 0,
        total: limpo.total ?? 0,
        time_ms: limpo.total_time_ms ?? 0,
        // Já sem `tests[].code`: o gabarito também não vai para o banco.
        results: limpo.tests ?? [],
        stdout: limpo.stdout ?? "",
        stderr: limpo.stderr ?? limpo.error ?? "",
      });
      persistido = !error;
      if (error) console.warn("submissão não gravada:", error.message);
    } else {
      console.warn(`challenge "${slug}" não existe no banco — submissão não gravada`);
    }
  } catch (e) {
    console.warn("falha ao gravar submissão:", e instanceof Error ? e.message : String(e));
  }

  // `persistido` é honesto: a UI avisa quando o resultado não entrou no
  // histórico, em vez de fingir que entrou.
  return json({ ...limpo, persistido });
});
