import { useState } from "react";
import { Trash2 } from "lucide-react";
import { renderCell } from "./columns.jsx";
import { cellValue, relToDate } from "./helpers.jsx";

export default function ListView({ config, columns, rows, ctx, onUpdated, onDeleted, onOpenRow }) {
  const [hover, setHover] = useState(null);
  const [confirmDel, setConfirmDel] = useState(null);

  const titleCol = columns.find(c => c.key === "title") || columns[0];
  const metaCols = columns.filter(c =>
    c.key !== titleCol.key && ["status", "tag", "date", "datetime", "people", "relation"].includes(c.type)
  ).slice(0, 3);

  return (
    <div style={{
      border: "1px solid var(--line-soft)", borderRadius: "var(--radius)",
      background: "var(--surface)", overflow: "hidden"
    }}>
      {rows.length === 0 ? (
        <div style={{ padding: "60px 20px", textAlign: "center", color: "var(--muted-2)", fontSize: 12 }}>
          Nenhum item para exibir.
        </div>
      ) : (
        <div style={{ maxHeight: 560, overflowY: "auto" }}>
          {rows.map((row, i) => (
            <div key={row.id}
              onMouseEnter={() => setHover(row.id)}
              onMouseLeave={() => setHover(h => h === row.id ? null : h)}
              onClick={() => onOpenRow && onOpenRow(row)}
              style={{
                display: "flex", alignItems: "center", gap: 12, minHeight: 52, padding: "0 16px",
                borderBottom: i < rows.length - 1 ? "1px solid var(--line-soft)" : "none",
                background: hover === row.id ? "var(--surface-2)" : "transparent",
                cursor: hover === row.id ? "pointer" : "default",
                transition: "background var(--transition)"
              }}>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 13, fontWeight: 550, color: "var(--text)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                  {cellValue(row, titleCol.key) || "Sem título"}
                </div>
                {row.subtitle && (
                  <div style={{ fontSize: 11, color: "var(--muted-2)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    {row.subtitle}
                  </div>
                )}
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 8, flexShrink: 0 }}>
                {metaCols.map(col => {
                  const v = cellValue(row, col.key);
                  if (v == null || v === "" || (Array.isArray(v) && v.length === 0)) return null;
                  if (col.type === "date" || col.type === "datetime") {
                    return <span key={col.key} style={{ fontSize: 11, color: "var(--muted-2)" }}>{relToDate(v)}</span>;
                  }
                  return <span key={col.key}>{renderCell(col, row, ctx)}</span>;
                })}
              </div>
              <div style={{ flex: "0 0 auto", display: "flex", gap: 4 }}>
                {hover === row.id && !confirmDel && onDeleted && (
                  <button title="Excluir" onClick={e => { e.stopPropagation(); setConfirmDel(row.id); }}
                    style={{ ...iconBtn, color: "#d47d7d" }}><Trash2 size={13} /></button>
                )}
                {hover === row.id && confirmDel === row.id && (
                  <button onClick={async e => { e.stopPropagation(); onDeleted(row.id); setConfirmDel(null); }}
                    onMouseLeave={() => setConfirmDel(null)}
                    style={{ height: 28, padding: "0 10px", border: 0, borderRadius: 7, background: "#c94f4f", color: "#fff", cursor: "pointer", fontSize: 11, fontWeight: 600, fontFamily: "var(--font-body)" }}>
                    Confirmar
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

const iconBtn = {
  display: "grid", placeItems: "center", width: 26, height: 26, border: 0,
  borderRadius: 6, background: "transparent", color: "var(--muted-2)", cursor: "pointer"
};