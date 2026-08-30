import { useOutletContext, useNavigate } from "react-router-dom";
import { useState, useEffect, useMemo } from "react";
import { Menu, Search, Code2, Terminal, Cpu, Flame, Star, Lightbulb, ExternalLink, BookOpen } from "lucide-react";
import { fetchChallenges } from "../services/challenges.js";

const difficultyConfig = {
  Easy: { label: "Iniciante", color: "#6da87c", bg: "rgba(109,168,124,.14)" },
  Medium: { label: "Intermediário", color: "#c4a358", bg: "rgba(196,163,88,.14)" },
  Hard: { label: "Avançado", color: "#c76b60", bg: "rgba(199,107,96,.14)" },
};

const filters = ["Todos", "Iniciante", "Intermediário", "Avançado"];

export default function Practice() {
  const { menuOpen, setMenuOpen } = useOutletContext();
  const navigate = useNavigate();
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("Todos");

  useEffect(() => {
    document.title = "Ligia — Prática Torch";
    window.scrollTo({ top: 0 });
    fetchChallenges().then(setTasks).finally(() => setLoading(false));
  }, []);

  const filtered = useMemo(() => {
    const q = search.toLowerCase().trim();
    return tasks.filter(t => {
      const diffLabel = difficultyConfig[t.difficulty]?.label || t.difficulty;
      const matchesFilter = filter === "Todos" || diffLabel === filter;
      const haystack = `${t.title} ${t.slug} ${t.function_name} ${t.hint}`.toLowerCase();
      const matchesSearch = !q || haystack.includes(q);
      return matchesFilter && matchesSearch;
    });
  }, [search, filter, tasks]);

  const stats = useMemo(() => {
    const easy = tasks.filter(t => t.difficulty === "Easy").length;
    const medium = tasks.filter(t => t.difficulty === "Medium").length;
    const hard = tasks.filter(t => t.difficulty === "Hard").length;
    return { total: tasks.length, easy, medium, hard };
  }, [tasks]);

  return (
    <>
      <header style={{
        position: "sticky", top: 0, zIndex: 30, height: 66,
        display: "flex", alignItems: "center", gap: 18,
        padding: "0 clamp(20px, 4vw, 52px)",
        borderBottom: "1px solid rgba(55,48,37,.72)",
        background: "rgba(15,14,12,.82)", backdropFilter: "blur(18px)"
      }}>
        <button className="mobile-menu" onClick={() => setMenuOpen(true)} aria-label="Abrir navegação" style={{ display: "none", padding: 6, border: 0, background: "none", cursor: "pointer", color: "var(--text)" }}>
          <Menu size={20} />
        </button>
        <div style={{ color: "var(--muted)", fontSize: 13 }}>
          Ligia &nbsp;/&nbsp; <strong style={{ color: "var(--text)", fontWeight: 550, fontFamily: "var(--font-heading)" }}>Prática Torch</strong>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginLeft: "auto" }}>
          <a href="https://huggingface.co/spaces/duoan/TorchCode" target="_blank" rel="noreferrer" style={{
            display: "inline-flex", alignItems: "center", gap: 6, padding: "8px 14px", borderRadius: 9,
            border: "1px solid var(--line)", color: "var(--muted)", background: "transparent",
            fontSize: 12, fontWeight: 500, textDecoration: "none"
          }}>
            <ExternalLink size={14} /> Abrir no HF
          </a>
        </div>
      </header>

      <div style={{ padding: "36px clamp(20px, 4vw, 52px) 72px" }}>
        <div style={{ marginBottom: 28 }}>
          <div className="eyebrow" style={{ marginBottom: 8 }}>Membros · Prática</div>
          <h1 style={{ margin: "0 0 10px", fontSize: "clamp(28px, 4vw, 36px)", fontWeight: 500, letterSpacing: "-.03em" }}>
            <span className="gradient-text">TorchCode.</span> Prática de PyTorch
          </h1>
          <div className="gradient-bar" style={{ width: 64, marginBottom: 14 }} />
          <p style={{ maxWidth: 640, color: "var(--muted)", fontSize: 13, lineHeight: 1.7, margin: 0 }}>
            41 problemas curados de entrevistas de ML — de <em>ReLU</em> a <em>Flash Attention</em>. Ambiente Jupyter completo hospedado no Hugging Face. Sem instalação, sem GPU.
          </p>
        </div>

        <div style={{ display: "flex", gap: 10, marginBottom: 18, flexWrap: "wrap", alignItems: "center" }}>
          <div style={{ position: "relative", flex: 1, minWidth: 220, maxWidth: 360 }}>
            <Search size={14} style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", color: "var(--muted-2)" }} />
            <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Buscar ReLU, Attention, Adam…"
              style={{
                width: "100%", height: 38, padding: "0 14px 0 36px", borderRadius: 9,
                border: "1px solid var(--line-soft)", background: "var(--surface)", color: "var(--text)",
                outline: "none", fontSize: 12
              }} />
          </div>
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
            {filters.map(f => (
              <button key={f} onClick={() => setFilter(f)} style={{
                padding: "8px 14px", borderRadius: 9999, fontSize: 11, cursor: "pointer",
                border: `1px solid ${filter === f ? "var(--accent-border)" : "var(--line-soft)"}`,
                background: filter === f ? "var(--accent-soft)" : "transparent",
                color: filter === f ? "var(--accent)" : "var(--muted)"
              }}>{f}</button>
            ))}
          </div>
          <div style={{ marginLeft: "auto", display: "flex", gap: 8, color: "var(--muted-2)", fontSize: 11, alignItems: "center" }}>
            <span style={{ display: "inline-flex", alignItems: "center", gap: 4 }}><Flame size={12} color="#c76b60" /> {stats.hard} avançados</span>
            <span>·</span>
            <span>{stats.total} total</span>
          </div>
        </div>

        {loading ? (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))", gap: 16 }}>
            {[1,2,3,4,5,6].map(i => <div key={i} className="skeleton" style={{ height: 182, borderRadius: "var(--radius)", border: "1px solid var(--line-soft)" }} />)}
          </div>
        ) : (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))", gap: 16 }}>
            {filtered.map(task => {
              const diff = difficultyConfig[task.difficulty] || difficultyConfig.Medium;
              const Icon = task.difficulty === "Easy" ? Star : task.difficulty === "Hard" ? Flame : Lightbulb;
              return (
                <article key={task.id} onClick={() => navigate(`/pratica/${task.slug}`)} style={{
                  display: "flex", flexDirection: "column", padding: 20, borderRadius: "var(--radius)",
                  border: "1px solid var(--line-soft)", background: "var(--surface)", cursor: "pointer",
                  transition: "border-color var(--transition), transform var(--transition)"
                }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12 }}>
                    <div style={{ width: 36, height: 36, display: "grid", placeItems: "center", borderRadius: 9, background: diff.bg, color: diff.color }}>
                      <Icon size={16} />
                    </div>
                    <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: ".08em", textTransform: "uppercase", color: diff.color, background: diff.bg, padding: "4px 8px", borderRadius: 9999 }}>
                      {diff.label}
                    </span>
                    <span style={{ marginLeft: "auto", fontSize: 10, color: "var(--muted-2)" }}>{task.tests_count} testes</span>
                  </div>
                  <h3 style={{ margin: "0 0 6px", fontSize: 14, fontWeight: 600 }}>{task.title}</h3>
                  <code style={{ fontSize: 11, color: "var(--accent)", background: "var(--surface-2)", padding: "4px 8px", borderRadius: 6, alignSelf: "flex-start" }}>{task.function_name}</code>
                  <p style={{ margin: "10px 0 0", color: "var(--muted)", fontSize: 11, lineHeight: 1.6, display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" }}>
                    {task.hint ? task.hint.replace(/\$|\\/g, "").slice(0, 140) : ""}
                  </p>
                  <div style={{ display: "flex", gap: 8, marginTop: 14 }}>
                    <span style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "7px 12px", borderRadius: 9999, background: "var(--accent)", color: "#fff", fontSize: 11, fontWeight: 600 }}>
                      <Code2 size={12} /> Praticar
                    </span>
                    <span style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "7px 12px", borderRadius: 9999, border: "1px solid var(--line)", color: "var(--muted)", fontSize: 11 }}>
                      <BookOpen size={12} /> Ver
                    </span>
                  </div>
                </article>
              );
            })}
          </div>
        )}

        {!loading && filtered.length === 0 && (
          <div style={{ textAlign: "center", padding: "60px 20px", color: "var(--muted)" }}>
            Nenhum problema encontrado para "{search}" em {filter}.
          </div>
        )}

        <div style={{ marginTop: 32, padding: 18, borderRadius: "var(--radius)", border: "1px solid var(--line-soft)", background: "var(--surface-2)", display: "flex", gap: 12, alignItems: "center" }}>
          <div style={{ width: 36, height: 36, display: "grid", placeItems: "center", borderRadius: 9, background: "var(--accent-soft)", color: "var(--accent)" }}>
            <Terminal size={18} />
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 12, fontWeight: 600 }}>Versão B · Nativo</div>
            <div style={{ fontSize: 11, color: "var(--muted)", lineHeight: 1.6 }}>Editor Monaco + juiz em <code style={{ background: "var(--surface)", padding: "2px 6px", borderRadius: 6, fontSize: 10 }}>VITE_JUDGE_URL</code> (HF Space gratuito). Submissões salvas em Supabase. Fallback Colab/HF iframe se offline.</div>
          </div>
        </div>
      </div>
    </>
  );
}
