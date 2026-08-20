import { useState, useEffect, useRef } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  ArrowRight, Menu, X, Github, Linkedin,
  GraduationCap, Mail, MapPin, Sparkles,
  BookOpen, Megaphone, Languages, BrainCircuit, ScanEye, Cpu,
  CalendarDays, Plus, Minus, ChevronLeft, ChevronRight, Instagram
} from "lucide-react";
import { useAuth } from "../contexts/AuthContext.jsx";
import { fetchProfiles } from "../services/profiles.js";
import { fetchProjects } from "../services/projects.js";
import { fetchEvents } from "../services/events.js";

const teams = [
  { name: "NLP", icon: Languages, desc: "Processamento de linguagem natural, modelos de linguagem e recuperação de informação." },
  { name: "ML", icon: BrainCircuit, desc: "Aprendizado de máquina clássico, deep learning e experimentação acadêmica." },
  { name: "CV", icon: ScanEye, desc: "Visão computacional, detecção, segmentação e geração de imagens." },
  { name: "Comunicação", icon: Megaphone, desc: "Conteúdo, eventos, divulgação científica e parcerias da liga." },
];

const pillars = [
  { icon: BookOpen, title: "Estudar", desc: "Cursos, grupos de estudo e sessões técnicas sobre IA." },
  { icon: Cpu, title: "Construir", desc: "Projetos de pesquisa aplicada e desafios reais em equipe." },
  { icon: Megaphone, title: "Divulgar", desc: "Conteúdo, eventos e extensão para a comunidade." },
];

const researchInitiatives = [
  {
    name: "Cell Tracking Challenge",
    team: "CV",
    desc: "Participação no desafio internacional de rastreamento de células em imagens de microscopia — detecção, segmentação e associação temporal de trajetórias.",
    img: "https://images.unsplash.com/photo-1576086213369-97a306d36557?auto=format&fit=crop&w=1000&q=70",
  },
  {
    name: "Segmentação de Gordura Epicárdica",
    team: "CV",
    desc: "Segmentação automática de tecido adiposo epicárdico e pericárdico em imagens de TC cardíaca com deep learning, para análise de risco cardiovascular.",
    img: "https://images.unsplash.com/photo-1538113300105-e51e4560b4aa?w=600&auto=format&fit=crop&q=60&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxzZWFyY2h8M3x8aHVtYW4lMjBoZWFydCUyMGRhcmslMjBiYWNrZ3JvdW5kfGVufDB8fDB8fHww",
  },
  {
    name: "xAI para Detecção de Ataques Adversariais",
    team: "ML",
    desc: "Uso de explicações (eXplainable AI) para detectar e mitigar ataques adversariais em modelos de linguagem de grande porte.",
    img: "https://images.unsplash.com/photo-1620712943543-bcc4688e7485?auto=format&fit=crop&w=1000&q=70",
  },
  {
    name: "Conjunto de Dados de Notícias Falsas",
    team: "NLP",
    desc: "Construção de um conjunto de dados nacional em português para pesquisa em detecção de notícias falsas e desinformação.",
    img: "https://images.unsplash.com/photo-1504711434969-e33886168f5c?auto=format&fit=crop&w=1000&q=70",
  },
];

const generalInitiatives = [
  {
    name: "Projeto Ágora",
    team: "Iniciativa",
    desc: "Espaço de discussão e troca de conhecimento aberto a toda a comunidade acadêmica.",
    img: "https://images.unsplash.com/photo-1603565816030-6b389eeb23cb?auto=format&fit=crop&w=1000&q=70",
  },
  {
    name: "Cursos e oficinas",
    team: "Iniciativa",
    desc: "Trilhas de formação e oficinas técnicas em IA para estudantes de todas as graduações.",
    img: "https://images.unsplash.com/photo-1517245386807-bb43f82c33c4?auto=format&fit=crop&w=1000&q=70",
  },
];

const navLinks = [
  { id: "sobre", label: "Sobre" },
  { id: "iniciativas", label: "Iniciativas" },
  { id: "eventos", label: "Eventos" },
  { id: "membros", label: "Membros" },
  { id: "contato", label: "Contato" },
];

function formatEventDate(iso) {
  if (!iso) return "";
  try {
    return new Date(iso).toLocaleDateString("pt-BR", { day: "2-digit", month: "short", year: "numeric" });
  } catch {
    return "";
  }
}

export default function Landing() {
  const navigate = useNavigate();
  const { session } = useAuth();
  const [menuOpen, setMenuOpen] = useState(false);
  const [stats, setStats] = useState([
    { value: "—", label: "Membros", color: "#6da87c" },
    { value: "—", label: "Projetos", color: "#6b8eb3" },
    { value: "—", label: "Eventos", color: "#c4a358" },
    { value: 4, label: "Times", color: "var(--muted)" },
  ]);
  const [initiativeTab, setInitiativeTab] = useState("pesquisas");
  const [openInitiative, setOpenInitiative] = useState(null);
  const [pastEvents, setPastEvents] = useState([]);
  const [members, setMembers] = useState([]);
  const [eventIdx, setEventIdx] = useState(0);
  const eventsSnapRef = useRef(null);

  function moveCarousel(dir) {
    const el = eventsSnapRef.current;
    if (!el) return;
    const isMobile = window.innerWidth <= 820;
    const step = isMobile ? el.clientWidth : (el.clientWidth - 28) / 3 + 14;
    el.scrollBy({ left: dir * step, behavior: "smooth" });
  }

  function jumpCarousel(idx) {
    const el = eventsSnapRef.current;
    if (!el) return;
    const isMobile = window.innerWidth <= 820;
    const step = isMobile ? el.clientWidth : (el.clientWidth - 28) / 3 + 14;
    el.scrollTo({ left: idx * step, behavior: "smooth" });
  }

  function handleCarouselScroll() {
    const el = eventsSnapRef.current;
    if (!el) return;
    const isMobile = window.innerWidth <= 820;
    const step = isMobile ? el.clientWidth : (el.clientWidth - 28) / 3 + 14;
    if (step <= 0) return;
    setEventIdx(Math.min(pastEvents.length - 1, Math.round(el.scrollLeft / step)));
  }

  useEffect(() => {
    document.title = "Ligia — Liga Acadêmica de Inteligência Artificial";
    window.scrollTo({ top: 0 });
    loadStats();
  }, []);

  useEffect(() => {
    if (session) navigate("/inicio", { replace: true });
  }, [session]);

  async function loadStats() {
    try {
      const [profiles, projects, events] = await Promise.all([
        fetchProfiles(),
        fetchProjects(),
        fetchEvents(),
      ]);
      const publicEvents = (events || []).filter(e => e.visibility === "public");
      setStats([
        { value: profiles.length, label: "Membros", color: "#6da87c" },
        { value: projects.length, label: "Projetos", color: "#6b8eb3" },
        { value: publicEvents.length, label: "Eventos", color: "#c4a358" },
        { value: 4, label: "Times", color: "var(--muted)" },
      ]);
      setPastEvents(
        publicEvents
          .filter(e => e.starts_at && new Date(e.starts_at).getTime() < Date.now())
          .sort((a, b) => new Date(b.starts_at) - new Date(a.starts_at))
          .slice(0, 5)
      );
      setMembers(profiles.slice(0, 8));
    } catch (e) {
      console.warn("Landing stats error:", e.message);
    }
  }

  const byName = (a, b) => (a.name || "").localeCompare(b.name || "", "pt-BR", { sensitivity: "base" });
  const professors = members.filter(m => m.category === "professor").sort(byName);
  const directors = members
    .filter(m => m.category === "diretor")
    .sort(byName);
  const regularMembers = members.filter(m => m.category !== "professor" && m.category !== "diretor").sort(byName);

  function scrollTo(id) {
    setMenuOpen(false);
    document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  const goToOS = () => navigate(session ? "/inicio" : "/login");

  const c = {
    navLink: {
      border: 0, background: "none", color: "var(--muted)", cursor: "pointer",
      fontSize: 13, fontWeight: 500, padding: "6px 2px",
      fontFamily: "var(--font-body)", transition: "color var(--transition)"
    },
    card: {
      padding: 24, borderRadius: "var(--radius)",
      border: "1px solid var(--line-soft)", background: "var(--surface)"
    },
    iconTile: {
      display: "grid", placeItems: "center", width: 42, height: 42,
      marginBottom: 14, borderRadius: 11,
      background: "var(--accent-soft)", color: "var(--accent)"
    },
    primaryBtn: {
      display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 8,
      height: 44, padding: "0 26px", border: 0, borderRadius: "var(--radius-sm)",
      color: "#fff", background: "var(--accent)", cursor: "pointer",
      fontSize: 14, fontWeight: 600, fontFamily: "var(--font-body)",
      transition: "background var(--transition)"
    },
    secondaryBtn: {
      display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 8,
      height: 44, padding: "0 26px", border: "1px solid var(--line)",
      borderRadius: "var(--radius-sm)", color: "var(--text)",
      background: "transparent", cursor: "pointer",
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
          <button onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
            style={{ display: "flex", alignItems: "center", gap: 11, border: 0, background: "none", cursor: "pointer", padding: 0 }}>
            <img src="/media/logo.svg" alt="Ligia" style={{ height: 30, width: "auto" }} />
            <span style={{
              fontFamily: "var(--font-heading)", fontSize: 17, fontWeight: 600,
              letterSpacing: "-.02em", color: "var(--text)"
            }}>Ligia</span>
          </button>

          <nav className="landing-nav" style={{ display: "flex", gap: 22, marginLeft: 34, alignItems: "center" }}>
            {navLinks.map(link => (
              <button key={link.id} onClick={() => scrollTo(link.id)} style={c.navLink}>
                {link.label}
              </button>
            ))}
          </nav>

          <div style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 10 }}>
            <button onClick={goToOS} style={{
              display: "inline-flex", alignItems: "center", gap: 6,
              padding: "9px 20px", border: 0, borderRadius: "var(--radius-sm)",
              color: "#fff", background: "var(--accent)", cursor: "pointer",
              fontSize: 13, fontWeight: 600, fontFamily: "var(--font-body)",
              transition: "background var(--transition)"
            }}>
              {session ? "Abrir Ligia OS" : "Login"} <ArrowRight size={14} />
            </button>
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
            {navLinks.map(link => (
              <button key={link.id} onClick={() => scrollTo(link.id)}
                style={{ ...c.navLink, textAlign: "left", padding: "12px 2px", fontSize: 15 }}>
                {link.label}
              </button>
            ))}
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
            Liga Acadêmica de Inteligência Artificial
          </div>
          <h1 style={{
            margin: "0 auto 22px", maxWidth: 820,
            fontSize: "clamp(38px, 6.5vw, 72px)", lineHeight: 1.06,
            fontWeight: 500, letterSpacing: "-.035em"
          }}>
            Conexão que inspira o<br />
            <span className="gradient-text">futuro.</span>
          </h1>
          <p style={{
            margin: "0 auto 34px", maxWidth: 560,
            color: "var(--muted)", fontSize: 15, lineHeight: 1.8
          }}>
            A Ligia é uma liga acadêmica que reúne estudantes e pesquisadores para
            estudar, construir e divulgar inteligência artificial — com pesquisa,
            projetos e extensão em quatro frentes de atuação.
          </p>
          <div style={{ display: "flex", justifyContent: "center", gap: 12, flexWrap: "wrap" }}>
            <button onClick={() => scrollTo("participe")} style={c.primaryBtn}>
              Quero participar <ArrowRight size={15} />
            </button>
            <button onClick={() => scrollTo("sobre")} style={c.secondaryBtn}>
              Conhecer a Ligia
            </button>
          </div>
          <div className="gradient-bar" style={{ width: 72, margin: "56px auto 0" }} />
        </div>
      </section>

      {/* STATS */}
      <section style={{ borderBottom: "1px solid var(--line-soft)", background: "var(--surface)" }}>
        <div className="landing-stats" style={{
          maxWidth: 1180, margin: "0 auto", padding: "34px 28px",
          display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 14
        }}>
          {stats.map(stat => (
            <div key={stat.label} style={{ textAlign: "center", padding: "10px 8px" }}>
              <div style={{
                fontSize: 34, fontWeight: 600, lineHeight: 1.1, color: stat.color,
                fontFamily: "var(--font-heading)", letterSpacing: "-.02em"
              }}>{stat.value}</div>
              <div style={{ color: "var(--muted-2)", fontSize: 12, marginTop: 6 }}>{stat.label}</div>
            </div>
          ))}
        </div>
      </section>

      {/* SOBRE */}
      <section id="sobre" style={{ padding: "clamp(64px, 9vh, 96px) 28px" }}>
        <div style={{ maxWidth: 1180, margin: "0 auto" }}>
          <div style={{ maxWidth: 620, marginBottom: 40 }}>
            <div className="eyebrow" style={{ marginBottom: 10 }}>Sobre a Ligia</div>
            <h2 style={{ margin: "0 0 14px", fontSize: "clamp(28px, 4vw, 40px)", fontWeight: 500, letterSpacing: "-.03em" }}>
              Uma comunidade acadêmica<br />dedicada à inteligência artificial.
            </h2>
            <div className="gradient-bar" style={{ width: 56, marginBottom: 16 }} />
            <p style={{ margin: 0, color: "var(--muted)", fontSize: 14, lineHeight: 1.8 }}>
              Vinculada ao Centro de Informática da UFPE, a Ligia aproxima quem quer aprender e quem
              quer construir. Por meio de grupos de estudo, projetos de pesquisa e
              ações de divulgação, transformamos interesse em IA em formação
              prática e produção acadêmica.
            </p>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(255px, 1fr))", gap: 14 }}>
            {pillars.map(p => (
              <div key={p.title} style={{ ...c.card, display: "flex", flexDirection: "column" }}>
                <div style={c.iconTile}><p.icon size={19} /></div>
                <h3 style={{ margin: "0 0 6px", fontSize: 15, fontWeight: 550 }}>{p.title}</h3>
                <p style={{ margin: 0, color: "var(--muted)", fontSize: 12, lineHeight: 1.65 }}>
                  {p.desc}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ATUAÇÃO */}
      <section id="pilares" style={{ padding: "clamp(64px, 9vh, 96px) 28px", background: "var(--surface)" }}>
        <div style={{ maxWidth: 1180, margin: "0 auto" }}>
          <div style={{ maxWidth: 560, marginBottom: 40 }}>
            <div className="eyebrow" style={{ marginBottom: 10 }}>Pilares</div>
            <h2 style={{ margin: "0 0 14px", fontSize: "clamp(28px, 4vw, 40px)", fontWeight: 500, letterSpacing: "-.03em" }}>
              Estudar, construir e divulgar.
            </h2>
            <div className="gradient-bar" style={{ width: 56, marginBottom: 16 }} />
            <p style={{ margin: 0, color: "var(--muted)", fontSize: 14, lineHeight: 1.8 }}>
              Três pilares guiam todas as atividades da liga — da formação técnica
              à extensão para o público.
            </p>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: 14 }}>
            {teams.map(team => (
              <div key={team.name} style={{ ...c.card, padding: 26 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 12 }}>
                  <div style={{ ...c.iconTile, marginBottom: 0, width: 38, height: 38, borderRadius: 10 }}>
                    <team.icon size={17} />
                  </div>
                  <div style={{
                    fontFamily: "var(--font-heading)", fontSize: 16, fontWeight: 600,
                    letterSpacing: ".01em"
                  }}>{team.name}</div>
                </div>
                <p style={{ margin: 0, color: "var(--muted)", fontSize: 13, lineHeight: 1.7 }}>
                  {team.desc}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* INICIATIVAS */}
      <section id="iniciativas" style={{ padding: "clamp(64px, 9vh, 96px) 28px" }}>
        <div style={{ maxWidth: 1180, margin: "0 auto" }}>
          <div style={{ maxWidth: 560, marginBottom: 36 }}>
            <div className="eyebrow" style={{ marginBottom: 10 }}>Iniciativas</div>
            <h2 style={{ margin: "0 0 14px", fontSize: "clamp(28px, 4vw, 40px)", fontWeight: 500, letterSpacing: "-.03em" }}>
              Pesquisa, desenvolvimento e comunidade.
            </h2>
            <div className="gradient-bar" style={{ width: 56, marginBottom: 16 }} />
            <p style={{ margin: 0, color: "var(--muted)", fontSize: 14, lineHeight: 1.8 }}>
              Das frentes de pesquisa aos produtos e espaços da comunidade — veja
              o que a Ligia constrói hoje.
            </p>
          </div>

          <div style={{
            display: "flex", gap: 6, marginBottom: 24,
            padding: 4, borderRadius: "var(--radius-sm)",
            background: "var(--surface-2)", width: "fit-content"
          }}>
{[
                { key: "pesquisas", label: "Pesquisas", count: researchInitiatives.length },
                { key: "iniciativas", label: "Iniciativas", count: generalInitiatives.length },
              ].map(tab => (
              <button key={tab.key} onClick={() => setInitiativeTab(tab.key)}
                style={{
                  padding: "7px 16px", border: 0, borderRadius: 7, cursor: "pointer",
                  fontSize: 13, fontWeight: 550, fontFamily: "var(--font-body)",
                  color: initiativeTab === tab.key ? "#fff" : "var(--muted)",
                  background: initiativeTab === tab.key ? "var(--accent)" : "transparent",
                  transition: "background var(--transition), color var(--transition)"
                }}>
                {tab.label}
              </button>
            ))}
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(250px, 1fr))", gap: 16 }}>
            {(initiativeTab === "pesquisas" ? researchInitiatives : generalInitiatives)
              .map(item => {
                const isOpen = openInitiative === item.name;
                return (
                  <button key={item.name}
                    onClick={() => setOpenInitiative(isOpen ? null : item.name)}
                    aria-expanded={isOpen}
                    style={{
                      position: "relative", overflow: "hidden", textAlign: "left",
                      display: "block", height: 270, padding: 0, border: 0,
                      borderRadius: "var(--radius)", cursor: "pointer",
                      background: "var(--surface)", fontFamily: "var(--font-body)",
                      transition: "transform var(--transition)"
                    }}>
                    <img src={item.img} alt={item.name}
                      loading="lazy"
                      style={{
                        position: "absolute", inset: 0, width: "100%", height: "100%",
                        objectFit: "cover", filter: isOpen ? "brightness(.45)" : "brightness(.6)"
                      }} />
                    <div style={{
                      position: "absolute", inset: 0,
                      background: isOpen
                        ? "linear-gradient(180deg, rgba(18,16,12,.55) 0%, rgba(18,16,12,.9) 100%)"
                        : "linear-gradient(180deg, rgba(18,16,12,.05) 30%, rgba(18,16,12,.85) 100%)",
                      transition: "background .3s ease"
                    }} />
                    <span style={{
                      position: "absolute", top: 16, left: 16,
                      display: "inline-flex", alignItems: "center", gap: 7,
                      padding: "4px 12px", borderRadius: 999,
                      background: "rgba(255,255,255,.14)", color: "#fff",
                      fontSize: 11, fontWeight: 600, fontFamily: "var(--font-heading)",
                      letterSpacing: ".03em", backdropFilter: "blur(4px)"
                    }}>{item.team}</span>
                    <span style={{
                      position: "absolute", top: 16, right: 16,
                      display: "grid", placeItems: "center", width: 30, height: 30,
                      borderRadius: "50%", color: "#fff",
                      background: isOpen ? "var(--accent)" : "rgba(255,255,255,.18)",
                      backdropFilter: "blur(4px)", transition: "background var(--transition)"
                    }}>
                      {isOpen ? <Minus size={15} /> : <Plus size={15} />}
                    </span>
                    <div style={{
                      position: "absolute", left: 0, right: 0, bottom: 0,
                      padding: "0 20px", boxSizing: "border-box",
                      maxHeight: isOpen ? 250 : 0, opacity: isOpen ? 1 : 0,
                      overflow: "hidden", transform: isOpen ? "translateY(0)" : "translateY(6px)",
                      transition: "max-height .3s ease, opacity .3s ease, transform .3s ease"
                    }}>
                      <h3 style={{ margin: "0 0 8px", fontSize: 17, fontWeight: 600, letterSpacing: "-.01em", color: "#fff" }}>
                        {item.name}
                      </h3>
                      <p style={{ margin: "0 0 18px", color: "rgba(242,237,225,.8)", fontSize: 13, lineHeight: 1.7 }}>
                        {item.desc}
                      </p>
                    </div>
                    <div style={{
                      position: "absolute", left: 0, right: 0, bottom: 0,
                      padding: "16px 20px", boxSizing: "border-box",
                      opacity: isOpen ? 0 : 1, pointerEvents: isOpen ? "none" : "auto",
                      transition: "opacity .2s ease"
                    }}>
                      <h3 style={{ margin: 0, fontSize: 16, fontWeight: 600, letterSpacing: "-.01em", color: "#fff" }}>
                        {item.name}
                      </h3>
                    </div>
                  </button>
                );
              })}
          </div>
        </div>
      </section>

      {/* EVENTOS */}
      <section id="eventos" style={{ padding: "clamp(64px, 9vh, 96px) 28px", background: "var(--surface)" }}>
        <div style={{ maxWidth: 1180, margin: "0 auto" }}>
          <div style={{ maxWidth: 560, marginBottom: 40 }}>
            <div className="eyebrow" style={{ marginBottom: 10 }}>Eventos passados</div>
            <h2 style={{ margin: "0 0 14px", fontSize: "clamp(28px, 4vw, 40px)", fontWeight: 500, letterSpacing: "-.03em" }}>
              Atividade que já movimentou a liga.
            </h2>
            <div className="gradient-bar" style={{ width: 56, marginBottom: 16 }} />
            <p style={{ margin: 0, color: "var(--muted)", fontSize: 14, lineHeight: 1.8 }}>
              Workshops, sessões técnicas, maratonas e encontros da comunidade
              registrados na agenda da Ligia.
            </p>
          </div>

          {pastEvents.length === 0 ? (
            <div style={{ ...c.card, color: "var(--muted)", fontSize: 13, textAlign: "center", padding: "40px 20px" }}>
              Nenhum evento passado registrado ainda.
            </div>
          ) : (
            <>
              <div
                ref={eventsSnapRef}
                onScroll={handleCarouselScroll}
                className="events-snap"
                style={{
                  display: "flex", gap: 14, overflowX: "auto", scrollSnapType: "x mandatory",
                  scrollbarWidth: "none", msOverflowStyle: "none", borderRadius: "var(--radius)"
                }}>
                  {pastEvents.map((ev, idx) => {
                    const isCenter = idx === eventIdx;
                    return (
                      <div key={ev.id} style={{
                        display: "flex", flexDirection: "column", overflow: "hidden",
                        flex: "0 0 calc((100% - 28px) / 3)",
                        scrollSnapAlign: "center",
                        borderRadius: "var(--radius)",
                        border: isCenter ? "1px solid var(--accent-border)" : "1px solid var(--line-soft)",
                        background: "var(--bg)",
                        boxShadow: isCenter ? "var(--shadow)" : "none",
                        transform: isCenter ? "translateY(-8px)" : "none",
                        transition: "border-color var(--transition), box-shadow var(--transition), transform var(--transition)",
                        opacity: isCenter ? 1 : 0.78
                      }}>
                        <div style={{
                          position: "relative", height: isCenter ? 190 : 150, flex: "0 0 auto",
                          display: "grid", placeItems: "center", overflow: "hidden",
                          background: "var(--surface-2)"
                        }}>
                          {ev.image_url ? (
                            <img src={ev.image_url} alt={ev.title} loading="lazy"
                              style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover" }} />
                          ) : (
                            <div style={{
                              display: "grid", placeItems: "center", width: 46, height: 46,
                              borderRadius: 12, background: "var(--accent-soft)", color: "var(--accent)"
                            }}>
                              <CalendarDays size={20} />
                            </div>
                          )}
                          {isCenter && (
                            <span style={{
                              position: "absolute", top: 12, left: 12,
                              padding: "3px 10px", borderRadius: 999,
                              background: "var(--accent)", color: "#fff",
                              fontSize: 10.5, fontWeight: 700, fontFamily: "var(--font-heading)",
                              letterSpacing: ".04em"
                            }}>
                              Destaque
                            </span>
                          )}
                        </div>
                        <div style={{ padding: "16px 18px", display: "grid", gap: 8 }}>
                          <div style={{ fontSize: isCenter ? 15 : 13, fontWeight: 600, lineHeight: 1.4 }}>
                            {ev.title}
                          </div>
                          <div style={{ color: "var(--muted-2)", fontSize: 12 }}>
                            {formatEventDate(ev.starts_at)}{ev.location ? ` · ${ev.location}` : ""}
                          </div>
                          {isCenter && ev.description && (
                            <div style={{
                              color: "var(--muted)", fontSize: 12, lineHeight: 1.6,
                              display: "-webkit-box", WebkitLineClamp: 3, WebkitBoxOrient: "vertical",
                              overflow: "hidden"
                            }}>
                              {ev.description}
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>

              <div style={{ display: "flex", justifyContent: "center", alignItems: "center", gap: 14, marginTop: 22 }}>
                <button onClick={() => moveCarousel(-1)} aria-label="Anterior"
                  style={{
                    display: "grid", placeItems: "center", width: 36, height: 36,
                    border: "1px solid var(--line)", borderRadius: 9, cursor: "pointer",
                    background: "var(--bg)", color: "var(--text)"
                  }}>
                  <ChevronLeft size={16} />
                </button>
                <div style={{ display: "flex", gap: 6 }}>
                  {pastEvents.map((ev, idx) => (
                    <button key={ev.id} onClick={() => jumpCarousel(idx)} aria-label={`Ir para ${ev.title}`}
                      style={{
                        width: idx === eventIdx ? 22 : 7, height: 7, border: 0, borderRadius: 999,
                        cursor: "pointer", padding: 0,
                        background: idx === eventIdx ? "var(--accent)" : "var(--line)",
                        transition: "width var(--transition), background var(--transition)"
                      }} />
                  ))}
                </div>
                <button onClick={() => moveCarousel(1)} aria-label="Próximo"
                  style={{
                    display: "grid", placeItems: "center", width: 36, height: 36,
                    border: "1px solid var(--line)", borderRadius: 9, cursor: "pointer",
                    background: "var(--bg)", color: "var(--text)"
                  }}>
                  <ChevronRight size={16} />
                </button>
              </div>
            </>
          )}
        </div>
      </section>

      {/* MEMBROS */}
      <section id="membros" style={{ padding: "clamp(64px, 9vh, 96px) 28px" }}>
        <div style={{ maxWidth: 1180, margin: "0 auto" }}>
          <div style={{ maxWidth: 560, marginBottom: 40 }}>
            <div className="eyebrow" style={{ marginBottom: 10 }}>Quem faz a Ligia</div>
            <h2 style={{ margin: "0 0 14px", fontSize: "clamp(28px, 4vw, 40px)", fontWeight: 500, letterSpacing: "-.03em" }}>
              Professores, diretores e membros.
            </h2>
            <div className="gradient-bar" style={{ width: 56, marginBottom: 16 }} />
            <p style={{ margin: 0, color: "var(--muted)", fontSize: 14, lineHeight: 1.8 }}>
              A comunidade é conduzida por uma diretoria, apoiada por professores
              orientadores e formada por estudantes e pesquisadores.
            </p>
          </div>

          <div style={{ display: "grid", gap: 22 }}>
            <div>
              <div className="eyebrow" style={{ marginBottom: 14 }}>Professores orientadores</div>
              {professors.length === 0 ? (
                <div style={{ ...c.card, color: "var(--muted)", fontSize: 13, textAlign: "center", padding: "32px 20px" }}>
                  Em breve, a relação de professores aparece aqui.
                </div>
              ) : (
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(240px, 1fr))", gap: 14 }}>
                  {professors.map(p => (
                    <div key={p.id || p.name} style={{ ...c.card, display: "flex", alignItems: "center", gap: 13, padding: "16px 18px" }}>
                      <img src={p.avatar_url || `https://randomuser.me/api/portraits/${String(p.id).charCodeAt(0) % 2 === 0 ? "women" : "men"}/${(parseInt(String(p.id).replace(/\D/g, "")) || 10) % 90 + 1}.jpg`} alt={p.name} loading="lazy" style={{ width: 44, height: 44, flex: "0 0 auto", borderRadius: "50%", objectFit: "cover" }} />
                      <div style={{ minWidth: 0 }}>
                        <div style={{ fontSize: 13, fontWeight: 600, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{p.name}</div>
                        <div style={{ color: "var(--muted-2)", fontSize: 11, marginTop: 2 }}>{p.discipline}{p.affiliation ? ` · ${p.affiliation}` : ""}</div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div>
              <div className="eyebrow" style={{ marginBottom: 14 }}>Diretoria</div>
              {directors.length === 0 ? (
                <div style={{ ...c.card, color: "var(--muted)", fontSize: 13, textAlign: "center", padding: "32px 20px" }}>
                  Em breve, a relação da diretoria aparece aqui.
                </div>
              ) : (
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(240px, 1fr))", gap: 14 }}>
                  {directors.map(d => (
                    <div key={d.id || d.name} style={{ ...c.card, display: "flex", alignItems: "center", gap: 13, padding: "16px 18px" }}>
                      <img src={d.avatar_url || `https://randomuser.me/api/portraits/${String(d.id).charCodeAt(0) % 2 === 0 ? "women" : "men"}/${(parseInt(String(d.id).replace(/\D/g, "")) || 10) % 90 + 1}.jpg`} alt={d.name} loading="lazy" style={{ width: 44, height: 44, flex: "0 0 auto", borderRadius: "50%", objectFit: "cover" }} />
                      <div style={{ minWidth: 0 }}>
                        <div style={{ fontSize: 13, fontWeight: 600, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{d.name}</div>
                        <div style={{ color: "var(--muted-2)", fontSize: 11, marginTop: 2 }}>{d.director_role || "Diretor(a)"}{d.affiliation ? ` · ${d.affiliation}` : ""}</div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div>
              <div className="eyebrow" style={{ marginBottom: 14 }}>Membros</div>
              {regularMembers.length === 0 ? (
                <div style={{ ...c.card, color: "var(--muted)", fontSize: 13, textAlign: "center", padding: "40px 20px" }}>
                  Em breve, a relação de membros aparece aqui.
                </div>
              ) : (
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))", gap: 14 }}>
                  {regularMembers.map(m => (
                    <div key={m.id} style={{ ...c.card, display: "flex", alignItems: "center", gap: 13, padding: "16px 18px" }}>
                      <img src={m.avatar_url || `https://randomuser.me/api/portraits/${m.id % 2 === 0 ? "women" : "men"}/${(m.id * 7) % 90 + 1}.jpg`} alt={m.name} loading="lazy" style={{ width: 42, height: 42, flex: "0 0 auto", borderRadius: "50%", objectFit: "cover" }} />
                      <div style={{ minWidth: 0 }}>
                        <div style={{ fontSize: 13, fontWeight: 600, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                          {m.name}
                        </div>
                        <div style={{ color: "var(--muted-2)", fontSize: 11, marginTop: 2 }}>
                          {m.team}{m.affiliation ? ` · ${m.affiliation}` : ""}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* PARTICIPE */}
      <section id="participe" style={{ padding: "clamp(64px, 9vh, 96px) 28px" }}>
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
              <Sparkles size={22} />
            </div>
            <h2 style={{
              margin: "0 auto 14px", maxWidth: 560,
              fontSize: "clamp(26px, 3.6vw, 38px)", fontWeight: 500, letterSpacing: "-.03em"
            }}>
              Faça parte da Ligia.
            </h2>
            <p style={{ margin: "0 auto 28px", maxWidth: 480, color: "var(--muted)", fontSize: 14, lineHeight: 1.8 }}>
              Membros participam de grupos de estudo, projetos de pesquisa e
              eventos — e têm acesso à lideranças técnicas da IA do mundo todo.
            </p>
            <div style={{ display: "flex", justifyContent: "center", gap: 12, flexWrap: "wrap" }}>
              <Link to="/processo-seletivo" style={c.primaryBtn}>
                Processo Seletivo <ArrowRight size={15} />
              </Link>
              <button onClick={goToOS} style={c.secondaryBtn}>
                {session ? "Abrir Ligia OS" : "Sou Membro"}
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* FOOTER */}
      <footer id="contato" style={{ borderTop: "1px solid var(--line-soft)", background: "var(--surface)" }}>
        <div className="gradient-bar" style={{ width: "100%", height: 2 }} />
        <div style={{ maxWidth: 1180, margin: "0 auto", padding: "52px 28px 40px" }}>
          <div className="landing-footer-grid" style={{ display: "grid", gridTemplateColumns: "1.6fr 1fr 1fr 1.4fr", gap: 28 }}>
            <div>
              <div style={{ display: "flex", alignItems: "center", gap: 11, marginBottom: 16 }}>
                <img src="/media/logo.svg" alt="Ligia" style={{ height: 28, width: "auto" }} />
                <span style={{ fontFamily: "var(--font-heading)", fontSize: 16, fontWeight: 600, letterSpacing: "-.02em" }}>
                  Ligia
                </span>
              </div>
              <p style={{ margin: 0, color: "var(--muted-2)", fontSize: 13, lineHeight: 1.7, maxWidth: 260 }}>
                Liga Acadêmica de Inteligência Artificial — estudar, construir e
                divulgar IA em comunidade.
              </p>
            </div>
            <div>
              <div className="eyebrow" style={{ marginBottom: 14 }}>A liga</div>
              <div style={{ display: "grid", gap: 8 }}>
                {navLinks.map(link => (
                  <button key={link.id} onClick={() => scrollTo(link.id)} style={{
                    ...c.navLink, textAlign: "left", padding: 0, fontSize: 13
                  }}>{link.label}</button>
                ))}
              </div>
            </div>
            <div>
              <div className="eyebrow" style={{ marginBottom: 14 }}>Times</div>
              <div style={{ display: "grid", gap: 8 }}>
                {teams.map(t => (
                  <span key={t.name} style={{ color: "var(--muted-2)", fontSize: 13 }}>{t.name}</span>
                ))}
              </div>
            </div>
            <div>
              <div className="eyebrow" style={{ marginBottom: 14 }}>Contato</div>
              <div style={{ display: "grid", gap: 10, color: "var(--muted-2)", fontSize: 13 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 9 }}>
                  <Mail size={14} style={{ color: "var(--accent)" }} /> ligia@cin.ufpe.br
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 9 }}>
                  <MapPin size={14} style={{ color: "var(--accent)" }} /> CIn · UFPE, Recife
                </div>
                <div style={{ display: "flex", gap: 10, marginTop: 6 }}>
                  <a
                    href="https://instagram.com/ligia.ufpe"
                    target="_blank"
                    rel="noreferrer"
                    aria-label="Instagram da Ligia"
                    style={{ display: "grid", placeItems: "center", width: 32, height: 32, borderRadius: 9, background: "var(--surface-2)", color: "var(--muted)", cursor: "pointer" }}
                  >
                    <Instagram size={15} />
                  </a>

                  <a
                    href="https://github.com/ligia-ufpe"
                    target="_blank"
                    rel="noreferrer"
                    aria-label="Instagram da Ligia"
                    style={{ display: "grid", placeItems: "center", width: 32, height: 32, borderRadius: 9, background: "var(--surface-2)", color: "var(--muted)", cursor: "pointer" }}
                  >
                    <Github size={15} />
                  </a>

                  <a
                    href="https://www.linkedin.com/company/ligia/"
                    target="_blank"
                    rel="noreferrer"
                    aria-label="Instagram da Ligia"
                    style={{ display: "grid", placeItems: "center", width: 32, height: 32, borderRadius: 9, background: "var(--surface-2)", color: "var(--muted)", cursor: "pointer" }}
                  >
                    <Linkedin size={15} />
                  </a>


                </div>
              </div>
            </div>
          </div>
          <div style={{
            marginTop: 40, paddingTop: 20, borderTop: "1px solid var(--line-soft)",
            display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap",
            color: "var(--muted-3)", fontSize: 12
          }}>
            <span>© {new Date().getFullYear()} Ligia. Todos os direitos reservados.</span>
            <span>Conexão que inspira o futuro.</span>
          </div>
        </div>
      </footer>

      <style>{`
        .events-snap::-webkit-scrollbar { display: none; }
        @media (max-width: 900px) {
          .landing-nav { display: none !important; }
          header button[aria-label="Menu"] { display: grid !important; }
          .landing-nav-mobile { display: flex !important; }
        }
        @media (max-width: 760px) {
          .landing-stats { grid-template-columns: repeat(2, 1fr) !important; }
          .landing-footer-grid { grid-template-columns: 1fr 1fr !important; }
        }
        @media (max-width: 820px) {
          .events-snap > * { flex: 0 0 100% !important; }
        }
      `}</style>
    </div>
  );
}