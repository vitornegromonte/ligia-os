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

export async function submitToJudge(slug, code) {
  const url = import.meta.env.VITE_JUDGE_URL;
  if (!url) throw new Error("VITE_JUDGE_URL não configurado (HF Space)");
  const base = url.replace(/\/$/, "");

  // Tenta FastAPI primeiro (/api/submit) — funciona se Space expôs via demo.app
  try {
    const res = await fetch(`${base}/api/submit/${encodeURIComponent(slug)}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ code }),
    });
    const text = await res.text();
    // Se retornou JSON válido, usa
    try {
      const json = JSON.parse(text);
      if (res.ok && json && typeof json.success === "boolean") return json;
      if (res.ok) return json;
    } catch {}
    // Se retornou HTML (Gradio UI) ou erro, cai para fallback Gradio
    if (!res.ok || text.trim().startsWith("<!doctype") || text.trim().startsWith("<html")) {
      throw new Error("fallback to gradio");
    }
    throw new Error(text || `Judge ${res.status}`);
  } catch (e) {
    // Fallback Gradio ZeroGPU: POST /gradio_api/call/judge
    // Gradio 6: POST /gradio_api/call/judge com {data:[task_id, code]}
    try {
      const r1 = await fetch(`${base}/gradio_api/call/judge`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ data: [slug, code] }),
      });
      if (!r1.ok) throw new Error(await r1.text());
      const { event_id } = await r1.json();
      // Poll por até ~24s (ZeroGPU cold start ~6s + execução)
      for (let i = 0; i < 30; i++) {
        await new Promise(r => setTimeout(r, 800));
        const r2 = await fetch(`${base}/gradio_api/call/judge/${event_id}`);
        if (!r2.ok) continue;
        const j = await r2.json();
        if (j.event === "complete" || j.event === "error") {
          const raw = j.data?.[0];
          if (!raw) throw new Error("Resposta vazia do juiz");
          try {
            const parsed = JSON.parse(raw);
            return parsed;
          } catch {
            // Se não for JSON, retorna como erro
            return { success: false, passed: 0, total: 0, error: String(raw), tests: [] };
          }
        }
      }
      throw new Error("Timeout aguardando ZeroGPU (tente novamente)");
    } catch (gradioErr) {
      // Se gradio também falhar, propaga erro original
      throw gradioErr.message ? gradioErr : e;
    }
  }
}

export async function createSubmission({ challenge_id, slug, code, result }) {
  if (!isConfigured()) {
    // local mock — não persiste
    return { id: `local-${Date.now()}`, challenge_id: slug, status: result?.success ? "passed" : "failed", ...result };
  }
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Não autenticado");
  // resolve challenge_id
  let cid = challenge_id;
  if (!cid && slug) {
    const { data } = await supabase.from("challenges").select("id").eq("slug", slug).single();
    cid = data?.id;
  }
  if (!cid) throw new Error("Challenge não encontrado no banco");
  const payload = {
    challenge_id: cid,
    profile_id: user.id,
    code,
    status: result?.success ? "passed" : "failed",
    passed: result?.passed ?? 0,
    total: result?.total ?? 0,
    time_ms: result?.total_time_ms ?? 0,
    results: result?.tests || [],
    stdout: result?.stdout || "",
    stderr: result?.stderr || result?.error || "",
  };
  const { data, error } = await supabase.from("submissions").insert(payload).select().single();
  if (error) throw error;
  return data;
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
