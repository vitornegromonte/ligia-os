import { useAuth } from "../../contexts/AuthContext.jsx";
import { useState, useMemo, useCallback } from "react";
import { Search, LayoutGrid, Columns3, CalendarDays, List, Table2, Plus } from "lucide-react";
import TableView from "./TableView.jsx";
import BoardView from "./BoardView.jsx";
import CalendarView from "./CalendarView.jsx";
import ListView from "./ListView.jsx";
import { cellValue } from "./helpers.jsx";

const viewMeta = {
  table: { icon: Table2, label: "Tabela" },
  board: { icon: Columns3, label: "Board" },
  calendar: { icon: CalendarDays, label: "Calendário" },
  list: { icon: List, label: "Lista" },
};

const persisted = {};

export default function DbView({
  config,
  rows,
  ctx = {},
  onUpdated,
  onDeleted,
  onCreate,
  onOpenRow,
  extraActions,
}) {
  const { profile } = useAuth();
  const storageKey = `db-view-${profile.id}-${config.id}`;
  const [view, setView] = useState(persisted[storageKey]?.view || config.defaultView || config.views[0]);
  const [search, setSearch] = useState("");
  const [filters, setFilters] = useState(persisted[storageKey]?.filters || {});

  const persist = useCallback((v, f) => {
    persisted[storageKey] = { view: v, filters: f };
    try { localStorage.setItem(storageKey, JSON.stringify(persisted[storageKey])); } catch {}
  }, [storageKey]);

  const changeView = v => { setView(v); persist(v, filters); };
  const changeFilter = (key, value) => {
    const next = { ...filters, [key]: value || null };
    setFilters(next); persist(view, next);
  };

  const searchCols = config.searchColumns || [config.titleColumn || "title"];

  const visible = useMemo(() => {
    let out = rows;
    if (search.trim()) {
      const q = search.toLowerCase();
      out = out.filter(r =>
        searchCols.some(col => String(cellValue(r, col) ?? "").toLowerCase().includes(q))
      );
    }
    (config.filters || []).forEach(f => {
      const fv = filters[f.key];
      if (fv) out = out.filter(r => {
        const v = cellValue(r, f.key);
        if (Array.isArray(v)) return v.map(String).includes(String(fv));
        return String(v ?? "") === String(fv);
      });
    });
    return out;
  }, [rows, search, filters, searchCols, config.filters]);

  const columns = config.columns;

  return (
    <div>
      <div style={{
        display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap", marginBottom: 14
      }}>
        {config.toolbar?.search !== false && (
          <div style={{ position: "relative", flex: "1 1 220px", minWidth: 160 }}>
            <Search size={14} style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", color: "var(--muted-3)" }} />
            <input value={search} onChange={e => setSearch(e.target.value)}
              placeholder={`Buscar em ${config.title || "..."}`}
              style={{
                width: "100%", height: 36, padding: "0 12px 0 34px", border: "1px solid var(--line)",
                borderRadius: 9, outline: "none", color: "var(--text)", background: "var(--surface)",
                fontSize: 12, fontFamily: "var(--font-body)"
              }} />
          </div>
        )}

        {(config.filters || []).map(f => (
          <select key={f.key} value={filters[f.key] || ""} onChange={e => changeFilter(f.key, e.target.value)}
            style={{
              height: 36, padding: "0 10px", border: "1px solid var(--line)", borderRadius: 9,
              outline: "none", color: "var(--muted)", background: "var(--surface)", cursor: "pointer",
              fontSize: 12, fontFamily: "var(--font-body)"
            }}>
            <option value="">{f.label}</option>
            {f.options.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
        ))}

        {extraActions}

        {config.toolbar?.viewSwitcher !== false && config.views.length > 1 && (
          <div style={{
            display: "flex", gap: 2, padding: 3, borderRadius: 9,
            background: "var(--surface-2)", marginLeft: "auto"
          }}>
            {config.views.map(v => {
              const meta = viewMeta[v];
              if (!meta) return null;
              const Icon = meta.icon;
              return (
                <button key={v} onClick={() => changeView(v)} title={meta.label}
                  style={{
                    display: "grid", placeItems: "center", width: 30, height: 30, border: 0,
                    borderRadius: 7, background: view === v ? "var(--surface-3)" : "transparent",
                    color: view === v ? "var(--text)" : "var(--muted)", cursor: "pointer",
                    transition: "all var(--transition)"
                  }}>
                  <Icon size={15} />
                </button>
              );
            })}
          </div>
        )}

        {onCreate && (
          <button onClick={() => onCreate?.({})}
            style={{
              display: "inline-flex", alignItems: "center", gap: 7, height: 36,
              padding: "0 16px", border: 0, borderRadius: 9,
              background: "var(--accent)", color: "#fff", cursor: "pointer",
              fontSize: 12, fontWeight: 600, fontFamily: "var(--font-body)"
            }}>
            <Plus size={15} /> {config.createLabel || "Novo"}
          </button>
        )}
      </div>

      {visible.length === 0 && rows.length === 0 ? (
        <div style={{
          display: "flex", flexDirection: "column", alignItems: "center", gap: 10,
          padding: "72px 24px", textAlign: "center",
          border: "1px dashed var(--line-soft)", borderRadius: "var(--radius)"
        }}>
          <p style={{ margin: 0, fontSize: 13, color: "var(--text)" }}>{config.emptyTitle || "Nada por aqui ainda"}</p>
          <p style={{ margin: 0, maxWidth: 340, fontSize: 12, lineHeight: 1.6, color: "var(--muted)" }}>
            {config.emptyText || "Use o botão acima para criar o primeiro item."}
          </p>
        </div>
      ) : (
        <>
          {view === "table" && (
            <TableView config={config} columns={columns} rows={visible} ctx={ctx}
              onUpdated={onUpdated} onDeleted={onDeleted} onOpenRow={onOpenRow} />
          )}
          {view === "board" && (
            <BoardView config={config} columns={columns} rows={visible} ctx={ctx}
              onUpdated={onUpdated} onDeleted={onDeleted} onCreate={onCreate}
              onOpenRow={onOpenRow} />
          )}
          {view === "calendar" && (
            <CalendarView config={config} columns={columns} rows={visible} ctx={ctx}
              onUpdated={onUpdated} onOpenRow={onOpenRow} onCreate={onCreate} />
          )}
          {view === "list" && (
            <ListView config={config} columns={columns} rows={visible} ctx={ctx}
              onUpdated={onUpdated} onDeleted={onDeleted} onOpenRow={onOpenRow} />
          )}
        </>
      )}
    </div>
  );
}