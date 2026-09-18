import { useOutletContext } from "react-router-dom";
import { useState, useEffect, useCallback } from "react";
import {
  Users, Blocks, Search, LayoutGrid, List, UserPlus,
  Building, Github, Award, Menu, Mail, GraduationCap, Linkedin,
  Bot,
  X,
  CalendarDays, MoreHorizontal, ExternalLink
} from "lucide-react";
import { showToast } from "../utils/toast.js";
import { fetchProfiles, updateRole, updateProfile } from "../services/profiles.js";
import { fetchEvents } from "../services/events.js";
import { canManageMembers } from "../auth/access.js";
import { useAuth } from "../contexts/AuthContext.jsx";
import { useRealtime } from "../hooks/useRealtime.js";
import { matchJob } from "../utils/ats.js";
import { formatDate } from "../components/db/helpers.jsx";

const roleOptions = [
  { value: "all", label: "Todas as áreas" },
  { value: "Comunicação", label: "Comunicação" },
  { value: "CV", label: "CV" },
  { value: "NLP", label: "NLP" },
  { value: "ML", label: "ML" }
];

const accessRoleOptions = [
  { value: "admin", label: "Admin" },
  { value: "membro", label: "Membro" },
  { value: "visitante", label: "Visitante" }
];

const categoryOptions = [
  { value: "membro", label: "Membro" },
  { value: "diretor", label: "Diretor" },
  { value: "professor", label: "Professor" }
];

const directorRoleOptions = [
  "Executivo",
  "Pesquisa",
  "Ensino",
  "Extensão",
  "Comunicação"
];

const availabilityOptions = [
  { value: "all", label: "Qualquer disponibilidade" },
  { value: "Available", label: "Disponível" },
  { value: "Limited", label: "Limitado" },
  { value: "Allocated", label: "Alocado" }
];

const s = {
  topbar: {
    position: "sticky", top: 0, zIndex: 30, height: 66,
    display: "flex", alignItems: "center", gap: 18,
    padding: "0 clamp(20px, 4vw, 52px)",
    borderBottom: "1px solid rgba(55,48,37,.72)",
    background: "rgba(15,14,12,.82)", backdropFilter: "blur(18px)"
  },
  mobileMenu: {
    display: "none", padding: 6, border: 0, background: "none",
    cursor: "pointer", color: "var(--text)"
  },
  breadcrumbs: { color: "var(--muted)", fontSize: 13 },
  breadcrumbStrong: {
    color: "var(--text)", fontWeight: 550, fontFamily: "var(--font-heading)"
  },
  content: {
    padding: "36px clamp(20px, 4vw, 52px) 72px",
    width: "min(1420px, 100%)", margin: "0 auto"
  },
  stats: {
    display: "grid", gridTemplateColumns: "repeat(4, 1fr)",
    marginBottom: 26, overflow: "hidden",
    border: "1px solid var(--line-soft)",
    borderRadius: "var(--radius)", background: "var(--surface)"
  },
  stat: {
    position: "relative", minHeight: 114, padding: 22,
    borderRight: "1px solid var(--line-soft)"
  },
  statLabel: {
    marginBottom: 12, color: "var(--muted)", fontSize: 11,
    letterSpacing: ".04em", textTransform: "uppercase"
  },
  statValue: {
    fontFamily: "var(--font-heading)", fontSize: 30,
    fontWeight: 500, lineHeight: 1
  },
  statNote: { marginTop: 8, color: "var(--muted-2)", fontSize: 11 },
  statGlyph: {
    position: "absolute", top: 19, right: 18, width: 27, height: 27,
    display: "grid", placeItems: "center", borderRadius: 8,
    color: "var(--accent)", background: "var(--accent-soft)"
  },
  toolbar: {
    display: "flex", alignItems: "center", gap: 10, marginBottom: 18
  },
  searchWrap: {
    position: "relative", minWidth: 230, maxWidth: 380, flex: 1
  },
  searchIcon: {
    position: "absolute", top: "50%", left: 13, width: 15, height: 15,
    color: "var(--muted-2)", pointerEvents: "none", transform: "translateY(-50%)"
  },
  searchInput: {
    width: "100%", height: 40, padding: "0 13px 0 39px",
    border: "1px solid var(--line)", borderRadius: 9, outline: "none",
    color: "var(--text)", background: "var(--surface)",
    transition: "border var(--transition), box-shadow var(--transition)"
  },
  select: {
    height: 40, padding: "0 12px", border: "1px solid var(--line)",
    borderRadius: 9, outline: "none", color: "var(--muted)",
    background: "var(--surface)", cursor: "pointer", minWidth: 130,
    transition: "border var(--transition), box-shadow var(--transition)"
  },
  viewToggle: {
    display: "flex", marginLeft: "auto", padding: 3,
    border: "1px solid var(--line)", borderRadius: 9, background: "var(--surface)"
  },
  toggleBtn: (active) => ({
    width: 31, height: 30, display: "grid", placeItems: "center",
    border: 0, borderRadius: 6, cursor: "pointer",
    color: active ? "var(--text)" : "var(--muted-2)",
    background: active ? "var(--surface-3)" : "transparent"
  }),
  grid: {
    display: "grid", gridTemplateColumns: "repeat(3, minmax(0, 1fr))",
    gap: 14
  },
  listGrid: {
    display: "block", border: "1px solid var(--line-soft)",
    borderRadius: "var(--radius)", overflow: "hidden"
  },
  card: {
    position: "relative", minWidth: 0, padding: 20, overflow: "hidden",
    border: "1px solid var(--line-soft)", borderRadius: "var(--radius)",
    background: "linear-gradient(145deg, rgba(255,255,255,.012), transparent 40%), var(--surface)",
    cursor: "pointer", transition: "transform 180ms ease, border-color 180ms ease, background 180ms ease"
  },
  cardList: {
    display: "grid", gridTemplateColumns: "minmax(220px, 1.2fr) minmax(180px, 1fr) minmax(220px, 1fr) 150px",
    gap: 20, alignItems: "center", border: 0, borderBottom: "1px solid var(--line-soft)",
    borderRadius: 0, minWidth: 0, padding: 20, overflow: "hidden",
    background: "linear-gradient(145deg, rgba(255,255,255,.012), transparent 40%), var(--surface)",
    cursor: "pointer", transition: "transform 180ms ease, border-color 180ms ease, background 180ms ease"
  },
  cardHead: {
    display: "flex", gap: 13, alignItems: "center", marginBottom: 17
  },
  avatar: (color) => ({
    position: "relative", width: 46, height: 46,
    display: "grid", flex: "0 0 auto", placeItems: "center",
    border: "1px solid rgba(255,255,255,.08)", borderRadius: 13,
    color: "#161512", fontFamily: "var(--font-heading)",
    fontSize: 17, fontWeight: 500, background: color, overflow: "hidden"
  }),
  avatarImg: { position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover" },
  personTitle: { minWidth: 0 },
  personName: { margin: "0 0 3px", fontSize: 14, fontWeight: 650, letterSpacing: "-.01em", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" },
  personSub: { margin: 0, color: "var(--muted)", fontSize: 12, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" },
  teamTag: { display: "inline-flex", marginTop: 4, fontSize: 10, color: "var(--accent)", border: "1px solid var(--accent-border)", background: "var(--accent-soft)", padding: "4px 8px", borderRadius: 9999, whiteSpace: "nowrap" },
  projectLine: {
    display: "flex", alignItems: "center", gap: 8,
    marginTop: 8,
    cursor: "pointer",
    transition: "color var(--transition)"
  },
  avatarStack: { display: "flex" },
  miniAvatar: (color) => ({
    width: 29, height: 29, display: "grid", placeItems: "center",
    marginLeft: -7, border: "2px solid var(--surface)", borderRadius: "50%",
    color: "#171512", background: color, fontFamily: "var(--font-heading)",
    fontSize: 9, fontWeight: 500
  }),
  deadline: { display: "flex", alignItems: "center", gap: 5, marginLeft: "auto", color: "var(--muted)", fontSize: 10 },
  formGroup: { marginBottom: 16 },
  formLabel: { display: "block", marginBottom: 7, color: "#b9b6ad", fontSize: 11, fontWeight: 600 },
  field: {
    width: "100%", height: 40, padding: "0 12px",
    border: "1px solid var(--line)", borderRadius: 9, outline: "none",
    color: "var(--text)", background: "var(--surface)",
    transition: "border var(--transition), box-shadow var(--transition)"
  },
  textarea: {
    width: "100%", minHeight: 96, padding: "11px 12px",
    border: "1px solid var(--line)", borderRadius: 9, outline: "none",
    color: "var(--text)", background: "var(--surface)", resize: "vertical",
    transition: "border var(--transition), box-shadow var(--transition)"
  },
  formRow: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 15 },
  btn: {
    minHeight: 39, display: "inline-flex", alignItems: "center",
    justifyContent: "center", gap: 8, padding: "0 15px",
    border: "1px solid var(--line)", borderRadius: 9,
    color: "var(--text)", background: "var(--surface-2)",
    fontFamily: "var(--font-body)", fontWeight: 600, fontSize: 13,
    cursor: "pointer", whiteSpace: "nowrap", transition: "transform 180ms var(--ease-out, cubic-bezier(0.23,1,0.32,1)), background 180ms var(--ease-out, cubic-bezier(0.23,1,0.32,1)), border-color 180ms var(--ease-out, cubic-bezier(0.23,1,0.32,1)), color 180ms var(--ease-out, cubic-bezier(0.23,1,0.32,1))"
  },
  btnPrimary: {
    minHeight: 39, display: "inline-flex", alignItems: "center",
    justifyContent: "center", gap: 8, padding: "0 15px",
    border: "1px solid var(--ligia-orange-1)", borderRadius: 9,
    color: "#fff", background: "var(--ligia-orange-1)",
    fontFamily: "var(--font-body)", fontWeight: 700, fontSize: 13,
    cursor: "pointer", whiteSpace: "nowrap", transition: "transform 180ms var(--ease-out, cubic-bezier(0.23,1,0.32,1)), background 180ms var(--ease-out, cubic-bezier(0.23,1,0.32,1)), border-color 180ms var(--ease-out, cubic-bezier(0.23,1,0.32,1)), color 180ms var(--ease-out, cubic-bezier(0.23,1,0.32,1))"
  },
  iconBtn: {
    width: 35, height: 35, display: "grid", placeItems: "center",
    border: "1px solid var(--line)", borderRadius: 9,
    color: "var(--muted)", background: "var(--surface)",
    cursor: "pointer", transition: "transform 160ms var(--ease-out, cubic-bezier(0.23,1,0.32,1)), background 160ms var(--ease-out, cubic-bezier(0.23,1,0.32,1)), border-color 160ms var(--ease-out, cubic-bezier(0.23,1,0.32,1)), color 160ms var(--ease-out, cubic-bezier(0.23,1,0.32,1))"
  },
  skills: { display: "flex", flexWrap: "wrap", gap: 6, minHeight: 26 },
  tag: (accent) => ({
    display: "inline-flex", alignItems: "center", padding: "4px 8px",
    border: `1px solid ${accent ? "var(--accent-border)" : "var(--line)"}`,
    borderRadius: 9999, fontSize: 10, whiteSpace: "nowrap",
    color: accent ? "#fff" : "var(--muted)",
    background: accent ? "var(--accent-soft)" : "var(--surface-2)"
  }),
  cardFoot: {
    display: "flex", alignItems: "center", marginTop: 18,
    paddingTop: 13, borderTop: "1px solid var(--line-soft)",
    color: "var(--muted-2)", fontSize: 10
  },
  cardFootList: { display: "flex", alignItems: "center", margin: 0, padding: 0, border: 0, color: "var(--muted-2)", fontSize: 10 },
  emptyState: {
    gridColumn: "1 / -1", padding: "70px 20px",
    border: "1px dashed var(--line)", borderRadius: "var(--radius)",
    color: "var(--muted)", textAlign: "center"
  },
  modalBackdrop: (open) => ({
    position: "fixed", inset: 0, zIndex: 100,
    display: "flex", alignItems: "center", justifyContent: "center",
    padding: 20, background: "rgba(5,5,4,.72)", backdropFilter: "blur(9px)",
    opacity: open ? 1 : 0, visibility: open ? "visible" : "hidden",
    transition: "opacity .22s ease, visibility .22s ease"
  }),
  modal: {
    width: "min(720px, 100%)", maxHeight: "90vh", overflowY: "auto",
    border: "1px solid var(--line)", borderRadius: "var(--radius-lg)",
    background: "var(--surface)", boxShadow: "var(--shadow)"
  },
  smallModal: {
    width: "min(480px, 100%)", maxHeight: "90vh", overflowY: "auto",
    border: "1px solid var(--line)", borderRadius: "var(--radius-lg)",
    background: "var(--surface)", boxShadow: "var(--shadow)"
  },
  modalHeader: {
    display: "flex", alignItems: "center", justifyContent: "space-between",
    padding: "15px 20px", borderBottom: "1px solid var(--line-soft)",
    background: "rgba(24,21,18,.92)", backdropFilter: "blur(12px)"
  },
};

export default function TalentBank() {
  const { menuOpen, setMenuOpen } = useOutletContext();
  const { profile: currentUser } = useAuth();
  const [roleSaving, setRoleSaving] = useState(false);
  const [people, setPeople] = useState([]);
  const [events, setEvents] = useState([]);
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState("all");
  const [availabilityFilter, setAvailabilityFilter] = useState("all");
  const [gridMode, setGridMode] = useState("grid");
  const [selectedPerson, setSelectedPerson] = useState(null);
  const [atsOpen, setAtsOpen] = useState(false);
  const [atsJob, setAtsJob] = useState("");
  const [atsResults, setAtsResults] = useState(null);
  const [atsBusy, setAtsBusy] = useState(false);

  useEffect(() => { window.scrollTo({ top: 0 }); }, []);
  useEffect(() => { document.title = "Ligia — Membros"; }, []);
  useEffect(() => {
    fetchProfiles().then(setPeople).catch(e => console.warn("TalentBank load error:", e.message));
    fetchEvents().then(setEvents).catch(e => console.warn("Agenda load error:", e.message));
  }, []);

  const refreshPeople = useCallback(() => {
    fetchProfiles().then(setPeople).catch(e => console.warn("Realtime refresh error:", e.message));
  }, []);

  useRealtime("profiles", refreshPeople);
  useRealtime("events", () => fetchEvents().then(setEvents).catch(() => {}));

  const filtered = people.filter(person => {
    const query = search.toLowerCase().trim();
    const haystack = [person.name, person.team, person.project, person.affiliation, ...(person.skills || [])].join(" ").toLowerCase();
    return (!query || haystack.includes(query))
      && (roleFilter === "all" || person.discipline === roleFilter)
      && (availabilityFilter === "all" || person.availability === availabilityFilter);
  });

  function openProfile(person) { setSelectedPerson(person); }
  function closeProfile() { setSelectedPerson(null); }

  function PersonAvatar({ person, size = 46, radius = 13, fontSize = 17, style }) {
    if (person.avatar_url) {
      return (
        <div style={{ position: "relative", width: size, height: size, flex: "0 0 auto", borderRadius: radius, background: "var(--surface-2)", overflow: "hidden", ...style }}>
          <img src={person.avatar_url} alt={person.name} width="46" height="46" loading="lazy" style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover" }} />
        </div>
      );
    }
    return (
      <div style={{ ...s.avatar(person.color || "#b7c2d2"), width: size, height: size, borderRadius: radius, fontSize, ...style }}>
        {person.initials}
      </div>
    );
  }

  async function handleRoleChange(profileId, role) {
    if (!canManageMembers(currentUser) || profileId === currentUser.id || roleSaving) return;
    setRoleSaving(true);
    try {
      const updated = await updateRole(profileId, role);
      setPeople(prev => prev.map(p => p.id === profileId ? updated : p));
      setSelectedPerson(prev => prev && prev.id === profileId ? updated : prev);
      showToast("Permissão atualizada");
    } catch (err) {
      showToast("Erro: " + err.message, "error");
    } finally { setRoleSaving(false); }
  }

  async function handleProfileField(profileId, field, value) {
    if (!canManageMembers(currentUser)) return;
    try {
      await updateProfile(profileId, { [field]: value });
      setPeople(prev => prev.map(p => p.id === profileId ? { ...p, [field]: value } : p));
      setSelectedPerson(prev => prev && prev.id === profileId ? { ...prev, [field]: value } : prev);
    } catch (err) {
      showToast("Erro: " + err.message);
    }
  }

  function upcomingFor(personId, limit = 4) {
    const now = Date.now();
    return (events || [])
      .filter(e => (e.participants || []).map(String).includes(String(personId)) && new Date(e.starts_at).getTime() >= now)
      .sort((a, b) => new Date(a.starts_at) - new Date(b.starts_at))
      .slice(0, limit);
  }

  async function runAts(e) {
    e.preventDefault();
    if (!atsJob.trim()) return;
    setAtsBusy(true);
    setAtsResults(null);
    setTimeout(() => {
      setAtsResults(matchJob(people, atsJob));
      setAtsBusy(false);
    }, 1100);
  }

  return (
    <>
      <header style={s.topbar}>
        <button className="mobile-menu" onClick={() => setMenuOpen(true)}
          aria-label="Abrir navegação" style={s.mobileMenu}>
          <Menu size={20} />
        </button>
        <div style={s.breadcrumbs}>
          Ligia &nbsp;/&nbsp; <strong style={s.breadcrumbStrong}>Membros</strong>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginLeft: "auto" }}>
          <button style={s.iconBtn} onClick={() => setTimeout(() => document.getElementById("talentSearch")?.focus(), 300)}>
            <Search size={16} aria-hidden="true" />
          </button>
        </div>
      </header>

      <div style={s.content}>
        <section>
          <div style={{ marginBottom: 36 }}>
            <div className="eyebrow" style={{ marginBottom: 8 }}>Navegação</div>
            <h1 style={{
                margin: "0 0 10px", fontSize: "clamp(28px, 4vw, 36px)",
                fontWeight: 500, letterSpacing: "-.03em"
              }}><span className="gradient-text">Membros.</span></h1>
              <div className="gradient-bar" style={{ width: 64, marginBottom: 14 }} />
              <p style={{ margin: 0, color: "var(--muted)", fontSize: 13, lineHeight: 1.7, maxWidth: 520 }}>
                Perfis, especialidades, agendas públicas e currículos dos membros da liga.
              </p>
            </div>

            <div style={s.toolbar}>
              <div style={s.searchWrap}>
                <div style={s.searchIcon} aria-hidden="true"><Search size={15} aria-hidden="true" /></div>
                <input id="talentSearch" type="search" placeholder="Buscar membros, habilidades ou projetos…" aria-label="Buscar membros"
                  value={search} onChange={e => setSearch(e.target.value)} style={s.searchInput} />
              </div>
              <select aria-label="Filtrar por área" value={roleFilter} onChange={e => setRoleFilter(e.target.value)} style={s.select}>
                {roleOptions.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
              </select>
              <select aria-label="Filtrar por disponibilidade" value={availabilityFilter} onChange={e => setAvailabilityFilter(e.target.value)} style={s.select}>
                {availabilityOptions.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
              </select>
              {canManageMembers(currentUser) && (
                <button onClick={() => { setAtsOpen(true); setAtsResults(null); setAtsJob(""); }}
                  style={{ ...s.btn, marginLeft: "auto" }}>
                  <Bot size={15} aria-hidden="true" /> Buscar por vaga (ATS)
                </button>
              )}
              <div style={canManageMembers(currentUser) ? s.viewToggle : { ...s.viewToggle, marginLeft: "auto" }}>
                <button onClick={() => setGridMode("grid")} style={s.toggleBtn(gridMode === "grid")} aria-label="Visualização em grade">
                  <LayoutGrid size={14} />
                </button>
                <button onClick={() => setGridMode("list")} style={s.toggleBtn(gridMode === "list")} aria-label="Visualização em lista">
                  <List size={14} />
                </button>
              </div>
            </div>

            <div style={gridMode === "grid" ? s.grid : s.listGrid}>
              {filtered.length === 0 ? (
                <div style={s.emptyState}>
                  <Search size={30} style={{ marginBottom: 12, color: "var(--muted-2)" }} />
                  <strong style={{ display: "block", marginBottom: 4, color: "var(--text)" }}>Nenhum membro encontrado</strong>
                  <span>Tente ajustar sua busca ou filtros.</span>
                </div>
              ) : filtered.map(person => (
                <button type="button" key={person.id} onClick={() => openProfile(person)} aria-label={`Ver perfil de ${person.name}`} style={{ ...(gridMode === "grid" ? s.card : s.cardList), width: "100%", textAlign: "left" }}>
                  {gridMode === "grid" ? (
                    <>
                      <div style={s.cardHead}>
                        <PersonAvatar person={person} />
                        <div style={s.personTitle}>
                          <h3 style={s.personName}>{person.name}</h3>
                          <span style={s.teamTag}>{person.team}</span>
                        </div>
                        <button aria-label="Ações do membro" onClick={e => { e.stopPropagation(); showToast("Ações do membro disponíveis"); }} style={{ width: 28, height: 28, display: "grid", flex: "0 0 auto", marginLeft: "auto", placeItems: "center", border: 0, borderRadius: 7, color: "var(--muted)", background: "transparent", cursor: "pointer" }}>
                          <MoreHorizontal size={15} aria-hidden="true" />
                        </button>
                      </div>
                      <div style={s.projectLine}>
                        <Blocks size={13} color="var(--accent)" />
                        <span>Atualmente em&nbsp;</span>
                        <strong style={{ overflow: "hidden", color: "#c8c5bc", fontWeight: 550, textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{person.project}</strong>
                      </div>
                      <div style={s.skills}>
                        {person.skills.slice(0, 3).map((skill, i) => (
                          <span key={skill} style={s.tag(i === 0)}>{skill}</span>
                        ))}
                        {person.skills.length > 3 && <span style={s.tag(false)}>+{person.skills.length - 3}</span>}
                      </div>
                      <div style={{ display: "flex", alignItems: "center", gap: 10, marginTop: 12 }}>
                        <span style={{ display: "inline-flex", alignItems: "center", gap: 5, fontSize: 10, color: "var(--muted-2)" }}>
                          <CalendarDays size={12} /> Agenda pública · {upcomingFor(person.id).length} evento{upcomingFor(person.id).length === 1 ? "" : "s"}
                        </span>
                        {person.calendar_url && (
                          <a href={person.calendar_url} target="_blank" rel="noopener" onClick={e => e.stopPropagation()}
                            style={{ display: "inline-flex", alignItems: "center", gap: 5, fontSize: 10, color: "var(--accent)", textDecoration: "none" }}>
                            Calendário <ExternalLink size={11} />
                          </a>
                        )}
                      </div>
                      <div style={s.cardFoot}>
                        <span style={{ display: "flex", alignItems: "center", gap: 4 }}>
                          <Building size={11} /> {person.affiliation}
                        </span>
                        <span style={{ marginLeft: "auto", display: "flex", gap: 6 }}>
                          {person.github && (
                            <a href={person.github} target="_blank" rel="noopener" onClick={e => e.stopPropagation()} style={{ color: "var(--muted-2)" }}>
                              <Github size={13} />
                            </a>
                          )}
                          {person.kaggle && (
                            <a href={person.kaggle} target="_blank" rel="noopener" onClick={e => e.stopPropagation()} style={{ color: "var(--muted-2)" }}>
                              <Award size={13} />
                            </a>
                          )}
                        </span>
                      </div>
                    </>
                  ) : (
                    <>
                      <div style={{ ...s.cardHead, margin: 0 }}>
                        <PersonAvatar person={person} />
                        <div style={s.personTitle}>
                          <h3 style={s.personName}>{person.name}</h3>
                          <span style={s.teamTag}>{person.team}</span>
                        </div>
                      </div>
                      <div style={{ ...s.projectLine, margin: 0 }}>
                        <Blocks size={13} color="var(--accent)" />
                        <strong style={{ overflow: "hidden", color: "#c8c5bc", fontWeight: 550, textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{person.project}</strong>
                      </div>
                      <div style={s.skills}>
                        {person.skills.slice(0, 3).map((skill, i) => (
                          <span key={skill} style={s.tag(i === 0)}>{skill}</span>
                        ))}
                        {person.skills.length > 3 && <span style={s.tag(false)}>+{person.skills.length - 3}</span>}
                      </div>
                      <div style={s.cardFootList}>
                        <span style={{ display: "flex", alignItems: "center", gap: 4 }}>
                          <Building size={11} /> {person.affiliation}
                        </span>
                        <span style={{ marginLeft: "auto", display: "inline-flex", alignItems: "center", gap: 10, fontSize: 10 }}>
                          <span style={{ display: "inline-flex", alignItems: "center", gap: 5, color: "var(--muted-2)" }}>
                            <CalendarDays size={12} /> {upcomingFor(person.id).length} evento{upcomingFor(person.id).length === 1 ? "" : "s"}
                          </span>
                          {person.calendar_url && (
                            <a href={person.calendar_url} target="_blank" rel="noopener" onClick={e => e.stopPropagation()}
                              style={{ display: "inline-flex", alignItems: "center", gap: 5, color: "var(--accent)", textDecoration: "none" }}>
                              Agenda <ExternalLink size={11} />
                            </a>
                          )}
                          {person.github && <Github size={13} style={{ color: "var(--muted-2)" }} />}
                          {person.kaggle && <Award size={13} style={{ color: "var(--muted-2)" }} />}
                        </span>
                      </div>
                    </>
                  )}
                </button>
              ))}
            </div>
          </section>

      </div>

      <div style={s.modalBackdrop(!!selectedPerson)} onClick={e => { if (e.target === e.currentTarget) closeProfile(); }}>
        {selectedPerson && (
          <div style={s.modal} role="dialog" aria-modal="true">
            <div style={s.modalHeader}>
              <span style={{ color: "var(--muted)", fontSize: 11, textTransform: "uppercase", letterSpacing: ".1em" }}>Perfil do membro</span>
              <button aria-label="Fechar" style={s.iconBtn} onClick={closeProfile}><X size={16} aria-hidden="true" /></button>
            </div>
            <div style={{ padding: 26 }}>
              <div style={{ display: "flex", gap: 18, alignItems: "center", marginBottom: 28 }}>
                <PersonAvatar person={selectedPerson} size={72} radius={19} fontSize={25} />
                <div>
                  <h2 id="profileName" style={{ margin: "0 0 4px", fontFamily: "var(--font-heading)", fontSize: 28, fontWeight: 500 }}>{selectedPerson.name}</h2>
                  <p style={{ margin: "0 0 8px", color: "var(--muted)", fontSize: 12 }}>{selectedPerson.team} · {selectedPerson.affiliation}</p>
                </div>
                <div style={{ display: "flex", gap: 8, marginLeft: "auto", alignItems: "center" }}>
                  {canManageMembers(currentUser) && selectedPerson.id !== currentUser.id && (
                    <select aria-label="Papel de acesso" disabled={roleSaving} value={selectedPerson.role || ""}
                      onChange={e => handleRoleChange(selectedPerson.id, e.target.value)}
                      onClick={e => e.stopPropagation()}
                      style={{
                        height: 38, padding: "0 10px", border: "1px solid var(--line)",
                        borderRadius: 8, outline: "none", color: "var(--text)",
                        background: "var(--surface-2)", cursor: "pointer",
                        fontSize: 12, fontFamily: "var(--font-body)"
                      }}>
                      {accessRoleOptions.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                    </select>
                  )}
                  <button style={s.btnPrimary} onClick={() => { if (selectedPerson.email) window.location.href = `mailto:${selectedPerson.email}`; else showToast("Email não disponível"); }}>
                    <Mail size={15} /> Contato
                  </button>
                </div>
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1.35fr .65fr", gap: 24 }}>
                <div>
                  {canManageMembers(currentUser) && (
                    <div style={{ marginBottom: 25, padding: "16px 18px", borderRadius: 10, border: "1px solid var(--line-soft)", background: "var(--surface-2)" }}>
                      <h3 style={{ marginBottom: 12, color: "var(--muted)", fontSize: 10, letterSpacing: ".1em", textTransform: "uppercase" }}>Organização da liga</h3>
                      <div style={{ display: "grid", gap: 12 }}>
                        <div>
                          <label style={{ display: "block", marginBottom: 6, color: "var(--muted-2)", fontSize: 11 }}>Categoria</label>
                          <select value={selectedPerson.category || "membro"}
                            onChange={e => handleProfileField(selectedPerson.id, "category", e.target.value)}
                            style={{
                              width: "100%", height: 38, padding: "0 10px", border: "1px solid var(--line)",
                              borderRadius: 8, outline: "none", color: "var(--text)",
                              background: "var(--surface)", cursor: "pointer", fontSize: 12
                            }}>
                            {categoryOptions.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                          </select>
                        </div>
                        {selectedPerson.category === "diretor" && (
                          <div>
                            <label style={{ display: "block", marginBottom: 6, color: "var(--muted-2)", fontSize: 11 }}>Diretoria</label>
                            <select value={selectedPerson.director_role || ""}
                              onChange={e => handleProfileField(selectedPerson.id, "director_role", e.target.value)}
                              style={{
                                width: "100%", height: 38, padding: "0 10px", border: "1px solid var(--line)",
                                borderRadius: 8, outline: "none", color: "var(--text)",
                                background: "var(--surface)", cursor: "pointer", fontSize: 12
                              }}>
                              <option value="">Selecionar diretoria</option>
                              {directorRoleOptions.map(o => <option key={o} value={o}>{o}</option>)}
                            </select>
                          </div>
                        )}
                        <div>
                          <label style={{ display: "block", marginBottom: 6, color: "var(--muted-2)", fontSize: 11 }}>Foto de perfil (URL)</label>
                          <input
                            defaultValue={selectedPerson.avatar_url || ""}
                            placeholder="https://…"
                            onBlur={e => {
                              const v = e.target.value.trim();
                              if (v !== (selectedPerson.avatar_url || "")) handleProfileField(selectedPerson.id, "avatar_url", v);
                            }}
                            style={{
                              width: "100%", height: 38, padding: "0 10px", border: "1px solid var(--line)",
                              borderRadius: 8, outline: "none", color: "var(--text)",
                              background: "var(--surface)", fontSize: 12
                            }} />
                        </div>
                      </div>
                    </div>
                  )}
                  <div style={{ marginBottom: 25 }}>
                    <h3 style={{ marginBottom: 11, color: "var(--muted)", fontSize: 10, letterSpacing: ".1em", textTransform: "uppercase" }}>Sobre</h3>
                    <p style={{ color: "#c2bfb6", fontSize: 12, lineHeight: 1.7 }}>{selectedPerson.bio}</p>
                  </div>
                  <div style={{ marginBottom: 25 }}>
                    <h3 style={{ marginBottom: 11, color: "var(--muted)", fontSize: 10, letterSpacing: ".1em", textTransform: "uppercase" }}>Projetos e pesquisas</h3>
                    <div style={{ position: "relative", paddingLeft: 19 }}>
                      <div style={{ position: "absolute", left: 4, top: 5, bottom: 5, width: 1, background: "var(--line)" }}></div>
                      {(selectedPerson.history || []).map((item, i) => (
                        <div key={i} style={{ position: "relative", marginBottom: 17 }}>
                          <div style={{ position: "absolute", left: -19, top: 4, width: 7, height: 7, border: "2px solid var(--surface)", borderRadius: "50%", background: "var(--accent)" }}></div>
                          <strong style={{ display: "block", marginBottom: 2, fontSize: 12 }}>{item[0]}</strong>
                          <small style={{ color: "var(--muted)", fontSize: 10 }}>{item[1]}</small>
                        </div>
                      ))}
                    </div>
                  </div>
                  <div style={{ marginBottom: 25 }}>
                    <h3 style={{ marginBottom: 11, color: "var(--muted)", fontSize: 10, letterSpacing: ".1em", textTransform: "uppercase" }}>Interesses de pesquisa</h3>
                    <p style={{ color: "#c2bfb6", fontSize: 12, lineHeight: 1.7 }}>{selectedPerson.researchInterests || "—"}</p>
                  </div>
                  <div style={{ marginBottom: 25 }}>
                    <h3 style={{ marginBottom: 11, color: "var(--muted)", fontSize: 10, letterSpacing: ".1em", textTransform: "uppercase" }}>Agenda pública</h3>
                    {selectedPerson.calendar_url && (
                      <a href={selectedPerson.calendar_url} target="_blank" rel="noopener"
                        style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 12px", marginBottom: 10, borderRadius: 8, background: "var(--surface-2)", color: "var(--text)", textDecoration: "none", fontSize: 12 }}>
                        <CalendarDays size={16} style={{ color: "var(--accent)" }} /> <span>Ver calendário completo</span>
                      </a>
                    )}
                    {upcomingFor(selectedPerson.id).length === 0 ? (
                      <p style={{ color: "var(--muted-2)", fontSize: 12 }}>Sem eventos públicos agendados.</p>
                    ) : (
                      <div style={{ display: "grid", gap: 8 }}>
                        {upcomingFor(selectedPerson.id).map(ev => (
                          <div key={ev.id} style={{ padding: "11px 13px", borderRadius: 9, background: "var(--surface-2)" }}>
                            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                              <span style={{ fontSize: 12, fontWeight: 600, color: "var(--text)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{ev.title}</span>
                              <span style={{ marginLeft: "auto", color: "var(--accent)", fontSize: 10, whiteSpace: "nowrap" }}>{formatDate(ev.starts_at)}</span>
                            </div>
                            {ev.location && (
                              <div style={{ marginTop: 4, color: "var(--muted-2)", fontSize: 11 }}>{ev.location}</div>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
                <aside>
                  <div style={{ marginBottom: 25 }}>
                    <h3 style={{ marginBottom: 11, color: "var(--muted)", fontSize: 10, letterSpacing: ".1em", textTransform: "uppercase" }}>Redes e portfólio</h3>
                    <div style={{ display: "grid", gap: 6 }}>
                      {selectedPerson.lattes && (
                        <a href={selectedPerson.lattes} target="_blank" rel="noopener" style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 12px", borderRadius: 8, background: "var(--surface-2)", color: "var(--text)", textDecoration: "none", fontSize: 12 }}>
                          <GraduationCap size={16} style={{ color: "var(--accent)" }} /> <span>Lattes</span>
                        </a>
                      )}
                      {selectedPerson.github && (
                        <a href={selectedPerson.github} target="_blank" rel="noopener" style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 12px", borderRadius: 8, background: "var(--surface-2)", color: "var(--text)", textDecoration: "none", fontSize: 12 }}>
                          <Github size={16} style={{ color: "var(--accent)" }} /> <span>GitHub</span>
                        </a>
                      )}
                      {selectedPerson.linkedin && (
                        <a href={selectedPerson.linkedin} target="_blank" rel="noopener" style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 12px", borderRadius: 8, background: "var(--surface-2)", color: "var(--text)", textDecoration: "none", fontSize: 12 }}>
                          <Linkedin size={16} style={{ color: "var(--accent)" }} /> <span>LinkedIn</span>
                        </a>
                      )}
                      {selectedPerson.kaggle && (
                        <a href={selectedPerson.kaggle} target="_blank" rel="noopener" style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 12px", borderRadius: 8, background: "var(--surface-2)", color: "var(--text)", textDecoration: "none", fontSize: 12 }}>
                          <Award size={16} style={{ color: "var(--accent)" }} /> <span>Kaggle</span>
                        </a>
                      )}
                    </div>
                  </div>
                  <div style={{ marginBottom: 25 }}>
                    <h3 style={{ marginBottom: 11, color: "var(--muted)", fontSize: 10, letterSpacing: ".1em", textTransform: "uppercase" }}>Habilidades</h3>
                    <div style={s.skills}>
                      {selectedPerson.skills.map((skill, i) => (
                        <span key={skill} style={s.tag(i < 2)}>{skill}</span>
                      ))}
                    </div>
                  </div>
                  <div style={{ marginTop: 20 }}>
                    {selectedPerson.cv ? (
                      <a href={selectedPerson.cv} target="_blank" rel="noopener"
                        style={{ display: "flex", alignItems: "center", gap: 12, padding: 14, borderRadius: 10, background: "linear-gradient(135deg, var(--accent), var(--accent-hover))", cursor: "pointer", color: "#fff", textDecoration: "none" }}>
                        <div style={{ display: "flex", alignItems: "center", justifyContent: "center", width: 36, height: 36, borderRadius: 8, background: "rgba(255,255,255,.15)" }}>
                          <ExternalLink size={18} color="#fff" />
                        </div>
                        <div style={{ flex: 1 }}>
                          <strong style={{ display: "block", color: "#fff", fontSize: 13, fontWeight: 600 }}>Abrir CV</strong>
                          <span style={{ color: "rgba(255,255,255,.7)", fontSize: 10 }}>Google Drive / Link externo</span>
                        </div>
                        <ExternalLink size={18} style={{ color: "rgba(255,255,255,.8)" }} />
                      </a>
                    ) : (
                      <div style={{ display: "flex", alignItems: "center", gap: 12, padding: 14, borderRadius: 10, background: "var(--surface-2)" }}>
                        <div style={{ display: "flex", alignItems: "center", justifyContent: "center", width: 36, height: 36, borderRadius: 8, background: "var(--surface-3)" }}>
                          <ExternalLink size={18} style={{ color: "var(--muted-2)" }} />
                        </div>
                        <div style={{ flex: 1 }}>
                          <strong style={{ display: "block", color: "var(--muted)", fontSize: 13, fontWeight: 600 }}>CV não disponível</strong>
                          <span style={{ color: "var(--muted-2)", fontSize: 10 }}>Nenhum link cadastrado</span>
                        </div>
                      </div>
                    )}
                  </div>
                </aside>
              </div>
            </div>
          </div>
        )}
      </div>

      <div style={s.modalBackdrop(atsOpen)} onClick={e => { if (e.target === e.currentTarget) setAtsOpen(false); }}>
        <div style={{ ...s.modal, width: "min(640px, 100%)" }} role="dialog" aria-modal="true">
          <div style={s.modalHeader}>
            <span style={{ color: "var(--muted)", fontSize: 11, textTransform: "uppercase", letterSpacing: ".1em" }}>
              <Bot size={13} style={{ marginRight: 6, verticalAlign: -2 }} /> Buscador de candidatos (ATS)
            </span>
            <button aria-label="Fechar" style={s.iconBtn} onClick={() => setAtsOpen(false)}><X size={16} aria-hidden="true" /></button>
          </div>
          <div style={{ padding: 26 }}>
            <form onSubmit={runAts}>
              <div style={s.formGroup}>
                <label style={s.formLabel}>Descrição da vaga</label>
                <textarea style={{ ...s.textarea, minHeight: 150 }} autoFocus
                  placeholder={"Cole aqui a descrição da vaga, por exemplo:\n\n\"Estamos buscando um cientista de dados com experiência em Python, aprendizado de máquina e modelos de linguagem para atuar com NLP e RAG em sistemas de recomendação...\""}
                  value={atsJob} onChange={e => setAtsJob(e.target.value)} />
              </div>
              <button type="submit" disabled={atsBusy || !atsJob.trim()} style={{ ...s.btnPrimary, width: "100%" }}>
                <Bot size={15} /> {atsBusy ? "Analisando currículos…" : "Buscar candidatos"}
              </button>
            </form>

            {atsBusy && (
              <div style={{ padding: "34px 20px", textAlign: "center", color: "var(--muted)", fontSize: 12 }}>
                Analisando currículos contra os requisitos da vaga…
              </div>
            )}

            {atsResults && atsResults.length === 0 && (
              <div style={{ padding: "30px 20px", textAlign: "center", color: "var(--muted-2)", fontSize: 12 }}>
                Nenhum membro encontrado para esta vaga.
              </div>
            )}

            {atsResults && atsResults.length > 0 && (
              <div style={{ marginTop: 20, display: "grid", gap: 8 }}>
                {atsResults.slice(0, 8).map(({ person, score, matched, total }, i) => (
                  <button key={person.id} onClick={() => { setAtsOpen(false); setSelectedPerson(person); }}
                    style={{
                      display: "grid", gridTemplateColumns: "34px 1fr auto", gap: 12, alignItems: "center",
                      padding: "12px 14px", border: "1px solid var(--line-soft)", borderRadius: 11,
                      background: "var(--surface-2)", cursor: "pointer", textAlign: "left",
                      fontFamily: "var(--font-body)"
                    }}>
                    <div style={s.avatar(person.color)}>{person.initials}</div>
                    <div style={{ minWidth: 0 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                        <strong style={{ color: "var(--text)", fontSize: 13, fontWeight: 600 }}>{person.name}</strong>
                        <span style={s.teamTag}>{person.team}</span>
                      </div>
                      <div style={{ display: "flex", flexWrap: "wrap", gap: 4, marginTop: 5 }}>
                        {matched.slice(0, 5).map(m => (
                          <span key={m} style={{ fontSize: 9, padding: "2px 6px", borderRadius: 9999, color: "var(--accent)", background: "var(--accent-soft)" }}>{m}</span>
                        ))}
                        {matched.length > 5 && (
                          <span style={{ fontSize: 9, padding: "2px 6px", borderRadius: 9999, color: "var(--muted-2)", background: "var(--surface-3)" }}>+{matched.length - 5}</span>
                        )}
                      </div>
                    </div>
                    <div style={{ textAlign: "right", width: 90 }}>
                      <div style={{ color: "var(--text)", fontSize: 17, fontWeight: 650, fontFamily: "var(--font-heading)" }}>{score}%</div>
                      <div style={{ marginTop: 4, height: 4, borderRadius: 9999, background: "var(--surface-3)", overflow: "hidden" }}>
                        <div style={{ width: `${score}%`, height: "100%", borderRadius: 9999, background: score >= 70 ? "#6da87c" : score >= 40 ? "#c4a358" : "var(--muted-2)" }} />
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
