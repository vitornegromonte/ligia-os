import { useState } from "react";
import { NavLink } from "react-router-dom";
import {
  Users, BookOpen, Award, Blocks, Sparkles, ChevronsUpDown, BarChart3, Kanban, House, LogOut, Settings,
  Sun, CalendarDays, StickyNote, Globe, Code2
} from "lucide-react";
import { useAuth } from "../contexts/AuthContext.jsx";
import ProfileEdit from "./ProfileEdit.jsx";

const navGroups = [
  {
    label: "Dia a dia",
    items: [
      { to: "/dia", icon: Sun, label: "Meu Dia" },
      { to: "/agenda", icon: CalendarDays, label: "Agenda" },
      { to: "/notas", icon: StickyNote, label: "Notas" },
    ]
  },
  {
    label: "Navegação",
    items: [
      { to: "/inicio", icon: House, label: "Início" },
      { to: "/dashboard", icon: BarChart3, label: "Dashboard" },
      { to: "/projetos", icon: Kanban, label: "Projetos" },
      { to: "/docs", icon: BookOpen, label: "Documentação" },
      { to: "/membros", icon: Users, label: "Membros" },
    ]
  },
  {
    label: "Ferramentas",
    items: [
      { to: "/certificados", icon: Award, label: "Certificados" },
    ]
  },
  {
    label: "Aprender",
    roles: ["membro", "admin"],
    items: [
      { to: "/pratica", icon: Code2, label: "Prática Torch" },
    ]
  },
  {
    label: "Liga",
    items: [
      { to: "/", icon: Globe, label: "Site da Ligia" },
    ]
  }
];

export default function Sidebar({ open, onClose }) {
  const { profile, signOut } = useAuth();
  const [profileEditOpen, setProfileEditOpen] = useState(false);
  return (
    <>
      <ProfileEdit open={profileEditOpen} onClose={() => setProfileEditOpen(false)} />
      {open && <div className="mobile-overlay" onClick={onClose} style={{
        position: "fixed", inset: 0, zIndex: 35,
        background: "rgba(0,0,0,.55)",
        overscrollBehavior: "contain"
      }} />}
      <aside aria-label="Navegação principal" className="sidebar" style={{
        position: "fixed", inset: "0 auto 0 0", zIndex: 40,
        width: "var(--sidebar-width)", display: "flex",
        flexDirection: "column",
        borderRight: "1px solid var(--line-soft)",
        background: "rgba(20,18,14,.92)",
        backdropFilter: "blur(18px)",
        overscrollBehavior: "contain",
        transform: open ? "translateX(0)" : undefined,
        transition: "transform .25s ease"
      }}>
        <div className="gradient-bar" style={{ width: "100%", height: 2, flex: "0 0 auto" }} />
        <NavLink to="/dashboard" className="brand" style={{
          display: "flex", alignItems: "center", gap: 12,
          height: 78, padding: "0 22px", textDecoration: "none", color: "inherit"
        }}>
          <img src="/media/logo.svg" alt="Ligia" width="32" height="32"
            style={{ height: 32, width: "auto", flex: "0 0 auto" }} />
          <div style={{
            fontFamily: "var(--font-heading)", fontSize: 18,
            fontWeight: 600, letterSpacing: "-.02em"
          }}>Ligia&thinsp;<span style={{ color: "var(--muted)", fontWeight: 450 }}>OS</span></div>
        </NavLink>

        {navGroups.filter(g => !g.roles || g.roles.includes(profile?.role)).map(group => (
          <div key={group.label}>
            <div className="nav-label" style={{
              padding: "12px 22px 7px", color: "var(--muted-2)",
              fontSize: 10, fontWeight: 700, letterSpacing: ".12em",
              textTransform: "uppercase", fontFamily: "var(--font-body)"
            }}>{group.label}</div>
            <nav className="nav" style={{ padding: "0 10px" }}>
              {group.items.map(item => (
                <NavLink key={item.to} to={item.to} end={item.to === "/"}
                  onClick={onClose}
                  className={({ isActive }) => `nav-item${isActive ? " active" : ""}`}
                  style={{
                    width: "100%", display: "flex", alignItems: "center", gap: 11,
                    margin: "2px 0", padding: "10px 12px", border: 0,
                    borderRadius: 9, background: "transparent", cursor: "pointer",
                    textAlign: "left", fontFamily: "var(--font-body)",
                    textDecoration: "none", color: "var(--muted)",
                    transition: "color var(--transition), background var(--transition)"
                  }}>
                  <item.icon size={17} strokeWidth={1.7} aria-hidden="true" />
                  {item.label}
                </NavLink>
              ))}
            </nav>
          </div>
        ))}

        <div style={{ marginTop: "auto", padding: "14px 12px 18px" }}>
          {profile && (
            <div style={{
              display: "flex", alignItems: "center", gap: 10,
              padding: 11, border: "1px solid var(--line-soft)",
              borderRadius: 12, background: "rgba(255,255,255,.018)"
            }}>
              <button aria-label="Abrir edição de perfil" onClick={() => setProfileEditOpen(true)}
                style={{ display: "contents", cursor: "pointer", background: "none", border: "none", padding: 0 }}>
                <div style={{
                  width: 32, height: 32, display: "grid", flex: "0 0 auto",
                  placeItems: "center", borderRadius: 9, overflow: "hidden",
                  color: "#17140f", background: profile.avatar_url ? "var(--surface-2)" : (profile.color || "#e7c8a6"),
                  fontWeight: 750, fontSize: 11, fontFamily: "var(--font-heading)",
                  border: profile.avatar_url ? "1px solid var(--line-soft)" : "none"
                }}>
                  {profile.avatar_url ? (
                    <img src={profile.avatar_url} alt={profile.name || "Avatar"} width="32" height="32" style={{ width: "100%", height: "100%", objectFit: "cover" }}
                      onError={e => { e.currentTarget.style.display = "none"; }} />
                  ) : (
                    profile.initials || profile.name?.slice(0, 2).toUpperCase() || "??"
                  )}
                </div>
                <div style={{ minWidth: 0, flex: 1, textAlign: "left" }}>
                  <div className="workspace-name" style={{
                    overflow: "hidden", color: "var(--text)", fontSize: 12,
                    fontWeight: 600, textOverflow: "ellipsis",
                    whiteSpace: "nowrap", fontFamily: "var(--font-body)"
                  }}>{profile.name || "Usuário"}</div>
                  <div style={{ color: "var(--muted-2)", fontSize: 11, textTransform: "capitalize" }}>{profile.role}</div>
                </div>
              </button>
              <button aria-label="Editar perfil" onClick={() => setProfileEditOpen(true)} title="Editar perfil" style={{
                background: "none", border: "none", cursor: "pointer",
                color: "var(--muted)", padding: 4,
                display: "grid", placeItems: "center",
                borderRadius: 6, flexShrink: 0
              }}>
                <Settings size={14} aria-hidden="true" />
              </button>
              <button aria-label="Sair" onClick={signOut} title="Sair" style={{
                background: "none", border: "none", cursor: "pointer",
                color: "var(--muted)", padding: 4,
                display: "grid", placeItems: "center",
                borderRadius: 6, flexShrink: 0
              }}>
                <LogOut size={15} aria-hidden="true" />
              </button>
            </div>
          )}
        </div>
      </aside>
    </>
  );
}
