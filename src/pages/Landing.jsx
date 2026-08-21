import { useState, useEffect, useRef, lazy, Suspense } from "react";
import { Link, useNavigate } from "react-router-dom";
const NeuralHero = lazy(() => import("../components/NeuralHero.jsx"));
import {
  ArrowRight, Menu, X, Github, Linkedin,
  GraduationCap, Mail, MapPin, Sparkles,
  BookOpen, Megaphone, Languages, BrainCircuit, ScanEye, Cpu,
  CalendarDays, Plus, Minus, ChevronLeft, ChevronRight, Instagram, ExternalLink
} from "lucide-react";
import { useAuth } from "../contexts/AuthContext.jsx";
import { fetchProfiles } from "../services/profiles.js";
import { fetchProjects } from "../services/projects.js";
import { fetchEvents } from "../services/events.js";
import { fetchInitiatives } from "../services/initiatives.js";
import { supabase } from "../lib/supabase.js";
import { isConfigured } from "../services/supabase.js";

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

const fallbackResearch = [
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

const fallbackInitiatives = [
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
  { id: "newsletter", label: "Newsletter" },
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

// — Layout tokens padronizados (landing) — alinhados ao padrão do Ligia OS (clamp 20–52px)
const L = {
  maxW: 1180,
  px: "clamp(20px, 4vw, 52px)",
  sectionPad: "clamp(72px, 8vh, 96px) clamp(20px, 4vw, 52px)",
  heroPad: "clamp(88px, 12vh, 144px) clamp(20px, 4vw, 52px) clamp(72px, 8vh, 96px)",
};

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
  const [researchInitiatives, setResearchInitiatives] = useState(fallbackResearch);
  const [generalInitiatives, setGeneralInitiatives] = useState(fallbackInitiatives);
  const [statsLoading, setStatsLoading] = useState(true);
  const [landingLoading, setLandingLoading] = useState(true);
  const [newsletterEmail, setNewsletterEmail] = useState("");

  function easeOutCubic(t) { return 1 - Math.pow(1 - t, 3); }
  function smoothScrollTo(el, targetLeft, duration = 560) {
    const start = el.scrollLeft;
    const delta = targetLeft - start;
    if (Math.abs(delta) < 1) { el.scrollLeft = targetLeft; return; }
    const startTime = performance.now();
    const animate = (now) => {
      const elapsed = now - startTime;
      const p = Math.min(elapsed / duration, 1);
      el.scrollLeft = start + delta * easeOutCubic(p);
      if (p < 1) requestAnimationFrame(animate);
    };
    requestAnimationFrame(animate);
  }

  function getCenterIdx() {
    const el = eventsSnapRef.current;
    if (!el || pastEvents.length === 0) return 0;
    const containerRect = el.getBoundingClientRect();
    const containerCenter = containerRect.left + containerRect.width / 2;
    let bestIdx = 0;
    let bestDist = Infinity;
    Array.from(el.children).forEach((child, idx) => {
      const r = child.getBoundingClientRect();
      const c = r.left + r.width / 2;
      const d = Math.abs(c - containerCenter);
      if (d < bestDist) { bestDist = d; bestIdx = idx; }
    });
    return bestIdx;
  }

  function moveCarousel(dir) {
    if (pastEvents.length === 0) return;
    const n = pastEvents.length;
    const next = (eventIdx + dir + n) % n;
    jumpCarousel(next);
  }

  function jumpCarousel(idx) {
    const el = eventsSnapRef.current;
    if (!el) return;
    const clamped = Math.min(pastEvents.length - 1, Math.max(0, idx));
    const target = el.children[clamped];
    if (!target) return;
    const targetLeft = target.offsetLeft - (el.clientWidth - target.offsetWidth) / 2;
    smoothScrollTo(el, targetLeft, 560);
    setEventIdx(clamped);
  }

  function handleCarouselScroll() {
    window.requestAnimationFrame(() => setEventIdx(getCenterIdx()));
  }

  useEffect(() => {
    document.title = "Ligia — Liga Acadêmica de Inteligência Artificial";
    window.scrollTo({ top: 0 });
    loadStats();
  }, []);

  // Removido redirecionamento automático: usuário logado pode visitar a landing.
  // O botão "Abrir Ligia OS" / "Login" já direciona corretamente via goToOS().

  // Reveal on scroll — respeita prefers-reduced-motion
  useEffect(() => {
    if (typeof window === "undefined" || !("IntersectionObserver" in window)) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      document.querySelectorAll("[data-reveal]").forEach(el => el.classList.add("is-visible"));
      return;
    }
    const obs = new IntersectionObserver((entries) => {
      entries.forEach(e => {
        if (e.isIntersecting) {
          e.target.classList.add("is-visible");
          obs.unobserve(e.target);
        }
      });
    }, { threshold: 0.12, rootMargin: "0px 0px -48px 0px" });
    document.querySelectorAll("[data-reveal]").forEach(el => obs.observe(el));
    return () => obs.disconnect();
  }, [landingLoading]);

  // Destaque padrão é sempre o último evento adicionado (mais recente)
  useEffect(() => {
    if (pastEvents.length === 0) return;
    const initial = 0;
    setEventIdx(initial);
    requestAnimationFrame(() => {
      const el = eventsSnapRef.current;
      const target = el?.children[initial];
      if (target) target.scrollIntoView({ inline: "center", block: "nearest" });
    });
  }, [pastEvents.length]);

  // Recalcula o centro ao redimensionar (mobile ↔ desktop)
  useEffect(() => {
    const onResize = () => handleCarouselScroll();
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, [pastEvents.length]);

  // Cache de 5min para segunda visita instantânea
  const LANDING_CACHE_KEY = "ligia:landing:v2";
  const LANDING_TTL = 5 * 60 * 1000;

  function readLandingCache() {
    try {
      const raw = sessionStorage.getItem(LANDING_CACHE_KEY);
      if (!raw) return null;
      const { data, ts } = JSON.parse(raw);
      if (Date.now() - ts > LANDING_TTL) return null;
      return data;
    } catch { return null; }
  }
  function writeLandingCache(data) {
    try { sessionStorage.setItem(LANDING_CACHE_KEY, JSON.stringify({ data, ts: Date.now() })); } catch {}
  }

  async function loadStats() {
    // Hidrata instantâneo do cache (perceived 0ms na 2ª visita)
    const cached = readLandingCache();
    if (cached) {
      setStats(cached.stats);
      setPastEvents(cached.pastEvents || []);
      setMembers(cached.members || []);
      if (cached.research) setResearchInitiatives(cached.research);
      if (cached.general) setGeneralInitiatives(cached.general);
      setStatsLoading(false);
      setLandingLoading(false);
    } else {
      setStatsLoading(true);
      setLandingLoading(true);
    }

    const doFetch = async () => {
      try {
        let profiles, projects, events, initiatives;

        if (!isConfigured()) {
          // Fallback mock — sem rede, instantâneo
          const results = await Promise.allSettled([
            fetchProfiles({ limit: 24 }),
            fetchProjects(),
            fetchEvents(),
            fetchInitiatives().catch(() => []),
          ]);
          profiles = results[0].status === "fulfilled" ? results[0].value || [] : [];
          projects = results[1].status === "fulfilled" ? results[1].value || [] : [];
          events = results[2].status === "fulfilled" ? results[2].value || [] : [];
          initiatives = results[3].status === "fulfilled" ? results[3].value || [] : [];
        } else {
          // Queries mínimas — só colunas usadas na landing (corta ~60% do payload)
          const [pRes, prRes, eRes, iRes] = await Promise.allSettled([
            supabase.from("profiles").select("id,name,avatar_url,category,director_role,discipline,affiliation,team").limit(24),
            supabase.from("projects").select("id,name,description,team,image_url").limit(20),
            supabase.from("events").select("id,title,description,starts_at,location,visibility,image_url").eq("visibility", "public").order("starts_at", { ascending: false }).limit(10),
            supabase.from("initiatives").select("id,name,team,description,image_url").limit(10),
          ]);
          profiles = pRes.status === "fulfilled" && !pRes.value.error ? (pRes.value.data || []).map(m => ({
            id: m.id, name: m.name, avatar_url: m.avatar_url || "", category: m.category || "membro",
            director_role: m.director_role || "", discipline: m.discipline || m.team || "Geral",
            affiliation: m.affiliation || "", team: m.team || "Geral",
          })) : [];
          projects = prRes.status === "fulfilled" && !prRes.value.error ? (prRes.value.data || []).map(m => ({
            id: m.id, name: m.name, description: m.description || "", team: m.team || "", image_url: m.image_url || "",
          })) : [];
          events = eRes.status === "fulfilled" && !eRes.value.error ? (eRes.value.data || []) : [];
          initiatives = iRes.status === "fulfilled" && !iRes.value.error ? (iRes.value.data || []).map(m => ({
            id: m.id, name: m.name, team: m.team || "Iniciativa", description: m.description || "", image_url: m.image_url || "",
          })) : [];
          // Fallback se tabela vazia / erro RLS → tenta serviço genérico
          if (profiles.length === 0) profiles = await fetchProfiles({ limit: 24 }).catch(() => []);
          if (projects.length === 0) projects = await fetchProjects().catch(() => []);
          if (events.length === 0) events = await fetchEvents().catch(() => []);
        }

        const publicEvents = (events || []).filter(e => e.visibility === "public");
        const nextStats = [
          { value: profiles.length, label: "Membros", color: "#6da87c" },
          { value: projects.length, label: "Projetos", color: "#6b8eb3" },
          { value: publicEvents.length, label: "Eventos", color: "#c4a358" },
          { value: 4, label: "Times", color: "var(--muted)" },
        ];
        const nextPast = publicEvents
          .filter(e => e.starts_at && new Date(e.starts_at).getTime() < Date.now())
          .sort((a, b) => new Date(b.starts_at) - new Date(a.starts_at))
          .slice(0, 5);
        const nextMembers = profiles.slice(0, 12);

        setStats(nextStats);
        setPastEvents(nextPast);
        setMembers(nextMembers);

        let nextResearch = null;
        let nextGeneral = null;
        if (projects.length > 0) {
          const fromDb = projects
            .filter(p => p.team)
            .map(p => ({ name: p.name, team: p.team || "Geral", desc: p.description || "", img: p.image_url || fallbackResearch[0].img }));
          if (fromDb.length > 0) { setResearchInitiatives(fromDb); nextResearch = fromDb; }
        }
        if (initiatives.length > 0) {
          const gen = initiatives.map(i => ({ name: i.name, team: i.team || "Iniciativa", desc: i.description || "", img: i.image_url || fallbackInitiatives[0].img }));
          if (gen.length > 0) { setGeneralInitiatives(gen); nextGeneral = gen; }
        }

        writeLandingCache({ stats: nextStats, pastEvents: nextPast, members: nextMembers, research: nextResearch, general: nextGeneral });
      } catch (e) {
        console.warn("Landing stats error:", e.message);
      } finally {
        setStatsLoading(false);
        setLandingLoading(false);
      }
    };

    // Não bloqueia o paint do hero — agenda para idle
    if ("requestIdleCallback" in window) {
      window.requestIdleCallback(doFetch, { timeout: 800 });
    } else {
      setTimeout(doFetch, 60);
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
      position: "relative", border: 0, background: "none", color: "var(--muted)", cursor: "pointer",
      fontSize: 13, fontWeight: 500, padding: "6px 2px",
      fontFamily: "var(--font-body)", transition: "color var(--transition)"
    },
    card: {
      position: "relative", overflow: "hidden",
      padding: 26, borderRadius: "var(--radius)",
      border: "1px solid var(--line-soft)",
      background: "var(--surface)",
      boxShadow: "0 1px 2px rgba(0,0,0,0.06), 0 4px 16px rgba(0,0,0,0.06)",
      transition: "transform 220ms cubic-bezier(.22,.61,.36,1), border-color var(--transition), box-shadow 220ms cubic-bezier(.22,.61,.36,1)"
    },
    cardElevated: {
      position: "relative", overflow: "hidden",
      padding: 26, borderRadius: "var(--radius)",
      border: "1px solid var(--line-soft)",
      background: "var(--surface-2)",
      boxShadow: "0 1px 2px rgba(0,0,0,0.06), 0 8px 24px rgba(0,0,0,0.08)",
      transition: "transform 220ms cubic-bezier(.22,.61,.36,1), border-color var(--transition), box-shadow 220ms cubic-bezier(.22,.61,.36,1)"
    },
    iconTile: {
      display: "grid", placeItems: "center", width: 44, height: 44,
      marginBottom: 16, borderRadius: 12,
      background: "var(--accent-soft)",
      color: "var(--accent)", border: "1px solid var(--accent-border)",
      transition: "transform var(--transition), background var(--transition), border-color var(--transition)"
    },
    primaryBtn: {
      display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 8,
      height: 44, padding: "0 26px", border: 0, borderRadius: "var(--radius-sm)",
      color: "#fff", background: "var(--accent)", cursor: "pointer",
      fontSize: 14, fontWeight: 600, fontFamily: "var(--font-body)",
      boxShadow: "0 4px 14px rgba(255,75,31,0.22)",
      transition: "transform var(--transition), background var(--transition), box-shadow var(--transition), filter var(--transition)"
    },
    secondaryBtn: {
      display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 8,
      height: 44, padding: "0 26px", border: "1px solid var(--line)",
      borderRadius: "var(--radius-sm)", color: "var(--text)",
      background: "rgba(255,255,255,0.02)", cursor: "pointer",
      fontSize: 14, fontWeight: 550, fontFamily: "var(--font-body)",
      backdropFilter: "blur(6px)",
      transition: "transform var(--transition), border-color var(--transition), background var(--transition), box-shadow var(--transition)"
    }
  };

  return (
    <div style={{ minHeight: "100vh", background: "var(--bg)", color: "var(--text)" }}>
      <a href="#sobre" style={{ position: "absolute", left: "-9999px", top: "auto", width: 1, height: 1, overflow: "hidden" }} onFocus={e => { const s=e.currentTarget.style; s.left="16px"; s.top="16px"; s.width="auto"; s.height="auto"; s.padding="8px 16px"; s.background="var(--accent)"; s.color="#fff"; s.zIndex="100"; s.borderRadius="8px"; }} onBlur={e => { const s=e.currentTarget.style; s.left="-9999px"; s.top="auto"; s.width="1px"; s.height="1px"; s.overflow="hidden"; }}>Pular para conteúdo</a>

      {/* NAV */}
      <header style={{
        position: "sticky", top: 0, zIndex: 40,
        borderBottom: "1px solid rgba(55,48,37,.72)",
        background: "rgba(15,14,12,.82)", backdropFilter: "blur(18px)"
      }}>
        <div style={{
          maxWidth: L.maxW, margin: "0 auto", padding: `0 ${L.px}`,
          height: 68, display: "flex", alignItems: "center", gap: 14
        }}>
          <button onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
            style={{ display: "flex", alignItems: "center", gap: 11, border: 0, background: "none", cursor: "pointer", padding: 0 }}>
            <img src="/media/logo.svg" alt="Ligia" width="30" height="30" decoding="async" fetchPriority="high" style={{ height: 30, width: "auto" }} />
            <span style={{
              fontFamily: "var(--font-heading)", fontSize: 17, fontWeight: 600,
              letterSpacing: "-.02em", color: "var(--text)"
            }}>Ligia</span>
          </button>

          <nav className="landing-nav" style={{ display: "flex", gap: 24, marginLeft: 32, alignItems: "center" }}>
            {navLinks.map(link => (
              <a key={link.id} href={`#${link.id}`} onClick={e => { e.preventDefault(); scrollTo(link.id); }} className="landing-nav-link" style={c.navLink}>
                {link.label}
              </a>
            ))}
          </nav>

          <div style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 10 }}>
            <button onClick={goToOS} className="landing-btn-primary" style={{
              display: "inline-flex", alignItems: "center", gap: 6,
              padding: "9px 20px", border: 0, borderRadius: "var(--radius-sm)",
              color: "#fff", background: "var(--accent)", cursor: "pointer",
              fontSize: 13, fontWeight: 600, fontFamily: "var(--font-body)",
              transition: "background var(--transition)"
            }}>
              {session ? "Abrir Ligia OS" : "Login"} <ArrowRight size={14} aria-hidden="true" />
            </button>
            <button onClick={() => setMenuOpen(o => !o)} aria-label="Menu"
              style={{
                display: "none", placeItems: "center", width: 36, height: 36,
                border: 0, borderRadius: 9, background: "var(--surface-2)",
                color: "var(--text)", cursor: "pointer"
              }}>
              {menuOpen ? <X size={18} aria-hidden="true" /> : <Menu size={18} aria-hidden="true" />}
            </button>
          </div>
        </div>
        {menuOpen && (
          <nav className="landing-nav-mobile" style={{
            display: "none", padding: "10px 28px 18px",
            borderTop: "1px solid var(--line-soft)", flexDirection: "column", gap: 4
          }}>
            {navLinks.map(link => (
              <a key={link.id} href={`#${link.id}`} onClick={e => { e.preventDefault(); scrollTo(link.id); }}
                style={{ ...c.navLink, textAlign: "left", padding: "12px 2px", fontSize: 15 }}>
                {link.label}
              </a>
            ))}
          </nav>
        )}
      </header>

      {/* HERO — rede neural (animejs) com blur para suavizar */}
      <section style={{
        position: "relative", overflow: "hidden",
        background: "var(--bg)",
        isolation: "isolate",
        minHeight: "clamp(520px, 72vh, 760px)",
        display: "grid", placeItems: "center"
      }}>
        {/* Camada 1: rede animada — leve, rAF + pausa fora da viewport */}
        <div aria-hidden="true" style={{ position: "absolute", inset: 0, zIndex: 0, opacity: 0.92 }}>
          <Suspense fallback={null}>
            <NeuralHero />
          </Suspense>
        </div>
        {/* Camada 2: blur leve + véu — suaviza sem pesar GPU */}
        <div aria-hidden="true" style={{
          position: "absolute", inset: 0, zIndex: 1,
          backdropFilter: "blur(4px)", WebkitBackdropFilter: "blur(4px)",
          background: `
            radial-gradient(circle at 50% -8%, rgba(15,14,12,0.32) 0%, transparent 44%),
            linear-gradient(180deg, rgba(15,14,12,0.12) 0%, rgba(15,14,12,0.46) 58%, rgba(15,14,12,0.70) 100%),
            radial-gradient(circle at 70% -10%, rgba(255,75,31,.09), transparent 38%),
            radial-gradient(circle at 15% 90%, rgba(255,144,104,.05), transparent 40%)
          `
        }} />
        {/* Camada 3: grade sutil */}
        <div aria-hidden="true" style={{
          position: "absolute", inset: 0, zIndex: 1, opacity: 0.032,
          backgroundImage: "linear-gradient(var(--line-soft) 1px, transparent 1px), linear-gradient(90deg, var(--line-soft) 1px, transparent 1px)",
          backgroundSize: "48px 48px",
          maskImage: "radial-gradient(circle at 50% 50%, black 60%, transparent 94%)",
          WebkitMaskImage: "radial-gradient(circle at 50% 50%, black 60%, transparent 94%)"
        }} />
        <div style={{ maxWidth: L.maxW, margin: "0 auto", padding: L.heroPad, textAlign: "center", position: "relative", zIndex: 2, width: "100%" }}>
          <div className="eyebrow hero-enter" style={{ marginBottom: 18, color: "var(--accent)", "--delay": "0ms" }}>
            Liga Acadêmica de Inteligência Artificial
          </div>
          <h1 className="hero-enter" style={{ margin: "0 auto 22px", maxWidth: 820, fontSize: "clamp(38px, 6.5vw, 72px)", lineHeight: 1.06, fontWeight: 500, letterSpacing: "-.035em", "--delay": "90ms" }}>
            Conexão que inspira o<br />
            <span className="gradient-text">futuro.</span>
          </h1>
          <p className="hero-enter" style={{ margin: "0 auto 34px", maxWidth: 560, color: "var(--muted)", fontSize: 15, lineHeight: 1.8, "--delay": "180ms" }}>
            A Ligia é uma liga acadêmica que reúne estudantes e pesquisadores para
            estudar, construir e divulgar inteligência artificial — com pesquisa,
            projetos e extensão em quatro frentes de atuação.
          </p>
          <div className="hero-enter" style={{ display: "flex", justifyContent: "center", gap: 12, flexWrap: "wrap", "--delay": "270ms" }}>
            <button onClick={() => scrollTo("participe")} className="landing-btn-primary" style={c.primaryBtn}>
              Quero participar <ArrowRight size={15} aria-hidden="true" />
            </button>
            <button onClick={() => scrollTo("sobre")} className="landing-btn-secondary" style={c.secondaryBtn}>
              Conhecer a Ligia
            </button>
          </div>
          <div className="gradient-bar hero-enter" style={{ width: 72, margin: "56px auto 0", "--delay": "360ms" }} />
        </div>
      </section>

      {/* STATS */}
      <section data-reveal style={{ borderBottom: "1px solid var(--line-soft)", background: "var(--surface)" }}>
        <div className="landing-stats" style={{
          maxWidth: L.maxW, margin: "0 auto", padding: `32px ${L.px}`,
          display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 16
        }}>
          {stats.map(stat => (
            <div key={stat.label} className="landing-card landing-stat" style={{ ...c.cardElevated, textAlign: "center", padding: "18px 14px", display: "grid", placeItems: "center", gap: 6 }}>
              <div style={{
                fontSize: 32, fontWeight: 650, lineHeight: 1, color: stat.color,
                fontFamily: "var(--font-heading)", letterSpacing: "-.03em",
                minHeight: 34, display: "grid", placeItems: "center"
              }}>
                {statsLoading ? (
                  <span className="skeleton" style={{ width: 56, height: 22, borderRadius: 6, display: "inline-block" }} />
                ) : stat.value}
              </div>
              <div style={{ color: "var(--muted-2)", fontSize: 11, fontWeight: 500, letterSpacing: ".02em" }}>{stat.label}</div>
              <div style={{ width: 28, height: 2, borderRadius: 999, background: stat.color, opacity: 0.9, marginTop: 2 }} />
            </div>
          ))}
        </div>
      </section>

      {/* SOBRE */}
      <section id="sobre" data-reveal style={{ padding: L.sectionPad, scrollMarginTop: "80px" }}>
        <div style={{ maxWidth: L.maxW, margin: "0 auto" }}>
          <div style={{ maxWidth: 600, marginBottom: 40 }}>
            <div className="eyebrow" style={{ marginBottom: 12 }}>Sobre a Ligia</div>
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

          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(255px, 1fr))", gap: 16 }}>
            {pillars.map(p => (
              <div key={p.title} className="landing-card" style={{ ...c.card, display: "flex", flexDirection: "column" }}>
                <div style={c.iconTile}><p.icon size={19} aria-hidden="true" /></div>
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
      <section id="pilares" data-reveal style={{ padding: L.sectionPad, background: "var(--surface)", scrollMarginTop: "80px" }}>
        <div style={{ maxWidth: L.maxW, margin: "0 auto" }}>
          <div style={{ maxWidth: 600, marginBottom: 40 }}>
            <div className="eyebrow" style={{ marginBottom: 12 }}>Pilares</div>
            <h2 style={{ margin: "0 0 14px", fontSize: "clamp(28px, 4vw, 40px)", fontWeight: 500, letterSpacing: "-.03em" }}>
              Estudar, construir e divulgar.
            </h2>
            <div className="gradient-bar" style={{ width: 56, marginBottom: 16 }} />
            <p style={{ margin: 0, color: "var(--muted)", fontSize: 14, lineHeight: 1.8 }}>
              Três pilares guiam todas as atividades da liga — da formação técnica
              à extensão para o público.
            </p>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: 16 }}>
            {teams.map(team => (
              <div key={team.name} className="landing-card" style={{ ...c.card, padding: 26 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 12 }}>
                  <div style={{ ...c.iconTile, marginBottom: 0, width: 38, height: 38, borderRadius: 10 }}>
                    <team.icon size={17} aria-hidden="true" />
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
      <section id="iniciativas" data-reveal style={{ padding: L.sectionPad, scrollMarginTop: "80px" }}>
        <div style={{ maxWidth: L.maxW, margin: "0 auto" }}>
          <div style={{ maxWidth: 600, marginBottom: 40 }}>
            <div className="eyebrow" style={{ marginBottom: 12 }}>Iniciativas</div>
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
                    className="landing-initiative"
                    style={{
                      position: "relative", overflow: "hidden", textAlign: "left",
                      display: "block", height: 270, padding: 0, border: "1px solid var(--line-soft)",
                      borderRadius: "var(--radius)", cursor: "pointer",
                      background: "var(--surface)", fontFamily: "var(--font-body)",
                      boxShadow: "0 1px 2px rgba(0,0,0,0.08), 0 4px 16px rgba(0,0,0,0.06)",
                      transition: "transform 220ms cubic-bezier(.22,.61,.36,1), border-color var(--transition), box-shadow var(--transition)"
                    }}>
                    <img src={item.img} alt={item.name} width="600" height="400" loading="lazy" decoding="async"
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
                      {isOpen ? <Minus size={15} aria-hidden="true" /> : <Plus size={15} aria-hidden="true" />}
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
      <section id="eventos" style={{ padding: L.sectionPad, background: "var(--surface)" }}>
        <div style={{ maxWidth: L.maxW, margin: "0 auto" }}>
          <div style={{ maxWidth: 600, marginBottom: 40 }}>
            <div className="eyebrow" style={{ marginBottom: 12 }}>Eventos passados</div>
            <h2 style={{ margin: "0 0 14px", fontSize: "clamp(28px, 4vw, 40px)", fontWeight: 500, letterSpacing: "-.03em" }}>
              Atividade que já movimentou a liga.
            </h2>
            <div className="gradient-bar" style={{ width: 56, marginBottom: 16 }} />
            <p style={{ margin: 0, color: "var(--muted)", fontSize: 14, lineHeight: 1.8 }}>
              Workshops, sessões técnicas, maratonas e encontros da comunidade
              registrados na agenda da Ligia.
            </p>
          </div>

          {landingLoading ? (
            <div style={{ display: "flex", gap: 16 }}>
              {[1,2,3].map(i => (
                <div key={i} className="skeleton" style={{ flex: "1 1 0", aspectRatio: "1 / 1", borderRadius: "var(--radius)", border: "1px solid var(--line-soft)" }} />
              ))}
            </div>
          ) : pastEvents.length === 0 ? (
            <div style={{ ...c.card, color: "var(--muted)", fontSize: 13, textAlign: "center", padding: "40px 20px" }}>
              Nenhum evento passado registrado ainda.
            </div>
          ) : (
            <>
              <div
                ref={eventsSnapRef}
                onScroll={handleCarouselScroll}
                className="events-snap"
                aria-roledescription="carousel"
                aria-label="Eventos passados"
                tabIndex={0}
                onKeyDown={e => {
                  if (e.key === "ArrowLeft") { e.preventDefault(); moveCarousel(-1); }
                  if (e.key === "ArrowRight") { e.preventDefault(); moveCarousel(1); }
                }}
                style={{
                  display: "flex", gap: 14, overflowX: "auto", scrollSnapType: "x mandatory",
                  scrollbarWidth: "none", msOverflowStyle: "none", borderRadius: "var(--radius)",
                  overscrollBehaviorX: "contain", WebkitOverflowScrolling: "touch",
                  scrollPaddingInline: "24px", paddingBottom: 8,
                  outline: "none"
                }}>
                  {pastEvents.map((ev, idx) => {
                    const isCenter = idx === eventIdx;
                    return (
                      <div key={ev.id} className="landing-card" role="group" aria-roledescription="slide" aria-label={`${idx + 1} de ${pastEvents.length}: ${ev.title}`} style={{
                        display: "flex", flexDirection: "column", overflow: "hidden",
                        flex: "0 0 calc((100% - 28px) / 3)",
                        scrollSnapAlign: "center",
                        borderRadius: "var(--radius)",
                        border: isCenter ? "1px solid var(--accent-border)" : "1px solid var(--line-soft)",
                        background: "var(--bg)",
                        boxShadow: isCenter ? "var(--shadow)" : "none",
                        transform: isCenter ? "translateY(-6px)" : "none",
                        transition: "border-color 420ms var(--ease-out, cubic-bezier(0.23,1,0.32,1)), box-shadow 420ms var(--ease-out, cubic-bezier(0.23,1,0.32,1)), transform 560ms var(--ease-out, cubic-bezier(0.23,1,0.32,1)), opacity 420ms var(--ease-out, cubic-bezier(0.23,1,0.32,1))",
                        opacity: isCenter ? 1 : 0.82
                      }}>
                        <div style={{
                          position: "relative", aspectRatio: "1 / 1", flex: "0 0 auto",
                          display: "grid", placeItems: "center", overflow: "hidden",
                          background: "var(--surface-2)"
                        }}>
                          {ev.image_url ? (
                            <img src={ev.image_url} alt={ev.title} width="400" height="400" loading="lazy" decoding="async"
                              style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover", objectPosition: "center" }} />
                          ) : (
                            <div style={{
                              display: "grid", placeItems: "center", width: 46, height: 46,
                              borderRadius: 12, background: "var(--accent-soft)", color: "var(--accent)"
                            }}>
                              <CalendarDays size={20} aria-hidden="true" />
                            </div>
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
                    background: "var(--bg)", color: "var(--text)",
                    transition: "border-color var(--transition), background var(--transition)"
                  }}>
                  <ChevronLeft size={16} aria-hidden="true" />
                </button>
                <div style={{ display: "flex", gap: 6 }} role="tablist" aria-label="Eventos">
                  {pastEvents.map((ev, idx) => (
                    <button key={ev.id} onClick={() => jumpCarousel(idx)} aria-label={`Ir para ${ev.title}`} aria-current={idx === eventIdx ? "true" : undefined} role="tab"
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
                    background: "var(--bg)", color: "var(--text)",
                    transition: "border-color var(--transition), background var(--transition)"
                  }}>
                  <ChevronRight size={16} aria-hidden="true" />
                </button>
              </div>
            </>
          )}
        </div>
      </section>

      {/* MEMBROS */}
      <section id="membros" data-reveal style={{ padding: L.sectionPad, scrollMarginTop: "80px" }}>
        <div style={{ maxWidth: L.maxW, margin: "0 auto" }}>
          <div style={{ maxWidth: 600, marginBottom: 40 }}>
            <div className="eyebrow" style={{ marginBottom: 12 }}>Quem faz a Ligia</div>
            <h2 style={{ margin: "0 0 14px", fontSize: "clamp(28px, 4vw, 40px)", fontWeight: 500, letterSpacing: "-.03em" }}>
              Professores, diretores e membros.
            </h2>
            <div className="gradient-bar" style={{ width: 56, marginBottom: 16 }} />
            <p style={{ margin: 0, color: "var(--muted)", fontSize: 14, lineHeight: 1.8 }}>
              A comunidade é conduzida por uma diretoria, apoiada por professores
              orientadores e formada por estudantes e pesquisadores.
            </p>
          </div>

          <div style={{ display: "grid", gap: 28 }}>
            {landingLoading ? (
              <>
                {[1,2,3].map(s => (
                  <div key={s}>
                    <div className="eyebrow" style={{ marginBottom: 12, opacity: 0.6 }}>&nbsp;</div>
                    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(240px, 1fr))", gap: 16 }}>
                      {[1,2,3].map(i => <div key={i} className="skeleton" style={{ height: 78, borderRadius: "var(--radius)", border: "1px solid var(--line-soft)" }} />)}
                    </div>
                  </div>
                ))}
              </>
            ) : (
              <>
            <div>
              <div className="eyebrow" style={{ marginBottom: 12 }}>Professores orientadores</div>
              {professors.length === 0 ? (
                <div style={{ ...c.card, color: "var(--muted)", fontSize: 13, textAlign: "center", padding: "32px 20px" }}>
                  Em breve, a relação de professores aparece aqui.
                </div>
              ) : (
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(240px, 1fr))", gap: 16 }}>
                  {professors.map(p => (
                    <div key={p.id || p.name} className="landing-card" style={{ ...c.card, display: "flex", alignItems: "center", gap: 13, padding: "16px 18px" }}>
                      <img src={p.avatar_url || `https://randomuser.me/api/portraits/${String(p.id).charCodeAt(0) % 2 === 0 ? "women" : "men"}/${(parseInt(String(p.id).replace(/\D/g, "")) || 10) % 90 + 1}.jpg`} alt={p.name} width="44" height="44" loading="lazy" decoding="async" style={{ width: 44, height: 44, flex: "0 0 auto", borderRadius: "50%", objectFit: "cover", border: "2px solid var(--surface)", boxShadow: "0 0 0 1px var(--line-soft), 0 1px 3px rgba(0,0,0,0.12)" }} />
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
              <div className="eyebrow" style={{ marginBottom: 12 }}>Diretoria</div>
              {directors.length === 0 ? (
                <div style={{ ...c.card, color: "var(--muted)", fontSize: 13, textAlign: "center", padding: "32px 20px" }}>
                  Em breve, a relação da diretoria aparece aqui.
                </div>
              ) : (
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(240px, 1fr))", gap: 16 }}>
                  {directors.map(d => (
                    <div key={d.id || d.name} className="landing-card" style={{ ...c.card, display: "flex", alignItems: "center", gap: 13, padding: "16px 18px" }}>
                      <img src={d.avatar_url || `https://randomuser.me/api/portraits/${String(d.id).charCodeAt(0) % 2 === 0 ? "women" : "men"}/${(parseInt(String(d.id).replace(/\D/g, "")) || 10) % 90 + 1}.jpg`} alt={d.name} width="44" height="44" loading="lazy" decoding="async" style={{ width: 44, height: 44, flex: "0 0 auto", borderRadius: "50%", objectFit: "cover", border: "2px solid var(--surface)", boxShadow: "0 0 0 1px var(--line-soft), 0 1px 3px rgba(0,0,0,0.12)" }} />
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
              <div className="eyebrow" style={{ marginBottom: 12 }}>Membros</div>
              {regularMembers.length === 0 ? (
                <div style={{ ...c.card, color: "var(--muted)", fontSize: 13, textAlign: "center", padding: "40px 20px" }}>
                  Em breve, a relação de membros aparece aqui.
                </div>
              ) : (
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))", gap: 16 }}>
                  {regularMembers.map(m => (
                    <div key={m.id} className="landing-card" style={{ ...c.card, display: "flex", alignItems: "center", gap: 13, padding: "16px 18px" }}>
                      <img src={m.avatar_url || `https://randomuser.me/api/portraits/${m.id % 2 === 0 ? "women" : "men"}/${(m.id * 7) % 90 + 1}.jpg`} alt={m.name} width="42" height="42" loading="lazy" decoding="async" style={{ width: 42, height: 42, flex: "0 0 auto", borderRadius: "50%", objectFit: "cover", border: "2px solid var(--surface)", boxShadow: "0 0 0 1px var(--line-soft), 0 1px 3px rgba(0,0,0,0.12)" }} />
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
              </>
            )}
          </div>
        </div>
      </section>

      {/* NEWSLETTER — Substack */}
      <section id="newsletter" data-reveal style={{ padding: L.sectionPad, background: "var(--surface)", scrollMarginTop: "80px" }}>
        <div style={{ maxWidth: L.maxW, margin: "0 auto" }}>
          <div style={{
            display: "grid", gridTemplateColumns: "1.15fr 0.85fr", gap: 28,
            alignItems: "center",
            padding: "clamp(28px, 4vw, 40px)",
            borderRadius: "var(--radius-lg)",
            border: "1px solid var(--line-soft)",
            background: `var(--surface-2)`,
            boxShadow: "0 1px 2px rgba(0,0,0,0.08), 0 8px 28px rgba(0,0,0,0.10)"
          }} className="landing-newsletter">
            <div>
              <div className="eyebrow" style={{ marginBottom: 12, color: "var(--accent)" }}>Boletim Ligia · Substack</div>
              <h2 style={{ margin: "0 0 12px", fontSize: "clamp(26px, 3.6vw, 36px)", fontWeight: 550, letterSpacing: "-.03em", lineHeight: 1.15 }}>
                Bastidores de IA,<br />sem o ruído.
              </h2>
              <div className="gradient-bar" style={{ width: 56, marginBottom: 14 }} />
              <p style={{ margin: 0, color: "var(--muted)", fontSize: 13.5, lineHeight: 1.8, maxWidth: 520 }}>
                No Substack da Ligia compartilhamos artigos e reflexões sobre inteligência artificial — direto no seu e-mail. Gratuita, feita pela comunidade.
              </p>
              <div style={{ display: "flex", gap: 8, marginTop: 18, flexWrap: "wrap", alignItems: "center", color: "var(--muted-2)", fontSize: 12 }}>
                <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}><Mail size={13} style={{ color: "var(--accent)" }} /> Sem spam</span>
                <span style={{ opacity: 0.5 }}>·</span>
                <span>Edições quinzenais</span>
                <span style={{ opacity: 0.5 }}>·</span>
                <span>Cancele quando quiser</span>
              </div>
            </div>

            <div style={{ display: "grid", gap: 12 }}>
              <form
                onSubmit={e => {
                  e.preventDefault();
                  const email = newsletterEmail.trim();
                  const base = "https://boletimligia.substack.com/subscribe";
                  const url = email ? `${base}?email=${encodeURIComponent(email)}` : base;
                  window.open(url, "_blank", "noopener,noreferrer");
                }}
                style={{ display: "grid", gap: 10, padding: 18, borderRadius: "var(--radius)", border: "1px solid var(--line-soft)", background: "var(--surface)", boxShadow: "0 2px 10px rgba(0,0,0,0.06)" }}
              >
                <label htmlFor="newsletter-email" style={{ fontSize: 11, fontWeight: 600, color: "var(--muted)", letterSpacing: ".04em", textTransform: "uppercase" }}>Seu melhor e-mail</label>
                <div style={{ display: "flex", gap: 8 }}>
                  <input
                    id="newsletter-email"
                    type="email"
                    required
                    placeholder="voce@exemplo.com"
                    value={newsletterEmail}
                    onChange={e => setNewsletterEmail(e.target.value)}
                    style={{ flex: 1, height: 42, padding: "0 14px", border: "1px solid var(--line)", borderRadius: "var(--radius-sm)", outline: "none", background: "var(--bg)", color: "var(--text)", fontSize: 13 }}
                  />
                  <button type="submit" className="landing-btn-primary" style={{ ...c.primaryBtn, height: 42, whiteSpace: "nowrap", padding: "0 18px" }}>
                    Assinar <ArrowRight size={15} aria-hidden="true" />
                  </button>
                </div>
                <div style={{ color: "var(--muted-2)", fontSize: 11, lineHeight: 1.6 }}>
                  Ao assinar você concorda em receber e-mails da Ligia via Substack. Abra no Substack para confirmar sua inscrição.
                </div>
              </form>

              <a href="https://boletimligia.substack.com/" target="_blank" rel="noreferrer"
                style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 8, height: 42, borderRadius: "var(--radius-sm)", border: "1px solid var(--line)", background: "transparent", color: "var(--muted)", fontSize: 13, fontWeight: 500, textDecoration: "none" }}>
                Ler no Substack <ExternalLink size={14} aria-hidden="true" />
              </a>
            </div>
          </div>
        </div>
      </section>

      {/* PARTICIPE */}
      <section id="participe" data-reveal style={{ padding: L.sectionPad, scrollMarginTop: "80px" }}>
        <div style={{ maxWidth: L.maxW, margin: "0 auto" }}>
          <div className="landing-cta" style={{
            padding: "clamp(40px, 6vw, 64px)", textAlign: "center",
            borderRadius: "var(--radius-lg)",
            border: "1px solid var(--line-soft)",
            background: `radial-gradient(circle at 50% 120%, rgba(255,75,31,.10), transparent 60%), var(--surface-2)`,
            boxShadow: "0 1px 2px rgba(0,0,0,0.06), 0 8px 24px rgba(0,0,0,0.10)",
            position: "relative", overflow: "hidden"
          }}>
            <div style={{ display: "grid", placeItems: "center", width: 52, height: 52, margin: "0 auto 18px", borderRadius: 13, background: "var(--accent-soft)", color: "var(--accent)" }}>
              <Sparkles size={22} aria-hidden="true" />
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
              <Link to="/processo-seletivo" className="landing-btn-primary" style={c.primaryBtn}>
                Processo Seletivo <ArrowRight size={15} aria-hidden="true" />
              </Link>
              <button onClick={goToOS} className="landing-btn-secondary" style={c.secondaryBtn}>
                {session ? "Abrir Ligia OS" : "Sou Membro"}
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* FOOTER */}
      <footer id="contato" style={{ borderTop: "1px solid var(--line-soft)", background: "var(--surface)", scrollMarginTop: "80px" }}>
        <div className="gradient-bar" style={{ width: "100%", height: 2 }} />
        <div style={{ maxWidth: L.maxW, margin: "0 auto", padding: `56px ${L.px} 40px` }}>
          <div className="landing-footer-grid" style={{ display: "grid", gridTemplateColumns: "1.6fr 1fr 1fr 1.4fr", gap: 28 }}>
            <div>
              <div style={{ display: "flex", alignItems: "center", gap: 11, marginBottom: 16 }}>
                <img src="/media/logo.svg" alt="Ligia" width="28" height="28" decoding="async" style={{ height: 28, width: "auto" }} />
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
              <div className="eyebrow" style={{ marginBottom: 12 }}>A liga</div>
              <div style={{ display: "grid", gap: 8 }}>
                {navLinks.map(link => (
                  <a key={link.id} href={`#${link.id}`} onClick={e => { e.preventDefault(); scrollTo(link.id); }} style={{
                    ...c.navLink, textAlign: "left", padding: 0, fontSize: 13, display: "block"
                  }}>{link.label}</a>
                ))}
              </div>
            </div>
            <div>
              <div className="eyebrow" style={{ marginBottom: 12 }}>Times</div>
              <div style={{ display: "grid", gap: 8 }}>
                {teams.map(t => (
                  <span key={t.name} style={{ color: "var(--muted-2)", fontSize: 13 }}>{t.name}</span>
                ))}
              </div>
            </div>
            <div>
              <div className="eyebrow" style={{ marginBottom: 12 }}>Contato</div>
              <div style={{ display: "grid", gap: 10, color: "var(--muted-2)", fontSize: 13 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 9 }}>
                  <Mail size={14} aria-hidden="true" style={{ color: "var(--accent)" }} /> ligia@cin.ufpe.br
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 9 }}>
                  <MapPin size={14} aria-hidden="true" style={{ color: "var(--accent)" }} /> CIn · UFPE, Recife
                </div>
                <div style={{ display: "flex", gap: 10, marginTop: 6 }}>
                  <a
                    href="https://instagram.com/ligia.ufpe"
                    target="_blank"
                    rel="noreferrer"
                    aria-label="Instagram da Ligia"
                    style={{ display: "grid", placeItems: "center", width: 32, height: 32, borderRadius: 9, background: "var(--surface-2)", color: "var(--muted)", cursor: "pointer" }}
                  >
                    <Instagram size={15} aria-hidden="true" />
                  </a>

                  <a
                    href="https://github.com/ligia-ufpe"
                    target="_blank"
                    rel="noreferrer"
                    aria-label="Instagram da Ligia"
                    style={{ display: "grid", placeItems: "center", width: 32, height: 32, borderRadius: 9, background: "var(--surface-2)", color: "var(--muted)", cursor: "pointer" }}
                  >
                    <Github size={15} aria-hidden="true" />
                  </a>

                  <a
                    href="https://www.linkedin.com/company/ligia/"
                    target="_blank"
                    rel="noreferrer"
                    aria-label="Instagram da Ligia"
                    style={{ display: "grid", placeItems: "center", width: 32, height: 32, borderRadius: 9, background: "var(--surface-2)", color: "var(--muted)", cursor: "pointer" }}
                  >
                    <Linkedin size={15} aria-hidden="true" />
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
        :root { --ease-out: cubic-bezier(0.23,1,0.32,1); --ease-in-out: cubic-bezier(0.77,0,0.175,1); --ease-drawer: cubic-bezier(0.32,0.72,0,1); }
        .skeleton { background: linear-gradient(90deg, var(--surface-2) 25%, var(--surface-3) 37%, var(--surface-2) 63%); background-size: 400% 100%; animation: shimmer 1.4s ease infinite; }
        @keyframes shimmer { 0% { background-position: 100% 0; } 100% { background-position: -100% 0; } }
        @keyframes heroIn { from { opacity: 0; transform: translateY(14px) scale(0.98); } to { opacity: 1; transform: translateY(0) scale(1); } }
        .hero-enter { opacity: 0; animation: heroIn 420ms var(--ease-out) forwards; animation-delay: var(--delay, 0ms); }
        [data-reveal] { opacity: 0; transform: translateY(18px); transition: opacity 220ms var(--ease-out, cubic-bezier(0.23,1,0.32,1)), transform 220ms var(--ease-out, cubic-bezier(0.23,1,0.32,1)) cubic-bezier(.22,.61,.36,1); }
        [data-reveal].is-visible { opacity: 1; transform: translateY(0); }
        #pilares, #eventos { position: relative; }
        #pilares::before, #eventos::before { content: ""; position: absolute; inset: 0; background: radial-gradient(circle at 80% 10%, rgba(255,75,31,0.05), transparent 38%), radial-gradient(circle at 10% 90%, rgba(255,144,104,0.03), transparent 36%); pointer-events: none; }
        /* Conteúdo abaixo da dobra não bloqueia o primeiro paint */
        #pilares, #iniciativas, #eventos, #membros, #newsletter, #participe { content-visibility: auto; contain-intrinsic-size: 900px 800px; }
        .landing-nav-link { transform-origin: var(--transform-origin, center); }
        .landing-nav-link::after { content: ""; position: absolute; left: 2px; right: 2px; bottom: -2px; height: 2px; background: var(--accent); border-radius: 999px; transform: scaleX(0); transform-origin: left; transition: transform 200ms var(--ease-out); }
        .landing-nav-link:hover::after, .landing-nav-link:focus-visible::after { transform: scaleX(1); }
        .landing-nav-link:hover { color: var(--text) !important; }
        .landing-card { position: relative; transform-origin: var(--transform-origin, center); transition: transform 200ms var(--ease-out), border-color 180ms var(--ease-out), box-shadow 200ms var(--ease-out); }
        .landing-card:active { transform: scale(0.97); }
        .landing-initiative { transform-origin: var(--transform-origin, center); transition: transform 200ms var(--ease-out), border-color 180ms var(--ease-out), box-shadow 200ms var(--ease-out); }
        .landing-initiative:active { transform: scale(0.97); }
        @media (hover: hover) and (pointer: fine) {
          .landing-card:hover { transform: translateY(-4px); border-color: var(--line) !important; box-shadow: 0 8px 24px rgba(0,0,0,0.14), 0 2px 6px rgba(0,0,0,0.08); }
          .landing-initiative:hover { transform: translateY(-4px); border-color: var(--line) !important; box-shadow: 0 10px 28px rgba(0,0,0,0.16), 0 4px 10px rgba(0,0,0,0.10); }
          .landing-initiative:hover img { transform: scale(1.03); }
          .landing-btn-primary:hover { transform: translateY(-1.5px); box-shadow: 0 10px 28px rgba(255,75,31,.32), 0 2px 8px rgba(0,0,0,0.12); filter: brightness(1.06); }
          .landing-btn-secondary:hover { transform: translateY(-1.5px); border-color: var(--accent-border) !important; background: var(--surface-2) !important; color: var(--text) !important; box-shadow: 0 6px 20px rgba(0,0,0,0.10); }
          .landing-stat:hover { transform: translateY(-4px); border-color: rgba(255,255,255,0.08) !important; }
        }
        .landing-initiative img { transition: transform 320ms var(--ease-out), filter 180ms var(--ease-out); }
        .landing-btn-primary { transition: transform 160ms var(--ease-out), box-shadow 180ms var(--ease-out), filter 180ms var(--ease-out), background 180ms var(--ease-out); }
        .landing-btn-primary:active { transform: scale(0.97); box-shadow: none; }
        .landing-btn-secondary { transition: transform 160ms var(--ease-out), border-color 180ms var(--ease-out), background 180ms var(--ease-out), color 180ms var(--ease-out), box-shadow 180ms var(--ease-out); }
        .landing-btn-secondary:active { transform: scale(0.97); box-shadow: none; }
        .landing-stat { transition: transform 200ms var(--ease-out), border-color 180ms var(--ease-out), box-shadow 200ms var(--ease-out); }
        .landing-stat:active { transform: scale(0.97); }
        .landing-cta { position: relative; }
        .landing-card:focus-within, .landing-initiative:focus-visible { outline: 2px solid var(--accent-border); outline-offset: 2px; }
        /* Stagger 45ms — decorativo, não bloqueia interação */
        #sobre .landing-card:nth-child(1), #pilares .landing-card:nth-child(1), #iniciativas .landing-initiative:nth-child(1) { transition-delay: 0ms; }
        #sobre .landing-card:nth-child(2), #pilares .landing-card:nth-child(2), #iniciativas .landing-initiative:nth-child(2) { transition-delay: 45ms; }
        #sobre .landing-card:nth-child(3), #pilares .landing-card:nth-child(3), #iniciativas .landing-initiative:nth-child(3) { transition-delay: 90ms; }
        #sobre .landing-card:nth-child(4), #pilares .landing-card:nth-child(4), #iniciativas .landing-initiative:nth-child(4) { transition-delay: 135ms; }
        .landing-nav-mobile { transform-origin: top; }
        @media (prefers-reduced-motion: reduce) {
          .hero-enter, [data-reveal] { animation: none !important; transition: none !important; transform: none !important; opacity: 1 !important; }
          .landing-card:hover, .landing-initiative:hover, .landing-btn-primary:hover, .landing-btn-secondary:hover, .landing-stat:hover { transform: none !important; }
        }
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
        @media (max-width: 880px) {
          .landing-newsletter { grid-template-columns: 1fr !important; }
        }
        @media (max-width: 820px) {
          .events-snap > * { flex: 0 0 100% !important; }
        }
      `}</style>
    </div>
  );
}