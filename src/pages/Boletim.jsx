import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { ArrowRight, ExternalLink, Mail, RefreshCw, User } from "lucide-react";
import BoletimShell from "../components/BoletimShell.jsx";
import { fetchTodasEdicoes } from "../services/boletim.js";

const L = {
  maxW: 1180,
  px: "clamp(20px, 4vw, 52px)",
  sectionPad: "clamp(56px, 8vh, 96px) clamp(20px, 4vw, 52px)",
  heroPad: "clamp(96px, 12vh, 150px) clamp(20px, 4vw, 52px) clamp(56px, 7vh, 90px)",
};
const EASE = "700ms cubic-bezier(0.32,0.72,0,1)";

const c = {
  card: {
    position: "relative", overflow: "hidden",
    padding: 26, borderRadius: 24,
    border: "1px solid rgba(255,255,255,0.08)",
    background: "var(--surface)",
    boxShadow: "inset 0 1px 1px rgba(255,255,255,0.04)",
  },
  primaryBtn: {
    display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 10,
    height: 44, padding: "4px 4px 4px 20px", border: 0, borderRadius: 999,
    color: "#fff", background: "var(--accent)", cursor: "pointer",
    fontSize: 13.5, fontWeight: 600, fontFamily: "var(--font-body)",
    boxShadow: "0 4px 14px rgba(255,75,31,0.22)", textDecoration: "none",
    transition: `transform ${EASE}, background ${EASE}, box-shadow ${EASE}, filter ${EASE}`
  },
  primaryDot: {
    display: "grid", placeItems: "center", width: 28, height: 28,
    borderRadius: 999, background: "rgba(255,255,255,0.18)", color: "#fff",
  },
  secondaryBtn: {
    display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 10,
    height: 44, padding: "4px 4px 4px 20px", border: "1px solid var(--line)",
    borderRadius: 999, color: "var(--text)",
    background: "rgba(255,255,255,0.02)", cursor: "pointer", textDecoration: "none",
    fontSize: 13.5, fontWeight: 550, fontFamily: "var(--font-body)",
    transition: `transform ${EASE}, border-color ${EASE}, background ${EASE}, box-shadow ${EASE}`
  },
  secondaryDot: {
    display: "grid", placeItems: "center", width: 28, height: 28,
    borderRadius: 999, background: "rgba(255,255,255,0.06)", color: "var(--muted)",
  },
};

function formatData(iso) {
  if (!iso) return "";
  try {
    return new Date(`${iso}T00:00:00`).toLocaleDateString("pt-BR", { day: "2-digit", month: "long", year: "numeric" });
  } catch {
    return iso;
  }
}

function folderOf(path) {
  return (path || "").split("/").pop();
}

export default function Boletim() {
  const [edicoes, setEdicoes] = useState(null);
  const [error, setError] = useState(false);
  const [loading, setLoading] = useState(true);
  const [email, setEmail] = useState("");

  function load() {
    setLoading(true);
    setError(false);
    fetchTodasEdicoes()
      .then(setEdicoes)
      .catch(() => setError(true))
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    document.title = "Boletim — Ligia";
    if ("scrollRestoration" in window.history) window.history.scrollRestoration = "manual";
    window.scrollTo({ top: 0, behavior: "instant" });
    load();
  }, []);

  return (
    <BoletimShell active="boletim">
      {/* HERO + assinatura */}
      <section style={{
        position: "relative", overflow: "hidden",
        background: `
          radial-gradient(circle at 70% -10%, rgba(255,75,31,.07), transparent 38%),
          radial-gradient(circle at 15% 90%, rgba(255,144,104,.04), transparent 40%),
          var(--bg)`
      }}>
        <div style={{ maxWidth: L.maxW, margin: "0 auto", padding: L.heroPad, textAlign: "center" }}>
          <div className="eyebrow-pill" style={{ marginBottom: 22 }}>Boletim Ligia</div>
          <h1 style={{
            margin: "0 auto 22px", maxWidth: 780,
            fontSize: "clamp(38px, 5.6vw, 60px)", lineHeight: 1.06,
            fontWeight: 500, letterSpacing: "-.035em"
          }}>
            Bastidores de IA,<br /><span className="gradient-text">sem o ruído.</span>
          </h1>
          <p style={{
            margin: "0 auto 30px", maxWidth: 560,
            color: "var(--muted)", fontSize: 15, lineHeight: 1.85
          }}>
            A newsletter quinzenal da Ligia com artigos e reflexões sobre inteligência
            artificial, feita pela comunidade. Assine para receber no e-mail, ou leia
            as edições anteriores aqui embaixo.
          </p>
          <form
            onSubmit={e => {
              e.preventDefault();
              const trimmed = email.trim();
              const base = "https://boletimligia.substack.com/subscribe";
              const url = trimmed ? `${base}?email=${encodeURIComponent(trimmed)}` : base;
              window.open(url, "_blank", "noopener,noreferrer");
            }}
            style={{ display: "flex", gap: 8, justifyContent: "center", flexWrap: "wrap", maxWidth: 460, margin: "0 auto" }}
            className="boletim-hero-form"
          >
            <input
              type="email"
              required
              placeholder="voce@exemplo.com"
              value={email}
              onChange={e => setEmail(e.target.value)}
              aria-label="Seu melhor e-mail"
              style={{ flex: 1, minWidth: 200, height: 44, padding: "0 16px", border: "1px solid var(--line)", borderRadius: 999, outline: "none", background: "var(--surface)", color: "var(--text)", fontSize: 14 }}
            />
            <button type="submit" className="landing-btn-primary btn-island group" style={c.primaryBtn}>
              Assinar
              <span className="btn-dot" style={c.primaryDot}>
                <ArrowRight size={15} strokeWidth={1.5} aria-hidden="true" />
              </span>
            </button>
          </form>
          <div style={{ marginTop: 14 }}>
            <a href="https://boletimligia.substack.com/" target="_blank" rel="noreferrer" className="landing-btn-secondary btn-island group"
              style={{ ...c.secondaryBtn, height: 38, padding: "3px 3px 3px 16px", fontSize: 12.5, textDecoration: "none" }}>
              Ler no Substack
              <span className="btn-dot" style={{ ...c.secondaryDot, width: 24, height: 24 }}>
                <ExternalLink size={12} strokeWidth={1.5} aria-hidden="true" />
              </span>
            </a>
          </div>
        </div>
      </section>

      {/* EDIÇÕES */}
      <section style={{ padding: L.sectionPad }}>
        <div style={{ maxWidth: L.maxW, margin: "0 auto" }}>
          {loading && (
            <div style={{ display: "grid", gap: 18 }}>
              {[0, 1].map(i => (
                <div key={i} className="skeleton" style={{ height: 220, borderRadius: 24 }} />
              ))}
            </div>
          )}

          {!loading && error && (
            <div style={{ ...c.card, textAlign: "center", padding: "48px 24px" }}>
              <p style={{ margin: "0 0 18px", color: "var(--muted)", fontSize: 14 }}>
                Não foi possível carregar as edições anteriores agora. Tente de novo em instantes.
              </p>
              <button onClick={load} className="landing-btn-secondary btn-island group" style={{ ...c.secondaryBtn, margin: "0 auto" }}>
                Tentar de novo
                <span className="btn-dot" style={c.secondaryDot}>
                  <RefreshCw size={14} strokeWidth={1.5} aria-hidden="true" />
                </span>
              </button>
            </div>
          )}

          {!loading && !error && edicoes && edicoes.length === 0 && (
            <p style={{ textAlign: "center", color: "var(--muted)", fontSize: 14 }}>
              Nenhuma edição publicada ainda.
            </p>
          )}

          {!loading && !error && edicoes && edicoes.length > 0 && (
            <div style={{ display: "grid", gap: 20 }}>
              {edicoes.map(ed => (
                <article key={ed.path} className="landing-card" style={c.card}>
                  <div className="eyebrow" style={{ marginBottom: 10, color: "var(--muted-2)", fontSize: 11, letterSpacing: ".08em", textTransform: "uppercase" }}>
                    {formatData(ed.data_publicacao)}
                  </div>
                  <h2 style={{ margin: "0 0 12px", fontSize: "clamp(22px, 2.6vw, 28px)", fontWeight: 500, letterSpacing: "-.02em" }}>
                    {ed.titulo}
                  </h2>
                  {ed.introducao && (
                    <p style={{ margin: "0 0 20px", color: "var(--muted)", fontSize: 14, lineHeight: 1.8, maxWidth: 720 }}>
                      {ed.introducao}
                    </p>
                  )}
                  {ed.textos.length > 0 && (
                    <div style={{ display: "grid", gap: 8 }}>
                      {ed.textos.map(t => (
                        <Link
                          key={t.slug}
                          to={`/boletim/${folderOf(ed.path)}/${t.slug}`}
                          className={`boletim-text-row${t.imagem ? " has-image" : ""}`}
                          style={{
                            display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12,
                            padding: "16px 18px", borderRadius: 14, textDecoration: "none",
                            minHeight: t.imagem ? 92 : undefined,
                            border: "1px solid rgba(255,255,255,0.06)",
                            background: t.imagem
                              ? `linear-gradient(100deg, rgba(15,14,12,.95) 0%, rgba(15,14,12,.87) 40%, rgba(15,14,12,.32) 100%), url(${t.imagem}) center/cover no-repeat`
                              : "var(--bg)",
                          }}
                        >
                          <span style={{ display: "grid", gap: 3 }}>
                            <span style={{ color: "var(--text)", fontSize: 14.5, fontWeight: 550, letterSpacing: "-.01em" }}>
                              {t.titulo}
                            </span>
                            {t.autor && (
                              <span style={{ display: "inline-flex", alignItems: "center", gap: 6, color: "var(--muted-2)", fontSize: 12 }}>
                                <User size={11} strokeWidth={1.5} aria-hidden="true" /> {t.autor}{t.colunaConvidado ? " · convidado(a)" : ""}
                              </span>
                            )}
                          </span>
                          <ArrowRight size={16} strokeWidth={1.5} aria-hidden="true" style={{ color: "var(--muted)", flexShrink: 0 }} />
                        </Link>
                      ))}
                    </div>
                  )}
                </article>
              ))}
            </div>
          )}
        </div>
      </section>

      <style>{`
        .boletim-text-row { transition: border-color ${EASE}, background ${EASE}, filter ${EASE}, transform ${EASE}; }
        @media (hover: hover) and (pointer: fine) {
          .boletim-text-row:not(.has-image):hover { border-color: var(--accent-border) !important; background: var(--surface-2) !important; transform: translateX(2px); }
          .boletim-text-row.has-image:hover { border-color: var(--accent-border) !important; filter: brightness(1.12); transform: translateX(2px); }
        }
        @media (max-width: 480px) {
          .boletim-hero-form { flex-direction: column; }
          .boletim-hero-form button { width: 100%; justify-content: center; }
        }
      `}</style>
    </BoletimShell>
  );
}
