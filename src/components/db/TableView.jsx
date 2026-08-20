import { useState } from "react";
import { ArrowUp, ArrowDown, ChevronsUpDown, Pencil, Trash2, KeyRound } from "lucide-react";
import { renderCell, CellEditor } from "./columns.jsx";
import { cellValue } from "./helpers.jsx";

function visibleColumns(columns, view) {
  return columns.filter(c => !c.views || c.views.includes(view) || c.key === "title");
}

export default function TableView({ config, columns, rows, ctx, onUpdated, onDeleted, onOpenRow }) {
  const cols = visibleColumns(columns, "table");
  const [sort, setSort] = useState(null); // { key, dir }
  const [editing, setEditing] = useState(null); // { id, key }
  const [hover, setHover] = useState(null);
  const [confirmDel, setConfirmDel] = useState(null);

  const sorted = [...rows].sort((a, b) => {
    if (!sort) return 0;
    const av = cellValue(a, sort.key);
    const bv = cellValue(b, sort.key);
    if (av == null && bv == null) return 0;
    if (av == null) return 1;
    if (bv == null) return -1;
    const cmp = String(av).localeCompare(String(bv), "pt-BR", { numeric: true });
    return sort.dir === "asc" ? cmp : -cmp;
  });

  function toggleSort(key) {
    setSort(s => s && s.key === key
      ? (s.dir === "asc" ? { key, dir: "desc" } : null)
      : { key, dir: "asc" });
  }

  return (
    <div style={{
      border: "1px solid var(--line-soft)", borderRadius: "var(--radius)",
      overflow: "hidden", background: "var(--surface)"
    }}>
      <div style={{ display: "flex", alignItems: "center", height: 42, borderBottom: "1px solid var(--line)", padding: "0 12px" }}>
        <div style={{ flex: 1, display: "flex", gap: 8, overflow: "hidden" }}>
          {cols.slice(0, 6).map(col => (
            <button key={col.key} onClick={() => toggleSort(col.key)} title={col.label}
              style={{
                flex: col.key === "title" ? 2 : 0, minWidth: col.key === "title" ? 0 : 120,
                display: "flex", alignItems: "center", gap: 4,
                padding: "6px 8px", border: 0, borderRadius: 6, background: "transparent",
                color: "var(--muted)", fontSize: 11, letterSpacing: ".02em", cursor: "pointer",
                textTransform: "uppercase", fontFamily: "var(--font-body)", fontWeight: 600,
                overflow: "hidden", whiteSpace: "nowrap"
              }}>
              {col.label}
              {sort?.key === col.key
                ? (sort.dir === "asc" ? <ArrowUp size={11} /> : <span style={{ display: "inline-flex" }}><ArrowDown size={11} /></span>)
                : <ChevronsUpDown size={11} style={{ opacity: .4 }} />}
            </button>
          ))}
        </div>
        {
          rows.length > 0 &&
          <span style={{ marginLeft: "auto", color: "var(--muted-2)", fontSize: 11, whiteSpace: "nowrap" }}>
            {rows.length} {rows.length === 1 ? "linha" : "linhas"}
          </span>
        }
      </div>

      {rows.length === 0 ? (
        <div style={{
          padding: "60px 20px", textAlign: "center", color: "var(--muted-2)", fontSize: 12
        }}>Nenhum item para exibir.</div>
      ) : (
        <div style={{ maxHeight: 560, overflowY: "auto" }}>
          {sorted.map((row, i) => (
            <div key={row.id} onMouseEnter={() => setHover(row.id)} onMouseLeave={() => { setHover(h => h === row.id ? null : h); }}
              onClick={() => !editing && onOpenRow && onOpenRow(row)}
              style={{
                display: "flex", alignItems: "center", minHeight: 46, padding: "0 12px",
                borderBottom: i < sorted.length - 1 ? "1px solid var(--line-soft)" : "none",
                background: hover === row.id ? "var(--surface-2)" : "transparent",
                cursor: hover === row.id ? "pointer" : "default",
                transition: "background var(--transition)"
              }}>
              {cols.map(col => {
                const isEditing = editing?.rowId === row.id && editing?.key === col.key;
                return (
                  <div key={col.key}
                    style={{
                      flex: col.key === "title" ? 2 : 0,
                      minWidth: col.key === "title" ? 0 : col.type === "people" ? 110 : 90,
                      padding: "0 8px", overflow: "hidden", fontSize: 13
                    }}
                    onClick={e => {
                      e.stopPropagation();
                      if (col.editable && !col.readOnly && !isEditing) {
                        setEditing({ rowId: row.id, key: col.key });
                      } else if (col.key !== "title" && !col.editable) {
                        onOpenRow && onOpenRow(row);
                      }
                    }}>
                    {isEditing ? (
                      <CellEditor column={col} value={cellValue(row, col.key)} row={row} ctx={ctx}
                        onCommit={value => {
                          onUpdated && onUpdated(row.id, { [col.key]: value });
                          setEditing(null);
                        }}
                        onCancel={() => setEditing(null)} />
                    ) : (
                      <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                        {renderCell(col, row, ctx)}
                      </div>
                    )}
                  </div>
                );
              })}

              <div style={{ flex: "0 0 auto", display: "flex", gap: 4, minWidth: 64, justifyContent: "flex-end" }}>
                {hover === row.id && !confirmDel && (
                  <>
                    {onUpdated && <button title="Editar"
                      onClick={e => { e.stopPropagation(); onOpenRow && onOpenRow(row); }}
                      style={iconBtn}><Pencil size={13} /></button>}
                    {onDeleted && (
                      <button title="Excluir" onClick={e => { e.stopPropagation(); setConfirmDel(row.id); }}
                        style={{ ...iconBtn, color: "#d47d7d" }}><Trash2 size={13} /></button>
                    )}
                  </>
                )}
                {hover === row.id && confirmDel === row.id && (
                  <button
                    onClick={async e => { e.stopPropagation(); onDeleted(row.id); setConfirmDel(null); }}
                    onMouseLeave={() => setConfirmDel(null)}
                    style={{
                      display: "flex", alignItems: "center", gap: 5, height: 28, padding: "0 10px",
                      border: 0, borderRadius: 7, background: "#c94f4f", color: "#fff",
                      cursor: "pointer", fontSize: 11, fontFamily: "var(--font-body)", fontWeight: 600
                    }}>
                    <KeyRound size={11} /> Confirmar
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