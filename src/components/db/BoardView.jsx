import { useState } from "react";
import { Plus, GripVertical, Trash2 } from "lucide-react";
import { renderCell, colorOf } from "./columns.jsx";
import { cellValue, relToDate, avatarCircle } from "./helpers.jsx";

export default function BoardView({ config, columns, rows, ctx, onUpdated, onDeleted, onCreate, onOpenRow }) {
  const by = config.boardBy;
  const stCol = columns.find(c => c.key === by) || { options: [], key: by, label: by };
  const groups = stCol.options || [];

  const [dragId, setDragId] = useState(null);
  const [over, setOver] = useState(null);
  const [confirmDel, setConfirmDel] = useState(null);

  const titleCol = columns.find(c => c.key === "title");
  const badgeCols = columns.filter(c => ["people", "date", "datetime"].includes(c.type)).slice(0, 2);

  function drop(status) {
    if (dragId && status !== undefined) onUpdated && onUpdated(dragId, { [by]: status });
    setDragId(null); setOver(null);
  }

  return (
    <div style={{
      display: "flex", gap: 12, overflowX: "auto", paddingBottom: 8, alignItems: "flex-start"
    }}>
      {groups.map(g => {
        const inGroup = rows.filter(r => String(cellValue(r, by) ?? "") === g.value);
        const z = colorOf(stCol.options, g.value);
        return (
          <div key={g.value} onDragOver={e => { e.preventDefault(); setOver(g.value); }}
            onDragLeave={() => setOver(h => h === g.value ? null : h)}
            onDrop={() => drop(g.value)}
            style={{
              flex: "0 0 260px", display: "flex", flexDirection: "column",
              borderRadius: "var(--radius)", background: "var(--surface)",
              border: `1px solid ${over === g.value ? "var(--accent-border)" : "var(--line-soft)"}`,
              transition: "border-color var(--transition)", maxHeight: 620
            }}>
            <div style={{
              display: "flex", alignItems: "center", gap: 8,
              padding: "12px 14px", borderBottom: "1px solid var(--line-soft)"
            }}>
              <span style={{ width: 8, height: 8, borderRadius: 3, background: g.color || z?.color || "var(--muted-2)", flexShrink: 0 }} />
              <span style={{ fontSize: 12, fontWeight: 600, color: "var(--text)" }}>{g.label}</span>
              <span style={{ fontSize: 11, color: "var(--muted-2)" }}>{inGroup.length}</span>
              {onCreate && (
                <button onClick={() => onCreate?.({ [by]: g.value })} title={`Adicionar ${g.label}`}
                  style={{ marginLeft: "auto", ...iconBtn }}>
                  <Plus size={14} />
                </button>
              )}
            </div>

            <div style={{ flex: 1, padding: 10, overflowY: "auto", display: "flex", flexDirection: "column", gap: 8 }}>
              {inGroup.length === 0 ? (
                <div style={{ padding: "18px 10px", textAlign: "center", color: "var(--muted-3)", fontSize: 11 }}>
                  Arraste itens para cá
                </div>
              ) : inGroup.map(row => (
                <div key={row.id}
                  draggable
                  onDragStart={() => setDragId(row.id)}
                  onClick={() => onOpenRow && onOpenRow(row)}
                  style={{
                    padding: "11px 12px", borderRadius: 10, cursor: "grab",
                    border: "1px solid var(--line-soft)", background: "var(--surface-2)",
                    opacity: dragId === row.id ? .5 : 1, position: "relative"
                  }}>
                  <GripVertical size={13} style={{ position: "absolute", top: 10, right: 10, color: "var(--muted-3)" }} />
                  <div style={{
                    fontSize: 13, fontWeight: 550, color: "var(--text)", lineHeight: 1.4,
                    paddingRight: 16, marginBottom: 8
                  }}>{cellValue(row, titleCol.key) || "Sem título"}</div>
                  <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
                    {badgeCols.map(col => (
                      <span key={col.key}>
                        {hasAny(row, col) && (col.type === "people"
                          ? renderPeople(row, col, ctx, 20)
                          : <span style={{ fontSize: 10, color: "var(--muted-2)" }}>{relToDate(cellValue(row, col.key))}</span>)}
                      </span>
                    ))}
                  </div>
                  {onDeleted && confirmDel === row.id ? (
                    <div style={{ display: "flex", gap: 6, marginTop: 8 }}>
                      <button onClick={() => setConfirmDel(null)} style={smallBtn}>Cancelar</button>
                      <button onClick={e => { e.stopPropagation(); onDeleted(row.id); setConfirmDel(null); }} style={dangerBtn}>Excluir</button>
                    </div>
                  ) : (
                    onDeleted && (
                      <button onClick={e => { e.stopPropagation(); setConfirmDel(row.id); }}
                        style={{ position: "absolute", bottom: 10, left: 12, border: 0, background: "transparent", color: "var(--muted-3)", cursor: "pointer" }}>
                        <Trash2 size={13} />
                      </button>
                    )
                  )}
                </div>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}

function renderPeople(row, col, ctx, size) {
  const ids = cellValue(row, col.key) || [];
  const profiles = ctx.profiles || [];
  const people = profiles.filter(p => ids.map(String).includes(String(p.id))).slice(0, 3);
  return (
    <span style={{ display: "flex", gap: 3 }}>
      {people.map(p => avatarCircle(p, size))}
    </span>
  );
}

function hasAny(row, col) {
  const v = cellValue(row, col.key);
  if (Array.isArray(v)) return v.length > 0;
  return v != null && v !== "";
}

const iconBtn = {
  display: "grid", placeItems: "center", width: 26, height: 26, border: 0,
  borderRadius: 6, background: "transparent", color: "var(--muted-2)", cursor: "pointer"
};
const smallBtn = {
  height: 26, padding: "0 10px", border: "1px solid var(--line)", borderRadius: 7,
  color: "var(--muted)", background: "var(--surface)", cursor: "pointer", fontSize: 11
};
const dangerBtn = {
  height: 26, padding: "0 10px", border: 0, borderRadius: 7,
  color: "#fff", background: "#c94f4f", cursor: "pointer", fontSize: 11, fontWeight: 600
}