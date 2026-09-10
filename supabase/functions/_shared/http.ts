import { createClient, type SupabaseClient } from "jsr:@supabase/supabase-js@2";
import { env } from "./env.ts";

export const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

export function json(corpo: unknown, status = 200, headers: Record<string, string> = {}): Response {
  return new Response(JSON.stringify(corpo), {
    status,
    headers: { ...CORS, "Content-Type": "application/json", ...headers },
  });
}

/**
 * Identifica o chamador pelo JWT do Supabase.
 *
 * As rotas equivalentes no Next.js eram ABERTAS e freadas só por um limitador
 * em memória por IP — um curl em laço queimava a cota do Gemini. Aqui a
 * função exige sessão, e o limite é por usuário.
 */
export async function usuarioDaRequisicao(req: Request): Promise<string | null> {
  const auth = req.headers.get("Authorization");
  if (!auth) return null;

  const sb = createClient(env("SUPABASE_URL"), env("SUPABASE_ANON_KEY"), {
    global: { headers: { Authorization: auth } },
  });
  const { data, error } = await sb.auth.getUser();
  if (error || !data.user) return null;
  return data.user.id;
}

/** Client com service-role, para chamar RPC que o cliente não pode chamar. */
export function clientDeServico(): SupabaseClient {
  return createClient(env("SUPABASE_URL"), env("SUPABASE_SERVICE_ROLE_KEY"));
}

/**
 * Consome uma unidade do balde do usuário. FALHA FECHADA: se a RPC der erro,
 * nega. A alternativa é uma conta ilimitada de Gemini quando o banco oscila.
 */
export async function dentroDoLimite(
  userId: string,
  bucket: string,
  limite: number,
  janela: string,
): Promise<boolean> {
  try {
    const { data, error } = await clientDeServico().rpc("consume_rate_limit", {
      p_bucket: bucket,
      p_limit: limite,
      p_window: janela,
    });
    if (error) {
      console.warn(`rate limit indisponível (${bucket}) para ${userId}:`, error.message);
      return false;
    }
    return data === true;
  } catch (e) {
    console.warn("rate limit lançou:", e instanceof Error ? e.message : String(e));
    return false;
  }
}
