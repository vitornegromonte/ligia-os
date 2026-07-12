import { useOutletContext, useNavigate } from "react-router-dom";
import { useState, useEffect } from "react";
import {
  Menu, Search, BookOpen, Clock, FileText, FolderOpen,
  FlaskConical, ListChecks, DoorOpen, CalendarPlus, Palette,
  Backpack, GitBranch, Server, ScrollText, BookMarked,
  Layers, Quote, Beaker, Microscope, Bot, Sparkles, Globe, Cpu
} from "lucide-react";
import { showToast } from "../utils/toast.js";
import DocModal from "../components/DocModal.jsx";
import { guides, researchDocs, projectDocs } from "../data/docs.js";

const iconMap = {
  DoorOpen, CalendarPlus, Palette, Backpack, GitBranch, Server,
  FlaskConical, ScrollText, BookMarked, Layers, Quote, ListChecks,
  Microscope, Beaker, Bot, Sparkles, Globe, Cpu
};

const tabs = [
  { id: "guias", icon: BookOpen, label: "Guias" },
  { id: "pesquisa", icon: FlaskConical, label: "Pesquisa" },
  { id: "projetos", icon: FolderOpen, label: "Projetos" }
];

const guideCategories = ["Todos", "Processos", "Marca", "Eventos", "Infraestrutura"];
const researchAreas = ["Todos", "NLP", "CV", "ML", "Geral"];

export default function Documentation() {
  const { menuOpen, setMenuOpen } = useOutletContext();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState("guias");
  const [filter, setFilter] = useState("Todos");
  const [modalOpen, setModalOpen] = useState(false);
  const [modalTitle, setModalTitle] = useState("");
  const [modalContent, setModalContent] = useState("");

  useEffect(() => { window.scrollTo({ top: 0 }); }, [activeTab]);
  useEffect(() => { document.title = "Ligia — Documentação"; }, []);

  const areaMap = { "NLP": "nlp", "CV": "cv", "ML": "ml", "Geral": "geral" };

  const filteredGuides = filter === "Todos"
    ? guides : guides.filter(g => g.category === filter.toLowerCase());
  const filteredResearch = filter === "Todos"
    ? researchDocs : researchDocs.filter(r => r.area === areaMap[filter]);

  const currentCategories = activeTab === "guias" ? guideCategories : researchAreas;

  function openDoc(title, content) {
    setModalTitle(title);
    setModalContent(content);
    setModalOpen(true);
  }

  const subtitles = {
    guias: "Guias, manuais e referências para entender processos, boas práticas e o funcionamento interno da Ligia.",
    pesquisa: "Materiais e templates para apoiar a produção de pesquisa em IA: metodologia, experimentos, publicações e reprodutibilidade.",
    projetos: "Documentação técnica detalhada dos projetos em andamento: arquitetura, experimentos, dados e decisões de implementação."
  };

  function renderCardGrid(items, label = "Ler") {
    return (
      <div style={{
        display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: 18
      }}>
        {items.map(item => {
          const Icon = iconMap[item.icon] || FileText;
          return (
            <article key={item.id} style={{
              display: "flex", flexDirection: "column", padding: 24,
              borderRadius: "var(--radius)", border: "1px solid var(--line-soft)",
              background: "var(--surface)",
              transition: "border-color var(--transition), transform var(--transition)"
            }}>
              <div style={{
                display: "flex", alignItems: "center", justifyContent: "center",
                width: 44, height: 44, marginBottom: 16, borderRadius: 12,
                background: "var(--accent-soft)", color: "var(--accent)"
              }}>
                <Icon size={22} />
              </div>
              <h2 style={{ margin: "0 0 8px", fontSize: 17, fontWeight: 550 }}>{item.title}</h2>
              <p style={{ margin: "0 0 auto", color: "var(--muted)", fontSize: 12, lineHeight: 1.6 }}>
                {item.content.replace(/#+\s*/g, "").replace(/\*\*/g, "").split("\n").find(l => l.trim().length > 20)?.trim().slice(0, 120) || ""}
              </p>
              {item.updated && (
                <div style={{
                  display: "flex", alignItems: "center", gap: 8,
                  marginTop: 18, paddingTop: 14, borderTop: "1px solid var(--line-soft)",
                  color: "var(--muted-2)", fontSize: 10
                }}>
                  <Clock size={12} /> {item.updated} <span>·</span> {item.readTime} de leitura
                </div>
              )}
              <button onClick={() => openDoc(item.title, item.content)}
                style={{
                  display: "inline-flex", alignItems: "center", gap: 6,
                  marginTop: 16, padding: "9px 18px", border: 0,
                  borderRadius: "var(--radius-sm)", color: "#fff",
                  background: "var(--accent)", cursor: "pointer",
                  fontSize: 12, fontWeight: 550, alignSelf: "flex-start",
                  fontFamily: "var(--font-body)"
                }}>
                <BookOpen size={14} /> {label}
              </button>
            </article>
          );
        })}
      </div>
    );
  }

  function renderProjectsTab() {
    return (
      <div style={{
        display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: 18
      }}>
        {projectDocs.map(proj => {
          const ProjIcon = iconMap[proj.icon] || FolderOpen;
          return (
            <article key={proj.id} onClick={() => navigate(`/projetos/${proj.id}`)}
              style={{
                display: "flex", flexDirection: "column", padding: 24,
                borderRadius: "var(--radius)", border: "1px solid var(--line-soft)",
                background: "var(--surface)", cursor: "pointer",
                transition: "border-color var(--transition), transform var(--transition)"
              }}>
              <div style={{
                display: "flex", alignItems: "center", justifyContent: "center",
                width: 44, height: 44, marginBottom: 16, borderRadius: 12,
                background: "var(--accent-soft)", color: "var(--accent)"
              }}>
                <ProjIcon size={22} />
              </div>
              <h2 style={{ margin: "0 0 6px", fontSize: 17, fontWeight: 550 }}>{proj.title}</h2>
              <p style={{ margin: "0 0 auto", color: "var(--muted)", fontSize: 12, lineHeight: 1.6 }}>
                {proj.docs.length} documento{proj.docs.length > 1 ? "s" : ""} ·{' '}
                {proj.docs.map(d => d.category).filter((v, i, a) => a.indexOf(v) === i).join(", ")}
              </p>
              <div style={{
                display: "inline-flex", alignItems: "center", gap: 6,
                marginTop: 16, padding: "9px 18px", border: 0,
                borderRadius: "var(--radius-sm)", color: "#fff",
                background: "var(--accent)", cursor: "pointer",
                fontSize: 12, fontWeight: 550, alignSelf: "flex-start",
                fontFamily: "var(--font-body)"
              }}>
                <FolderOpen size={14} /> Abrir projeto
              </div>
            </article>
          );
        })}
      </div>
    );
  }

  return (
    <>
      <header style={{
        position: "sticky", top: 0, zIndex: 30, height: 66,
        display: "flex", alignItems: "center", gap: 18,
        padding: "0 clamp(20px, 4vw, 52px)",
        borderBottom: "1px solid rgba(52,51,45,.72)",
        background: "rgba(15,15,13,.82)", backdropFilter: "blur(18px)"
      }}>
        <button className="mobile-menu" onClick={() => setMenuOpen(true)}
          aria-label="Abrir navegação" style={{
            display: "none", padding: 6, border: 0, background: "none",
            cursor: "pointer", color: "var(--text)"
          }}>
          <Menu size={20} />
        </button>
        <div style={{ color: "var(--muted)", fontSize: 13 }}>
          <strong style={{
            color: "var(--text)", fontWeight: 550, fontFamily: "var(--font-heading)"
          }}>Documentação</strong>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 6, marginLeft: "auto" }}>
          <button onClick={() => showToast("Busca em desenvolvimento")}
            style={{
              display: "grid", placeItems: "center", width: 32, height: 32,
              border: 0, borderRadius: 9, color: "var(--muted)", background: "transparent",
              cursor: "pointer"
            }}>
            <Search size={18} />
          </button>
        </div>
      </header>

      <div style={{ padding: "36px clamp(20px, 4vw, 52px) 72px" }}>
        <div style={{ marginBottom: 32 }}>
          <div style={{
            marginBottom: 8, color: "var(--muted-2)", fontSize: 11,
            fontWeight: 700, letterSpacing: ".12em", textTransform: "uppercase"
          }}>Central de conhecimento</div>
          <h1 style={{
            margin: "0 0 10px", fontSize: "clamp(28px, 4vw, 36px)",
            fontWeight: 500, letterSpacing: "-.03em"
          }}><span className="gradient-text">Documentação.</span></h1>
          <p style={{
            maxWidth: 520, color: "var(--muted)", fontSize: 13, lineHeight: 1.7, margin: 0
          }}>{subtitles[activeTab]}</p>
        </div>

        <div style={{
          display: "flex", gap: 4, marginBottom: 28,
          padding: 4, borderRadius: "var(--radius-sm)",
          background: "var(--surface-2)", width: "fit-content"
        }}>
          {tabs.map(tab => {
            const TabIcon = tab.icon;
            return (
              <button key={tab.id} onClick={() => { setActiveTab(tab.id); setFilter("Todos"); }}
                style={{
                  display: "flex", alignItems: "center", gap: 7,
                  padding: "9px 18px", border: 0, borderRadius: 7,
                  background: activeTab === tab.id ? "var(--surface-3)" : "transparent",
                  color: activeTab === tab.id ? "var(--text)" : "var(--muted)",
                  cursor: "pointer", fontSize: 12, fontWeight: 550,
                  fontFamily: "var(--font-body)", transition: "all var(--transition)"
                }}>
                <TabIcon size={16} style={{ color: activeTab === tab.id ? "var(--accent)" : undefined }} />
                {tab.label}
              </button>
            );
          })}
        </div>

        {activeTab !== "projetos" && (
          <div style={{ display: "flex", gap: 6, marginBottom: 36, flexWrap: "wrap" }}>
            {currentCategories.map(cat => (
              <button key={cat} onClick={() => setFilter(cat)}
                style={{
                  padding: "8px 14px",
                  border: `1px solid ${filter === cat ? "var(--accent-border)" : "var(--line-soft)"}`,
                  borderRadius: 9999, color: filter === cat ? "var(--accent)" : "var(--muted)",
                  background: filter === cat ? "var(--accent-soft)" : "transparent",
                  cursor: "pointer", fontSize: 11, fontFamily: "var(--font-body)",
                  transition: "all var(--transition)"
                }}>{cat}</button>
            ))}
          </div>
        )}

        {activeTab === "guias" && renderCardGrid(filteredGuides, "Ler guia")}
        {activeTab === "pesquisa" && renderCardGrid(filteredResearch, "Abrir")}
        {activeTab === "projetos" && renderProjectsTab()}
      </div>

      <DocModal
        open={modalOpen}
        title={modalTitle}
        content={modalContent}
        onClose={() => setModalOpen(false)}
      />
    </>
  );
}
