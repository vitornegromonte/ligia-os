import { Check } from "lucide-react";

export function cellValue(row, key) {
  return row?.[key];
}

export function formatDate(value) {
  if (!value) return "";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return String(value);
  return d.toLocaleDateString("pt-BR");
}

export function formatDateTime(value) {
  if (!value) return "";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return String(value);
  return d.toLocaleDateString("pt-BR", { day: "2-digit", month: "short" }) +
    " · " + d.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
}

export function relToDate(value) {
  if (!value) return "";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "";
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const cmp = new Date(d);
  cmp.setHours(0, 0, 0, 0);
  const diff = Math.round((cmp - today) / 86400000);
  const label = String(d).slice(0, 10);
  void label;
  if (diff === 0) return "Hoje";
  if (diff === 1) return "Amanhã";
  if (diff === -1) return "Ontem";
  return formatDate(value);
}

export function statusChip(label, color, bg, size = "small") {
  return (
    <span style={{
      display: "inline-flex", alignItems: "center", gap: 6,
      padding: size === "small" ? "3px 9px" : "4px 12px",
      borderRadius: 9999, fontSize: size === "small" ? 11 : 12,
      fontWeight: 600, color, background: bg || "transparent",
      border: `1px solid ${bg ? "transparent" : "rgba(255,255,255,.06)"}`,
      whiteSpace: "nowrap", lineHeight: "1.4"
    }}>
      <span style={{
        width: 6, height: 6, borderRadius: "50%", background: color, flexShrink: 0
      }} />
      {label}
    </span>
  );
}

export function avatarCircle(person, size = 24) {
  const initials = person?.initials ||
    (person?.name ? person.name.split(" ").map(n => n[0]).join("").slice(0, 2).toUpperCase() : "??");
  return (
    <div key={person?.id || "anon"} title={person?.name}
      style={{
        width: size, height: size, borderRadius: 6, display: "grid", placeItems: "center",
        background: person?.color || "#b7c2d2", color: "#1d1710",
        fontSize: Math.round(size * 0.38), fontWeight: 700,
        fontFamily: "var(--font-heading)", flexShrink: 0
      }}>
      {initials}
    </div>
  );
}

export function CheckMark() {
  return <Check size={12} />;
}

export function clamp(str, n = 60) {
  if (!str) return "";
  return str.length > n ? str.slice(0, n) + "…" : str;
}