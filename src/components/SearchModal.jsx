import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Search, X, ArrowRight } from "lucide-react";
import { searchAll } from "../services/search.js";
import { useAuth } from "../contexts/AuthContext.jsx";
import { avatarCircle } from "./db/helpers.jsx";

export default function SearchModal({ open, onClose }) {
  const { profile } = useAuth();
  const navigate = useNavigate();
  const [term, setTerm] = useState("");
  const [results, setResults] = useState([]);
  const [busy, setBusy] = useState(false);
  const [active, setActive] = useState(0);
  const inputRef = useRef(null);
  const timer = useRef(null);

  useEffect(() => {
    if (open) {
      setTerm("");
      setResults([]);
      setActive(0);
      setTimeout(() => inputRef.current?.focus(), 30);
    }
  }, [open]);

  useEffect(() => {
    if (!open) return;
    clearTimeout(timer.current);
    if (!term.trim()) { setResults([]); return; }
    timer.current = setTimeout(async () => {
      setBusy(true);
      try {
        setResults(await searchAll(term, profile));
      } catch (e) {
        setResults([]);
      } finally {
        setBusy(false);
      }
    }, 180);
  }, [term, open, profile]);

  useEffect(() => {
    if (!open) return;
    const onKey = e => {
      if (e.key === "Escape") onClose();
      if (e.key === "ArrowDown") { e.preventDefault(); setActive(a => Math.min(a + 1, results.length - 1)); }
      if (e.key === "ArrowUp") { e.preventDefault(); setActive(a => Math.max(a - 1, 0)); }
      if (e.key === "Enter" && results[active]) { navigate(results[active].link); onClose(); }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, results, active, navigate, onClose]);

  if (!open) return null;

  return (
    <div onClick={e => { if (e.target === e.currentTarget) onClose(); }} style={{
      position: "fixed", inset: 0, zIndex: 120,
      display: "flex", alignItems: "flex-start", justifyContent: "center",
      paddingTop: "12vh", padding: "12vh 20px 20px",
      background: "rgba(5,5,4,.72)", backdropFilter: "blur(9px)"
    }}>
      <div style={{
        width: "min(620px, 100%)",
        border: "1px solid #37362f", borderRadius: 18, background: "#181815",
        boxShadow: "var(--shadow)", overflow: "hidden"
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12, padding: "14px 18px", borderBottom: "1px solid var(--line-soft)" }}>
          <Search size={18} style={{ color: "var(--muted)", flexShrink: 0 }} />
          <input ref={inputRef} value={term} onChange={e => setTerm(e.target.value)}
            placeholder="Buscar projetos, pessoas, notas, eventos, documentos…"
            style={{ flex: 1, border: 0, outline: "none", color: "var(--text)", background: "transparent", fontSize: 15, fontFamily: "var(--font-body)" }} />
          {busy && <span style={{ color: "var(--muted-2)", fontSize: 11 }}>buscando…</span>}
          <button onClick={onClose} style={{
            display: "grid", placeItems: "center", width: 30, height: 30,
            border: 0, borderRadius: 8, color: "var(--muted)",
            background: "var(--surface)", cursor: "pointer"
          }}>
            <X size={15} />
          </button>
        </div>

        <div style={{ maxHeight: "50vh", overflowY: "auto", padding: 8 }}>
          {!term.trim() && (
            <div style={{ padding: "30px 20px", textAlign: "center", color: "var(--muted-2)", fontSize: 12 }}>
              Digite para buscar em toda a plataforma
            </div>
          )}
          {term.trim() && results.length === 0 && !busy && (
            <div style={{ padding: "30px 20px", textAlign: "center", color: "var(--muted-2)", fontSize: 12 }}>
              Nada encontrado para “{term}”
            </div>
          )}
          {results.map((r, i) => (
            <button key={i} onClick={() => { navigate(r.link); onClose(); }}
              onMouseEnter={() => setActive(i)}
              style={{
                display: "flex", alignItems: "center", gap: 12, width: "100%",
                padding: "10px 12px", border: 0, borderRadius: 10, textAlign: "left",
                background: i === active ? "rgba(255,255,255,.045)" : "transparent",
                cursor: "pointer", fontFamily: "var(--font-body)"
              }}>
              {r.type === "profile" ? avatarCircle({ id: r.link, name: r.label, color: r.color }, 30)
                : (
                  <span style={{
                    width: 30, height: 30, flex: "0 0 auto", display: "grid", placeItems: "center",
                    borderRadius: 8, background: "var(--accent-soft)", color: r.color || "var(--accent)", fontSize: 11
                  }}>⌕</span>
                )}
              <span style={{ minWidth: 0, flex: 1 }}>
                <span style={{ display: "block", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", color: "var(--text)", fontSize: 13, fontWeight: 550 }}>
                  {r.label}
                </span>
                <span style={{ color: "var(--muted-2)", fontSize: 11, textTransform: "capitalize" }}>{r.meta}</span>
              </span>
              {i === active && <ArrowRight size={14} style={{ color: "var(--muted)" }} />}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}