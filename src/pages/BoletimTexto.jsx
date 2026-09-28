import { useState, useEffect } from "react";
import { useParams, Link } from "react-router-dom";
import { ArrowLeft, ArrowRight, ExternalLink, RefreshCw, User } from "lucide-react";
import BoletimShell from "../components/BoletimShell.jsx";
import MarkdownViewer from "../components/MarkdownViewer.jsx";
import { fetchEdicaoMetadata, fetchTexto } from "../services/boletim.js";

const L = {
  maxW: 760,
  px: "clamp(20px, 4vw, 52px)",
  pad: "clamp(120px, 14vh, 160px) clamp(20px, 4vw, 52px) clamp(56px, 8vh, 96px)",
};
const EASE = "700ms cubic-bezier(0.32,0.72,0,1)";

const c = {
  secondaryBtn: {
    display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 10,
    height: 40, padding: "4px 4px 4px 18px", border: "1px solid var(--line)",
    borderRadius: 999, color: "var(--text)",
    background: "rgba(255,255,255,0.02)", cursor: "pointer", textDecoration: "none",
    fontSize: 13, fontWeight: 550, fontFamily: "var(--font-body)",
    transition: `transform ${EASE}, border-color ${EASE}, background ${EASE}, box-shadow ${EASE}`
  },
  secondaryDot: {
    display: "grid", placeItems: "center", width: 26, height: 26,
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

export default function BoletimTexto() {
  const { edicao, slug } = useParams();
  const path = `boletins/${edicao}`;
  const [metadata, setMetadata] = useState(null);
  const [texto, setTexto] = useState(null);
  const [error, setError] = useState(false);
  const [loading, setLoading] = useState(true);

  function load() {
    setLoading(true);
    setError(false);
    Promise.all([fetchEdicaoMetadata(path), fetchTexto(path, slug)])
      .then(([m, t]) => { setMetadata(m); setTexto(t); })
      .catch(() => setError(true))
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "instant" });
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [edicao, slug]);

  useEffect(() => {
    document.title = texto ? `${texto.titulo} — Boletim Ligia` : "Boletim — Ligia";
  }, [texto]);

  const ordem = metadata?.textos || [];
  const idx = ordem.indexOf(slug);
  const prevSlug = idx > 0 ? ordem[idx - 1] : null;
  const nextSlug = idx >= 0 && idx < ordem.length - 1 ? ordem[idx + 1] : null;

  return (
    <BoletimShell active="boletim">
      <section style={{ padding: L.pad }}>
        <div style={{ maxWidth: L.maxW, margin: "0 auto" }}>
          <div style={{ marginBottom: 28 }}>
            <Link to="/boletim" className="boletim-back" style={{
              display: "inline-flex", alignItems: "center", gap: 8,
              color: "var(--muted)", fontSize: 13, textDecoration: "none", fontWeight: 500
            }}>
              <ArrowLeft size={14} strokeWidth={1.5} aria-hidden="true" /> Todas as edições
            </Link>
          </div>

          {loading && (
            <div style={{ display: "grid", gap: 14 }}>
              <div className="skeleton" style={{ height: 34, width: "70%", borderRadius: 8 }} />
              <div className="skeleton" style={{ height: 16, width: "40%", borderRadius: 8 }} />
              <div className="skeleton" style={{ height: 220, borderRadius: 16, marginTop: 12 }} />
            </div>
          )}

          {!loading && error && (
            <div style={{ textAlign: "center", padding: "48px 24px", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 24, background: "var(--surface)" }}>
              <p style={{ margin: "0 0 18px", color: "var(--muted)", fontSize: 14 }}>
                Não foi possível carregar este texto agora. Tente de novo em instantes.
              </p>
              <button onClick={load} className="landing-btn-secondary btn-island group" style={{ ...c.secondaryBtn, margin: "0 auto" }}>
                Tentar de novo
                <span className="btn-dot" style={c.secondaryDot}>
                  <RefreshCw size={13} strokeWidth={1.5} aria-hidden="true" />
                </span>
              </button>
            </div>
          )}

          {!loading && !error && texto && (
            <>
              {texto.imagem && (
                <div style={{
                  position: "relative", marginBottom: 28, borderRadius: 24, overflow: "hidden",
                  border: "1px solid rgba(255,255,255,0.08)", boxShadow: "0 24px 56px rgba(0,0,0,0.38)"
                }}>
                  <img src={texto.imagem} alt="" style={{ width: "100%", height: "clamp(200px, 32vw, 340px)", objectFit: "cover", display: "block" }} />
                  <div style={{
                    position: "absolute", inset: 0,
                    background: "linear-gradient(180deg, rgba(15,14,12,0) 40%, rgba(15,14,12,.55) 100%)"
                  }} />
                </div>
              )}
              {metadata?.titulo && (
                <div className="eyebrow-pill" style={{ marginBottom: 18 }}>
                  {metadata.titulo}{metadata.data_publicacao ? ` · ${formatData(metadata.data_publicacao)}` : ""}
                </div>
              )}
              <h1 style={{ margin: "0 0 14px", fontSize: "clamp(28px, 4vw, 40px)", fontWeight: 500, letterSpacing: "-.03em", lineHeight: 1.12 }}>
                {texto.titulo}
              </h1>
              {texto.autor && (
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 28, color: "var(--muted)", fontSize: 13.5 }}>
                  <User size={14} strokeWidth={1.5} aria-hidden="true" style={{ color: "var(--accent)" }} />
                  {texto.autorUrl ? (
                    <a href={texto.autorUrl} target="_blank" rel="noreferrer" style={{ color: "var(--muted)" }}>{texto.autor}</a>
                  ) : (
                    <span>{texto.autor}</span>
                  )}
                  {texto.colunaConvidado && (
                    <span style={{
                      fontSize: 11, fontWeight: 600, letterSpacing: ".04em", textTransform: "uppercase",
                      color: "var(--accent)", background: "var(--accent-soft)", border: "1px solid var(--accent-border)",
                      padding: "2px 8px", borderRadius: 999
                    }}>Coluna convidada</span>
                  )}
                </div>
              )}
              {texto.minibio && (
                <p style={{ margin: "-16px 0 28px", color: "var(--muted-2)", fontSize: 12.5, lineHeight: 1.7, fontStyle: "italic" }}>
                  {texto.minibio}
                </p>
              )}

              <MarkdownViewer content={texto.corpo} />

              {texto.fonte && (
                <p style={{ marginTop: 28, fontSize: 12.5 }}>
                  <a href={texto.fonte} target="_blank" rel="noreferrer" style={{ color: "var(--muted)", display: "inline-flex", alignItems: "center", gap: 6 }}>
                    Fonte <ExternalLink size={11} strokeWidth={1.5} aria-hidden="true" />
                  </a>
                </p>
              )}

              {(prevSlug || nextSlug) && (
                <div style={{ display: "flex", justifyContent: "space-between", gap: 12, marginTop: 48, paddingTop: 24, borderTop: "1px solid var(--line-soft)" }}>
                  {prevSlug ? (
                    <Link to={`/boletim/${edicao}/${prevSlug}`} style={{ color: "var(--muted)", fontSize: 13, textDecoration: "none", display: "inline-flex", alignItems: "center", gap: 6 }}>
                      <ArrowLeft size={13} strokeWidth={1.5} aria-hidden="true" /> Texto anterior
                    </Link>
                  ) : <span />}
                  {nextSlug && (
                    <Link to={`/boletim/${edicao}/${nextSlug}`} style={{ color: "var(--muted)", fontSize: 13, textDecoration: "none", display: "inline-flex", alignItems: "center", gap: 6 }}>
                      Próximo texto <ArrowRight size={13} strokeWidth={1.5} aria-hidden="true" />
                    </Link>
                  )}
                </div>
              )}
            </>
          )}
        </div>
      </section>

      <style>{`
        .boletim-back { transition: color ${EASE}; }
        .boletim-back:hover { color: var(--text) !important; }
      `}</style>
    </BoletimShell>
  );
}
