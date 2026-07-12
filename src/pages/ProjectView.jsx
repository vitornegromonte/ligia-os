import { useOutletContext, useParams, useNavigate } from "react-router-dom";
import { useState, useEffect, useMemo } from "react";
import { Menu, ChevronRight, FolderOpen, BookOpen } from "lucide-react";
import { projectDocs } from "../data/docs.js";
import { marked } from "marked";

marked.setOptions({ breaks: true, gfm: true });

const iconMap = {
  DoorOpen: "DoorOpen", CalendarPlus: "CalendarPlus", Palette: "Palette",
  Backpack: "Backpack", GitBranch: "GitBranch", Server: "Server",
  FlaskConical: "FlaskConical", ScrollText: "ScrollText", BookMarked: "BookMarked",
  Layers: "Layers", Quote: "Quote", ListChecks: "ListChecks",
  Microscope: "Microscope", Beaker: "Beaker", Bot: "Bot", Sparkles: "Sparkles",
  Globe: "Globe", Cpu: "Cpu"
};

const categoryLabels = {
  "infraestrutura": "Infraestrutura",
  "experimentos": "Experimentos",
  "dados": "Dados",
  "desenvolvimento": "Desenvolvimento",
  "UX": "UX",
  "métricas": "Métricas",
  "referências": "Referências",
  "geral": "Geral"
};

export default function ProjectView() {
  const { menuOpen, setMenuOpen } = useOutletContext();
  const { projectId, docId } = useParams();
  const navigate = useNavigate();
  const [selectedDocId, setSelectedDocId] = useState(docId || null);

  const project = useMemo(
    () => projectDocs.find(p => p.id === projectId),
    [projectId]
  );

  const selectedDoc = useMemo(
    () => project?.docs.find(d => d.id === selectedDocId) || project?.docs[0] || null,
    [project, selectedDocId]
  );

  useEffect(() => {
    if (project) {
      document.title = `Ligia — ${project.title}`;
      window.scrollTo({ top: 0 });
    }
  }, [project]);

  useEffect(() => {
    if (project && !selectedDocId) {
      setSelectedDocId(project.docs[0]?.id);
    }
  }, [project, selectedDocId]);

  useEffect(() => {
    if (docId) setSelectedDocId(docId);
  }, [docId]);

  if (!project) {
    return (
      <div style={{
        display: "flex", flexDirection: "column", alignItems: "center",
        justifyContent: "center", height: "100vh", gap: 16,
        color: "var(--muted-2)", fontSize: 14
      }}>
        <FolderOpen size={40} />
        <div>Projeto não encontrado</div>
        <button onClick={() => navigate("/docs")}
          style={{
            padding: "10px 22px", border: 0, borderRadius: "var(--radius-sm)",
            color: "#fff", background: "var(--accent)", cursor: "pointer",
            fontSize: 13, fontWeight: 550, fontFamily: "var(--font-body)"
          }}>
          Voltar para Documentação
        </button>
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
        <div style={{ color: "var(--muted)", fontSize: 13, display: "flex", alignItems: "center", gap: 6 }}>
          <span style={{
            color: "var(--text)", fontWeight: 550, fontFamily: "var(--font-heading)"
          }}>{project.title}</span>
        </div>
      </header>

      <div style={{ padding: "32px clamp(20px, 4vw, 52px) 72px" }}>
        <button onClick={() => navigate("/docs")}
          style={{
            display: "inline-flex", alignItems: "center", gap: 6,
            marginBottom: 20, padding: "8px 16px",
            border: "1px solid var(--line-soft)", borderRadius: "var(--radius-sm)",
            background: "transparent", color: "var(--muted)", cursor: "pointer",
            fontSize: 12, fontFamily: "var(--font-body)"
          }}>
          <ChevronRight size={14} style={{ transform: "rotate(180deg)" }} />
          Voltar
        </button>
        <div style={{
          borderRadius: "var(--radius)",
          border: "1px solid var(--line-soft)", background: "var(--surface)",
          overflow: "hidden"
        }}>
          <div style={{
            display: "flex", alignItems: "center", gap: 14,
            padding: "20px 24px",
            borderBottom: "1px solid var(--line-soft)",
            background: "var(--surface-2)"
          }}>
            <div style={{
              display: "grid", placeItems: "center", width: 44, height: 44,
              borderRadius: 12, background: "var(--accent-soft)", color: "var(--accent)"
            }}>
              <BookOpen size={22} />
            </div>
            <div>
              <div style={{ fontSize: 17, fontWeight: 550 }}>{project.title}</div>
              <div style={{ color: "var(--muted-2)", fontSize: 11 }}>
                {project.docs.length} documento{project.docs.length > 1 ? "s" : ""}
              </div>
            </div>
          </div>

          <div style={{
            display: "flex", gap: 2, padding: "10px 10px 0",
            borderBottom: "1px solid var(--line-soft)",
            background: "var(--surface-2)", overflowX: "auto"
          }}>
            {project.docs.map(doc => {
              const isActive = doc.id === selectedDocId;
              return (
                <button key={doc.id} onClick={() => setSelectedDocId(doc.id)}
                  style={{
                    display: "inline-flex", alignItems: "center", gap: 6,
                    padding: "8px 14px", border: 0, cursor: "pointer",
                    borderTopLeftRadius: 8, borderTopRightRadius: 8,
                    background: isActive ? "var(--surface)" : "transparent",
                    color: isActive ? "var(--text)" : "var(--muted)",
                    fontFamily: "var(--font-body)", fontSize: 11,
                    fontWeight: isActive ? 550 : 400,
                    whiteSpace: "nowrap", transition: "all var(--transition)"
                  }}>
                  {doc.title}
                </button>
              );
            })}
          </div>

          <div style={{ padding: 28 }}>
            {selectedDoc && (
                <div className="proj-content" style={{ color: "var(--text)", fontSize: 14, lineHeight: 1.75 }}>
                  <style>{`
                    .proj-content h1 { font-family: var(--font-heading); font-size: 26px; font-weight: 550; margin: 0 0 16px; letter-spacing: -.02em; color: #fff; line-height: 1.25; }
                    .proj-content h2 { font-family: var(--font-heading); font-size: 20px; font-weight: 550; margin: 28px 0 10px; letter-spacing: -.01em; color: var(--text); }
                    .proj-content h3 { font-family: var(--font-heading); font-size: 16px; font-weight: 550; margin: 22px 0 8px; color: var(--text); }
                    .proj-content p { margin: 0 0 14px; color: #d4d1c8; }
                    .proj-content ul, .proj-content ol { margin: 0 0 14px; padding-left: 22px; color: #d4d1c8; }
                    .proj-content li { margin-bottom: 5px; }
                    .proj-content strong { color: var(--text); font-weight: 600; }
                    .proj-content code { background: var(--surface-2); padding: 2px 7px; border-radius: 5px; font-size: 12px; color: var(--accent); }
                    .proj-content pre { background: var(--surface-2); padding: 16px; border-radius: var(--radius-sm); overflow-x: auto; margin: 0 0 14px; border: 1px solid var(--line-soft); }
                    .proj-content pre code { background: none; padding: 0; color: var(--text); font-size: 12px; }
                    .proj-content blockquote { margin: 0 0 14px; padding: 12px 16px; border-left: 3px solid var(--accent); background: var(--accent-soft); border-radius: 0 var(--radius-sm) var(--radius-sm) 0; color: var(--muted); font-style: italic; }
                    .proj-content table { width: 100%; border-collapse: collapse; margin: 0 0 14px; font-size: 12px; }
                    .proj-content th, .proj-content td { padding: 8px 12px; border: 1px solid var(--line-soft); text-align: left; }
                    .proj-content th { background: var(--surface-2); color: var(--text); font-weight: 600; }
                    .proj-content td { color: #d4d1c8; }
                  `}</style>
                  <div dangerouslySetInnerHTML={{ __html: marked.parse(selectedDoc.content) }} />
                </div>
              )}
          </div>
        </div>
      </div>
    </>
  );
}
