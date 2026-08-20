import { useState } from "react";
import { Check, X, Minus } from "lucide-react";
import { statusChip, avatarCircle, formatDate, formatDateTime, clamp, cellValue } from "./helpers.jsx";

export function colorOf(options, value) {
  return (options || []).find(o => o.value === value) || null;
}

function labelOf(options, value) {
  const o = colorOf(options, value);
  return o ? o.label : (value != null && value !== "" ? String(value) : "");
}

export function renderCell(column, row, ctx) {
  const value = cellValue(row, column.key);
  const { type } = column;

  switch (type) {
    case "title":
      return <span style={{ fontWeight: 600, color: "var(--text)" }}>{value || "—"}</span>;

    case "text":
      return <span style={{ color: "var(--muted)" }}>{value || "—"}</span>;

    case "longText":
      return <span style={{ color: "var(--muted)", fontSize: 12 }}>{clamp(value || "", 90) || "—"}</span>;

    case "status": {
      const o = colorOf(column.options, value);
      return statusChip(o?.label || labelOf(column.options, value) || "Sem status", o?.color || "var(--muted-2)", o?.bg);
    }

    case "tag": {
      const o = colorOf(column.options, value);
      return statusChip(o?.label || labelOf(column.options, value) || "—", o?.color || "var(--muted-2)", o?.bg);
    }

    case "multiSelect":
      return (
        <span style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
          {(value || []).map(v => {
            const o = colorOf(column.options, v);
            return statusChip(o?.label || v, o?.color || "var(--muted-2)", o?.bg, "small");
          })}
          {(value || []).length === 0 && <span style={{ color: "var(--muted-2)" }}>—</span>}
        </span>
      );

    case "date":
      return <span style={{ color: "var(--muted)", fontSize: 12, whiteSpace: "nowrap" }}>{formatDate(value) || "—"}</span>;

    case "datetime":
      return <span style={{ color: "var(--muted)", fontSize: 12, whiteSpace: "nowrap" }}>{formatDateTime(value) || "—"}</span>;

    case "checkbox":
      return value
        ? <span style={{ color: "var(--accent)", display: "inline-flex" }}><Check size={15} /></span>
        : <span style={{ color: "var(--muted-3)", display: "inline-flex" }}><Minus size={15} /></span>;

    case "people": {
      const profiles = ctx.profiles || [];
      const ids = value || [];
      const people = profiles.filter(p => ids.map(String).includes(String(p.id)));
      if (people.length === 0) return <span style={{ color: "var(--muted-2)" }}>—</span>;
      return (
        <span style={{ display: "flex", gap: 3 }}>
          {people.slice(0, 3).map(p => avatarCircle(p, 24))}
          {people.length > 3 && (
            <span style={{
              width: 24, height: 24, borderRadius: 6, display: "grid", placeItems: "center",
              background: "var(--surface-2)", color: "var(--muted-2)", fontSize: 9, fontWeight: 600
            }}>+{people.length - 3}</span>
          )}
        </span>
      );
    }

    case "relation": {
      const list = ctx[column.relation] || [];
      const item = list.find(x => String(x.id) === String(value));
      const label = item?.name || item?.title || "—";
      return (
        <span style={{
          display: "inline-flex", alignItems: "center", gap: 6, color: "var(--muted)",
          background: "var(--surface-2)", padding: "3px 9px", borderRadius: 8, fontSize: 11
        }}>
          {item?.color && <span style={{ width: 7, height: 7, borderRadius: 3, background: item.color }} />}
          {label}
        </span>
      );
    }

    case "number":
      return <span style={{ color: "var(--muted)" }}>{value ?? "—"}</span>;

    case "progress":
      return (
        <div style={{ width: 70, height: 5, borderRadius: 4, background: "var(--surface-2)", overflow: "hidden" }}>
          <div style={{ height: "100%", borderRadius: 4, background: "var(--accent)", width: `${Math.max(0, Math.min(100, value || 0))}%` }} />
        </div>
      );

    default:
      return <span style={{ color: "var(--muted)" }}>{value == null ? "—" : String(value)}</span>;
  }
}

export function CellEditor({ column, value, row, ctx, autoFocus, onCommit, onCancel }) {
  const [val, setVal] = useState(prepareValue(column.type, value));
  const { type } = column;

  function commit() {
    onCommit(column.type === "number" && val !== "" ? Number(val) : val);
  }

  if (type === "people") {
    const profiles = (ctx.profiles || []).filter(p => p.id !== ctx?.currentId);
    const current = value || [];
    const toggle = id => {
      const next = current.map(String).includes(String(id))
        ? current.filter(x => String(x) !== String(id))
        : [...current, id];
      onCommit(next);
    };
    return (
      <div style={{ padding: 6, display: "flex", gap: 6, flexWrap: "wrap", minWidth: 240 }}>
        {profiles.map(p => {
          const on = current.map(String).includes(String(p.id));
          return (
            <button key={p.id} onClick={() => toggle(p.id)} style={{
              display: "flex", alignItems: "center", gap: 7, padding: "5px 10px 5px 5px",
              border: `1px solid ${on ? "var(--accent-border)" : "var(--line-soft)"}`,
              borderRadius: 9999, background: on ? "var(--accent-soft)" : "transparent",
              cursor: "pointer", color: "var(--text)", fontSize: 11
            }}>
              {avatarCircle(p, 20)}
              {p.name}
              {on && <Check size={12} style={{ color: "var(--accent)" }} />}
            </button>
          );
        })}
      </div>
    );
  }

  if (type === "checkbox") {
    return (
      <button onClick={() => onCommit(!value)} style={{
        display: "grid", placeItems: "center", width: 30, height: 30, border: 0,
        borderRadius: 7, background: "var(--surface-2)", cursor: "pointer",
        color: value ? "var(--accent)" : "var(--muted-3)"
      }}>
        {value ? <Check size={16} /> : <X size={14} />}
      </button>
    );
  }

  if (type === "status" || type === "tag" || type === "relation") {
    const opts = type === "relation"
      ? (ctx[column.relation] || []).map(x => ({ value: x.id, label: x.name || x.title }))
      : (column.options || []);
    return (
      <select autoFocus value={String(value ?? "")}
        onChange={e => onCommit(e.target.value === "" ? null : e.target.value)}
        style={{
          width: "100%", height: 34, padding: "0 8px", border: "1px solid var(--line)",
          borderRadius: 7, background: "var(--surface)", color: "var(--text)", outline: "none",
          fontSize: 12, fontFamily: "var(--font-body)"
        }}>
        <option value="">—</option>
        {opts.map(o => <option key={String(o.value)} value={String(o.value)}>{o.label}</option>)}
      </select>
    );
  }

  if (type === "datetime") {
    return (
      <input autoFocus type="datetime-local" value={val} onChange={e => setVal(e.target.value)}
        onBlur={commit} onKeyDown={e => { if (e.key === "Enter") commit(); if (e.key === "Escape") onCancel(); }}
        style={{
          width: "100%", height: 34, padding: "0 8px", border: "1px solid var(--line)",
          borderRadius: 7, background: "var(--surface)", color: "var(--text)", outline: "none",
          fontSize: 12, fontFamily: "var(--font-body)"
        }} />
    );
  }

  return (
    <input autoFocus type="text" value={val} onChange={e => setVal(e.target.value)}
      placeholder={column.key === "title" ? "Sem título" : ""}
      onBlur={column.type === "title" ? commit : undefined}
      onKeyDown={e => { if (e.key === "Enter") commit(); if (e.key === "Escape") onCancel(); }}
      onClick={e => e.stopPropagation()}
      style={{
        width: "100%", height: 34, padding: "0 8px", border: "1px solid var(--line)",
        borderRadius: 7, background: "var(--surface)", color: "var(--text)", outline: "none",
        fontSize: 12, fontFamily: "var(--font-body)"
      }} />
  );
}

function prepareValue(type, value) {
  if (type === "datetime" && value) {
    const d = new Date(value);
    if (!Number.isNaN(d.getTime())) {
      const pad = n => String(n).padStart(2, "0");
      return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
    }
  }
  return value ?? "";
}