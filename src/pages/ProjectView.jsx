import { useOutletContext, useParams, useNavigate } from "react-router-dom";
import { useState, useEffect, useMemo } from "react";
import { Menu, ChevronRight, FolderOpen, BookOpen, Users, X, UserPlus } from "lucide-react";
import { fetchProjectDocs } from "../services/docs.js";
import { fetchProfiles } from "../services/profiles.js";
import { fetchProjectsWithMilestones, assignProjectMember, removeProjectMember } from "../services/projects.js";
import { useAuth } from "../contexts/AuthContext.jsx";
import { showToast } from "../utils/toast.js";
import { marked } from "marked";

marked.setOptions({ breaks: true, gfm: true });

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
  const [projectDocs, setProjectDocs] = useState([]);
  const [profiles, setProfiles] = useState([]);
  const [members, setMembers] = useState([]);
  const [pickerOpen, setPickerOpen] = useState(false);
  const { profile } = useAuth();

  useEffect(() => {
    fetchProjectDocs().then(setProjectDocs);
    fetchProfiles().then(setProfiles);
  }, []);

  useEffect(() => {
    if (!projectId) return;
    fetchProjectsWithMilestones(profile?.id, profile?.role)
      .then(projects => {
        const proj = projects.find(p => p.id === projectId);
        setMembers(proj?.members || []);
      })
      .catch(() => {});
  }, [projectId, profile?.id, profile?.role]);

  const project = useMemo(
    () => projectDocs.find(p => p.id === projectId),
    [projectDocs, projectId]
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

  async function handleAddMember(profileId) {
    try {
      await assignProjectMember(projectId, profileId);
      setMembers(prev => prev.includes(profileId) ? prev : [...prev, profileId]);
      setPickerOpen(false);
      showToast("Membro adicionado ao projeto");
    } catch (err) {
      showToast("Erro: " + err.message);
    }
  }

  async function handleRemoveMember(profileId) {
    try {
      await removeProjectMember(projectId, profileId);
      setMembers(prev => prev.filter(m => m !== profileId));
      showToast("Membro removido do projeto");
    } catch (err) {
      showToast("Erro: " + err.message);
    }
  }

  const canManageMembers = profile?.role === "admin" || profile?.role === "membro";
  const memberProfiles = profiles.filter(p => members.includes(p.id));
  const availableProfiles = profiles.filter(p => !members.includes(p.id) && p.id !== profile?.id);

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

          <div style={{
            padding: "20px 24px", borderTop: "1px solid var(--line-soft)",
            background: "var(--surface-2)"
          }}>
            <div style={{
              display: "flex", alignItems: "center", gap: 8, marginBottom: 14
            }}>
              <Users size={15} style={{ color: "var(--accent)" }} />
              <span style={{ fontSize: 13, fontWeight: 600, color: "var(--text)" }}>
                Membros ({memberProfiles.length})
              </span>
              {canManageMembers && (
                <button onClick={() => setPickerOpen(!pickerOpen)}
                  style={{
                    display: "inline-flex", alignItems: "center", gap: 6,
                    marginLeft: "auto", padding: "7px 12px", border: 0, borderRadius: 8,
                    color: "#fff", background: "var(--accent)", cursor: "pointer",
                    fontSize: 11, fontWeight: 600, fontFamily: "var(--font-body)"
                  }}>
                  <UserPlus size={13} /> Adicionar
                </button>
              )}
            </div>

            {pickerOpen && canManageMembers && (
              <div style={{
                marginBottom: 14, padding: 12, border: "1px solid var(--line-soft)",
                borderRadius: 10, background: "var(--surface)"
              }}>
                <div style={{
                  display: "flex", flexDirection: "column", gap: 4, maxHeight: 200, overflowY: "auto"
                }}>
                  {availableProfiles.length === 0 ? (
                    <span style={{ fontSize: 12, color: "var(--muted-2)" }}>Nenhum membro disponível.</span>
                  ) : availableProfiles.map(p => (
                    <button key={p.id} onClick={() => handleAddMember(p.id)}
                      style={{
                        display: "flex", alignItems: "center", gap: 10,
                        padding: "8px 10px", border: 0, borderRadius: 8,
                        background: "transparent", cursor: "pointer", textAlign: "left",
                        transition: "background var(--transition)"
                      }}>
                      <div style={{
                        width: 26, height: 26, borderRadius: 7, display: "grid", placeItems: "center",
                        background: p.color || "#b7c2d2", color: "#0f0f0d",
                        fontSize: 9, fontWeight: 700, fontFamily: "var(--font-heading)", flexShrink: 0
                      }}>{p.initials || p.name?.slice(0, 2).toUpperCase() || "??"}</div>
                      <span style={{ fontSize: 12, color: "var(--text)" }}>{p.name}</span>
                      <span style={{ marginLeft: "auto", fontSize: 10, color: "var(--muted-2)" }}>{p.team || p.affiliation || ""}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}

            <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
              {memberProfiles.length === 0 ? (
                <span style={{ fontSize: 12, color: "var(--muted-2)" }}>Nenhum membro alocado ainda.</span>
              ) : memberProfiles.map(p => (
                <div key={p.id} style={{
                  display: "flex", alignItems: "center", gap: 8,
                  padding: "6px 10px 6px 6px", borderRadius: 9,
                  border: "1px solid var(--line-soft)", background: "var(--surface)"
                }}>
                  <div style={{
                    width: 26, height: 26, borderRadius: 7, display: "grid", placeItems: "center",
                    background: p.color || "#b7c2d2", color: "#0f0f0d",
                    fontSize: 9, fontWeight: 700, fontFamily: "var(--font-heading)"
                  }}>{p.initials || p.name?.slice(0, 2).toUpperCase() || "??"}</div>
                  <span style={{ fontSize: 12, color: "var(--text)", fontWeight: 550 }}>{p.name}</span>
                  {canManageMembers && p.id !== profile?.id && (
                    <button onClick={() => handleRemoveMember(p.id)} title="Remover"
                      style={{
                        display: "grid", placeItems: "center", width: 22, height: 22,
                        border: 0, borderRadius: 6, color: "var(--muted-2)",
                        background: "transparent", cursor: "pointer"
                      }}>
                      <X size={12} />
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
