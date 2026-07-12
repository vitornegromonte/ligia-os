import { NavLink } from "react-router-dom";
import {
  Users, BookOpen, Award, Blocks, Sparkles, ChevronsUpDown, BarChart3, Kanban, House
} from "lucide-react";

const navGroups = [
  {
    label: "Navegação",
    items: [
      { to: "/", icon: House, label: "Início" },
      { to: "/dashboard", icon: BarChart3, label: "Dashboard" },
      { to: "/projetos", icon: Kanban, label: "Projetos" },
      { to: "/docs", icon: BookOpen, label: "Documentação" },
      { to: "/talentos", icon: Users, label: "Banco de Talentos" },
    ]
  },
  {
    label: "Ferramentas",
    items: [
      { to: "/certificados", icon: Award, label: "Certificados" },
    ]
  }
];

export default function Sidebar({ open, onClose }) {
  return (
    <>
      {open && <div className="mobile-overlay" onClick={onClose} style={{
        position: "fixed", inset: 0, zIndex: 35,
        background: "rgba(0,0,0,.55)"
      }} />}
      <aside className="sidebar" style={{
        position: "fixed", inset: "0 auto 0 0", zIndex: 40,
        width: "var(--sidebar-width)", display: "flex",
        flexDirection: "column",
        borderRight: "1px solid var(--line-soft)",
        background: "rgba(20,20,17,.92)",
        backdropFilter: "blur(18px)",
        transform: open ? "translateX(0)" : undefined,
        transition: "transform .25s ease"
      }}>
        <NavLink to="/dashboard" className="brand" style={{
          display: "flex", alignItems: "center", gap: 12,
          height: 78, padding: "0 22px", textDecoration: "none", color: "inherit"
        }}>
          <img src="/media/Varia%C3%A7%C3%A3o%3DLogotipo_colorido.png" alt="Ligia"
            style={{ height: 32, width: "auto", flex: "0 0 auto" }} />
          <div style={{
            fontFamily: "var(--font-heading)", fontSize: 18,
            fontWeight: 600, letterSpacing: "-.02em"
          }}>Ligia&thinsp;<span style={{ color: "var(--muted)", fontWeight: 450 }}>OS</span></div>
        </NavLink>

        {navGroups.map(group => (
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
                  <item.icon size={17} strokeWidth={1.7} />
                  {item.label}
                </NavLink>
              ))}
            </nav>
          </div>
        ))}

        <div style={{ marginTop: "auto", padding: "14px 12px 18px" }}>
          <div className="workspace" style={{
            display: "flex", alignItems: "center", gap: 10,
            padding: 11, border: "1px solid var(--line-soft)",
            borderRadius: 12, background: "rgba(255,255,255,.018)"
          }}>
            <div style={{
              width: 32, height: 32, display: "grid", flex: "0 0 auto",
              placeItems: "center", borderRadius: 9,
              color: "#17140f", background: "#e7c8a6",
              fontWeight: 750, fontSize: 11, fontFamily: "var(--font-heading)"
            }}>LI</div>
            <div style={{ minWidth: 0, flex: 1 }}>
              <div className="workspace-name" style={{
                overflow: "hidden", color: "var(--text)", fontSize: 12,
                fontWeight: 600, textOverflow: "ellipsis",
                whiteSpace: "nowrap", fontFamily: "var(--font-body)"
              }}>Ligia Core</div>
              <div style={{ color: "var(--muted-2)", fontSize: 11 }}>Workspace privado</div>
            </div>
            <ChevronsUpDown size={15} style={{ color: "var(--muted)", flexShrink: 0 }} />
          </div>
        </div>
      </aside>
    </>
  );
}
