import conceptsRaw from "../_shared/generated/conceitos.json" with { type: "json" };
import { getLoopCompleto } from "../_shared/loops-servidor.ts";
import { getLLM } from "../_shared/llm/index.ts";
import { llmConfigured } from "../_shared/llm/config.ts";
import { buildChatMessages } from "../_shared/loop-chat.ts";
import { streamResponsePrimed, isQuotaError } from "../_shared/llm/stream.ts";
import { CORS, json, usuarioDaRequisicao, dentroDoLimite } from "../_shared/http.ts";

/** 40 perguntas por hora por aluno. O painel do cliente já limita 6 por sessão. */
const LIMITE = 40;
const JANELA = "1 hour";
const MAX_MENSAGENS = 12;
const MAX_CHARS = 2000;

const ROTULO: Record<string, string> = Object.fromEntries(
  (conceptsRaw as { id: string; label: string }[]).map((c) => [c.id, c.label]),
);

type Mensagem = { role: "user" | "assistant"; content: string };

/** Tutor do conceito: responde dúvidas laterais durante a prática. */
Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });
  if (req.method !== "POST") return json({ error: "método não suportado" }, 405);

  if (!llmConfigured) return json({ error: "LLM não configurado" }, 503);

  const userId = await usuarioDaRequisicao(req);
  if (!userId) return json({ error: "não autenticado" }, 401);

  if (!(await dentroDoLimite(userId, "loop-perguntar", LIMITE, JANELA))) {
    return json({ error: "muitas perguntas seguidas — tente de novo em instantes" }, 429, {
      "Retry-After": "600",
    });
  }

  const corpo = (await req.json().catch(() => null)) as
    | { conceptId?: unknown; messages?: unknown }
    | null;
  const conceptId = typeof corpo?.conceptId === "string" ? corpo.conceptId : "";
  const brutas = Array.isArray(corpo?.messages) ? corpo.messages : [];

  const messages: Mensagem[] = [];
  for (const m of brutas) {
    const role = (m as Mensagem)?.role;
    const content = typeof (m as Mensagem)?.content === "string" ? (m as Mensagem).content.trim() : "";
    if ((role !== "user" && role !== "assistant") || !content || content.length > MAX_CHARS) {
      return json({ error: "requisição inválida" }, 400);
    }
    messages.push({ role, content });
  }
  if (!conceptId || messages.length === 0 || messages.length > MAX_MENSAGENS) {
    return json({ error: "requisição inválida" }, 400);
  }
  if (messages[messages.length - 1].role !== "user") {
    return json({ error: "última mensagem deve ser do usuário" }, 400);
  }

  const loop = getLoopCompleto(conceptId);
  const rotulo = ROTULO[conceptId];
  if (!loop || !rotulo) return json({ error: "conceito não encontrado" }, 404);

  try {
    const iter = getLLM().stream(buildChatMessages(rotulo, loop.contexto, messages), {
      temperature: 0.4,
      maxOutputTokens: 600,
    });
    const res = await streamResponsePrimed(iter);
    for (const [k, v] of Object.entries(CORS)) res.headers.set(k, v);
    return res;
  } catch (e) {
    if (isQuotaError(e)) return json({ error: "Sem cota no momento — tente em instantes." }, 429);
    console.error("falha ao responder:", e instanceof Error ? e.message : String(e));
    return json({ error: "falha ao responder" }, 502);
  }
});
