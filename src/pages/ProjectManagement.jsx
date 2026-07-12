import { useOutletContext, useNavigate } from "react-router-dom";
import { useState, useEffect } from "react";
import {
  Menu, Search, List, Columns3, Circle, CheckCircle2, Clock,
  Users, ArrowUpRight
} from "lucide-react";
import { showToast } from "../utils/toast.js";
import projects from "../data/projects.js";

const statusConfig = {
  done: { icon: CheckCircle2, color: "#6da87c", bg: "rgba(109,168,124,.15)", label: "Concluído" },
  in_progress: { icon: Clock, color: "#c4a358", bg: "rgba(196,163,88,.15)", label: "Em andamento" },
  todo: { icon: Circle, color: "var(--muted-2)", bg: "transparent", label: "A fazer" },
};

const peopleMap = {
  1: { name: "Amara Oliveira", initials: "AO", color: "#b7c2d2" },
  2: { name: "Jonas Almeida", initials: "JA", color: "#c6b6d1" },
  3: { name: "Sofia Martins", initials: "SM", color: "#d1ba9e" },
  4: { name: "Elena Costa", initials: "EC", color: "#aebfba" },
  5: { name: "Theo Santos", initials: "TS", color: "#c6b6d1" },
  6: { name: "Maya Singh", initials: "MS", color: "#b7c2d2" },
  7: { name: "Noah Pereira", initials: "NP", color: "#d1ba9e" },
  8: { name: "Priya Patel", initials: "PP", color: "#aebfba" },
};

const boardColumns = [
  { status: "todo", label: "A fazer", color: "var(--muted-2)" },
  { status: "in_progress", label: "Em andamento", color: "#c4a358" },
  { status: "done", label: "Concluído", color: "#6da87c" },
];

export default function ProjectManagement() {
  const { menuOpen, setMenuOpen } = useOutletContext();
  const navigate = useNavigate();
  const [view, setView] = useState("timeline");

  useEffect(() => { document.title = "Ligia — Projetos"; window.scrollTo({ top: 0 }); }, []);

  const allMilestones = projects.flatMap(p =>
    p.milestones.map(m => ({ ...m, projectId: p.id, projectName: p.name, projectColor: p.color }))
  );

  const stats = {
    total: allMilestones.length,
    done: allMilestones.filter(m => m.status === "done").length,
    inProgress: allMilestones.filter(m => m.status === "in_progress").length,
    todo: allMilestones.filter(m => m.status === "todo").length,
  };

  const projectProgress = (milestones) => {
    if (!milestones.length) return 0;
    return Math.round((milestones.filter(m => m.status === "done").length / milestones.length) * 100);
  };

  function renderMemberAvatars(memberIds) {
    return (
      <div style={{ display: "flex", gap: 3 }}>
        {memberIds.map(id => {
          const p = peopleMap[id];
          if (!p) return null;
          return (
            <div key={id} title={p.name}
              style={{
                width: 22, height: 22, borderRadius: "50%",
                display: "grid", placeItems: "center",
                background: p.color, color: "#0f0f0d",
                fontSize: 9, fontWeight: 700,
                fontFamily: "var(--font-heading)"
              }}>
              {p.initials}
            </div>
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
          Ligia &nbsp;/&nbsp; <strong style={{
            color: "var(--text)", fontWeight: 550, fontFamily: "var(--font-heading)"
          }}>Projetos</strong>
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
        <div style={{ marginBottom: 28 }}>
          <div style={{
            marginBottom: 8, color: "var(--muted-2)", fontSize: 11,
            fontWeight: 700, letterSpacing: ".12em", textTransform: "uppercase"
          }}>Gestão de projetos</div>
          <h1 style={{
            margin: "0 0 10px", fontSize: "clamp(28px, 4vw, 36px)",
            fontWeight: 500, letterSpacing: "-.03em"
          }}><span className="gradient-text">Projetos de Pesquisa.</span></h1>
          <p style={{
            maxWidth: 560, color: "var(--muted)", fontSize: 13, lineHeight: 1.7, margin: 0
          }}>Acompanhe o progresso dos projetos em andamento, seus marcos e responsáveis.</p>
        </div>

        <div style={{
          display: "flex", gap: 12, marginBottom: 28, flexWrap: "wrap", alignItems: "center"
        }}>
          <div style={{
            display: "flex", gap: 4, padding: 4, borderRadius: "var(--radius-sm)",
            background: "var(--surface-2)", width: "fit-content"
          }}>
            <button onClick={() => setView("timeline")}
              style={{
                display: "flex", alignItems: "center", gap: 7,
                padding: "9px 16px", border: 0, borderRadius: 7,
                background: view === "timeline" ? "var(--surface-3)" : "transparent",
                color: view === "timeline" ? "var(--text)" : "var(--muted)",
                cursor: "pointer", fontSize: 12, fontWeight: 550,
                fontFamily: "var(--font-body)", transition: "all var(--transition)"
              }}>
              <List size={16} /> Timeline
            </button>
            <button onClick={() => setView("board")}
              style={{
                display: "flex", alignItems: "center", gap: 7,
                padding: "9px 16px", border: 0, borderRadius: 7,
                background: view === "board" ? "var(--surface-3)" : "transparent",
                color: view === "board" ? "var(--text)" : "var(--muted)",
                cursor: "pointer", fontSize: 12, fontWeight: 550,
                fontFamily: "var(--font-body)", transition: "all var(--transition)"
              }}>
              <Columns3 size={16} /> Board
            </button>
          </div>
        </div>

        <div style={{
          display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 12, marginBottom: 32
        }}>
          {[
            { label: "Total de marcos", value: stats.total, color: "var(--text)" },
            { label: "Concluídos", value: stats.done, color: "#6da87c" },
            { label: "Em andamento", value: stats.inProgress, color: "#c4a358" },
            { label: "A fazer", value: stats.todo, color: "var(--muted-2)" },
          ].map(stat => (
            <div key={stat.label} style={{
              padding: "16px 20px", borderRadius: "var(--radius)",
              border: "1px solid var(--line-soft)", background: "var(--surface)"
            }}>
              <div style={{ fontSize: 28, fontWeight: 600, color: stat.color, fontFamily: "var(--font-heading)", lineHeight: 1 }}>
                {stat.value}
              </div>
              <div style={{ color: "var(--muted-2)", fontSize: 11, marginTop: 4 }}>{stat.label}</div>
            </div>
          ))}
        </div>

        {view === "timeline" ? (
          <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
            {projects.map(project => {
              const progress = projectProgress(project.milestones);
              return (
                <div key={project.id} style={{
                  borderRadius: "var(--radius)",
                  border: "1px solid var(--line-soft)", background: "var(--surface)",
                  overflow: "hidden"
                }}>
                  <div style={{
                    display: "flex", alignItems: "center", gap: 14,
                    padding: "18px 22px", cursor: "pointer",
                    borderBottom: "1px solid var(--line-soft)",
                    background: "var(--surface-2)"
                  }}
                    onClick={() => navigate(`/projetos/${project.id}`)}>
                    <div style={{
                      width: 10, height: 10, borderRadius: "50%",
                      background: project.color, flexShrink: 0
                    }} />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{
                        fontSize: 15, fontWeight: 550,
                        color: "var(--text)", fontFamily: "var(--font-heading)"
                      }}>{project.name}</div>
                      <div style={{
                        color: "var(--muted-2)", fontSize: 11, marginTop: 2
                      }}>{project.description}</div>
                    </div>
                    <div style={{
                      display: "flex", alignItems: "center", gap: 12, flexShrink: 0
                    }}>
                      {renderMemberAvatars(project.members)}
                      <div style={{ textAlign: "right" }}>
                        <div style={{
                          fontSize: 13, fontWeight: 600, color: "var(--text)",
                          fontFamily: "var(--font-heading)"
                        }}>{progress}%</div>
                        <div style={{
                          width: 60, height: 4, borderRadius: 4, marginTop: 4,
                          background: "var(--surface-3)", overflow: "hidden"
                        }}>
                          <div style={{
                            width: `${progress}%`, height: "100%",
                            borderRadius: 4, background: project.color,
                            transition: "width .4s ease"
                          }} />
                        </div>
                      </div>
                      <ArrowUpRight size={15} style={{ color: "var(--muted-2)" }} />
                    </div>
                  </div>

                  <div style={{ padding: "6px 0" }}>
                    {project.milestones.map((ms, idx) => {
                      const conf = statusConfig[ms.status];
                      const Icon = conf.icon;
                      return (
                        <div key={ms.id} style={{
                          display: "flex", alignItems: "center", gap: 12,
                          padding: "10px 22px", borderTop: idx > 0 ? "1px solid var(--line-soft)" : "none",
                          opacity: ms.status === "todo" ? 0.55 : 1,
                          transition: "opacity var(--transition)"
                        }}>
                          <Icon size={16} style={{ color: conf.color, flexShrink: 0 }} />
                          <div style={{ fontSize: 13, color: "var(--text)", flex: 1 }}>{ms.name}</div>
                          {renderMemberAvatars(ms.members)}
                          <div style={{
                            fontSize: 10, flexShrink: 0,
                            padding: "3px 8px", borderRadius: 9999,
                            background: conf.bg, color: conf.color, fontWeight: 600
                          }}>{conf.label}</div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div style={{
            display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 16,
            alignItems: "start"
          }}>
            {boardColumns.map(col => {
              const colMilestones = allMilestones.filter(m => m.status === col.status);
              return (
                <div key={col.status} style={{
                  borderRadius: "var(--radius)",
                  border: "1px solid var(--line-soft)", background: "var(--surface)",
                  overflow: "hidden"
                }}>
                  <div style={{
                    display: "flex", alignItems: "center", gap: 8,
                    padding: "14px 18px",
                    borderBottom: "1px solid var(--line-soft)",
                    background: "var(--surface-2)"
                  }}>
                    <div style={{
                      width: 8, height: 8, borderRadius: "50%",
                      background: col.color
                    }} />
                    <div style={{ fontSize: 13, fontWeight: 550, color: "var(--text)" }}>
                      {col.label}
                    </div>
                    <div style={{
                      marginLeft: "auto", fontSize: 11, color: "var(--muted-2)",
                      background: "var(--surface-3)", padding: "1px 8px",
                      borderRadius: 9999, fontWeight: 600
                    }}>{colMilestones.length}</div>
                  </div>
                  <div style={{ padding: 10, display: "flex", flexDirection: "column", gap: 8 }}>
                    {colMilestones.length === 0 ? (
                      <div style={{
                        padding: "24px 16px", textAlign: "center",
                        color: "var(--muted-2)", fontSize: 12
                      }}>Nenhum marco</div>
                    ) : colMilestones.map(ms => (
                      <div key={`${ms.projectId}-${ms.id}`} style={{
                        padding: "14px 16px", borderRadius: "var(--radius-sm)",
                        border: "1px solid var(--line-soft)",
                        background: "var(--surface-2)"
                      }}>
                        <div style={{ fontSize: 12, fontWeight: 550, color: "var(--text)", marginBottom: 6 }}>
                          {ms.name}
                        </div>
                        <div style={{
                          fontSize: 10, color: ms.projectColor, fontWeight: 600, marginBottom: 8
                        }}>{ms.projectName}</div>
                        {renderMemberAvatars(ms.members)}
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </>
  );
}
