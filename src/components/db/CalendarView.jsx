import { useState } from "react";
import { ChevronLeft, ChevronRight, Plus } from "lucide-react";
import { cellValue } from "./helpers.jsx";

export default function CalendarView({ config, columns, rows, ctx, onUpdated, onOpenRow, onCreate }) {
  const by = config.calendarBy;
  const [anchor, setAnchor] = useState(startOfMonth(new Date()));

  const dateCol = columns.find(c => c.key === by);

  function cellDate(row) {
    const v = cellValue(row, by);
    if (!v) return null;
    const d = new Date(v);
    return Number.isNaN(d.getTime()) ? null : d;
  }

  const first = new Date(anchor.getFullYear(), anchor.getMonth(), 1);
  const monthStartWeekday = (first.getDay() + 6) % 7; // semana inicia na segunda
  const daysInMonth = new Date(anchor.getFullYear(), anchor.getMonth() + 1, 0).getDate();

  const cells = [];
  for (let i = 0; i < monthStartWeekday; i++) cells.push({ day: null });
  for (let d = 1; d <= daysInMonth; d++) cells.push({ day: d });

  const today = new Date();
  const isThisMonth = today.getFullYear() === anchor.getFullYear() && today.getMonth() === anchor.getMonth();

  const rowsByDay = {};
  rows.forEach(row => {
    const d = cellDate(row);
    if (d && d.getFullYear() === anchor.getFullYear() && d.getMonth() === anchor.getMonth()) {
      const key = d.getDate();
      if (!rowsByDay[key]) rowsByDay[key] = [];
      rowsByDay[key].push(row);
    }
  });

  return (
    <div style={{
      border: "1px solid var(--line-soft)", borderRadius: "var(--radius)",
      background: "var(--surface)", overflow: "hidden"
    }}>
      <div style={{
        display: "flex", alignItems: "center", gap: 8, padding: "12px 16px",
        borderBottom: "1px solid var(--line)"
      }}>
        <button onClick={() => setAnchor(new Date())} style={toolBtn}>Hoje</button>
        <button onClick={() => setAnchor(new Date(anchor.getFullYear(), anchor.getMonth() - 1, 1))} style={toolBtn}>
          <ChevronLeft size={15} />
        </button>
        <button onClick={() => setAnchor(new Date(anchor.getFullYear(), anchor.getMonth() + 1, 1))} style={toolBtn}>
          <ChevronRight size={15} />
        </button>
        <span style={{ fontSize: 14, fontWeight: 600, color: "var(--text)", fontFamily: "var(--font-heading)" }}>
          {anchor.toLocaleDateString("pt-BR", { month: "long", year: "numeric" })}
        </span>
        {onCreate && (
          <button onClick={() => onCreate?.({ [by]: isoDate(new Date()) })}
            style={{ marginLeft: "auto", display: "inline-flex", alignItems: "center", gap: 6, ...addBtn }}>
            <Plus size={14} /> Novo
          </button>
        )}
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", borderBottom: "1px solid var(--line)" }}>
        {["Seg", "Ter", "Qua", "Qui", "Sex", "Sáb", "Dom"].map(d => (
          <div key={d} style={{ padding: "8px 6px", textAlign: "center", color: "var(--muted-2)", fontSize: 10, textTransform: "uppercase", letterSpacing: ".06em" }}>
            {d}
          </div>
        ))}
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)" }}>
        {cells.map((c, i) => {
          if (!c.day) return <div key={i} style={{ minHeight: 96, borderRight: "1px solid var(--line-soft)", borderBottom: "1px solid var(--line-soft)", background: "var(--bg)" }} />;
          const items = rowsByDay[c.day] || [];
          const isToday = isThisMonth && today.getDate() === c.day;
          return (
            <div key={i} onClick={() => onCreate?.({ [by]: isoDate(new Date(anchor.getFullYear(), anchor.getMonth(), c.day)) })}
              style={{
                minHeight: 96, padding: 6, cursor: onCreate ? "pointer" : "default",
                borderRight: "1px solid var(--line-soft)", borderBottom: "1px solid var(--line-soft)",
                background: isToday ? "var(--accent-soft)" : "transparent"
              }}>
              <div style={{
                display: "grid", placeItems: "center", width: 22, height: 22, borderRadius: 7,
                marginBottom: 4, fontSize: 11, fontWeight: isToday ? 700 : 500,
                color: isToday ? "var(--accent)" : "var(--muted)", background: isToday ? "var(--surface)" : "transparent"
              }}>{c.day}</div>
              <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                {items.slice(0, 3).map(row => (
                  <button key={row.id} onClick={e => { e.stopPropagation(); onOpenRow && onOpenRow(row); }}
                    style={{
                      display: "block", width: "100%", textAlign: "left", border: 0, padding: 0,
                      background: "transparent", cursor: "pointer", fontFamily: "var(--font-body)"
                    }}>
                    <span style={{
                      display: "flex", alignItems: "center", gap: 6, fontSize: 10,
                      color: "var(--text)", fontWeight: 500, overflow: "hidden",
                      textOverflow: "ellipsis", whiteSpace: "nowrap"
                    }}>
                      <span style={{ width: 6, height: 6, borderRadius: 2, background: "var(--accent)", flexShrink: 0 }} />
                      {cellValue(row, config.titleColumn) || "Sem título"}
                    </span>
                  </button>
                ))}
                {items.length > 3 && (
                  <span style={{ fontSize: 9, color: "var(--muted-2)" }}>+{items.length - 3} mais</span>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function startOfMonth(d) { return new Date(d.getFullYear(), d.getMonth(), 1); }
function isoDate(d) {
  const pad = n => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

const toolBtn = {
  display: "grid", placeItems: "center", width: 30, height: 30, border: 0, borderRadius: 7,
  background: "var(--surface-2)", color: "var(--muted)", cursor: "pointer", fontFamily: "var(--font-body)", fontSize: 11
};
const addBtn = {
  height: 32, padding: "0 14px", border: 0, borderRadius: 8,
  background: "var(--accent)", color: "#fff", cursor: "pointer",
  fontSize: 12, fontWeight: 600, fontFamily: "var(--font-body)"
};