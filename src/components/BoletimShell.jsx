import { useState } from "react";
import { Link } from "react-router-dom";
import { ArrowRight, Mail, MapPin } from "lucide-react";
import { homeFor } from "../auth/access.js";
import { useAuth } from "../contexts/AuthContext.jsx";

// Header/rodapé compartilhados entre /boletim e /boletim/:edicao/:slug —
// mesma "ilha" flutuante e mesmos tokens da Landing e do Processo Seletivo.
const L = { maxW: 1180, px: "clamp(20px, 4vw, 52px)" };
const EASE = "700ms cubic-bezier(0.32,0.72,0,1)";

const c = {
  navLink: {
    position: "relative", border: 0, background: "none", color: "var(--muted)", cursor: "pointer",
    fontSize: 13, fontWeight: 500, padding: "6px 2px", textDecoration: "none",
    fontFamily: "var(--font-body)", transition: `color ${EASE}`
  },
  primaryBtn: {
    display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 10,
    height: 44, padding: "4px 4px 4px 20px", border: 0, borderRadius: 999,
    color: "#fff", background: "var(--accent)", cursor: "pointer",
    fontSize: 16, fontWeight: 600, fontFamily: "var(--font-body)",
    boxShadow: "0 4px 14px rgba(255,75,31,0.22)", textDecoration: "none",
    transition: `transform ${EASE}, background ${EASE}, box-shadow ${EASE}, filter ${EASE}`
  },
  primaryDot: {
    display: "grid", placeItems: "center", width: 28, height: 28,
    borderRadius: 999, background: "rgba(255,255,255,0.18)", color: "#fff",
  },
};

export default function BoletimShell({ active, children }) {
  const { session, profile } = useAuth();
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <div style={{ minHeight: "100vh", background: "var(--bg)", color: "var(--text)" }}>

      {/* NAV — ilha flutuante, igual à landing */}
      <div style={{ position: "sticky", top: 0, zIndex: 40, paddingTop: 18, paddingLeft: 16, paddingRight: 16, pointerEvents: "none" }}>
        <header className="landing-island" style={{
          pointerEvents: "auto",
          maxWidth: L.maxW, margin: "0 auto",
          border: "1px solid rgba(255,255,255,0.12)",
          borderRadius: 999,
          background: "rgba(15,14,12,.55)", backdropFilter: "blur(24px) saturate(160%)", WebkitBackdropFilter: "blur(24px) saturate(160%)",
          boxShadow: "inset 0 1px 1px rgba(255,255,255,0.08), 0 12px 40px rgba(0,0,0,0.35)",
        }}>
          <div style={{
            maxWidth: "100%", margin: "0 auto", padding: "0 10px 0 clamp(20px, 4vw, 32px)",
            height: 60, display: "flex", alignItems: "center", gap: 14
          }}>
            <Link to="/" style={{ display: "flex", alignItems: "center", gap: 11, textDecoration: "none" }}>
              <img src="/media/logo.svg" alt="Ligia" style={{ height: 30, width: "auto" }} />
              <span style={{
                fontFamily: "var(--font-heading)", fontSize: 17, fontWeight: 600,
                letterSpacing: "-.02em", color: "var(--text)"
              }}>Ligia</span>
            </Link>

            <nav className="landing-nav" style={{ display: "flex", gap: 22, marginLeft: 34, alignItems: "center" }}>
              <Link to="/" style={c.navLink}>Início</Link>
              <Link to="/boletim" style={{ ...c.navLink, color: active === "boletim" ? "var(--text)" : c.navLink.color }}>Boletim</Link>
            </nav>

            <div style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 10 }}>
              <Link to={session ? homeFor(profile) : "/login"} className="landing-btn-primary btn-island group" style={c.primaryBtn}>
                {session ? "Abrir Ligia OS" : "Login"}
                <span className="btn-dot" style={c.primaryDot}>
                  <ArrowRight size={15} strokeWidth={1.5} aria-hidden="true" />
                </span>
              </Link>
              <button onClick={() => setMenuOpen(o => !o)} aria-label={menuOpen ? "Fechar menu" : "Abrir menu"} aria-expanded={menuOpen}
                className="landing-burger"
                style={{
                  display: "none", placeItems: "center", width: 42, height: 42,
                  border: 0, borderRadius: 999, background: "rgba(255,255,255,0.06)",
                  color: "var(--text)", cursor: "pointer", position: "relative",
                }}>
                <span aria-hidden="true" style={{
                  position: "absolute", left: 12, right: 12, height: 1.5, borderRadius: 2,
                  background: "currentColor",
                  transform: menuOpen ? "translateY(0) rotate(45deg)" : "translateY(-4px)",
                  transition: `transform ${EASE}`,
                }} />
                <span aria-hidden="true" style={{
                  position: "absolute", left: 12, right: 12, height: 1.5, borderRadius: 2,
                  background: "currentColor",
                  transform: menuOpen ? "translateY(0) rotate(-45deg)" : "translateY(4px)",
                  transition: `transform ${EASE}`,
                }} />
              </button>
            </div>
          </div>
        </header>
        {menuOpen && (
          <nav className="landing-nav-mobile landing-menu-open" style={{
            pointerEvents: "auto",
            display: "none", maxWidth: L.maxW, margin: "10px auto 0",
            padding: "14px", borderRadius: 24,
            border: "1px solid rgba(255,255,255,0.12)",
            background: "rgba(15,14,12,.92)",
            flexDirection: "column", gap: 4
          }}>
            <Link to="/" className="landing-menu-item" style={{ ...c.navLink, textAlign: "left", padding: "12px 14px", fontSize: 15, borderRadius: 12, ["--d"]: "100ms" }}>Início</Link>
            <Link to="/boletim" className="landing-menu-item" style={{ ...c.navLink, color: "var(--text)", textAlign: "left", padding: "12px 14px", fontSize: 15, borderRadius: 12, ["--d"]: "150ms" }}>Boletim</Link>
          </nav>
        )}
      </div>

      {children}

      {/* FOOTER */}
      <footer style={{ borderTop: "1px solid var(--line-soft)", background: "var(--surface)" }}>
        <div className="gradient-bar" style={{ width: "100%", height: 2 }} />
        <div style={{ maxWidth: L.maxW, margin: "0 auto", padding: `40px ${L.px} 36px` }}>
          <div style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap", color: "var(--muted-2)", fontSize: 13 }}>
            <span>Liga Acadêmica de Inteligência Artificial</span>
            <div style={{ display: "grid", gap: 8 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 9 }}>
                <Mail size={14} strokeWidth={1.5} aria-hidden="true" style={{ color: "var(--accent)" }} /> ligia@cin.ufpe.br
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 9 }}>
                <MapPin size={14} strokeWidth={1.5} aria-hidden="true" style={{ color: "var(--accent)" }} /> CIn · UFPE, Recife
              </div>
            </div>
          </div>
          <div style={{
            marginTop: 24, paddingTop: 16, borderTop: "1px solid var(--line-soft)",
            display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap",
            color: "var(--muted-3)", fontSize: 12
          }}>
            <span>© {new Date().getFullYear()} Ligia. Todos os direitos reservados.</span>
            <span>Conexão que inspira o futuro.</span>
          </div>
        </div>
      </footer>

      <style>{`
        .btn-island:active { transform: scale(0.98); }
        .btn-island .btn-dot { transition: transform 700ms cubic-bezier(0.32,0.72,0,1); }
        .landing-btn-primary { transition: transform 700ms cubic-bezier(0.32,0.72,0,1), box-shadow 700ms cubic-bezier(0.32,0.72,0,1), filter 700ms cubic-bezier(0.32,0.72,0,1), background 700ms cubic-bezier(0.32,0.72,0,1); }
        .landing-btn-secondary { transition: transform 700ms cubic-bezier(0.32,0.72,0,1), border-color 700ms cubic-bezier(0.32,0.72,0,1), background 700ms cubic-bezier(0.32,0.72,0,1), box-shadow 700ms cubic-bezier(0.32,0.72,0,1); }
        @media (hover: hover) and (pointer: fine) {
          .landing-btn-primary:hover { transform: translateY(-1.5px); box-shadow: 0 10px 28px rgba(255,75,31,.32), 0 2px 8px rgba(0,0,0,0.12); filter: brightness(1.06); }
          .landing-btn-primary:hover .btn-dot, .landing-btn-secondary:hover .btn-dot { transform: translate(2px, -2px) scale(1.05); }
          .landing-btn-secondary:hover { transform: translateY(-1.5px); border-color: var(--accent-border) !important; background: var(--surface-2) !important; box-shadow: 0 6px 20px rgba(0,0,0,0.10); }
          .landing-card:hover { transform: translateY(-4px); border-color: var(--line) !important; }
        }
        .landing-btn-primary:active, .landing-btn-secondary:active { transform: scale(0.98); }
        .landing-card { transition: transform 700ms cubic-bezier(0.32,0.72,0,1), border-color 700ms cubic-bezier(0.32,0.72,0,1), box-shadow 700ms cubic-bezier(0.32,0.72,0,1); }
        .landing-menu-open { animation: menuIn 700ms cubic-bezier(0.32,0.72,0,1); }
        @keyframes menuIn { from { opacity: 0; transform: translateY(-10px); } to { opacity: 1; transform: translateY(0); } }
        .landing-menu-item { opacity: 0; transform: translateY(12px); animation: menuItemIn 700ms cubic-bezier(0.32,0.72,0,1) forwards; animation-delay: var(--d, 100ms); }
        @keyframes menuItemIn { to { opacity: 1; transform: translateY(0); } }
        .landing-menu-item:hover { background: rgba(255,255,255,0.04); color: var(--text) !important; }
        @media (prefers-reduced-motion: reduce) {
          .landing-btn-primary, .landing-btn-secondary, .landing-card, .landing-menu-item { animation: none !important; transition: none !important; }
        }
        @media (max-width: 900px) {
          .landing-nav { display: none !important; }
          .landing-burger { display: grid !important; }
          .landing-nav-mobile { display: flex !important; }
          .landing-island { border-radius: 24px !important; }
        }
      `}</style>
    </div>
  );
}
