import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import {
  ArrowRight, Menu, X, Mail, MapPin, GraduationCap,
  FileText, Users, User, MessageCircle, Sparkles
} from "lucide-react";
import { useAuth } from "../contexts/AuthContext.jsx";

const steps = [
  {
    icon: FileText,
    title: "1 · Inscrição",
    desc: "Preencha o formulário de inscrição com seus dados, curso, período e uma breve apresentação — o motivo pelo qual quer entrar para a Ligia.",
  },
  {
    icon: Users,
    title: "2 · Desafio em Grupo",
    desc: "Um desafio prático resolvido em equipe, para avaliar como você colabora, comunica ideias e conduz problemas sob pressão.",
  },
  {
    icon: User,
    title: "3 · Desafio Individual",
    desc: "Um desafio individual para avaliar suas habilidades técnicas e sua capacidade de organizar e resolver um problema sozinho.",
  },
  {
    icon: MessageCircle,
    title: "4 · Entrevista",
    desc: "Uma conversa leve para conhecermos você melhor: sua trajetória, expectativas e o que quer construir conosco. Divulgamos o resultado por e-mail.",
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
    window.scrollTo({ top: 0 });
  }, []);

  const c = {
    navLink: {
      border: 0, background: "none", color: "var(--muted)", cursor: "pointer",
      fontSize: 13, fontWeight: 500, padding: "6px 2px",
      fontFamily: "var(--font-body)", transition: "color var(--transition)"
    },
    primaryBtn: {
      display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 8,
      height: 44, padding: "0 26px", border: 0, borderRadius: "var(--radius-sm)",
      color: "#fff", background: "var(--accent)", cursor: "pointer",
      fontSize: 14, fontWeight: 600, fontFamily: "var(--font-body)",
      textDecoration: "none", transition: "background var(--transition)"
    },
    secondaryBtn: {
      display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 8,
      height: 44, padding: "0 26px", border: "1px solid var(--line)",
      borderRadius: "var(--radius-sm)", color: "var(--text)",
      background: "transparent", cursor: "pointer", textDecoration: "none",
      fontSize: 14, fontWeight: 550, fontFamily: "var(--font-body)",
      transition: "border-color var(--transition)"
    }
  };

  return (
    <div style={{ minHeight: "100vh", background: "var(--bg)", color: "var(--text)" }}>

      {/* NAV */}
      <header style={{
        position: "sticky", top: 0, zIndex: 40,
        borderBottom: "1px solid rgba(55,48,37,.72)",
        background: "rgba(15,14,12,.82)", backdropFilter: "blur(18px)"
      }}>
        <div style={{
          maxWidth: 1180, margin: "0 auto", padding: "0 28px",
          height: 68, display: "flex", alignItems: "center", gap: 14
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
            <Link to="/processo-seletivo" style={{ ...c.navLink, color: "var(--accent)" }}>Processo Seletivo</Link>
          </nav>

          <div style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 10 }}>
            <Link to={session ? "/inicio" : "/login"} style={{
              display: "inline-flex", alignItems: "center", gap: 6,
              padding: "9px 20px", border: 0, borderRadius: "var(--radius-sm)",
              color: "#fff", background: "var(--accent)", cursor: "pointer",
              fontSize: 13, fontWeight: 600, fontFamily: "var(--font-body)",
              textDecoration: "none", transition: "background var(--transition)"
            }}>
              {session ? "Abrir Ligia OS" : "Login"} <ArrowRight size={14} />
            </Link>
            <button onClick={() => setMenuOpen(o => !o)} aria-label="Menu"
              style={{
                display: "none", placeItems: "center", width: 36, height: 36,
                border: 0, borderRadius: 9, background: "var(--surface-2)",
                color: "var(--text)", cursor: "pointer"
              }}>
              {menuOpen ? <X size={18} /> : <Menu size={18} />}
            </button>
          </div>
        </div>
        {menuOpen && (
          <nav className="landing-nav-mobile" style={{
            display: "none", padding: "10px 28px 18px",
            borderTop: "1px solid var(--line-soft)", flexDirection: "column", gap: 4
          }}>
            <Link to="/" style={{ ...c.navLink, textAlign: "left", padding: "12px 2px", fontSize: 15 }}>Início</Link>
            <Link to="/processo-seletivo" style={{ ...c.navLink, color: "var(--accent)", textAlign: "left", padding: "12px 2px", fontSize: 15 }}>Processo Seletivo</Link>
          </nav>
        )}
      </header>

      {/* HERO */}
      <section style={{
        position: "relative", overflow: "hidden",
        background: `
          radial-gradient(circle at 70% -10%, rgba(255,75,31,.14), transparent 38%),
          radial-gradient(circle at 15% 90%, rgba(255,144,104,.07), transparent 40%),
          var(--bg)`
      }}>
        <div style={{ maxWidth: 1180, margin: "0 auto", padding: "clamp(80px, 12vh, 140px) 28px 80px", textAlign: "center" }}>
          <div className="eyebrow" style={{ marginBottom: 18, color: "var(--accent)" }}>
            Processo Seletivo · Ligia
          </div>
          <h1 style={{
            margin: "0 auto 22px", maxWidth: 780,
            fontSize: "clamp(38px, 6.5vw, 64px)", lineHeight: 1.06,
            fontWeight: 500, letterSpacing: "-.035em"
          }}>
            Faça parte de uma<br />
            <span className="gradient-text">comunidade de IA.</span>
          </h1>
          <p style={{
            margin: "0 auto 34px", maxWidth: 540,
            color: "var(--muted)", fontSize: 15, lineHeight: 1.8
          }}>
            A Ligia abre as portas para novos membros uma vez por ano.
            Veja como funciona o processo e candidate-se para estudar, construir
            e divulgar inteligência artificial em comunidade.
          </p>
          <div style={{ display: "flex", justifyContent: "center", gap: 12, flexWrap: "wrap" }}>
            <Link to="/register" style={c.primaryBtn}>
              Quero participar <ArrowRight size={15} />
            </Link>
            <a href="#etapas" style={c.secondaryBtn}>
              Como funciona
            </a>
          </div>
          <div className="gradient-bar" style={{ width: 72, margin: "56px auto 0" }} />
        </div>
      </section>

      {/* ETAPAS */}
      <section id="etapas" style={{ padding: "clamp(64px, 9vh, 96px) 28px" }}>
        <div style={{ maxWidth: 1180, margin: "0 auto" }}>
          <div style={{ maxWidth: 560, marginBottom: 40 }}>
            <div className="eyebrow" style={{ marginBottom: 10 }}>Como funciona</div>
            <h2 style={{ margin: "0 0 14px", fontSize: "clamp(28px, 4vw, 40px)", fontWeight: 500, letterSpacing: "-.03em" }}>
              Quatro etapas até entrar na liga.
            </h2>
            <div className="gradient-bar" style={{ width: 56, marginBottom: 16 }} />
            <p style={{ margin: 0, color: "var(--muted)", fontSize: 14, lineHeight: 1.8 }}>
              Um processo leve, transparente e pensado para encontrar quem
              realmente quer construir IA junto com a gente.
            </p>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: 14 }}>
            {steps.map(step => (
              <div key={step.title} style={{
                padding: 24, borderRadius: "var(--radius)",
                border: "1px solid var(--line-soft)", background: "var(--surface)"
              }}>
                <div style={{
                  display: "grid", placeItems: "center", width: 42, height: 42,
                  marginBottom: 14, borderRadius: 11,
                  background: "var(--accent-soft)", color: "var(--accent)"
                }}>
                  <step.icon size={20} />
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
      <section style={{ padding: "clamp(64px, 9vh, 96px) 28px", background: "var(--surface)" }}>
        <div style={{ maxWidth: 1180, margin: "0 auto", display: "grid", gridTemplateColumns: "1fr 1.4fr", gap: 48, alignItems: "center" }} className="ps-split">
          <div>
            <div className="eyebrow" style={{ marginBottom: 10 }}>Quem pode participar</div>
            <h2 style={{ margin: "0 0 14px", fontSize: "clamp(28px, 4vw, 40px)", fontWeight: 500, letterSpacing: "-.03em" }}>
              O que buscamos em você.
            </h2>
            <div className="gradient-bar" style={{ width: 56, marginBottom: 16 }} />
            <p style={{ margin: 0, color: "var(--muted)", fontSize: 14, lineHeight: 1.8 }}>
              Buscamos pessoas com prática em código e vontade de aprender
              e de contribuir. Conhecimento técnico em IA não é pré-requisito —
              mas experiência com programação, sim.
            </p>
          </div>
          <div style={{ display: "grid", gap: 10 }}>
            {requirements.map(req => (
              <div key={req.label} style={{
                display: "flex", alignItems: "flex-start", gap: 12,
                padding: "16px 18px", borderRadius: "var(--radius-sm)",
                border: "1px solid var(--line-soft)", background: "var(--bg)"
              }}>
                <Sparkles size={16} style={{ color: "var(--accent)", flexShrink: 0, marginTop: 2 }} />
                <span style={{ fontSize: 14, lineHeight: 1.6, color: "var(--text)" }}>
                  <strong>{req.label}.</strong> {req.text}
                </span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section style={{ padding: "clamp(64px, 9vh, 96px) 28px" }}>
        <div style={{ maxWidth: 760, margin: "0 auto" }}>
          <div style={{ marginBottom: 40, textAlign: "center" }}>
            <div className="eyebrow" style={{ marginBottom: 10 }}>Dúvidas</div>
            <h2 style={{ margin: "0 0 14px", fontSize: "clamp(28px, 4vw, 40px)", fontWeight: 500, letterSpacing: "-.03em" }}>
              Perguntas frequentes.
            </h2>
            <div className="gradient-bar" style={{ width: 56, margin: "0 auto 16px" }} />
          </div>
          <div style={{ display: "grid", gap: 10 }}>
            {faq.map(item => (
              <details key={item.q} style={{
                padding: "18px 20px", borderRadius: "var(--radius-sm)",
                border: "1px solid var(--line-soft)", background: "var(--surface)"
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
      <section style={{ padding: "0 28px 96px" }}>
        <div style={{ maxWidth: 1180, margin: "0 auto" }}>
          <div style={{
            padding: "clamp(36px, 5vw, 56px)", textAlign: "center",
            borderRadius: "var(--radius-lg)",
            border: "1px solid var(--line)",
            background: `
              radial-gradient(circle at 50% 120%, rgba(255,75,31,.16), transparent 55%),
              var(--surface-2)`
          }}>
            <div style={{ display: "grid", placeItems: "center", width: 52, height: 52, margin: "0 auto 18px", borderRadius: 13, background: "var(--accent-soft)", color: "var(--accent)" }}>
              <FileText size={22} />
            </div>
            <h2 style={{
              margin: "0 auto 14px", maxWidth: 480,
              fontSize: "clamp(26px, 3.6vw, 38px)", fontWeight: 500, letterSpacing: "-.03em"
            }}>
              Pronto para o próximo passo?
            </h2>
            <p style={{ margin: "0 auto 28px", maxWidth: 440, color: "var(--muted)", fontSize: 14, lineHeight: 1.8 }}>
              Deixe seus dados que avisamos quando o processo seletivo abrir.
              A inscrição é gratuita.
            </p>
            <div style={{ display: "flex", justifyContent: "center", gap: 12, flexWrap: "wrap" }}>
              <Link to="/register" style={c.primaryBtn}>
                Quero participar <ArrowRight size={15} />
              </Link>
              <Link to="/" style={c.secondaryBtn}>
                Voltar ao início
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* FOOTER */}
      <footer style={{ borderTop: "1px solid var(--line-soft)", background: "var(--surface)" }}>
        <div className="gradient-bar" style={{ width: "100%", height: 2 }} />
        <div style={{ maxWidth: 1180, margin: "0 auto", padding: "40px 28px 36px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap", color: "var(--muted-2)", fontSize: 13 }}>
            <span>Liga Acadêmica de Inteligência Artificial</span>
            <div style={{ display: "grid", gap: 8 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 9 }}>
                <Mail size={14} style={{ color: "var(--accent)" }} /> contato@ligia.ai
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 9 }}>
                <MapPin size={14} style={{ color: "var(--accent)" }} /> CIn · UFPE, Recife
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 9 }}>
                <GraduationCap size={14} style={{ color: "var(--accent)" }} /> Vínculo acadêmico
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
        @media (max-width: 900px) {
          .landing-nav { display: none !important; }
          header button[aria-label="Menu"] { display: grid !important; }
          .landing-nav-mobile { display: flex !important; }
        }
        @media (max-width: 820px) {
          .ps-split { grid-template-columns: 1fr !important; }
        }
      `}</style>
    </div>
  );
}