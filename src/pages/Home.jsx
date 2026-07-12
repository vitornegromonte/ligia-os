import { useOutletContext, useNavigate } from "react-router-dom";
import { useState, useEffect } from "react";
import {
  Menu, Search, BarChart3, Kanban, Users, BookOpen, Award,
  ArrowUpRight
} from "lucide-react";
import { showToast } from "../utils/toast.js";
import { fetchProfiles } from "../services/profiles.js";
import { fetchProjectsWithMilestones } from "../services/projects.js";
import { useAuth } from "../contexts/AuthContext.jsx";

const features = [
  { to: "/dashboard", icon: BarChart3, title: "Dashboard", desc: "Métricas da equipe, distribuição por time, skills e indicadores de atividade." },
  { to: "/projetos", icon: Kanban, title: "Projetos", desc: "Acompanhe o andamento dos projetos de pesquisa e seus marcos." },
  { to: "/talentos", icon: Users, title: "Banco de Talentos", desc: "Perfil dos membros, skills, projetos e redes acadêmicas." },
  { to: "/docs", icon: BookOpen, title: "Documentação", desc: "Guias, referências de pesquisa e documentação técnica dos projetos." },
];

export default function Home() {
  const { menuOpen, setMenuOpen } = useOutletContext();
  const navigate = useNavigate();
  const { profile } = useAuth();
  const [stats, setStats] = useState([
    { value: 0, label: "Membros", color: "#6da87c" },
    { value: 0, label: "Projetos ativos", color: "#6b8eb3" },
    { value: 0, label: "Marcos", color: "#c4a358" },
    { value: 0, label: "Concluídos", color: "var(--muted)" },
  ]);

  useEffect(() => {
    document.title = "Ligia — Início";
    window.scrollTo({ top: 0 });
    loadData();
  }, []);

  async function loadData() {
    try {
      const [profiles, projects] = await Promise.all([
        fetchProfiles(),
        fetchProjectsWithMilestones(profile?.id, profile?.role),
      ]);
      const totalMilestones = projects.reduce((acc, p) => acc + (p.milestones?.length || 0), 0);
      const doneMilestones = projects.reduce(
        (acc, p) => acc + (p.milestones?.filter(m => m.status === "done").length || 0), 0
      );
      setStats([
        { value: profiles.length, label: "Membros", color: "#6da87c" },
        { value: projects.length, label: "Projetos ativos", color: "#6b8eb3" },
        { value: totalMilestones, label: "Marcos", color: "#c4a358" },
        { value: doneMilestones, label: "Concluídos", color: "var(--muted)" },
      ]);
    } catch (e) {
      console.warn("Home loadData error:", e.message);
    }
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
          }}>Início</strong>
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

      <div style={{ padding: "48px clamp(20px, 4vw, 52px) 72px" }}>
        <div style={{ marginBottom: 36 }}>
          <img src="/media/logo.svg" alt="Ligia"
            style={{ height: 40, width: "auto", marginBottom: 20 }} />
          <h1 style={{
            margin: "0 0 12px", fontSize: "clamp(32px, 5vw, 48px)",
            fontWeight: 500, letterSpacing: "-.03em", lineHeight: 1.15
          }}>
            <span className="gradient-text">Ligia OS</span>
          </h1>
          <p style={{
            maxWidth: 540, color: "var(--muted)", fontSize: 14, lineHeight: 1.7, margin: "0 0 24px"
          }}>
            Plataforma de gestão interna da Liga Acadêmica de Inteligência Artificial.
            Acompanhe projetos, talentos, documentação e certificados da comunidade.
          </p>
        </div>

        <div style={{
          display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 12, marginBottom: 36
        }}>
          {stats.map(stat => (
            <div key={stat.label} style={{
              padding: "18px 20px", borderRadius: "var(--radius)",
              border: "1px solid var(--line-soft)", background: "var(--surface)"
            }}>
              <div style={{
                fontSize: 30, fontWeight: 600, color: stat.color,
                fontFamily: "var(--font-heading)", lineHeight: 1
              }}>{stat.value}</div>
              <div style={{ color: "var(--muted-2)", fontSize: 11, marginTop: 5 }}>{stat.label}</div>
            </div>
          ))}
        </div>

        <div style={{
          display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 16
        }}>
          {features.map(f => (
            <article key={f.to} onClick={() => navigate(f.to)}
              style={{
                display: "flex", flexDirection: "column",
                padding: 24, borderRadius: "var(--radius)",
                border: "1px solid var(--line-soft)",
                background: "var(--surface)", cursor: "pointer",
                transition: "border-color var(--transition)"
              }}>
              <div style={{
                display: "grid", placeItems: "center",
                width: 42, height: 42, marginBottom: 14, borderRadius: 11,
                background: "var(--accent-soft)", color: "var(--accent)"
              }}>
                <f.icon size={20} />
              </div>
              <h2 style={{ margin: "0 0 6px", fontSize: 16, fontWeight: 550 }}>{f.title}</h2>
              <p style={{ margin: "0 0 auto", color: "var(--muted)", fontSize: 12, lineHeight: 1.6 }}>
                {f.desc}
              </p>
              <div style={{
                display: "inline-flex", alignItems: "center", gap: 5,
                marginTop: 16, color: "var(--accent)", fontSize: 12, fontWeight: 550
              }}>
                Acessar <ArrowUpRight size={13} />
              </div>
            </article>
          ))}
        </div>

        <div style={{
          marginTop: 40, padding: 24, borderRadius: "var(--radius)",
          border: "1px solid var(--line-soft)", background: "var(--surface)",
          display: "flex", alignItems: "center", justifyContent: "space-between",
          flexWrap: "wrap", gap: 16
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <div style={{
              display: "grid", placeItems: "center", width: 40, height: 40,
              borderRadius: 10, background: "var(--accent-soft)", color: "var(--accent)"
            }}>
              <Award size={19} />
            </div>
            <div>
              <div style={{ fontSize: 14, fontWeight: 550 }}>Certificados</div>
              <div style={{ color: "var(--muted-2)", fontSize: 11 }}>
                Gere e exporte certificados de participação
              </div>
            </div>
          </div>
          <button onClick={() => navigate("/certificados")}
            style={{
              display: "inline-flex", alignItems: "center", gap: 6,
              padding: "10px 20px", border: "1px solid var(--line-soft)",
              borderRadius: "var(--radius-sm)", color: "var(--text)",
              background: "transparent", cursor: "pointer",
              fontSize: 12, fontWeight: 550, fontFamily: "var(--font-body)"
            }}>
            Acessar <ArrowUpRight size={14} />
          </button>
        </div>
      </div>
    </>
  );
}
