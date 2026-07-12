import { useState } from "react";
import {
  BookOpen, FileText, FolderOpen, Microscope, Beaker,
  Bot, Sparkles, Globe, Cpu, FlaskConical,
  ScrollText, BookMarked, Layers, Quote, ListChecks,
  DoorOpen, CalendarPlus, Palette, Backpack, GitBranch, Server,
  BarChart3, Kanban, Users, Award, Blocks,
} from "lucide-react";

const iconMap = {
  BookOpen, FileText, FolderOpen, Microscope, Beaker,
  Bot, Sparkles, Globe, Cpu, FlaskConical,
  ScrollText, BookMarked, Layers, Quote, ListChecks,
  DoorOpen, CalendarPlus, Palette, Backpack, GitBranch, Server,
  BarChart3, Kanban, Users, Award, Blocks,
};

const availableIcons = Object.keys(iconMap);

export default function IconPicker({ value, onChange }) {
  const [open, setOpen] = useState(false);
  const IconComp = iconMap[value] || FileText;

  return (
    <div style={{ position: "relative" }}>
      <button type="button" onClick={() => setOpen(!open)}
        style={{
          display: "flex", alignItems: "center", gap: 8,
          height: 42, padding: "0 14px",
          border: "1px solid var(--line)", borderRadius: 9,
          outline: "none", color: "var(--text)", background: "var(--surface)",
          cursor: "pointer", fontFamily: "var(--font-body)", fontSize: 13,
          width: "100%"
        }}>
        <IconComp size={18} style={{ color: "var(--accent)" }} />
        {value || "Selecionar ícone"}
      </button>
      {open && (
        <div style={{
          position: "absolute", top: "100%", left: 0, zIndex: 10,
          marginTop: 4, padding: 8, width: 280,
          border: "1px solid var(--line)", borderRadius: 9,
          background: "var(--surface)", boxShadow: "0 12px 40px rgba(0,0,0,.5)",
          display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: 4,
        }}>
          {availableIcons.map(name => {
            const Icon = iconMap[name];
            const isSelected = value === name;
            return (
              <button key={name} type="button" onClick={() => { onChange(name); setOpen(false); }}
                title={name}
                style={{
                  display: "grid", placeItems: "center",
                  width: 46, height: 46, border: 0, borderRadius: 8,
                  background: isSelected ? "var(--accent-soft)" : "transparent",
                  color: isSelected ? "var(--accent)" : "var(--muted)",
                  cursor: "pointer", transition: "all var(--transition)"
                }}>
                <Icon size={18} />
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
