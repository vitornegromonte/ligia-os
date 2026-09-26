import { useState, useEffect, useRef, lazy, Suspense } from "react";
import { Link, useNavigate } from "react-router-dom";
const NeuralHero = lazy(() => import("../components/NeuralHero.jsx"));
const Logo3D = lazy(() => import("../components/Logo3D.jsx"));
import {
  ArrowRight, Github, Linkedin,
  GraduationCap, Mail, MapPin,
  BookOpen, Megaphone, Languages, BrainCircuit, ScanEye, Cpu,
  CalendarDays, ChevronDown, ChevronLeft, ChevronRight, Instagram, ExternalLink
} from "lucide-react";
import { homeFor } from "../auth/access.js";
import { useAuth } from "../contexts/AuthContext.jsx";
import { fetchProfiles } from "../services/profiles.js";
import { fetchProjects } from "../services/projects.js";
import { fetchEvents } from "../services/events.js";
import { fetchInitiatives } from "../services/initiatives.js";
import { publicSupabase } from "../lib/supabase.js";
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
    desc: "Participação no desafio internacional de rastreamento de células em imagens de microscopia: detecção, segmentação e associação temporal de trajetórias.",
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

// Abas verticais sincronizadas: nav (esq) + visual (centro) + infos (dir).
// Um estado só; as três áreas atualizam juntas. Tema dark.
function InitiativeTabs({ research, general }) {
  const groups = [
    { key: "pesquisas", label: "Pesquisas", items: research || [] },
    { key: "iniciativas", label: "Iniciativas", items: general || [] },
  ].filter(g => g.items.length > 0);
  const [sel, setSel] = useState({ group: groups[0]?.key || "pesquisas", idx: 0 });

  const flat = groups.flatMap(g => g.items.map((item, idx) => ({ group: g.key, idx, item })));
  if (flat.length === 0) {
    return (
      <div style={{ padding: "40px 20px", textAlign: "center", color: "var(--muted)", fontSize: 13, border: "1px solid rgba(255,255,255,0.08)", borderRadius: "var(--landing-inner)", background: "var(--surface)" }}>
        Em breve, as iniciativas da liga aparecem aqui.
      </div>
    );
  }
  const current = flat.find(f => f.group === sel.group && f.idx === sel.idx) || flat[0];
  const active = current.item;

  const iconFor = (team) => {
    if (team === "NLP") return Languages;
    if (team === "ML") return BrainCircuit;
    if (team === "CV") return ScanEye;
    if (team === "Comunicação") return Megaphone;
    return BookOpen;
  };

  function move(dir) {
    const i = flat.findIndex(f => f.group === current.group && f.idx === current.idx);
    const next = flat[(i + dir + flat.length) % flat.length];
    setSel({ group: next.group, idx: next.idx });
  }

  const EASE = "200ms cubic-bezier(0.32,0.72,0,1)";

  return (
    <div className="landing-vtab" style={{ display: "grid", gridTemplateColumns: "260px 1.1fr 1fr", gap: "clamp(32px, 4vw, 56px)", alignItems: "start" }}>
      <div className="landing-vtab-select" style={{ display: "none" }}>
        <label
          htmlFor="vtab-select"
          style={{ display: "block", fontFamily: "var(--font-heading)", fontSize: 10, fontWeight: 600, letterSpacing: ".2em", textTransform: "uppercase", color: "var(--muted-2)", marginBottom: 8 }}
        >
          Escolher iniciativa
        </label>
        <span style={{ position: "relative", display: "block" }}>
          <select
            id="vtab-select"
            value={`${current.group}:${current.idx}`}
            onChange={e => {
              const [group, idx] = e.target.value.split(":");
              setSel({ group, idx: Number(idx) });
            }}
            style={{
              width: "100%", height: 52, appearance: "none", WebkitAppearance: "none",
              padding: "0 44px 0 16px", borderRadius: 14, cursor: "pointer",
              border: "1px solid rgba(255,255,255,0.08)", background: "var(--surface-2)", color: "var(--text)",
              fontSize: 14, fontWeight: 550, fontFamily: "var(--font-body)",
            }}
          >
            {groups.map(g => (
              <optgroup key={g.key} label={g.label}>
                {g.items.map((item, idx) => (
                  <option key={item.name} value={`${g.key}:${idx}`}>{item.name}</option>
                ))}
              </optgroup>
            ))}
          </select>
          <ChevronDown size={16} strokeWidth={1.5} aria-hidden="true" style={{ position: "absolute", right: 16, top: "50%", transform: "translateY(-50%)", color: "var(--muted)", pointerEvents: "none" }} />
        </span>
      </div>
      <div
        className="landing-vtab-nav" role="tablist" aria-label="Pesquisas e iniciativas"
        onKeyDown={e => {
          if (e.key === "ArrowDown") { e.preventDefault(); move(1); }
          if (e.key === "ArrowUp") { e.preventDefault(); move(-1); }
        }}
        style={{ display: "grid", gap: 4, alignContent: "start" }}
      >
        {groups.map(g => (
          <div key={g.key} className="vtab-group" style={{ display: "grid", gap: 4 }}>
            <div className="vtab-group-label" style={{ fontFamily: "var(--font-heading)", fontSize: 10, fontWeight: 600, letterSpacing: ".2em", textTransform: "uppercase", color: "var(--muted-2)", padding: "14px 14px 6px" }}>
              {g.label}
            </div>
            {g.items.map((item, idx) => {
              const isActive = current.group === g.key && current.idx === idx;
              const Icon = iconFor(item.team);
              return (
                <button
                  key={item.name} role="tab" aria-selected={isActive}
                  onClick={() => setSel({ group: g.key, idx })}
                  style={{
                    display: "flex", alignItems: "center", gap: 12, textAlign: "left",
                    padding: "12px 14px", border: "1px solid transparent", borderRadius: 14,
                    cursor: "pointer", fontFamily: "var(--font-body)", width: "100%",
                    color: isActive ? "var(--text)" : "var(--muted)",
                    background: isActive ? "rgba(255,255,255,0.05)" : "transparent",
                    borderColor: isActive ? "rgba(255,255,255,0.09)" : "transparent",
                    boxShadow: isActive ? "0 8px 24px rgba(0,0,0,0.22)" : "none",
                    transition: `background ${EASE}, color ${EASE}, border-color ${EASE}, box-shadow ${EASE}, transform ${EASE}`,
                  }}
                >
                  <span data-vtab-icon style={{
                    display: "grid", placeItems: "center", width: 34, height: 34, borderRadius: 10, flex: "0 0 auto",
                    background: isActive ? "var(--accent-soft)" : "rgba(255,255,255,0.05)",
                    color: isActive ? "var(--accent)" : "var(--muted-2)",
                    border: isActive ? "1px solid var(--accent-border)" : "1px solid rgba(255,255,255,0.08)",
                    transition: `background ${EASE}, color ${EASE}, border-color ${EASE}`,
                  }}>
                    <Icon size={16} strokeWidth={1.5} aria-hidden="true" />
                  </span>
                  <span style={{ minWidth: 0 }}>
                    <span style={{ display: "block", fontSize: 13.5, fontWeight: isActive ? 600 : 500, color: "var(--text)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                      {item.name}
                    </span>
                    <span style={{ display: "block", fontSize: 11, marginTop: 2, color: isActive ? "var(--muted)" : "var(--muted-2)" }}>
                      {item.team}
                    </span>
                  </span>
                </button>
              );
            })}
          </div>
        ))}
      </div>

      <figure className="landing-vtab-media" key={active.name + "-media"} style={{ margin: "0 0 0 calc(clamp(0px, 1.5vw, 16px) + 70px)", maxWidth: "none", padding: 6, borderRadius: 24, background: "transparent", border: "1px solid transparent" }}>
        <span style={{ display: "block", borderRadius: "var(--landing-inner)", overflow: "hidden", border: "1px solid rgba(255,255,255,0.08)" }}>
          <img
            src={active.img} alt={active.name} width="800" height="600" loading="lazy" decoding="async"
            style={{ display: "block", width: "100%", aspectRatio: "4 / 3", objectFit: "cover" }}
          />
        </span>
      </figure>

      <article className="landing-vtab-info" key={active.name + "-info"} aria-live="polite" style={{ minWidth: 0, paddingTop: 6, marginLeft: "calc(clamp(0px, 1.5vw, 16px) + 70px)" }}>
        <div style={{
          display: "inline-flex", alignItems: "center", padding: "5px 14px", borderRadius: 999,
          background: "var(--accent-soft)", border: "1px solid var(--accent-border)",
          fontFamily: "var(--font-heading)", fontSize: 11, fontWeight: 600, letterSpacing: ".08em",
          textTransform: "uppercase", color: "var(--accent)",
        }}>
          {active.team}
        </div>
        <h3 style={{ margin: "16px 0 12px", fontSize: "clamp(24px, 2.6vw, 32px)", fontWeight: 550, letterSpacing: "-.02em", lineHeight: 1.12, color: "var(--text)" }}>
          {active.name}
        </h3>
        <p style={{ margin: 0, color: "var(--muted)", fontSize: 15, lineHeight: 1.75, maxWidth: 420, textAlign: "left" }}>
          {active.desc}
        </p>
      </article>
    </div>
  );
}

// Iniciais para tile de avatar (sem foto externa genérica)
function initialsOf(name) {
  return (name || "")
    .split(" ")
    .filter(Boolean)
    .map(n => n[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

function MemberAvatar({ person, size = 44 }) {
  if (person.avatar_url) {
    return (
      <img src={person.avatar_url} alt={person.name} width={size} height={size} loading="lazy" decoding="async" style={{ width: size, height: size, flex: "0 0 auto", borderRadius: "50%", objectFit: "cover", border: "2px solid var(--surface)", boxShadow: "0 0 0 1px rgba(255,255,255,0.08)" }} />
    );
  }
  return (
    <span aria-hidden="true" style={{ width: size, height: size, flex: "0 0 auto", display: "grid", placeItems: "center", borderRadius: "50%", background: "var(--surface-2)", border: "1px solid rgba(255,255,255,0.08)", color: "var(--muted)", fontFamily: "var(--font-heading)", fontSize: size * 0.34, fontWeight: 600 }}>
      {initialsOf(person.name)}
    </span>
  );
}

// Links externos do membro: só renderiza o que existe no perfil.
function MemberLinks({ person }) {
  const links = [
    person.github && { href: person.github, label: `GitHub de ${person.name}`, Icon: Github },
    person.linkedin && { href: person.linkedin, label: `LinkedIn de ${person.name}`, Icon: Linkedin },
  ].filter(Boolean);
  if (links.length === 0) return null;
  return (
    <span style={{ marginLeft: "auto", display: "flex", flexDirection: "column", gap: 6, flex: "0 0 auto" }}>
      {links.map(({ href, label, Icon }) => (
        <a
          key={label} href={href} target="_blank" rel="noreferrer" aria-label={label}
          className="member-link"
          style={{
            display: "grid", placeItems: "center", width: 26, height: 26, borderRadius: 9,
            border: "1px solid rgba(255,255,255,0.08)", color: "var(--muted-2)",
            transition: "color 200ms cubic-bezier(0.32,0.72,0,1), border-color 200ms cubic-bezier(0.32,0.72,0,1)",
          }}
        >
          <Icon size={12} strokeWidth={1.5} aria-hidden="true" />
        </a>
      ))}
    </span>
  );
}

// — Layout tokens padronizados (landing) — alinhados ao padrão do Ligia OS
const L = {
  maxW: 1180,
  px: "clamp(20px, 4vw, 52px)",
  sectionPad: "clamp(140px, 15vh, 210px) clamp(20px, 4vw, 52px)",
  sectionPadTight: "clamp(96px, 10vh, 144px) clamp(20px, 4vw, 52px)",
  heroPad: "clamp(36px, 8vh, 90px) clamp(20px, 4vw, 52px) clamp(96px, 10vh, 130px)",
};

export default function Landing() {
  const navigate = useNavigate();
  const { session, profile } = useAuth();
  const [menuOpen, setMenuOpen] = useState(false);
  const [navScrolled, setNavScrolled] = useState(false);
  const navSentinelRef = useRef(null);
  const heroBgRef = useRef(null);
  const heroSectionRef = useRef(null);
  const [stats, setStats] = useState([
    { value: "—", label: "Membros", color: "#6da87c" },
    { value: "—", label: "Projetos", color: "#6b8eb3" },
    { value: "—", label: "Eventos", color: "#c4a358" },
    { value: 4, label: "Times", color: "var(--muted)" },
  ]);
  const [pastEvents, setPastEvents] = useState([]);
  const [members, setMembers] = useState([]);
  const [eventIdx, setEventIdx] = useState(0);
  const eventIdxRef = useRef(0);
  const tickRef = useRef(false);
  const animatingRef = useRef(false);
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
    // Snap desligado no voo programático: evita que o navegador agarre
    // cards intermediários (o bug do wrap último → segundo).
    animatingRef.current = true;
    const prevSnap = el.style.scrollSnapType;
    el.style.scrollSnapType = "none";
    const startTime = performance.now();
    const animate = (now) => {
      const elapsed = now - startTime;
      const p = Math.min(elapsed / duration, 1);
      el.scrollLeft = start + delta * easeOutCubic(p);
      if (p < 1) {
        requestAnimationFrame(animate);
      } else {
        el.scrollLeft = targetLeft; // trava exata no destino
        el.style.scrollSnapType = prevSnap || "x proximity";
        animatingRef.current = false;
      }
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
    if (pastEvents.length === 0 || animatingRef.current) return;
    const n = pastEvents.length;
    const next = (eventIdxRef.current + dir + n) % n;
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
    eventIdxRef.current = clamped;
    setEventIdx(clamped);
  }

  function handleCarouselScroll() {
    if (tickRef.current || animatingRef.current) return;
    tickRef.current = true;
    window.requestAnimationFrame(() => {
      tickRef.current = false;
      const next = getCenterIdx();
      if (next !== eventIdxRef.current) {
        eventIdxRef.current = next;
        setEventIdx(next);
      }
    });
  }

  useEffect(() => {
    document.title = "Ligia — Liga Acadêmica de Inteligência Artificial";
    // Abertura sempre no topo: sem restauração automática do navegador
    if ("scrollRestoration" in window.history) window.history.scrollRestoration = "manual";
    window.scrollTo({ top: 0, behavior: "instant" });
    loadStats();
  }, []);

  // Garante o topo após o conteúdo assíncrono hidratar (imagens alteram a altura)
  useEffect(() => {
    if (!landingLoading && !window.location.hash) window.scrollTo({ top: 0, behavior: "instant" });
  }, [landingLoading]);

  // Removido redirecionamento automático: usuário logado pode visitar a landing.
  // O botão "Abrir Ligia OS" / "Login" já direciona corretamente via goToOS().

  // Hero: fundo dissolve ao rolar (sem scroll listener, sem re-render)
  useEffect(() => {
    const sec = heroSectionRef.current;
    const bg = heroBgRef.current;
    if (!sec || !bg || !("IntersectionObserver" in window)) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const obs = new IntersectionObserver(([e]) => {
      bg.style.opacity = Math.max(0, Math.min(1, e.intersectionRatio * 1.4 - 0.15)).toFixed(3);
    }, { threshold: [0, 0.15, 0.3, 0.45, 0.6, 0.75, 0.9, 1] });
    obs.observe(sec);
    return () => obs.disconnect();
  }, []);
  useEffect(() => {
    const el = navSentinelRef.current;
    if (!el || !("IntersectionObserver" in window)) return;
    const obs = new IntersectionObserver(([e]) => setNavScrolled(!e.isIntersecting), { threshold: 0 });
    obs.observe(el);
    return () => obs.disconnect();
  }, []);

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

  // Destaque padrão é sempre o último evento adicionado (mais recente).
  // Scroll manual só no eixo X: scrollIntoView moveria a página inteira.
  useEffect(() => {
    if (pastEvents.length === 0) return;
    const initial = 0;
    eventIdxRef.current = initial;
    setEventIdx(initial);
    requestAnimationFrame(() => {
      const el = eventsSnapRef.current;
      const target = el?.children[initial];
      if (el && target) el.scrollLeft = target.offsetLeft - (el.clientWidth - target.offsetWidth) / 2;
    });
  }, [pastEvents.length]);

  // Recalcula o centro ao redimensionar (mobile ↔ desktop)
  useEffect(() => {
    const onResize = () => handleCarouselScroll();
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, [pastEvents.length]);

  // Cache de 5min para segunda visita instantânea
  const LANDING_CACHE_KEY = "ligia:landing:public:v3";
  const LANDING_TTL = 5 * 60 * 1000;

  function readLandingCache() {
    try {
      sessionStorage.removeItem("ligia:landing:v2");
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
          // No public publication flag exists for profiles/projects. Do not publish
          // internal rows, even when an administrator visits the public landing.
          profiles = [];
          projects = [];
          const [eRes, iRes] = await Promise.allSettled([
            publicSupabase.from("events").select("id,title,description,starts_at,location,visibility,image_url").eq("visibility", "public").order("starts_at", { ascending: false }).limit(10),
            publicSupabase.from("initiatives").select("id,name,team,description,image_url").limit(10),
          ]);
          events = eRes.status === "fulfilled" && !eRes.value.error ? (eRes.value.data || []) : [];
          initiatives = iRes.status === "fulfilled" && !iRes.value.error ? (iRes.value.data || []) : [];

        }

        const publicEvents = (events || []).filter(e => e.visibility === "public");
        const nextStats = [
          { value: isConfigured() ? "—" : profiles.length, label: "Membros", color: "#6da87c" },
          { value: isConfigured() ? "—" : projects.length, label: "Projetos", color: "#6b8eb3" },
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

  const goToOS = () => navigate(session ? homeFor(profile) : "/login");

  const c = {
    navLink: {
      position: "relative", border: 0, background: "none", color: "var(--muted)", cursor: "pointer",
      fontSize: 13, fontWeight: 500, padding: "6px 2px",
      fontFamily: "var(--font-body)", transition: "color 200ms cubic-bezier(0.32,0.72,0,1)"
    },
    card: {
      position: "relative", overflow: "hidden",
      padding: 26, borderRadius: "var(--landing-inner)",
      border: "1px solid rgba(255,255,255,0.08)",
      background: "var(--surface)",
      boxShadow: "inset 0 1px 1px rgba(255,255,255,0.04)",
      transition: "transform 200ms cubic-bezier(0.32,0.72,0,1), border-color 200ms cubic-bezier(0.32,0.72,0,1), box-shadow 200ms cubic-bezier(0.32,0.72,0,1)"
    },
    bezelShell: {
      padding: 6, borderRadius: 24,
      background: "transparent",
      border: "1px solid transparent",
    },
    iconTile: {
      display: "grid", placeItems: "center", width: 44, height: 44,
      marginBottom: 16, borderRadius: 12,
      background: "var(--accent-soft)",
      color: "var(--accent)", border: "1px solid var(--accent-border)",
      transition: "transform 200ms cubic-bezier(0.32,0.72,0,1), background 200ms cubic-bezier(0.32,0.72,0,1), border-color 200ms cubic-bezier(0.32,0.72,0,1)"
    },
    primaryBtn: {
      display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 10,
      height: 44, padding: "4px 4px 4px 20px", border: 0, borderRadius: 999,
      color: "#fff", background: "var(--accent)", cursor: "pointer",
      fontSize: 13.5, fontWeight: 600, fontFamily: "var(--font-body)",
      boxShadow: "0 4px 14px rgba(255,75,31,0.22)",
      transition: "transform 200ms cubic-bezier(0.32,0.72,0,1), background 200ms cubic-bezier(0.32,0.72,0,1), box-shadow 200ms cubic-bezier(0.32,0.72,0,1), filter 200ms cubic-bezier(0.32,0.72,0,1)"
    },
    primaryDot: {
      display: "grid", placeItems: "center", width: 28, height: 28,
      borderRadius: 999, background: "rgba(255,255,255,0.18)", color: "#fff",
    },
    secondaryBtn: {
      display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 10,
      height: 44, padding: "4px 4px 4px 20px", border: "1px solid var(--line)",
      borderRadius: 999, color: "var(--text)",
      background: "rgba(255,255,255,0.02)", cursor: "pointer",
      fontSize: 14, fontWeight: 550, fontFamily: "var(--font-body)",
      transition: "transform 200ms cubic-bezier(0.32,0.72,0,1), border-color 200ms cubic-bezier(0.32,0.72,0,1), background 200ms cubic-bezier(0.32,0.72,0,1), box-shadow 200ms cubic-bezier(0.32,0.72,0,1)"
    },
    secondaryDot: {
      display: "grid", placeItems: "center", width: 28, height: 28,
      borderRadius: 999, background: "rgba(255,255,255,0.06)", color: "var(--muted)",
    }
  };

  return (
    <div style={{ minHeight: "100vh", background: "var(--bg)", color: "var(--text)" }}>
      <a href="#sobre" style={{ position: "absolute", left: "-9999px", top: "auto", width: 1, height: 1, overflow: "hidden" }} onFocus={e => { const s=e.currentTarget.style; s.left="16px"; s.top="16px"; s.width="auto"; s.height="auto"; s.padding="8px 16px"; s.background="var(--accent)"; s.color="#fff"; s.zIndex="100"; s.borderRadius="8px"; }} onBlur={e => { const s=e.currentTarget.style; s.left="-9999px"; s.top="auto"; s.width="1px"; s.height="1px"; s.overflow="hidden"; }}>Pular para conteúdo</a>

      {/* NAV — floating island pill, detached */}
      <div style={{ position: "sticky", top: 0, zIndex: 40, paddingTop: 18, paddingLeft: 16, paddingRight: 16, pointerEvents: "none" }}>
        <header className="landing-island" style={{
          pointerEvents: "auto",
          maxWidth: L.maxW, margin: "0 auto",
          border: "1px solid rgba(255,255,255,0.12)",
          borderRadius: 999,
          background: "rgba(15,14,12,.55)", backdropFilter: "blur(24px) saturate(160%)", WebkitBackdropFilter: "blur(24px) saturate(160%)",
          boxShadow: navScrolled
            ? "inset 0 1px 1px rgba(255,255,255,0.08), 0 18px 60px rgba(0,0,0,0.45)"
            : "inset 0 1px 1px rgba(255,255,255,0.08), 0 12px 40px rgba(0,0,0,0.35)",
          transition: "box-shadow 200ms cubic-bezier(0.32,0.72,0,1), background 200ms cubic-bezier(0.32,0.72,0,1)",
        }}>
          <div style={{
            maxWidth: "100%", margin: "0 auto", padding: "0 10px 0 clamp(20px, 4vw, 32px)",
            height: 60, display: "flex", alignItems: "center", gap: 14
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
              <button onClick={goToOS} className="landing-btn-primary btn-island group" style={{ ...c.primaryBtn, fontSize: 13 }}>
                {session ? "Abrir Ligia OS" : "Login"}
                <span className="btn-dot" style={c.primaryDot}>
                  <ArrowRight size={15} strokeWidth={1.5} aria-hidden="true" />
                </span>
              </button>
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
                  transition: "transform 200ms cubic-bezier(0.32,0.72,0,1)",
                }} />
                <span aria-hidden="true" style={{
                  position: "absolute", left: 12, right: 12, height: 1.5, borderRadius: 2,
                  background: "currentColor",
                  transform: menuOpen ? "translateY(0) rotate(-45deg)" : "translateY(4px)",
                  transition: "transform 200ms cubic-bezier(0.32,0.72,0,1)",
                }} />
              </button>
            </div>
          </div>
        </header>
        {menuOpen && (
          <nav className="landing-nav-mobile landing-menu-open" style={{
            pointerEvents: "auto",
            display: "none", maxWidth: L.maxW, margin: "10px auto 0",
            padding: "14px 14px 16px",
            borderRadius: 24,
            border: "1px solid rgba(255,255,255,0.08)",
            background: "rgba(15,14,12,.92)",
            flexDirection: "column", gap: 4
          }}>
            {navLinks.map((link, i) => (
              <a key={link.id} href={`#${link.id}`} onClick={e => { e.preventDefault(); scrollTo(link.id); }}
                className="landing-menu-item"
                style={{ ...c.navLink, textAlign: "left", padding: "12px 14px", fontSize: 15, borderRadius: 12, ["--d"]: `${100 + i * 50}ms` }}>
                {link.label}
              </a>
            ))}
          </nav>
        )}
        <div ref={navSentinelRef} aria-hidden="true" style={{ height: 8, pointerEvents: "none" }} />
      </div>

      {/* HERO — Editorial Split: type left, neural canvas breathing right. No glass blur. */}
      <section ref={heroSectionRef} style={{
        position: "relative", overflow: "hidden",
        background: "var(--bg)",
        isolation: "isolate",
        minHeight: "min(100dvh, 860px)",
        display: "grid", placeItems: "center"
      }}>
        {/* Camadas 0+1: aurora + rede (fade conjunto no scroll) */}
        <div aria-hidden="true" ref={heroBgRef} style={{ position: "absolute", inset: 0, zIndex: 0 }}>
          <div className="hero-aurora" style={{ position: "absolute", inset: "-10%", pointerEvents: "none" }}>
            <span className="hero-aurora-a" style={{
              position: "absolute", width: "60vmax", height: "60vmax", left: "-12vmax", top: "-18vmax",
              background: "radial-gradient(circle, rgba(255,75,31,0.055) 0%, transparent 62%)",
            }} />
            <span className="hero-aurora-b" style={{
              position: "absolute", width: "52vmax", height: "52vmax", right: "-14vmax", bottom: "-20vmax",
              background: "radial-gradient(circle, rgba(255,144,104,0.045) 0%, transparent 62%)",
            }} />
          </div>
          <div className="hero-canvas-enter" style={{ position: "absolute", inset: 0 }}>
            <Suspense fallback={null}>
              <NeuralHero />
            </Suspense>
          </div>
        </div>
        {/* Camada 2: véu em opacidade apenas — sem backdrop-blur (perf + sem glass) */}
        <div aria-hidden="true" className="hero-veil-drift" style={{
          position: "absolute", inset: "-4%", zIndex: 1,
          background: `
            radial-gradient(circle at 18% 8%, rgba(15,14,12,0.55) 0%, transparent 46%),
            linear-gradient(180deg, rgba(15,14,12,0.30) 0%, rgba(15,14,12,0.55) 58%, rgba(15,14,12,0.86) 100%),
            radial-gradient(circle at 70% -10%, rgba(255,75,31,.07), transparent 38%),
            radial-gradient(circle at 15% 90%, rgba(255,144,104,.04), transparent 40%)
          `
        }} />
        {/* Camada 3: grade sutil à deriva */}
        <div aria-hidden="true" className="hero-grid-drift" style={{
          position: "absolute", inset: "-4%", zIndex: 1, opacity: 0.028,
          backgroundImage: "linear-gradient(var(--line-soft) 1px, transparent 1px), linear-gradient(90deg, var(--line-soft) 1px, transparent 1px)",
          backgroundSize: "48px 48px",
          maskImage: "radial-gradient(circle at 50% 50%, black 60%, transparent 94%)",
          WebkitMaskImage: "radial-gradient(circle at 50% 50%, black 60%, transparent 94%)"
        }} />
        <div className="landing-hero-grid" style={{ maxWidth: L.maxW, margin: "0 auto", padding: L.heroPad, position: "relative", zIndex: 2, width: "100%", display: "grid", gridTemplateColumns: "1.05fr 0.95fr", gap: "clamp(32px, 5vw, 72px)", alignItems: "center", textAlign: "left" }}>
          <div style={{ minWidth: 0 }}>
            <div className="eyebrow-pill hero-enter" style={{ marginBottom: 22, ["--delay"]: "0ms" }}>
              Liga Acadêmica de Inteligência Artificial
            </div>
            <h1 className="hero-enter" style={{ margin: "0 0 22px", maxWidth: 640, fontSize: "clamp(40px, 6vw, 68px)", lineHeight: 1.1, fontWeight: 500, letterSpacing: "-.035em", paddingBottom: "0.08em", ["--delay"]: "90ms" }}>
              Conexão que inspira o<br />
              <span className="gradient-text h1-accent">futuro.</span>
            </h1>
            <p className="hero-enter" style={{ margin: "0 0 34px", maxWidth: 520, color: "var(--muted)", fontSize: 15, lineHeight: 1.85, ["--delay"]: "180ms" }}>
              A Ligia é uma liga acadêmica que reúne estudantes e pesquisadores para
              estudar, construir e divulgar inteligência artificial, com pesquisa,
              projetos e extensão em quatro frentes de atuação.
            </p>
            <div className="hero-enter" style={{ display: "flex", gap: 12, flexWrap: "wrap", alignItems: "center", ["--delay"]: "270ms" }}>
              <button onClick={() => scrollTo("participe")} className="landing-btn-primary btn-island group" style={c.primaryBtn}>
                Processo Seletivo
                <span className="btn-dot" style={c.primaryDot}>
                  <ArrowRight size={15} strokeWidth={1.5} aria-hidden="true" />
                </span>
              </button>
              <button onClick={() => scrollTo("sobre")} className="landing-btn-secondary btn-island group" style={c.secondaryBtn}>
                Conhecer a Ligia
                <span className="btn-dot" style={c.secondaryDot}>
                  <ArrowRight size={15} strokeWidth={1.5} aria-hidden="true" />
                </span>
              </button>
            </div>
          </div>
          <div className="hero-enter landing-hero-logo" style={{ ["--delay"]: "150ms", minWidth: 0 }}>
            <Suspense fallback={<img src="/media/logo.svg" alt="Ligia" loading="eager" decoding="async" style={{ height: "clamp(240px, 38vh, 400px)", width: "auto", margin: "0 auto", display: "block" }} />}>
              <Logo3D offsetX={0.1} />
            </Suspense>
          </div>
        </div>
      </section>

      {/* SOBRE */}
      <section id="sobre" data-reveal style={{ padding: L.sectionPad, scrollMarginTop: "80px" }}>
        <div style={{ maxWidth: L.maxW, margin: "0 auto" }}>
          <div style={{ maxWidth: 640, marginBottom: 48 }}>
            <h2 style={{ margin: "0 0 14px", fontSize: "clamp(30px, 4vw, 44px)", fontWeight: 500, letterSpacing: "-.03em", lineHeight: 1.1 }}>
              Uma comunidade acadêmica<br />dedicada à inteligência artificial.
            </h2>
            <p style={{ margin: 0, color: "var(--muted)", fontSize: 15, lineHeight: 1.85 }}>
              Vinculada ao Centro de Informática da UFPE, a Ligia aproxima quem quer aprender e quem
              quer construir. Por meio de grupos de estudo, projetos de pesquisa e
              ações de divulgação, transformamos interesse em IA em formação
              prática e produção acadêmica.
            </p>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(255px, 1fr))", gap: 18 }}>
            {pillars.map(p => (
              <div
                key={p.title}
                style={{
                  padding: 6, borderRadius: 24,
                  border: "1px solid transparent",
                  background: "transparent",
                  boxShadow: "none",
                }}
              >
              <div className="landing-card" style={{ ...c.card, height: "100%", display: "flex", flexDirection: "column", border: "1px solid rgba(255,255,255,0.08)", boxShadow: "inset 0 1px 1px rgba(255,255,255,0.04)" }}>
                <div style={c.iconTile}><p.icon size={19} strokeWidth={1.5} aria-hidden="true" /></div>
                <h3 style={{ margin: "0 0 6px", fontSize: 15, fontWeight: 550 }}>{p.title}</h3>
                <p style={{ margin: 0, color: "var(--muted)", fontSize: 12, lineHeight: 1.65 }}>
                  {p.desc}
                </p>
              </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ATUAÇÃO — faixa clara #E4CEC8 (escolha do briefing; exceção deliberada ao theme-lock) */}
      <section id="pilares" data-reveal style={{ padding: L.sectionPad, background: "#E4CEC8", color: "#241914", scrollMarginTop: "80px" }}>
        <div style={{ maxWidth: L.maxW, margin: "0 auto" }}>
          <div style={{ maxWidth: 680, marginBottom: 56 }}>
            <div className="eyebrow-pill eyebrow-pill-light" style={{ marginBottom: 20 }}>Frentes de atuação</div>
            <h2 style={{ margin: "0 0 16px", fontSize: "clamp(34px, 4.6vw, 52px)", fontWeight: 500, letterSpacing: "-.03em", lineHeight: 1.05, color: "#241914" }}>
              Estudar, construir e divulgar.
            </h2>
            <p style={{ margin: 0, color: "#5c5447", fontSize: 16, lineHeight: 1.85 }}>
              Quatro frentes guiam todas as atividades da liga, da formação técnica
              à extensão para o público.
            </p>
          </div>

          <div className="landing-frentes" style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 20, alignItems: "stretch" }}>
            {teams.map(team => (
              <div key={team.name} style={{ padding: 6, borderRadius: 24, background: "transparent", border: "1px solid transparent" }}>
                <div className="landing-card" style={{ ...c.card, height: "100%", padding: 26, background: "#F2E7DD", border: "1px solid rgba(36,25,20,0.10)", boxShadow: "inset 0 1px 1px rgba(255,255,255,0.5)" }}>
                  <div style={{ ...c.iconTile, width: 42, height: 42, borderRadius: 12, marginBottom: 18 }}>
                    <team.icon size={18} strokeWidth={1.5} aria-hidden="true" />
                  </div>
                  <div style={{ fontFamily: "var(--font-heading)", fontSize: 17, fontWeight: 600, letterSpacing: "-.01em", color: "#241914", marginBottom: 8 }}>{team.name}</div>
                  <p style={{ margin: 0, color: "#5c5447", fontSize: 13.5, lineHeight: 1.75 }}>
                    {team.desc}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* INICIATIVAS — abas verticais sincronizadas, tema dark */}
      <section id="iniciativas" data-reveal style={{ padding: L.sectionPad, background: "var(--bg)", scrollMarginTop: "80px" }}>
        <div style={{ maxWidth: L.maxW, margin: "0 auto" }}>
          <div style={{ maxWidth: 680, marginBottom: 56 }}>
            <h2 style={{ margin: "0 0 16px", fontSize: "clamp(34px, 4.6vw, 52px)", fontWeight: 500, letterSpacing: "-.03em", lineHeight: 1.05 }}>
              Pesquisa, desenvolvimento e comunidade.
            </h2>
            <p style={{ margin: 0, color: "var(--muted)", fontSize: 16, lineHeight: 1.85 }}>
              Das frentes de pesquisa aos produtos e espaços da comunidade, veja
              o que a Ligia constrói hoje.
            </p>
          </div>

          <InitiativeTabs
            research={researchInitiatives}
            general={generalInitiatives}
          />
        </div>
      </section>

      {/* EVENTOS */}
      <section id="eventos" data-reveal style={{ padding: L.sectionPad, background: "var(--surface)", scrollMarginTop: "80px" }}>
        <div style={{ maxWidth: L.maxW, margin: "0 auto" }}>
          <div style={{ maxWidth: 680, marginBottom: 56 }}>
            <h2 style={{ margin: "0 0 16px", fontSize: "clamp(34px, 4.6vw, 52px)", fontWeight: 500, letterSpacing: "-.03em", lineHeight: 1.05 }}>
              Atividade que já movimentou a liga.
            </h2>
            <p style={{ margin: 0, color: "var(--muted)", fontSize: 16, lineHeight: 1.85 }}>
              Workshops, sessões técnicas, maratonas e encontros da comunidade
              registrados na agenda da Ligia.
            </p>
          </div>

          {landingLoading ? (
            <div style={{ display: "flex", gap: 16 }}>
              {[1,2,3].map(i => (
                <div key={i} className="skeleton" style={{ flex: "1 1 0", aspectRatio: "1 / 1", borderRadius: 24, border: "1px solid rgba(255,255,255,0.08)" }} />
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
                  display: "flex", gap: 18, overflowX: "auto", scrollSnapType: "x proximity",
                  scrollbarWidth: "none", msOverflowStyle: "none", borderRadius: 24,
                  overscrollBehaviorX: "contain", WebkitOverflowScrolling: "touch",
                  scrollPaddingInline: "24px", padding: "8px 4px 16px",
                  maskImage: "linear-gradient(90deg, transparent, black 4%, black 96%, transparent)",
                  WebkitMaskImage: "linear-gradient(90deg, transparent, black 4%, black 96%, transparent)",
                  outline: "none"
                }}>
                  {pastEvents.map((ev, idx) => {
                    const isCenter = idx === eventIdx;
                    return (
                      <div key={ev.id} className="landing-card" role="group" aria-roledescription="slide" aria-label={`${idx + 1} de ${pastEvents.length}: ${ev.title}`} style={{
                        display: "flex", flexDirection: "column", overflow: "hidden",
                        flex: "0 0 calc((100% - 36px) / 3)",
                        scrollSnapAlign: "center",
                        borderRadius: 24,
                        border: isCenter ? "1px solid var(--accent-border)" : "1px solid rgba(255,255,255,0.08)",
                        background: "var(--bg)",
                        boxShadow: isCenter ? "inset 0 1px 1px rgba(255,255,255,0.04)" : "none",
                        transform: isCenter ? "translateY(-6px)" : "none",
                        transition: "border-color 450ms cubic-bezier(0.32,0.72,0,1), box-shadow 450ms cubic-bezier(0.32,0.72,0,1), transform 450ms cubic-bezier(0.32,0.72,0,1), opacity 450ms cubic-bezier(0.32,0.72,0,1)",
                        opacity: isCenter ? 1 : 0.85
                      }}>
                        <div style={{
                          position: "relative", aspectRatio: "4 / 3", flex: "0 0 auto",
                          display: "grid", placeItems: "center", overflow: "hidden",
                          background: "var(--surface-2)",
                          borderBottom: "1px solid rgba(255,255,255,0.06)"
                        }}>
                          {ev.image_url ? (
                            <img src={ev.image_url} alt={ev.title} width="400" height="300" loading="lazy" decoding="async"
                              style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover", objectPosition: "center" }} />
                          ) : (
                            <div style={{
                              display: "grid", placeItems: "center", width: 46, height: 46,
                              borderRadius: 12, background: "var(--accent-soft)", color: "var(--accent)",
                              border: "1px solid var(--accent-border)"
                            }}>
                              <CalendarDays size={20} strokeWidth={1.5} aria-hidden="true" />
                            </div>
                          )}
                        </div>
                        <div style={{ padding: "18px 20px 20px", display: "grid", gap: 8, alignContent: "start" }}>
                          <div style={{ fontSize: 15, fontWeight: 600, lineHeight: 1.4 }}>
                            {ev.title}
                          </div>
                          <div style={{ color: "var(--muted-2)", fontSize: 12 }}>
                            {formatEventDate(ev.starts_at)}{ev.location ? ` · ${ev.location}` : ""}
                          </div>
                          {ev.description && (
                            <div style={{
                              color: "var(--muted)", fontSize: 12.5, lineHeight: 1.65,
                              display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical",
                              overflow: "hidden", minHeight: 41
                            }}>
                              {ev.description}
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>

              {pastEvents.length > 1 && (
              <div style={{ display: "flex", justifyContent: "center", alignItems: "center", gap: 14, marginTop: 26 }}>
                <button onClick={() => moveCarousel(-1)} aria-label="Anterior" className="carousel-arrow"
                  style={{
                    display: "grid", placeItems: "center", width: 44, height: 44,
                    border: "1px solid var(--line)", borderRadius: 999, cursor: "pointer",
                    background: "rgba(255,255,255,0.02)", color: "var(--text)",
                    transition: "border-color 200ms cubic-bezier(0.32,0.72,0,1), background 200ms cubic-bezier(0.32,0.72,0,1), transform 200ms cubic-bezier(0.32,0.72,0,1)"
                  }}>
                  <ChevronLeft size={16} strokeWidth={1.5} aria-hidden="true" />
                </button>
                <div style={{ display: "flex", gap: 6 }} role="tablist" aria-label="Eventos">
                  {pastEvents.map((ev, idx) => (
                    <button key={ev.id} onClick={() => jumpCarousel(idx)} aria-label={`Ir para ${ev.title}`} aria-current={idx === eventIdx ? "true" : undefined} role="tab"
                      style={{
                        width: 7, height: 7, border: 0, borderRadius: 999,
                        cursor: "pointer", padding: 0,
                        background: "var(--accent)", opacity: idx === eventIdx ? 1 : 0.3,
                        transform: idx === eventIdx ? "scale(1.6)" : "scale(1)",
                        transition: "opacity 200ms cubic-bezier(0.32,0.72,0,1), transform 200ms cubic-bezier(0.32,0.72,0,1), background 200ms cubic-bezier(0.32,0.72,0,1)"
                      }} />
                  ))}
                </div>
                <button onClick={() => moveCarousel(1)} aria-label="Próximo" className="carousel-arrow"
                  style={{
                    display: "grid", placeItems: "center", width: 44, height: 44,
                    border: "1px solid var(--line)", borderRadius: 999, cursor: "pointer",
                    background: "rgba(255,255,255,0.02)", color: "var(--text)",
                    transition: "border-color 200ms cubic-bezier(0.32,0.72,0,1), background 200ms cubic-bezier(0.32,0.72,0,1), transform 200ms cubic-bezier(0.32,0.72,0,1)"
                  }}>
                  <ChevronRight size={16} strokeWidth={1.5} aria-hidden="true" />
                </button>
              </div>
              )}
            </>
          )}
        </div>
      </section>

      {/* MEMBROS */}
      <section id="membros" data-reveal style={{ padding: L.sectionPad, scrollMarginTop: "80px" }}>
        <div style={{ maxWidth: L.maxW, margin: "0 auto" }}>
          <div style={{ maxWidth: 640, marginBottom: 48 }}>
            <h2 style={{ margin: "0 0 14px", fontSize: "clamp(30px, 4vw, 44px)", fontWeight: 500, letterSpacing: "-.03em", lineHeight: 1.1 }}>
              Professores, diretores e membros.
            </h2>
            <p style={{ margin: 0, color: "var(--muted)", fontSize: 15, lineHeight: 1.85 }}>
              A comunidade é conduzida por uma diretoria, apoiada por professores
              orientadores e formada por estudantes e pesquisadores.
            </p>
          </div>

          <div style={{ display: "grid", gap: 40 }}>
            {landingLoading ? (
              <>
                {[1,2,3].map(s => (
                  <div key={s}>
                    <div className="eyebrow" style={{ marginBottom: 12, opacity: 0.6 }}>&nbsp;</div>
                    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(240px, 1fr))", gap: 18 }}>
                      {[1,2,3].map(i => <div key={i} className="skeleton" style={{ height: 78, borderRadius: "var(--radius)", border: "1px solid var(--line-soft)" }} />)}
                    </div>
                  </div>
                ))}
              </>
            ) : (
              <>
            <div>
              <div style={{ fontSize: 13, fontWeight: 600, color: "var(--text)", marginBottom: 4 }}>Professores orientadores</div>
              <div aria-hidden="true" style={{ width: 32, height: 2, borderRadius: 999, background: "var(--accent)", opacity: 0.8, marginBottom: 14 }} />
              {professors.length === 0 ? (
                <div style={{ ...c.card, color: "var(--muted)", fontSize: 13, textAlign: "center", padding: "32px 20px" }}>
                  Em breve, a relação de professores aparece aqui.
                </div>
              ) : (
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(240px, 1fr))", gap: 18 }}>
                  {professors.map(p => (
                    <div key={p.id || p.name} className="landing-card" style={{ ...c.card, display: "flex", alignItems: "center", gap: 13, padding: "16px 18px" }}>
                      <MemberAvatar person={p} />
                      <div style={{ minWidth: 0 }}>
                        <div style={{ fontSize: 13, fontWeight: 600, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{p.name}</div>
                        <div style={{ color: "var(--muted-2)", fontSize: 11, marginTop: 2 }}>{p.discipline}{p.affiliation ? ` · ${p.affiliation}` : ""}</div>
                      </div>
                      <MemberLinks person={p} />
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div>
              <div style={{ fontSize: 13, fontWeight: 600, color: "var(--text)", marginBottom: 4 }}>Diretoria</div>
              <div aria-hidden="true" style={{ width: 32, height: 2, borderRadius: 999, background: "var(--accent)", opacity: 0.8, marginBottom: 14 }} />
              {directors.length === 0 ? (
                <div style={{ ...c.card, color: "var(--muted)", fontSize: 13, textAlign: "center", padding: "32px 20px" }}>
                  Em breve, a relação da diretoria aparece aqui.
                </div>
              ) : (
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(240px, 1fr))", gap: 18 }}>
                  {directors.map(d => (
                    <div key={d.id || d.name} className="landing-card" style={{ ...c.card, display: "flex", alignItems: "center", gap: 13, padding: "16px 18px" }}>
                      <MemberAvatar person={d} />
                      <div style={{ minWidth: 0 }}>
                        <div style={{ fontSize: 13, fontWeight: 600, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{d.name}</div>
                        <div style={{ color: "var(--muted-2)", fontSize: 11, marginTop: 2 }}>{d.director_role || "Diretor(a)"}{d.affiliation ? ` · ${d.affiliation}` : ""}</div>
                      </div>
                      <MemberLinks person={d} />
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div>
              <div style={{ fontSize: 13, fontWeight: 600, color: "var(--text)", marginBottom: 4 }}>Membros</div>
              <div aria-hidden="true" style={{ width: 32, height: 2, borderRadius: 999, background: "var(--accent)", opacity: 0.8, marginBottom: 14 }} />
              {regularMembers.length === 0 ? (
                <div style={{ ...c.card, color: "var(--muted)", fontSize: 13, textAlign: "center", padding: "40px 20px" }}>
                  Em breve, a relação de membros aparece aqui.
                </div>
              ) : (
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))", gap: 18 }}>
                  {regularMembers.map(m => (
                    <div key={m.id} className="landing-card" style={{ ...c.card, display: "flex", alignItems: "center", gap: 13, padding: "16px 18px" }}>
                      <MemberAvatar person={m} size={42} />
                      <div style={{ minWidth: 0 }}>
                        <div style={{ fontSize: 13, fontWeight: 600, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                          {m.name}
                        </div>
                        <div style={{ color: "var(--muted-2)", fontSize: 11, marginTop: 2 }}>
                          {m.team}{m.affiliation ? ` · ${m.affiliation}` : ""}
                        </div>
                      </div>
                      <MemberLinks person={m} />
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

      {/* NEWSLETTER — Substack, double-bezel */}
      <section id="newsletter" data-reveal style={{ padding: L.sectionPad, background: "var(--surface)", scrollMarginTop: "80px" }}>
        <div style={{ maxWidth: L.maxW, margin: "0 auto" }}>
          <div style={c.bezelShell}>
          <div style={{
            display: "grid", gridTemplateColumns: "1.15fr 0.85fr", gap: 28,
            alignItems: "center",
            padding: "clamp(28px, 4vw, 40px)",
            borderRadius: "var(--landing-inner)",
            border: "1px solid rgba(255,255,255,0.08)",
            background: `var(--surface-2)`,
            boxShadow: "inset 0 1px 1px rgba(255,255,255,0.04)"
          }} className="landing-newsletter">
            <div>
              <h2 style={{ margin: "0 0 12px", fontSize: "clamp(28px, 3.6vw, 40px)", fontWeight: 500, letterSpacing: "-.03em", lineHeight: 1.1 }}>
                Bastidores de IA,<br />sem o ruído.
              </h2>
              <p style={{ margin: 0, color: "var(--muted)", fontSize: 14, lineHeight: 1.85, maxWidth: 520 }}>
                No Substack da Ligia compartilhamos artigos e reflexões sobre inteligência artificial, direto no seu e-mail. Gratuita, feita pela comunidade.
              </p>
              <div style={{ display: "flex", gap: 8, marginTop: 18, flexWrap: "wrap", alignItems: "center", color: "var(--muted-2)", fontSize: 12 }}>
                <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}><Mail size={13} strokeWidth={1.5} style={{ color: "var(--accent)" }} /> Sem spam</span>
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
                style={{ display: "grid", gap: 10, padding: 18, borderRadius: "var(--radius)", border: "1px solid rgba(255,255,255,0.08)", background: "var(--surface)", boxShadow: "inset 0 1px 1px rgba(255,255,255,0.04)" }}
              >
                <label htmlFor="newsletter-email" style={{ fontSize: 11, fontWeight: 600, color: "var(--muted)", letterSpacing: ".04em", textTransform: "uppercase" }}>Seu melhor e-mail</label>
                <div className="newsletter-row" style={{ display: "flex", gap: 8 }}>
                  <input
                    id="newsletter-email"
                    type="email"
                    required
                    placeholder="voce@exemplo.com"
                    value={newsletterEmail}
                    onChange={e => setNewsletterEmail(e.target.value)}
                    style={{ flex: 1, minWidth: 0, height: 44, padding: "0 16px", border: "1px solid var(--line)", borderRadius: 999, outline: "none", background: "var(--bg)", color: "var(--text)", fontSize: 14 }}
                  />
                  <button type="submit" className="landing-btn-primary btn-island group" style={{ ...c.primaryBtn, whiteSpace: "nowrap", padding: "6px 6px 6px 22px" }}>
                    Assinar
                    <span className="btn-dot" style={c.primaryDot}>
                      <ArrowRight size={15} strokeWidth={1.5} aria-hidden="true" />
                    </span>
                  </button>
                </div>
                <div style={{ color: "var(--muted-2)", fontSize: 11, lineHeight: 1.6 }}>
                  Ao assinar você concorda em receber e-mails da Ligia via Substack. Abra no Substack para confirmar sua inscrição.
                </div>
              </form>

              <a href="https://boletimligia.substack.com/" target="_blank" rel="noreferrer" className="landing-btn-secondary btn-island group"
                style={{ ...c.secondaryBtn, textDecoration: "none", whiteSpace: "nowrap" }}>
                Ler no Substack
                <span className="btn-dot" style={c.secondaryDot}>
                  <ExternalLink size={14} strokeWidth={1.5} aria-hidden="true" />
                </span>
              </a>
            </div>
          </div>
          </div>
        </div>
      </section>

      {/* PARTICIPE */}
      <section id="participe" data-reveal style={{ padding: L.sectionPad, scrollMarginTop: "80px" }}>
        <div style={{ maxWidth: L.maxW, margin: "0 auto" }}>
          <div style={c.bezelShell}>
          <div className="landing-cta" style={{
            padding: "clamp(48px, 7vw, 88px) clamp(28px, 5vw, 64px)", textAlign: "center",
            borderRadius: "var(--landing-inner)",
            border: "1px solid rgba(255,255,255,0.08)",
            background: `radial-gradient(circle at 50% 130%, rgba(255,75,31,.08), transparent 62%), var(--surface-2)`,
            boxShadow: "inset 0 1px 1px rgba(255,255,255,0.04)",
            position: "relative", overflow: "hidden"
          }}>
            <div className="eyebrow-pill" style={{ marginBottom: 20 }}>Processo seletivo aberto</div>
            <h2 style={{
              margin: "0 auto 14px", maxWidth: 600,
              fontSize: "clamp(30px, 4vw, 46px)", fontWeight: 500, letterSpacing: "-.03em", lineHeight: 1.08
            }}>
              Faça parte da Ligia.
            </h2>
            <p style={{ margin: "0 auto 32px", maxWidth: 480, color: "var(--muted)", fontSize: 15, lineHeight: 1.85 }}>
              Membros participam de grupos de estudo, projetos de pesquisa e
              eventos, com acesso a lideranças técnicas de IA do mundo todo.
            </p>
            <div style={{ display: "flex", justifyContent: "center", gap: 12, flexWrap: "wrap" }}>
              <Link to="/processo-seletivo" className="landing-btn-primary btn-island group" style={c.primaryBtn}>
                Processo Seletivo
                <span className="btn-dot" style={c.primaryDot}>
                  <ArrowRight size={15} strokeWidth={1.5} aria-hidden="true" />
                </span>
              </Link>
              <button onClick={goToOS} className="landing-btn-secondary btn-island group" style={c.secondaryBtn}>
                {session ? "Sou membro" : "Sou membro"}
                <span className="btn-dot" style={c.secondaryDot}>
                  <ArrowRight size={15} strokeWidth={1.5} aria-hidden="true" />
                </span>
              </button>
            </div>
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
                Liga Acadêmica de Inteligência Artificial. Estudar, construir e
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
                  <Mail size={14} strokeWidth={1.5} aria-hidden="true" style={{ color: "var(--accent)" }} /> ligia@cin.ufpe.br
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 9 }}>
                  <MapPin size={14} strokeWidth={1.5} aria-hidden="true" style={{ color: "var(--accent)" }} /> CIn · UFPE, Recife
                </div>
                <div style={{ display: "flex", gap: 10, marginTop: 6 }}>
                  <a
                    href="https://instagram.com/ligia.ufpe"
                    target="_blank"
                    rel="noreferrer"
                    aria-label="Instagram da Ligia"
                    style={{ display: "grid", placeItems: "center", width: 32, height: 32, borderRadius: 12, background: "var(--surface-2)", border: "1px solid rgba(255,255,255,0.08)", color: "var(--muted)", cursor: "pointer" }}
                  >
                    <Instagram size={15} aria-hidden="true" />
                  </a>

                  <a
                    href="https://github.com/ligia-ufpe"
                    target="_blank"
                    rel="noreferrer"
                    aria-label="Instagram da Ligia"
                    style={{ display: "grid", placeItems: "center", width: 32, height: 32, borderRadius: 12, background: "var(--surface-2)", border: "1px solid rgba(255,255,255,0.08)", color: "var(--muted)", cursor: "pointer" }}
                  >
                    <Github size={15} aria-hidden="true" />
                  </a>

                  <a
                    href="https://www.linkedin.com/company/ligia/"
                    target="_blank"
                    rel="noreferrer"
                    aria-label="Instagram da Ligia"
                    style={{ display: "grid", placeItems: "center", width: 32, height: 32, borderRadius: 12, background: "var(--surface-2)", border: "1px solid rgba(255,255,255,0.08)", color: "var(--muted)", cursor: "pointer" }}
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
        @keyframes heroIn { from { opacity: 0; transform: translateY(16px); filter: blur(6px); } to { opacity: 1; transform: translateY(0); filter: blur(0); } }
        .hero-enter { opacity: 0; animation: heroIn 800ms var(--ease-drawer) forwards; animation-delay: var(--delay, 0ms); }
        [data-reveal] { opacity: 0; transform: translateY(28px); filter: blur(6px); transition: opacity 650ms var(--ease-drawer), transform 650ms var(--ease-drawer), filter 650ms var(--ease-drawer); }
        [data-reveal].is-visible { opacity: 1; transform: translateY(0); filter: blur(0); }
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
        @media (hover: hover) and (pointer: fine) {
          #pilares .landing-card:hover { border-color: rgba(36,25,20,0.32) !important; box-shadow: inset 0 1px 1px rgba(255,255,255,0.5) !important; }
          .landing-card:hover { transform: translateY(-4px); border-color: var(--line) !important; box-shadow: inset 0 1px 1px rgba(255,255,255,0.08), 0 8px 24px rgba(0,0,0,0.14), 0 2px 6px rgba(0,0,0,0.08); }
          .landing-btn-primary:hover { transform: translateY(-1.5px); box-shadow: 0 10px 28px rgba(255,75,31,.32), 0 2px 8px rgba(0,0,0,0.12); filter: brightness(1.06); }
          .landing-btn-primary:hover .btn-dot { transform: translate(2px, -2px) scale(1.05); }
          .landing-btn-secondary:hover { transform: translateY(-1.5px); border-color: var(--accent-border) !important; background: var(--surface-2) !important; color: var(--text) !important; box-shadow: 0 6px 20px rgba(0,0,0,0.10); }
          .landing-btn-secondary:hover .btn-dot { transform: translate(2px, -2px) scale(1.05); }
          .landing-stat:hover { transform: translateY(-4px); border-color: rgba(255,255,255,0.08) !important; }
        }
        .landing-btn-primary:active, .landing-btn-secondary:active { transform: scale(0.98); box-shadow: none; }
        .landing-initiative img { transition: transform 320ms var(--ease-out), filter 180ms var(--ease-out); }
        .landing-btn-primary { transition: transform 700ms var(--ease-drawer), box-shadow 700ms var(--ease-drawer), filter 700ms var(--ease-drawer), background 700ms var(--ease-drawer); }
        .landing-btn-primary:active { transform: scale(0.98); box-shadow: none; }
        .landing-btn-secondary { transition: transform 700ms var(--ease-drawer), border-color 700ms var(--ease-drawer), background 700ms var(--ease-drawer), color 700ms var(--ease-drawer), box-shadow 700ms var(--ease-drawer); }
        .landing-btn-secondary:active { transform: scale(0.98); box-shadow: none; }
        .landing-btn-primary .btn-dot, .landing-btn-secondary .btn-dot { transition: transform 700ms var(--ease-drawer); }
        .landing-cta { position: relative; }
        .landing-card:focus-within { outline: 2px solid var(--accent-border); outline-offset: 2px; }
        /* Stagger 45ms — decorativo, não bloqueia interação */
        #sobre .landing-card:nth-child(1), #pilares .landing-card:nth-child(1), #iniciativas .landing-initiative:nth-child(1) { transition-delay: 0ms; }
        #sobre .landing-card:nth-child(2), #pilares .landing-card:nth-child(2), #iniciativas .landing-initiative:nth-child(2) { transition-delay: 45ms; }
        #sobre .landing-card:nth-child(3), #pilares .landing-card:nth-child(3), #iniciativas .landing-initiative:nth-child(3) { transition-delay: 90ms; }
        #sobre .landing-card:nth-child(4), #pilares .landing-card:nth-child(4), #iniciativas .landing-initiative:nth-child(4) { transition-delay: 135ms; }
        .landing-nav-mobile { transform-origin: top; }
        .landing-menu-open { animation: menuIn 400ms var(--ease-drawer); }
        @keyframes menuIn { from { opacity: 0; transform: translateY(-10px); } to { opacity: 1; transform: translateY(0); } }
        .landing-menu-item { opacity: 0; transform: translateY(12px); animation: menuItemIn 400ms var(--ease-drawer) forwards; animation-delay: var(--d, 100ms); }
        @keyframes menuItemIn { to { opacity: 1; transform: translateY(0); } }
        .landing-menu-item:hover { background: rgba(255,255,255,0.04); color: var(--text) !important; }
        /* Fundo do hero: entrada, aurora e deriva (tudo transform/opacity) */
        @keyframes heroCanvasIn { from { opacity: 0; transform: scale(1.04); } to { opacity: 0.8; transform: scale(1); } }
        .hero-canvas-enter { opacity: 0; animation: heroCanvasIn 1200ms var(--ease-drawer) forwards; }
        @keyframes auroraA { 0%, 100% { transform: translate3d(0, 0, 0) scale(1); } 50% { transform: translate3d(4vmax, 3vmax, 0) scale(1.12); } }
        .hero-aurora-a { animation: auroraA 26s cubic-bezier(0.45, 0, 0.35, 1) infinite; will-change: transform; }
        @keyframes auroraB { 0%, 100% { transform: translate3d(0, 0, 0) scale(1.05); } 50% { transform: translate3d(-3vmax, -4vmax, 0) scale(1); } }
        .hero-aurora-b { animation: auroraB 32s cubic-bezier(0.45, 0, 0.35, 1) infinite; will-change: transform; }
        @keyframes veilDrift { 0%, 100% { transform: translate3d(0, 0, 0); } 50% { transform: translate3d(1.5%, 1%, 0); } }
        .hero-veil-drift { animation: veilDrift 30s cubic-bezier(0.45, 0, 0.35, 1) infinite; }
        @keyframes gridDrift { 0%, 100% { transform: translate3d(0, 0, 0); } 50% { transform: translate3d(-1.5%, -1%, 0); } }
        .hero-grid-drift { animation: gridDrift 36s cubic-bezier(0.45, 0, 0.35, 1) infinite; }
        @media (max-width: 820px) {
          .hero-aurora-b { display: none; }
        }
        /* Abas verticais: largura extra da mídia só no desktop (evita overflow) */
        @media (min-width: 961px) {
          .landing-vtab-media { width: calc(100% + 20px); }
        }
        /* Degrau tablet: pills no topo + mídia/infos lado a lado */
        @media (max-width: 1100px) and (min-width: 721px) {
          .landing-vtab { grid-template-columns: 1fr 1fr !important; }
          .landing-vtab-nav { grid-column: 1 / -1 !important; display: flex !important; flex-direction: row; gap: 8px; overflow-x: auto; padding-bottom: 8px; scroll-snap-type: x proximity; }
          .landing-vtab-nav .vtab-group { display: contents !important; }
          .landing-vtab-nav .vtab-group-label { display: none !important; }
          .landing-vtab-nav [role="tab"] { flex: 0 0 auto; min-height: 44px; scroll-snap-align: start; }
          .landing-vtab-nav [role="tab"] > span:last-child { max-width: 200px; }
        }
        /* Mobile: dropdown nativo no lugar da tablist */
        @media (max-width: 720px) {
          .landing-vtab-nav { display: none !important; }
          .landing-vtab-select { display: block !important; }
        }
        @keyframes vtabIn { from { opacity: 0; transform: translateY(14px); } to { opacity: 1; transform: translateY(0); } }
        .landing-vtab-media { animation: vtabIn 500ms var(--ease-drawer); }
        .landing-vtab-info { animation: vtabIn 500ms var(--ease-drawer); }
        .landing-vtab-nav [role="tab"]:focus-visible { outline: 2px solid var(--accent); outline-offset: 2px; }
        .member-link:hover { color: var(--accent) !important; border-color: var(--accent-border) !important; }
        .landing-vtab-nav .vtab-group:first-child .vtab-group-label { padding-top: 6px; }
        @media (hover: hover) and (pointer: fine) {
          .landing-vtab-nav [role="tab"][aria-selected="false"]:hover {
            background: rgba(255,255,255,0.045) !important;
            border-color: rgba(255,255,255,0.10) !important;
            transform: translateX(3px);
          }
          .landing-vtab-nav [role="tab"][aria-selected="false"]:hover [data-vtab-icon] {
            color: var(--accent) !important;
            border-color: var(--accent-border) !important;
          }
        }
        @media (prefers-reduced-motion: reduce) {
          .hero-enter, [data-reveal] { animation: none !important; transition: none !important; transform: none !important; opacity: 1 !important; }
          .hero-canvas-enter { animation: none !important; opacity: 0.8 !important; transform: none !important; }
          .hero-aurora-a, .hero-aurora-b, .hero-veil-drift, .hero-grid-drift { animation: none !important; }
          .landing-card:hover, .landing-btn-primary:hover, .landing-btn-secondary:hover { transform: none !important; }
          .landing-vtab-media, .landing-vtab-info, .landing-menu-item, .landing-menu-open { animation: none !important; }
          .landing-vtab-nav [role="tab"] { transform: none !important; }
        }
        .events-snap::-webkit-scrollbar { display: none; }
        .carousel-arrow:active { transform: scale(0.95); }
        @media (max-width: 900px) {
          .landing-nav { display: none !important; }
          header button.landing-burger, .landing-burger { display: grid !important; }
          .landing-nav-mobile { display: flex !important; }
        }
        @media (max-width: 960px) {
          .landing-hero-grid { grid-template-columns: 1fr !important; text-align: left; }
          .landing-hero-logo { order: -1; }
          .landing-hero-card { max-width: 560px; }
          .landing-frentes { grid-template-columns: 1fr !important; }
          .landing-frentes-feature, .landing-frentes-rest { grid-column: span 1 !important; }
        }
        @media (max-width: 720px) {
          .landing-vtab { grid-template-columns: 1fr !important; }
          .landing-vtab-media, .landing-vtab-info { margin-left: 0 !important; }
        }
        @media (max-width: 760px) {
          .landing-footer-grid { grid-template-columns: 1fr 1fr !important; }
          .landing-island { border-radius: 24px !important; }
        }
        @media (max-width: 880px) {
          .landing-newsletter { grid-template-columns: 1fr !important; }
        }
        @media (max-width: 560px) {
          .newsletter-row { flex-direction: column !important; }
          .newsletter-row .landing-btn-primary { width: 100%; justify-content: center; }
        }
        @media (max-width: 820px) {
          .events-snap > * { flex: 0 0 100% !important; }
        }
      `}</style>
    </div>
  );
}