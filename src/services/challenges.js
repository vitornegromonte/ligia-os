import { supabase } from "../lib/supabase.js";
import { isConfigured } from "./supabase.js";
import fallbackTasks from "../data/torch_tasks.json";

function mapChallenge(row) {
  return {
    id: row.slug || row.id,
    slug: row.slug,
    title: row.title,
    difficulty: row.difficulty,
    tags: row.tags || [],
    visibility: row.visibility || "internal",
    description: row.description || row.description_md || "",
    hint: row.hint || "",
    initial_code: row.starter_code || row.initial_code || "",
    starter_code: row.starter_code || row.initial_code || "",
    function_name: row.function_name || "",
    tests_count: Array.isArray(row.tests) ? row.tests.length : (row.tests_count || 0),
    order_index: row.order_index || 0,
  };
}

export async function fetchChallenges() {
  if (!isConfigured()) return fallbackTasks.map(t => ({ ...t, visibility: "internal" }));
  const { data, error } = await supabase
    .from("challenges")
    .select("*")
    .order("order_index", { ascending: true })
    .order("title", { ascending: true });
  if (error || !data || data.length === 0) {
    console.warn("fetchChallenges fallback", error?.message);
    return fallbackTasks.map(t => ({ ...t, visibility: "internal" }));
  }
  return data.map(mapChallenge);
}

export async function fetchChallenge(slug) {
  if (!isConfigured()) return fallbackTasks.find(t => t.slug === slug || t.id === slug) || null;
  const { data, error } = await supabase.from("challenges").select("*").eq("slug", slug).single();
  if (!error && data) return mapChallenge(data);
  // fallback to json
  return fallbackTasks.find(t => t.slug === slug || t.id === slug) || null;
}

/**
 * Executa o código do aluno contra o juiz.
 *
 * Passa por uma Edge Function (supabase/functions/judge) em vez de chamar o
 * HF Space direto. Três motivos:
 *
 *   1. O Space é aberto e CORS `*`: quem descobrisse a URL queimava a cota de
 *      ZeroGPU da Liga inteira.
 *   2. O juiz devolve `tests[].code` — o CÓDIGO-FONTE DOS TESTES. Chamando
 *      direto, o gabarito aparecia no devtools a cada execução e ainda era
 *      gravado em `submissions.results`. A função remove antes de responder.
 *   3. A submissão passa a ser gravada no servidor. Aqui era `catch {}`:
 *      falha de banco mostrava resultado verde e não persistia nada.
 *
 * O resultado inclui `persistido`, para a UI ser honesta quando a execução
 * não entrou no histórico.
 */
export async function submitToJudge(slug, code) {
  if (!isConfigured()) {
    throw new Error("Supabase não configurado — a execução de código precisa de conta.");
  }
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;
  if (!token) throw new Error("Entre na sua conta para executar o código.");

  const res = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/judge`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
      apikey: import.meta.env.VITE_SUPABASE_ANON_KEY,
    },
    body: JSON.stringify({ slug, code }),
  });

  const corpo = await res.json().catch(() => null);
  if (!res.ok) {
    const erro = new Error(corpo?.error || `Erro ${res.status}`);
    erro.status = res.status;
    throw erro;
  }
  return corpo;
}

export async function fetchMySubmissions(slug) {
  if (!isConfigured()) return [];
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return [];
  let query = supabase.from("submissions").select("*").eq("profile_id", user.id).order("created_at", { ascending: false }).limit(10);
  if (slug) {
    const { data: ch } = await supabase.from("challenges").select("id").eq("slug", slug).single();
    if (ch?.id) query = query.eq("challenge_id", ch.id);
  }
  const { data } = await query;
  return data || [];
}
