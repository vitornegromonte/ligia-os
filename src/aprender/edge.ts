import { supabase } from "../lib/supabase.js";
import { isConfigured } from "../services/supabase.js";

/** Erro com o status HTTP preservado, para o chamador distinguir 429 de 502. */
export class ErroEdge extends Error {
  constructor(
    message: string,
    readonly status: number,
  ) {
    super(message);
    this.name = "ErroEdge";
  }
}

/**
 * Chama uma Edge Function em modo STREAMING.
 *
 * `supabase.functions.invoke()` bufferiza a resposta inteira, o que mataria o
 * feedback token a token da correção. Então vai `fetch` direto, com o
 * access_token da sessão no Authorization — que é como a função identifica o
 * aluno e aplica o limite por usuário.
 */
export async function chamarEdgeStream(
  funcao: string,
  corpo: unknown,
  opcoes: { signal?: AbortSignal } = {},
): Promise<Response> {
  if (!isConfigured()) throw new ErroEdge("Supabase não configurado", 503);

  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;
  if (!token) throw new ErroEdge("não autenticado", 401);

  const base = import.meta.env.VITE_SUPABASE_URL;
  const res = await fetch(`${base}/functions/v1/${funcao}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
      apikey: import.meta.env.VITE_SUPABASE_ANON_KEY,
    },
    body: JSON.stringify(corpo),
    signal: opcoes.signal,
  });

  if (!res.ok || !res.body) {
    let msg = `Erro ${res.status}`;
    try {
      const j = await res.json();
      if (j?.error) msg = j.error;
    } catch {
      /* corpo não-JSON: fica a mensagem genérica */
    }
    throw new ErroEdge(msg, res.status);
  }
  return res;
}

/**
 * A correção ao vivo está disponível? Sem Supabase configurado não há Edge
 * Function para chamar, e a prática cai na auto-avaliação contra a rubrica —
 * que continua sendo uma prática legítima, só sem feedback.
 */
export function correcaoAoVivoDisponivel(): boolean {
  return isConfigured();
}
