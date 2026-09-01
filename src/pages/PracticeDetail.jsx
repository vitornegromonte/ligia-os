import { useParams, useOutletContext, Link } from "react-router-dom";
import { useEffect, useMemo, useState } from "react";
import { Menu, ArrowLeft, ExternalLink, Copy, FlaskConical, Lightbulb, Check, Play, RotateCcw, History, BookOpen } from "lucide-react";
import Editor from "@monaco-editor/react";
import { fetchChallenge, submitToJudge, createSubmission, fetchMySubmissions } from "../services/challenges.js";
import { showToast } from "../utils/toast.js";
import MarkdownViewer from "../components/MarkdownViewer.jsx";

const difficultyLabel = { Easy: "Iniciante", Medium: "Intermediário", Hard: "Avançado" };
const HF_URL = "https://huggingface.co/spaces/duoan/TorchCode";

export default function PracticeDetail() {
  const { slug } = useParams();
  const { menuOpen, setMenuOpen } = useOutletContext();
  const [task, setTask] = useState(null);
  const [loading, setLoading] = useState(true);
  const [code, setCode] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [result, setResult] = useState(null);
  const [history, setHistory] = useState([]);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    fetchChallenge(slug).then(t => {
      if (cancelled) return;
      setTask(t);
      if (t) {
        document.title = `Ligia — ${t.title}`;
        const saved = localStorage.getItem(`ligia_code_${t.slug}`) || localStorage.getItem(`torchcode_code_${t.slug}`) || "";
        setCode(saved || t.initial_code || t.starter_code || "");
        fetchMySubmissions(t.slug).then(setHistory).catch(() => {});
      }
    }).finally(() => !cancelled && setLoading(false));
    return () => { cancelled = true; };
  }, [slug]);

  useEffect(() => { window.scrollTo({ top: 0 }); }, [slug]);

  useEffect(() => {
    if (task && code) localStorage.setItem(`ligia_code_${task.slug}`, code);
  }, [code, task]);

  async function handleRun() {
    if (!task) return;
    setIsSubmitting(true);
    setResult(null);
    try {
      const res = await submitToJudge(task.slug, code);
      setResult(res);
      try { await createSubmission({ slug: task.slug, code, result: res }); } catch {}
      fetchMySubmissions(task.slug).then(setHistory).catch(() => {});
      if (res.success) showToast("✅ Passou em todos os testes");
      else showToast(`❌ ${res.passed}/${res.total} passaram`);
    } catch (e) {
      showToast(e.message.includes("VITE_JUDGE_URL") ? "Configure VITE_JUDGE_URL (HF Space) ou use o HF iframe ao lado" : `Erro: ${e.message}`);
      setResult({ success: false, error: e.message, tests: [] });
    } finally {
      setIsSubmitting(false);
    }
  }

  function handleReset() {
    if (!task) return;
    setCode(task.initial_code || task.starter_code || "");
    localStorage.removeItem(`ligia_code_${task.slug}`);
    showToast("Código restaurado");
  }

  async function copyCode() {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      showToast("Código copiado");
      setTimeout(() => setCopied(false), 1500);
    } catch { showToast("Copie manualmente"); }
  }

  if (loading) {
    return (
      <div style={{ padding: "60px 24px" }}>
        <div className="skeleton" style={{ height: 24, width: 180, borderRadius: 8, marginBottom: 16 }} />
        <div className="skeleton" style={{ height: 180, borderRadius: "var(--radius)" }} />
      </div>
    );
  }

  if (!task) {
    return (
      <div style={{ padding: "60px 24px", textAlign: "center", color: "var(--muted)" }}>
        <p>Desafio não encontrado: {slug}</p>
        <Link to="/pratica" style={{ color: "var(--accent)", fontSize: 13 }}>← Voltar para lista</Link>
      </div>
    );
  }

  const colabUrl = `https://colab.research.google.com/github/duoan/TorchCode/blob/master/templates/${task.id ? String(task.id).padStart(2, "0") : "01"}_${task.slug}.ipynb`;

  return (
    <>
      <header style={{
        position: "sticky", top: 0, zIndex: 30, height: 66,
        display: "flex", alignItems: "center", gap: 14,
        padding: "0 clamp(20px, 4vw, 52px)",
        borderBottom: "1px solid rgba(55,48,37,.72)",
        background: "rgba(15,14,12,.82)", backdropFilter: "blur(18px)"
      }}>
        <button className="mobile-menu" onClick={() => setMenuOpen(true)} aria-label="Abrir navegação" style={{ display: "none", padding: 6, border: 0, background: "none", cursor: "pointer", color: "var(--text)" }}>
          <Menu size={20} />
        </button>
        <Link to="/pratica" aria-label="Voltar para Prática" style={{ display: "inline-flex", alignItems: "center", gap: 8, padding: "8px 14px", borderRadius: 9999, border: "1px solid var(--line-soft)", background: "var(--surface-2)", color: "var(--text)", fontSize: 12, fontWeight: 600, textDecoration: "none" }}>
          <ArrowLeft size={14} aria-hidden="true" /> Voltar para Prática
        </Link>
        <span style={{ color: "var(--muted-2)", fontSize: 12, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", display: "none" }}>{task.title}</span>
        <span style={{ marginLeft: "auto", fontSize: 10, padding: "3px 8px", borderRadius: 9999, background: "var(--surface-2)", color: "var(--muted-2)", border: "1px solid var(--line-soft)", whiteSpace: "nowrap" }}>
          {difficultyLabel[task.difficulty] || task.difficulty}
        </span>
      </header>

      <div style={{ padding: "20px clamp(20px, 4vw, 52px) 32px" }}>
        <Link to="/pratica" style={{ display: "inline-flex", alignItems: "center", gap: 6, marginBottom: 16, color: "var(--muted)", fontSize: 12, textDecoration: "none" }}>
          <ArrowLeft size={14} aria-hidden="true" /> Voltar para Prática
        </Link>
        <div style={{ display: "grid", gridTemplateColumns: "minmax(0, 1.05fr) minmax(420px, 0.95fr)", gap: 18, alignItems: "start" }}>
          {/* Esquerda: enunciado */}
          <div style={{ display: "grid", gap: 14 }}>
            <div style={{ borderRadius: "var(--radius)", border: "1px solid var(--line-soft)", background: "var(--surface)", overflow: "hidden" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 12px", borderBottom: "1px solid var(--line-soft)", background: "#252526" }}>
                <div style={{ width: 28, height: 28, display: "grid", placeItems: "center", borderRadius: 8, background: "var(--accent-soft)", color: "var(--accent)" }}>
                  <FlaskConical size={14} aria-hidden="true" />
                </div>
                <div>
                  <h1 style={{ margin: 0, fontSize: 13, fontWeight: 650, lineHeight: 1.2 }}>{task.title}</h1>
                  <code style={{ fontSize: 10, color: "var(--accent)" }}>{task.function_name}</code>
                </div>
              </div>
              <div style={{ padding: 16 }}>
                <MarkdownViewer content={task.description || "Sem descrição — verifique o Hugging Face."} />
                {task.hint && (
                  <details style={{ marginTop: 14, padding: 12, borderRadius: 9, background: "var(--surface-2)", border: "1px solid var(--line-soft)" }}>
                    <summary style={{ cursor: "pointer", fontSize: 12, fontWeight: 600, color: "var(--text)", display: "flex", alignItems: "center", gap: 6 }}>
                      <Lightbulb size={14} color="var(--accent)" aria-hidden="true" /> Dica
                    </summary>
                    <div style={{ margin: "10px 0 0" }}>
                      <MarkdownViewer content={task.hint} />
                    </div>
                  </details>
                )}
              </div>
            </div>

            {history.length > 0 && (
              <div style={{ padding: 16, borderRadius: "var(--radius)", border: "1px solid var(--line-soft)", background: "var(--surface-2)" }}>
                <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: ".06em", textTransform: "uppercase", color: "var(--muted-2)", display: "flex", alignItems: "center", gap: 6, marginBottom: 8 }}>
                  <History size={12} aria-hidden="true" /> Histórico (Supabase)
                </div>
                <div style={{ display: "grid", gap: 6 }}>
                  {history.slice(0, 5).map(s => (
                    <div key={s.id} style={{ display: "flex", alignItems: "center", gap: 8, padding: "8px 10px", borderRadius: 8, background: "var(--surface)", border: "1px solid var(--line-soft)", fontSize: 11 }}>
                      <span style={{ width: 8, height: 8, borderRadius: "50%", background: s.status === "passed" ? "#6da87c" : "#c76b60", flex: "0 0 auto" }} />
                      <span style={{ color: "var(--muted)" }}>{new Date(s.created_at).toLocaleString("pt-BR")}</span>
                      <span style={{ marginLeft: "auto", color: s.status === "passed" ? "#6da87c" : "var(--muted-2)" }}>{s.passed}/{s.total}</span>
                      <span style={{ fontSize: 10, padding: "2px 6px", borderRadius: 9999, background: s.status === "passed" ? "rgba(109,168,124,.14)" : "rgba(199,107,96,.14)", color: s.status === "passed" ? "#6da87c" : "#c76b60" }}>{s.status}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Direita: editor */}
          <div style={{ position: "sticky", top: 78, display: "grid", gap: 12 }}>
            <div style={{ borderRadius: "var(--radius)", overflow: "hidden", border: "1px solid var(--line-soft)", background: "#1e1e1e" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "10px 12px", borderBottom: "1px solid #2d2d2d", background: "#252526" }}>
                <span style={{ fontSize: 11, color: "#cccccc", flex: 1 }}>{task.slug}.py</span>
                <button onClick={copyCode} style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "6px 10px", borderRadius: 6, border: "1px solid #3c3c3c", background: "#2d2d2d", color: "#cccccc", fontSize: 11, cursor: "pointer" }}>
                  {copied ? <Check size={12} color="#6da87c" /> : <Copy size={12} />} Copiar
                </button>
                <button onClick={handleReset} style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "6px 10px", borderRadius: 6, border: "1px solid var(--line)", background: "transparent", color: "var(--muted)", fontSize: 11, cursor: "pointer" }}>
                  <RotateCcw size={12} /> Reset
                </button>
                <button onClick={handleRun} disabled={isSubmitting} style={{
                  display: "inline-flex", alignItems: "center", gap: 6, padding: "8px 14px", borderRadius: 8, border: 0,
                  background: isSubmitting ? "var(--muted-2)" : "var(--accent)", color: "#fff", fontSize: 12, fontWeight: 600, cursor: isSubmitting ? "not-allowed" : "pointer"
                }}>
                  <Play size={14} aria-hidden="true" /> {isSubmitting ? "Executando…" : "Run Tests"}
                </button>
              </div>
              <Editor
                height="min(56vh, 420px)"
                language="python"
                value={code}
                onChange={v => setCode(v || "")}
                theme="vs-dark"
                options={{ fontSize: 12, minimap: { enabled: false }, scrollBeyondLastLine: false, padding: { top: 12, bottom: 12 }, fontFamily: "JetBrains Mono, monospace" }}
              />
              {result && (
                <div style={{ padding: 12, borderTop: "1px solid #2d2d2d", background: "#1e1e1e", maxHeight: 220, overflowY: "auto" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
                    <span style={{ fontSize: 12, fontWeight: 700, color: result.success ? "#6da87c" : "#c76b60" }}>
                      {result.success ? "✅ Accepted" : "❌ Wrong Answer"} — {result.passed}/{result.total} em {Math.round(result.total_time_ms || 0)}ms
                    </span>
                    {result.stdout && <span style={{ fontSize: 10, color: "var(--muted-2)" }}>stdout abaixo</span>}
                  </div>
                  {(result.tests || []).map((t, i) => (
                    <div key={i} style={{ padding: "8px 10px", marginBottom: 6, borderRadius: 8, background: t.passed ? "rgba(109,168,124,.10)" : "rgba(199,107,96,.10)", border: `1px solid ${t.passed ? "rgba(109,168,124,.2)" : "rgba(199,107,96,.2)"}` }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 11, fontWeight: 600, color: t.passed ? "#6da87c" : "#c76b60" }}>
                        {t.passed ? "✓" : "✗"} {t.name} <span style={{ marginLeft: "auto", fontSize: 10, color: "var(--muted-2)" }}>{Math.round(t.time_ms || 0)}ms</span>
                      </div>
                      {!t.passed && t.error_msg && <pre style={{ margin: "6px 0 0", fontSize: 10, color: "#e0b4b4", whiteSpace: "pre-wrap" }}>{t.error_msg}</pre>}
                      {t.stdout && <pre style={{ margin: "6px 0 0", fontSize: 10, color: "#a0a0a0", whiteSpace: "pre-wrap" }}>{t.stdout}</pre>}
                    </div>
                  ))}
                  {result.error && <pre style={{ fontSize: 11, color: "#c76b60", whiteSpace: "pre-wrap" }}>{result.error}</pre>}
                  {result.stderr && <pre style={{ fontSize: 10, color: "#a0a0a0", whiteSpace: "pre-wrap" }}>{result.stderr}</pre>}
                </div>
              )}
            </div>
            <a href={colabUrl} target="_blank" rel="noreferrer" style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "8px 14px", borderRadius: 9, background: "#F9AB00", color: "#202124", fontSize: 11, fontWeight: 600, textDecoration: "none", width: "fit-content" }}>
              <img src="https://colab.research.google.com/img/colab_favicon_256px.png" alt="" width="14" height="14" /> Abrir no Colab
            </a>
          </div>
        </div>


      </div>

      <style>{`
        @media (max-width: 960px) {
          div[style*="gridTemplateColumns: minmax(0, 1.05fr)"] { grid-template-columns: 1fr !important; }
          div[style*="position: sticky; top: 78"] { position: relative !important; top: auto !important; }
        }
      `}</style>
    </>
  );

  async function copyCode() {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      showToast("Código copiado");
      setTimeout(() => setCopied(false), 1500);
    } catch { showToast("Copie manualmente"); }
  }
}
