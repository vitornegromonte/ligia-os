import { getLoopCompleto } from "../_shared/loops-servidor.ts";
import { getLLM } from "../_shared/llm/index.ts";
import { llmConfigured } from "../_shared/llm/config.ts";
import { buildGradingPrompt } from "../_shared/loop-grading.ts";
import { streamResponsePrimed, isQuotaError } from "../_shared/llm/stream.ts";
import { CORS, json, usuarioDaRequisicao, dentroDoLimite } from "../_shared/http.ts";

/** 30 correções por hora por aluno: generoso para estudar, curto para abusar. */
const LIMITE = 30;
const JANELA = "1 hour";

type Corpo = { conceptId?: unknown; checkIndex?: unknown; resposta?: unknown };

/**
 * Corrige uma resposta aberta contra a rubrica da checagem.
 *
 * Contrato de resposta (o cliente depende dele): text/plain em streaming,
 * onde a PRIMEIRA LINHA é `acertei`, `parcial` ou `errei`, e o resto é o
 * feedback em markdown.
 */
Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });
  if (req.method !== "POST") return json({ error: "método não suportado" }, 405);

  if (!llmConfigured) return json({ error: "LLM não configurado" }, 503);

  const userId = await usuarioDaRequisicao(req);
  if (!userId) return json({ error: "não autenticado" }, 401);

  if (!(await dentroDoLimite(userId, "loop-avaliar", LIMITE, JANELA))) {
    return json(
      { error: "muitas correções seguidas — respire um pouco e tente de novo" },
      429,
      { "Retry-After": "600" },
    );
  }

  const corpo = (await req.json().catch(() => null)) as Corpo | null;
  const conceptId = typeof corpo?.conceptId === "string" ? corpo.conceptId : "";
  const checkIndex = typeof corpo?.checkIndex === "number" ? corpo.checkIndex : -1;
  const resposta = typeof corpo?.resposta === "string" ? corpo.resposta.trim() : "";
  if (!conceptId || !Number.isInteger(checkIndex) || checkIndex < 0 || !resposta) {
    return json({ error: "requisição inválida" }, 400);
  }

  const loop = getLoopCompleto(conceptId);
  const check = loop?.checagens[checkIndex];
  if (!loop || !check) return json({ error: "checagem não encontrada" }, 404);

  try {
    const iter = getLLM().stream(
      buildGradingPrompt(check.pergunta, check.rubrica, resposta, loop.contexto),
      { temperature: 0.2, maxOutputTokens: 512 },
    );
    // Puxa o 1º chunk aqui: um 429 preguiçoso do provedor vira status HTTP
    // real, em vez de um 200 com corpo vazio — indistinguível de sucesso.
    const res = await streamResponsePrimed(iter);
    for (const [k, v] of Object.entries(CORS)) res.headers.set(k, v);
    return res;
  } catch (e) {
    if (isQuotaError(e)) return json({ error: "Sem cota no momento — tente em instantes." }, 429);
    console.error("falha ao avaliar:", e instanceof Error ? e.message : String(e));
    return json({ error: "falha ao avaliar" }, 502);
  }
});
