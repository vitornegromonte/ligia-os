import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import {
  ArrowRight, Mail, MapPin, GraduationCap,
  FileText, Users, User, MessageCircle, Sparkles
} from "lucide-react";
import { useAuth } from "../contexts/AuthContext.jsx";

// — Mesmos tokens da landing —
const L = {
  maxW: 1180,
  px: "clamp(20px, 4vw, 52px)",
  sectionPad: "clamp(140px, 15vh, 210px) clamp(20px, 4vw, 52px)",
  heroPad: "clamp(96px, 12vh, 150px) clamp(20px, 4vw, 52px) clamp(96px, 10vh, 130px)",
};
const EASE = "700ms cubic-bezier(0.32,0.72,0,1)";

const steps = [
  {
    icon: FileText,
    title: "Inscrição",
    desc: "Preencha o formulário de inscrição com seus dados, curso, período e uma breve apresentação, com o motivo pelo qual quer entrar para a Ligia.",
  },
  {
    icon: Users,
    title: "Desafio em Grupo",
    desc: "Um desafio prático resolvido em equipe, para avaliar como você colabora, comunica ideias e conduz problemas sob pressão.",
  },
  {
    icon: User,
    title: "Desafio Individual",
    desc: "Um desafio individual para avaliar suas habilidades técnicas e sua capacidade de organizar e resolver um problema sozinho.",
  },
  {
    icon: MessageCircle,
    title: "Entrevista",
    desc: "Uma conversa leve para conhecermos você melhor: trajetória, expectativas e o que quer construir conosco. Resultado por e-mail.",
  },
];

const requirements = [
  {
    label: "Vínculo com uma universidade",
    text: "Apenas 10% das vagas são destinadas a estudantes de fora da UFPE.",
  },
  {
    label: "Experiência com programação",
    text: "Preferencialmente com Python.",
  },
  {
    label: "Disponibilidade de 10h semanais",
    text: "Para participar das atividades da liga.",
  },
];

const faq = [
  {
    q: "Preciso saber programar para entrar?",
    a: "Sim. Experiência com programação é requisito do processo, preferencialmente com Python. Não exigimos um nível avançado, mas é importante ter prática com código.",
  },
  {
    q: "Quando abrem as inscrições?",
    a: "O processo seletivo acontece uma vez por ano, entre novembro e dezembro. As datas são divulgadas nas redes da liga e nesta página.",
  },
  {
    q: "Sou de outra universidade, posso me candidatar?",
    a: "Sim, mas apenas 10% das vagas são destinadas a estudantes de fora da UFPE.",
  },
  {
    q: "Como fico sabendo do resultado?",
    a: "O resultado é enviado por e-mail para todos os inscritos, aprovados ou não, após o término das entrevistas.",
  },
];

export default function ProcessoSeletivo() {
  const { session } = useAuth();
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    document.title = "Processo Seletivo — Ligia";
    if ("scrollRestoration" in window.history) window.history.scrollRestoration = "manual";
    window.scrollTo({ top: 0, behavior: "instant" });
  }, []);

  const c = {
    navLink: {
      position: "relative", border: 0, background: "none", color: "var(--muted)", cursor: "pointer",
      fontSize: 13, fontWeight: 500, padding: "6px 2px", textDecoration: "none",
      fontFamily: "var(--font-body)", transition: `color ${EASE}`
    },
    card: {
      position: "relative", overflow: "hidden",
      padding: 26, borderRadius: 24,
      border: "1px solid rgba(255,255,255,0.08)",
      background: "var(--surface)",
      boxShadow: "inset 0 1px 1px rgba(255,255,255,0.04)",
      transition: `transform ${EASE}, border-color ${EASE}, box-shadow ${EASE}`
    },
    iconTile: {
      display: "grid", placeItems: "center", width: 42, height: 42,
      marginBottom: 18, borderRadius: 12,
      background: "var(--accent-soft)",
      color: "var(--accent)", border: "1px solid var(--accent-border)",
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
    }
  };

  return (
    <div style={{ minHeight: "100vh", background: "var(--bg)", color: "var(--text)" }}>

      {/* NAV — floating island pill, igual à landing */}
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
              <Link to="/processo-seletivo" style={{ ...c.navLink, color: "var(--text)" }}>Processo Seletivo</Link>
            </nav>

            <div style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 10 }}>
              <Link to={session ? "/inicio" : "/login"} className="landing-btn-primary btn-island group" style={{ ...c.primaryBtn, fontSize: 13 }}>
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
            <Link to="/processo-seletivo" className="landing-menu-item" style={{ ...c.navLink, color: "var(--text)", textAlign: "left", padding: "12px 14px", fontSize: 15, borderRadius: 12, ["--d"]: "150ms" }}>Processo Seletivo</Link>
          </nav>
        )}
      </div>

      {/* HERO */}
      <section style={{
        position: "relative", overflow: "hidden",
        background: `
          radial-gradient(circle at 70% -10%, rgba(255,75,31,.07), transparent 38%),
          radial-gradient(circle at 15% 90%, rgba(255,144,104,.04), transparent 40%),
          var(--bg)`
      }}>
        <div style={{ maxWidth: L.maxW, margin: "0 auto", padding: L.heroPad, textAlign: "center" }}>
          <div className="eyebrow-pill" style={{ marginBottom: 22 }}>
            Processo Seletivo
          </div>
          <h1 style={{
            margin: "0 auto 22px", maxWidth: 780,
            fontSize: "clamp(40px, 6vw, 68px)", lineHeight: 1.04,
            fontWeight: 500, letterSpacing: "-.035em"
          }}>
            Faça parte de uma<br />
            <span className="gradient-text">comunidade de IA.</span>
          </h1>
          <p style={{
            margin: "0 auto 34px", maxWidth: 540,
            color: "var(--muted)", fontSize: 15, lineHeight: 1.85
          }}>
            A Ligia abre as portas para novos membros uma vez por ano.
            Veja como funciona o processo e candidate-se para estudar, construir
            e divulgar inteligência artificial em comunidade.
          </p>
          <div style={{ display: "flex", justifyContent: "center", gap: 12, flexWrap: "wrap", alignItems: "center" }}>
            <Link to="/register" className="landing-btn-primary btn-island group" style={c.primaryBtn}>
              Quero participar
              <span className="btn-dot" style={c.primaryDot}>
                <ArrowRight size={15} strokeWidth={1.5} aria-hidden="true" />
              </span>
            </Link>
            <a href="#etapas" className="landing-btn-secondary btn-island group" style={c.secondaryBtn}>
              Como funciona
              <span className="btn-dot" style={c.secondaryDot}>
                <ArrowRight size={15} strokeWidth={1.5} aria-hidden="true" />
              </span>
            </a>
          </div>
        </div>
      </section>

      {/* ETAPAS */}
      <section id="etapas" style={{ padding: L.sectionPad, scrollMarginTop: "80px" }}>
        <div style={{ maxWidth: L.maxW, margin: "0 auto" }}>
          <div style={{ maxWidth: 640, marginBottom: 48 }}>
            <h2 style={{ margin: "0 0 14px", fontSize: "clamp(30px, 4vw, 44px)", fontWeight: 500, letterSpacing: "-.03em", lineHeight: 1.1 }}>
              Quatro etapas até entrar na liga.
            </h2>
            <p style={{ margin: 0, color: "var(--muted)", fontSize: 15, lineHeight: 1.85 }}>
              Um processo leve, transparente e pensado para encontrar quem
              realmente quer construir IA junto com a gente.
            </p>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: 18 }}>
            {steps.map(step => (
              <div key={step.title} className="landing-card" style={{ ...c.card, height: "100%", display: "flex", flexDirection: "column" }}>
                <div style={c.iconTile}>
                  <step.icon size={18} strokeWidth={1.5} aria-hidden="true" />
                </div>
                <h3 style={{ margin: "0 0 8px", fontSize: 16, fontWeight: 600, letterSpacing: "-.01em" }}>
                  {step.title}
                </h3>
                <p style={{ margin: 0, color: "var(--muted)", fontSize: 13, lineHeight: 1.7 }}>
                  {step.desc}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* REQUISITOS */}
      <section style={{ padding: L.sectionPad, background: "var(--surface)" }}>
        <div style={{ maxWidth: L.maxW, margin: "0 auto", display: "grid", gridTemplateColumns: "1fr 1.4fr", gap: 48, alignItems: "center" }} className="ps-split">
          <div>
            <h2 style={{ margin: "0 0 14px", fontSize: "clamp(30px, 4vw, 44px)", fontWeight: 500, letterSpacing: "-.03em", lineHeight: 1.1 }}>
              O que buscamos em você.
            </h2>
            <p style={{ margin: 0, color: "var(--muted)", fontSize: 15, lineHeight: 1.85 }}>
              Buscamos pessoas com prática em código e vontade de aprender
              e de contribuir. Conhecimento técnico em IA não é pré-requisito,
              mas experiência com programação, sim.
            </p>
          </div>
          <div style={{ display: "grid", gap: 10 }}>
            {requirements.map(req => (
              <div key={req.label} style={{
                display: "flex", alignItems: "flex-start", gap: 12,
                padding: "16px 18px", borderRadius: 14,
                border: "1px solid rgba(255,255,255,0.08)", background: "var(--bg)"
              }}>
                <Sparkles size={16} strokeWidth={1.5} aria-hidden="true" style={{ color: "var(--accent)", flexShrink: 0, marginTop: 2 }} />
                <span style={{ fontSize: 14, lineHeight: 1.6, color: "var(--text)" }}>
                  <strong>{req.label}.</strong> {req.text}
                </span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section style={{ padding: L.sectionPad }}>
        <div style={{ maxWidth: 760, margin: "0 auto" }}>
          <div style={{ marginBottom: 48, textAlign: "center" }}>
            <h2 style={{ margin: "0 0 14px", fontSize: "clamp(30px, 4vw, 44px)", fontWeight: 500, letterSpacing: "-.03em", lineHeight: 1.1 }}>
              Perguntas frequentes.
            </h2>
          </div>
          <div style={{ display: "grid", gap: 10 }}>
            {faq.map(item => (
              <details key={item.q} style={{
                padding: "18px 20px", borderRadius: 14,
                border: "1px solid rgba(255,255,255,0.08)", background: "var(--surface)"
              }}>
                <summary style={{
                  cursor: "pointer", fontSize: 14, fontWeight: 600,
                  fontFamily: "var(--font-heading)", letterSpacing: "-.01em",
                  listStyle: "none", display: "flex", alignItems: "center",
                  justifyContent: "space-between", gap: 12
                }}>
                  {item.q}
                  <span style={{ color: "var(--muted)", fontSize: 12, flexShrink: 0 }}>+</span>
                </summary>
                <p style={{ margin: "12px 0 0", color: "var(--muted)", fontSize: 13, lineHeight: 1.7 }}>
                  {item.a}
                </p>
              </details>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section style={{ padding: L.sectionPad, scrollMarginTop: "80px" }}>
        <div style={{ maxWidth: L.maxW, margin: "0 auto" }}>
          <div className="landing-cta" style={{
            padding: "clamp(48px, 7vw, 88px) clamp(28px, 5vw, 64px)", textAlign: "center",
            borderRadius: 24,
            border: "1px solid rgba(255,255,255,0.08)",
            background: `radial-gradient(circle at 50% 130%, rgba(255,75,31,.08), transparent 62%), var(--surface-2)`,
            boxShadow: "inset 0 1px 1px rgba(255,255,255,0.04)",
            position: "relative", overflow: "hidden"
          }}>
            <div className="eyebrow-pill" style={{ marginBottom: 20 }}>Inscrições anuais</div>
            <h2 style={{
              margin: "0 auto 14px", maxWidth: 600,
              fontSize: "clamp(30px, 4vw, 46px)", fontWeight: 500, letterSpacing: "-.03em", lineHeight: 1.08
            }}>
              Pronto para o próximo passo?
            </h2>
            <p style={{ margin: "0 auto 32px", maxWidth: 440, color: "var(--muted)", fontSize: 15, lineHeight: 1.85 }}>
              Deixe seus dados que avisamos quando o processo seletivo abrir.
              A inscrição é gratuita.
            </p>
            <div style={{ display: "flex", justifyContent: "center", gap: 12, flexWrap: "wrap", alignItems: "center" }}>
              <Link to="/register" className="landing-btn-primary btn-island group" style={c.primaryBtn}>
                Quero participar
                <span className="btn-dot" style={c.primaryDot}>
                  <ArrowRight size={15} strokeWidth={1.5} aria-hidden="true" />
                </span>
              </Link>
              <Link to="/" className="landing-btn-secondary btn-island group" style={c.secondaryBtn}>
                Voltar ao início
                <span className="btn-dot" style={c.secondaryDot}>
                  <ArrowRight size={15} strokeWidth={1.5} aria-hidden="true" />
                </span>
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* FOOTER */}
      <footer style={{ borderTop: "1px solid var(--line-soft)", background: "var(--surface)" }}>
        <div className="gradient-bar" style={{ width: "100%", height: 2 }} />
        <div style={{ maxWidth: L.maxW, margin: "0 auto", padding: `40px ${L.px} 36px` }}>
          <div style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap", color: "var(--muted-2)", fontSize: 13 }}>
            <span>Liga Acadêmica de Inteligência Artificial</span>
            <div style={{ display: "grid", gap: 8 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 9 }}>
                <Mail size={14} strokeWidth={1.5} aria-hidden="true" style={{ color: "var(--accent)" }} /> contato@ligia.ai
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 9 }}>
                <MapPin size={14} strokeWidth={1.5} aria-hidden="true" style={{ color: "var(--accent)" }} /> CIn · UFPE, Recife
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 9 }}>
                <GraduationCap size={14} strokeWidth={1.5} aria-hidden="true" style={{ color: "var(--accent)" }} /> Vínculo acadêmico
              </div>
            </div>
          </div>
          <div style={{
            marginTop: 24, paddingTop: 16, borderTop: "1px solid var(--line-soft)",
            display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap",
            color: "var(--muted-3)", fontSize: 12
          }}>
            <span>© {new Date().getFullYear()} Ligia. Todos os direitos reservados.</span>
            <span>Inteligência artificial em comunidade.</span>
          </div>
        </div>
      </footer>

      <style>{`
        .eyebrow-pill {
          display: inline-flex; align-items: center; gap: 8px;
          font-family: var(--font-heading); font-size: 10px; font-weight: 500;
          letter-spacing: .2em; text-transform: uppercase; color: var(--muted);
          border: 1px solid var(--line-soft); background: rgba(255,255,255,0.02);
          border-radius: 999px; padding: 6px 14px;
        }
        .eyebrow-pill::before {
          content: ""; width: 5px; height: 5px; border-radius: 999px;
          background: var(--accent); flex: 0 0 auto;
        }
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
        @media (max-width: 820px) {
          .ps-split { grid-template-columns: 1fr !important; }
        }
      `}</style>
    </div>
  );
}