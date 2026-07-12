import { useOutletContext } from "react-router-dom";
import { useState, useEffect } from "react";
import {
  Users, Blocks, Search, LayoutGrid, List, UserPlus,
  Building, Github, Award, Menu, FileDown, Mail, GraduationCap, Linkedin,
  Bot, Globe, Cpu, Microscope,
  X,
  CalendarDays, Bell, MoreHorizontal, BookOpen, ExternalLink
} from "lucide-react";
import { showToast } from "../utils/toast.js";
import { fetchProfiles, createProfile } from "../services/profiles.js";

const roleOptions = [
  { value: "all", label: "Todas as áreas" },
  { value: "Comunicação", label: "Comunicação" },
  { value: "CV", label: "CV" },
  { value: "NLP", label: "NLP" },
  { value: "ML", label: "ML" }
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
    borderBottom: "1px solid rgba(52,51,45,.72)",
    background: "rgba(15,15,13,.82)", backdropFilter: "blur(18px)"
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
    fontSize: 17, fontWeight: 500, background: color
  }),
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
    cursor: "pointer", whiteSpace: "nowrap", transition: "all var(--transition)"
  },
  btnPrimary: {
    minHeight: 39, display: "inline-flex", alignItems: "center",
    justifyContent: "center", gap: 8, padding: "0 15px",
    border: "1px solid var(--ligia-orange-1)", borderRadius: 9,
    color: "#fff", background: "var(--ligia-orange-1)",
    fontFamily: "var(--font-body)", fontWeight: 700, fontSize: 13,
    cursor: "pointer", whiteSpace: "nowrap", transition: "all var(--transition)"
  },
  iconBtn: {
    width: 35, height: 35, display: "grid", placeItems: "center",
    border: "1px solid var(--line)", borderRadius: 9,
    color: "var(--muted)", background: "var(--surface)",
    cursor: "pointer", transition: "all var(--transition)"
  },
  skills: { display: "flex", flexWrap: "wrap", gap: 6, minHeight: 26 },
  tag: (accent) => ({
    display: "inline-flex", alignItems: "center", padding: "4px 8px",
    border: `1px solid ${accent ? "var(--accent-border)" : "#34332d"}`,
    borderRadius: 9999, fontSize: 10, whiteSpace: "nowrap",
    color: accent ? "#fff" : "#aaa79e",
    background: accent ? "var(--accent-soft)" : "#22221e"
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
    border: "1px solid #37362f", borderRadius: 18,
    background: "#181815", boxShadow: "var(--shadow)"
  },
  smallModal: {
    width: "min(480px, 100%)", maxHeight: "90vh", overflowY: "auto",
    border: "1px solid #37362f", borderRadius: 18,
    background: "#181815", boxShadow: "var(--shadow)"
  },
  modalHeader: {
    display: "flex", alignItems: "center", justifyContent: "space-between",
    padding: "15px 20px", borderBottom: "1px solid var(--line-soft)",
    background: "rgba(24,24,21,.92)", backdropFilter: "blur(12px)"
  },
};

export default function TalentBank() {
  const { menuOpen, setMenuOpen } = useOutletContext();
  const [people, setPeople] = useState([]);
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState("all");
  const [availabilityFilter, setAvailabilityFilter] = useState("all");
  const [gridMode, setGridMode] = useState("grid");
  const [selectedPerson, setSelectedPerson] = useState(null);
  const [addModalOpen, setAddModalOpen] = useState(false);
  const [selectedTags] = useState(["Python", "RAG", "MLOps"]);

  const [formData, setFormData] = useState({
    name: "", email: "", team: "", discipline: "NLP",
    skills: "", affiliation: "", availability: "Disponível",
    lattes: "", github: "", linkedin: "", kaggle: "",
    bio: "", researchInterests: ""
  });

  useEffect(() => { window.scrollTo({ top: 0 }); }, []);
  useEffect(() => { document.title = "Ligia — Banco de Talentos"; }, []);
  useEffect(() => {
    fetchProfiles().then(setPeople).catch(e => console.warn("TalentBank load error:", e.message));
  }, []);

  const filtered = people.filter(person => {
    const query = search.toLowerCase().trim();
    const haystack = [person.name, person.team, person.project, person.affiliation, ...(person.skills || [])].join(" ").toLowerCase();
    return (!query || haystack.includes(query))
      && (roleFilter === "all" || person.discipline === roleFilter)
      && (availabilityFilter === "all" || person.availability === availabilityFilter);
  });

  function openProfile(person) { setSelectedPerson(person); }
  function closeProfile() { setSelectedPerson(null); }
  function openAddModal() { setAddModalOpen(true); }
  function closeAddModal() { setAddModalOpen(false); }

  function handleAddSubmit(e) {
    e.preventDefault();
    const name = formData.name.trim();
    closeAddModal();
    showToast(`${name} adicionado ao pool de talentos`);
  }

  return (
    <>
      <header style={s.topbar}>
        <button className="mobile-menu" onClick={() => setMenuOpen(true)}
          aria-label="Abrir navegação" style={s.mobileMenu}>
          <Menu size={20} />
        </button>
        <div style={s.breadcrumbs}>
          Ligia &nbsp;/&nbsp; <strong style={s.breadcrumbStrong}>Banco de Talentos</strong>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginLeft: "auto" }}>
          <button style={s.iconBtn} onClick={() => setTimeout(() => document.getElementById("talentSearch")?.focus(), 300)}>
            <Search size={16} />
          </button>
          <button style={s.iconBtn} onClick={() => showToast("Você está em dia")}>
            <Bell size={16} />
          </button>
        </div>
      </header>

      <div style={s.content}>
        <section>
          <div style={{ marginBottom: 36 }}>
            <h1 style={{
                margin: "0 0 10px", fontSize: "clamp(28px, 4vw, 36px)",
                fontWeight: 500, letterSpacing: "-.03em"
              }}><span className="gradient-text">Banco de Talentos.</span></h1>
              <p style={{ margin: 0, color: "var(--muted)", fontSize: 13, lineHeight: 1.7, maxWidth: 520 }}>
                Perfis, especialidades, CVs, disponibilidade e contribuições em projetos internos.
              </p>
            </div>

            <div style={s.toolbar}>
              <div style={s.searchWrap}>
                <div style={s.searchIcon}><Search size={15} /></div>
                <input id="talentSearch" type="search" placeholder="Buscar pessoas, habilidades ou projetos…"
                  value={search} onChange={e => setSearch(e.target.value)} style={s.searchInput} />
              </div>
              <select value={roleFilter} onChange={e => setRoleFilter(e.target.value)} style={s.select}>
                {roleOptions.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
              </select>
              <select value={availabilityFilter} onChange={e => setAvailabilityFilter(e.target.value)} style={s.select}>
                {availabilityOptions.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
              </select>
              <div style={s.viewToggle}>
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
                <article key={person.id} onClick={() => openProfile(person)} style={gridMode === "grid" ? s.card : s.cardList}>
                  {gridMode === "grid" ? (
                    <>
                      <div style={s.cardHead}>
                        <div style={s.avatar(person.color)}>
                          {person.initials}
                        </div>
                        <div style={s.personTitle}>
                          <h3 style={s.personName}>{person.name}</h3>
                          <span style={s.teamTag}>{person.team}</span>
                        </div>
                        <button onClick={e => { e.stopPropagation(); showToast("Ações do membro disponíveis"); }} style={{ width: 28, height: 28, display: "grid", flex: "0 0 auto", marginLeft: "auto", placeItems: "center", border: 0, borderRadius: 7, color: "var(--muted)", background: "transparent", cursor: "pointer" }}>
                          <MoreHorizontal size={15} />
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
                        <div style={s.avatar(person.color)}>
                          {person.initials}
                        </div>
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
                        <span style={{ marginLeft: "auto", display: "flex", gap: 6 }}>
                          {person.github && <Github size={13} style={{ color: "var(--muted-2)" }} />}
                          {person.kaggle && <Award size={13} style={{ color: "var(--muted-2)" }} />}
                        </span>
                      </div>
                    </>
                  )}
                </article>
              ))}
            </div>
          </section>

      </div>

      <div style={s.modalBackdrop(!!selectedPerson)} onClick={e => { if (e.target === e.currentTarget) closeProfile(); }}>
        {selectedPerson && (
          <div style={s.modal} role="dialog" aria-modal="true">
            <div style={s.modalHeader}>
              <span style={{ color: "var(--muted)", fontSize: 11, textTransform: "uppercase", letterSpacing: ".1em" }}>Perfil do membro</span>
              <button style={s.iconBtn} onClick={closeProfile}><X size={16} /></button>
            </div>
            <div style={{ padding: 26 }}>
              <div style={{ display: "flex", gap: 18, alignItems: "center", marginBottom: 28 }}>
                <div style={{ ...s.avatar(selectedPerson.color), width: 72, height: 72, borderRadius: 19, fontSize: 25 }}>
                  {selectedPerson.initials}
                </div>
                <div>
                  <h2 id="profileName" style={{ margin: "0 0 4px", fontFamily: "var(--font-heading)", fontSize: 28, fontWeight: 500 }}>{selectedPerson.name}</h2>
                  <p style={{ margin: "0 0 8px", color: "var(--muted)", fontSize: 12 }}>{selectedPerson.team} · {selectedPerson.affiliation}</p>
                </div>
                <div style={{ display: "flex", gap: 8, marginLeft: "auto" }}>
                  <button style={s.btnPrimary} onClick={() => { if (selectedPerson.email) window.location.href = `mailto:${selectedPerson.email}`; else showToast("Email não disponível"); }}>
                    <Mail size={15} /> Contato
                  </button>
                </div>
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1.35fr .65fr", gap: 24 }}>
                <div>
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

      <div style={s.modalBackdrop(addModalOpen)} onClick={e => { if (e.target === e.currentTarget) closeAddModal(); }}>
        <div style={s.smallModal} role="dialog" aria-modal="true">
          <div style={s.modalHeader}>
            <span style={{ color: "var(--muted)", fontSize: 11, textTransform: "uppercase", letterSpacing: ".1em" }}>Adicionar um membro</span>
            <button style={s.iconBtn} onClick={closeAddModal}><X size={16} /></button>
          </div>
          <div style={{ padding: 26 }}>
            <form onSubmit={handleAddSubmit}>
              <div style={s.formRow}>
                <div style={s.formGroup}>
                  <label style={s.formLabel}>Nome completo</label>
                  <input style={s.field} required placeholder="Alex Morgan"
                    value={formData.name} onChange={e => setFormData({ ...formData, name: e.target.value })} />
                </div>
                <div style={s.formGroup}>
                  <label style={s.formLabel}>Email</label>
                  <input style={s.field} required type="email" placeholder="alex@ligia.ai"
                    value={formData.email} onChange={e => setFormData({ ...formData, email: e.target.value })} />
                </div>
              </div>
              <div style={s.formRow}>
                <div style={s.formGroup}>
                  <label style={s.formLabel}>Equipe</label>
                  <input style={s.field} required placeholder="NLP"
                    value={formData.team} onChange={e => setFormData({ ...formData, team: e.target.value })} />
                </div>
                <div style={s.formGroup}>
                  <label style={s.formLabel}>Disciplina</label>
                  <select style={s.field} value={formData.discipline}
                    onChange={e => setFormData({ ...formData, discipline: e.target.value })}>
                    <option>Comunicação</option>
                    <option>CV</option>
                    <option>NLP</option>
                    <option>ML</option>
                  </select>
                </div>
              </div>
              <div style={s.formGroup}>
                <label style={s.formLabel}>Habilidades, separadas por vírgulas</label>
                <input style={s.field} required placeholder="Python, RAG, LangChain"
                  value={formData.skills} onChange={e => setFormData({ ...formData, skills: e.target.value })} />
              </div>
              <div style={s.formRow}>
                <div style={s.formGroup}>
                  <label style={s.formLabel}>Vínculo institucional</label>
                  <input style={s.field} placeholder="CIn-UFPE"
                    value={formData.affiliation} onChange={e => setFormData({ ...formData, affiliation: e.target.value })} />
                </div>
                <div style={s.formGroup}>
                  <label style={s.formLabel}>Disponibilidade</label>
                  <select style={s.field} value={formData.availability}
                    onChange={e => setFormData({ ...formData, availability: e.target.value })}>
                    <option>Disponível</option>
                    <option>Limitado</option>
                    <option>Alocado</option>
                  </select>
                </div>
              </div>
              <div style={s.formRow}>
                <div style={s.formGroup}>
                  <label style={s.formLabel}>Lattes</label>
                  <input style={s.field} placeholder="http://lattes.cnpq.br/..."
                    value={formData.lattes} onChange={e => setFormData({ ...formData, lattes: e.target.value })} />
                </div>
                <div style={s.formGroup}>
                  <label style={s.formLabel}>GitHub</label>
                  <input style={s.field} placeholder="https://github.com/usuario"
                    value={formData.github} onChange={e => setFormData({ ...formData, github: e.target.value })} />
                </div>
              </div>
              <div style={s.formRow}>
                <div style={s.formGroup}>
                  <label style={s.formLabel}>LinkedIn</label>
                  <input style={s.field} placeholder="https://linkedin.com/in/usuario"
                    value={formData.linkedin} onChange={e => setFormData({ ...formData, linkedin: e.target.value })} />
                </div>
                <div style={s.formGroup}>
                  <label style={s.formLabel}>Kaggle</label>
                  <input style={s.field} placeholder="https://kaggle.com/usuario"
                    value={formData.kaggle} onChange={e => setFormData({ ...formData, kaggle: e.target.value })} />
                </div>
              </div>
              <div style={s.formGroup}>
                <label style={s.formLabel}>Perfil resumido</label>
                <textarea style={s.textarea} placeholder="Formação, interesses e foco atual…"
                  value={formData.bio} onChange={e => setFormData({ ...formData, bio: e.target.value })} />
              </div>
              <div style={s.formGroup}>
                <label style={s.formLabel}>Interesses de pesquisa</label>
                <textarea style={s.textarea} placeholder="Sistemas de diálogo, RAG, avaliação de LLMs…"
                  value={formData.researchInterests} onChange={e => setFormData({ ...formData, researchInterests: e.target.value })} />
              </div>
              <button type="submit" style={{ ...s.btnPrimary, width: "100%" }}>
                <UserPlus size={15} /> Adicionar ao pool de talentos
              </button>
            </form>
          </div>
        </div>
      </div>
    </>
  );
}
