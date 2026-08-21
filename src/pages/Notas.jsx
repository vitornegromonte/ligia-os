import { useOutletContext } from "react-router-dom";
import { useState, useEffect, useMemo, useCallback } from "react";
import { Menu, X, Pin, Plus, StickyNote, Mic2, Search } from "lucide-react";
import { showToast } from "../utils/toast.js";
import { openGlobalSearch } from "../utils/searchBus.js";
import NotificationsBell from "../components/NotificationsBell.jsx";
import { fetchNotes, createNote, updateNote, deleteNote, findMentions } from "../services/notes.js";
import { fetchProfiles } from "../services/profiles.js";
import { createNotification } from "../services/notifications.js";
import { useAuth } from "../contexts/AuthContext.jsx";
import { useRealtime } from "../hooks/useRealtime.js";
import DbView from "../components/db/DbView.jsx";
import MarkdownViewer from "../components/MarkdownViewer.jsx";
import { avatarCircle } from "../components/db/helpers.jsx";

const typeOptions = [
  { value: "quick", label: "Rápida", color: "var(--muted-2)", bg: "rgba(180,177,168,.12)" },
  { value: "meeting", label: "Reunião", color: "#c4a358", bg: "rgba(196,163,88,.15)" },
];

const columns = [
  { key: "title", label: "Título", type: "text" },
  { key: "type", label: "Tipo", type: "tag", options: typeOptions },
  { key: "pinned", label: "Fixada", type: "checkbox" },
  { key: "created_at", label: "Criada", type: "date" },
];

const config = {
  id: "notas",
  title: "notas",
  titleColumn: "title",
  columns,
  views: ["list", "table"],
  defaultView: "list",
  createLabel: "Nova nota",
  filters: [{ key: "type", label: "Tipo", options: typeOptions }],
  searchColumns: ["title", "content"],
  toolbar: { search: true, viewSwitcher: true },
  emptyTitle: "Nenhuma nota",
  emptyText: "Capture ideias rápidas ou registre notas de reunião. Use @Nome para mencionar alguém.",
};

export default function Notas() {
  const { menuOpen, setMenuOpen } = useOutletContext();
  const { profile } = useAuth();
  const [notes, setNotes] = useState([]);
  const [profiles, setProfiles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [quick, setQuick] = useState("");
  const [editor, setEditor] = useState(null);
  const [saving, setSaving] = useState(false);
  const [preview, setPreview] = useState(false);

  useEffect(() => {
    document.title = "Ligia — Notas";
    window.scrollTo({ top: 0 });
    loadData();
  }, []);

  async function loadData() {
    try {
      const [ns, profs] = await Promise.all([fetchNotes(profile?.id), fetchProfiles()]);
      setNotes(ns);
      setProfiles(profs);
    } catch (e) {
      console.warn("Notas load error:", e.message);
    } finally {
      setLoading(false);
    }
  }

  const refresh = useCallback(() => loadData(), [profile?.id]);
  useRealtime("notes", refresh);

  const ctx = useMemo(() => ({ profiles, projects: [], currentId: profile?.id }), [profiles, profile?.id]);

  async function notifyMentions(content, noteTitle) {
    const mentioned = await findMentions(content);
    for (const m of mentioned) {
      if (String(m.id) === String(profile?.id)) continue;
      try {
        await createNotification(m.id, {
          type: "mention",
          title: `${profile?.name || "Alguém"} mencionou você`,
          body: `Em "${noteTitle || "Uma nota"}".`,
          link: "/notas",
        });
      } catch (e) { /* silencioso */ }
    }
  }

  function openNew() {
    setEditor({ id: null, title: "", content: "", type: "quick", pinned: false, participants: [] });
    setPreview(false);
  }

  function openEdit(note) {
    setEditor({ ...note });
    setPreview(false);
  }

  async function quickAdd(e) {
    e.preventDefault();
    const content = quick.trim();
    if (!content) return;
    try {
      const n = await createNote({ title: "", content, type: "quick" });
      setNotes(prev => [{ ...n }, ...prev]);
      setQuick("");
      showToast("Nota salva");
    } catch (err) {
      showToast("Erro: " + err.message);
    }
  }

  async function saveNote(e) {
    e.preventDefault();
    if (!editor) return;
    setSaving(true);
    try {
      const payload = {
        title: editor.title,
        content: editor.content,
        type: editor.type,
        pinned: editor.pinned,
        participants: editor.participants || [],
      };
      let saved;
      if (editor.id) {
        saved = await updateNote(editor.id, payload);
      } else {
        saved = await createNote(payload);
      }
      await notifyMentions(editor.content, editor.title || "Nota sem título");
      setNotes(prev => editor.id
        ? prev.map(n => n.id === editor.id ? { ...n, ...payload } : n)
        : [{ ...saved, ...payload }, ...prev]);
      setEditor(null);
      showToast(editor.id ? "Nota atualizada" : "Nota criada");
    } catch (err) {
      showToast("Erro: " + err.message);
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id) {
    try {
      await deleteNote(id);
      setNotes(prev => prev.filter(n => n.id !== id));
      showToast("Nota excluída");
    } catch (err) {
      showToast("Erro: " + err.message);
    }
  }

  return (
    <>
      <header style={{
        position: "sticky", top: 0, zIndex: 30, height: 66,
        display: "flex", alignItems: "center", gap: 18,
        padding: "0 clamp(20px, 4vw, 52px)",
        borderBottom: "1px solid rgba(55,48,37,.72)",
        background: "rgba(15,14,12,.82)", backdropFilter: "blur(18px)"
      }}>
        <button className="mobile-menu" onClick={() => setMenuOpen(true)} aria-label="Abrir navegação"
          style={{ display: "none", padding: 6, border: 0, background: "none", cursor: "pointer", color: "var(--text)" }}>
          <Menu size={20} />
        </button>
        <div style={{ color: "var(--muted)", fontSize: 13 }}>
          Ligia &nbsp;/&nbsp; <strong style={{ color: "var(--text)", fontWeight: 550, fontFamily: "var(--font-heading)" }}>Notas</strong>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 6, marginLeft: "auto" }}>
          <button onClick={openGlobalSearch} aria-label="Buscar" title="Buscar (Ctrl+K)"
            style={{
              display: "grid", placeItems: "center", width: 32, height: 32,
              border: 0, borderRadius: 9, color: "var(--muted)", background: "transparent", cursor: "pointer"
            }}>
            <Search size={18} />
          </button>
          <NotificationsBell />
        </div>
      </header>

      <div style={{ padding: "36px clamp(20px, 4vw, 52px) 72px" }}>
        <div style={{ marginBottom: 28 }}>
          <div className="eyebrow" style={{ marginBottom: 8 }}>Dia a dia</div>
          <h1 style={{ margin: "0 0 10px", fontSize: "clamp(28px, 4vw, 36px)", fontWeight: 500, letterSpacing: "-.03em" }}>
            <span className="gradient-text">Notas.</span>
          </h1>
          <div className="gradient-bar" style={{ width: 64, marginBottom: 14 }} />
          <p style={{ maxWidth: 560, color: "var(--muted)", fontSize: 13, lineHeight: 1.7, margin: 0 }}>
            Notas rápidas e de reunião em markdown. Mencione alguém com @Nome.
          </p>
        </div>

        <form onSubmit={quickAdd} style={{
          display: "flex", gap: 8, alignItems: "center", marginBottom: 18,
          padding: "6px 8px 6px 16px", border: "1px solid var(--line-soft)",
          borderRadius: "var(--radius-sm)", background: "var(--surface)"
        }}>
          <StickyNote size={16} style={{ color: "var(--muted-3)", flexShrink: 0 }} />
          <input value={quick} onChange={e => setQuick(e.target.value)}
            placeholder="Captura rápida — escreva e pressione Enter…"
            style={{ flex: 1, height: 34, border: 0, outline: "none", color: "var(--text)", background: "transparent", fontSize: 13, fontFamily: "var(--font-body)" }} />
        </form>

        {loading ? (
          <div style={{ padding: "40px 20px" }}><div className="skeleton" style={{ height: 200, borderRadius: "var(--radius)" }} /></div>
        ) : (
          <DbView
            config={config}
            rows={notes}
            ctx={ctx}
            onUpdated={() => {}}
            onDeleted={handleDelete}
            onCreate={openNew}
            onOpenRow={openEdit}
          />
        )}
      </div>

      {editor && (
        <div onClick={e => { if (e.target === e.currentTarget) setEditor(null); }} style={{
          position: "fixed", inset: 0, zIndex: 100,
          display: "flex", alignItems: "center", justifyContent: "center", padding: 20,
          background: "rgba(5,5,4,.72)", backdropFilter: "blur(9px)"
        }}>
          <form onSubmit={saveNote} style={{
            width: "min(720px, 100%)", maxHeight: "90vh", overflowY: "auto",
            border: "1px solid var(--line)", borderRadius: "var(--radius-lg)", background: "var(--surface)", boxShadow: "var(--shadow)"
          }}>
            <div style={{
              display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10,
              padding: "15px 20px", borderBottom: "1px solid var(--line-soft)"
            }}>
              <div style={{ display: "flex", gap: 4 }}>
                {typeOptions.map(o => (
                  <button key={o.value} type="button" onClick={() => setEditor(ed => ({ ...ed, type: o.value }))}
                    style={{
                      padding: "6px 12px", border: `1px solid ${editor.type === o.value ? o.color : "var(--line-soft)"}`,
                      borderRadius: 9999, color: editor.type === o.value ? o.color : "var(--muted)",
                      background: editor.type === o.value ? o.bg : "transparent", cursor: "pointer",
                      fontSize: 11, fontFamily: "var(--font-body)", fontWeight: 600
                    }}>
                    {o.value === "meeting" ? <Mic2 size={12} style={{ marginRight: 4, verticalAlign: -1 }} /> : null}
                    {o.label}
                  </button>
                ))}
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <button type="button" onClick={() => setEditor(ed => ({ ...ed, pinned: !ed.pinned }))}
                  title="Fixar nota"
                  style={{
                    display: "grid", placeItems: "center", width: 35, height: 35, border: 0, borderRadius: 9,
                    color: editor.pinned ? "var(--accent)" : "var(--muted)",
                    background: "var(--surface)", cursor: "pointer"
                  }}>
                  <Pin size={15} />
                </button>
                <button type="button" onClick={() => setPreview(!preview)} style={{
                  height: 35, padding: "0 12px", border: "1px solid var(--line)", borderRadius: 9,
                  color: "var(--muted)", background: "var(--surface)", cursor: "pointer", fontSize: 12
                }}>{preview ? "Editar" : "Visualizar"}</button>
                <button type="button" onClick={() => setEditor(null)} style={iconBtn}><X size={16} /></button>
              </div>
            </div>

            <div style={{ padding: 24 }}>
              <input value={editor.title} onChange={e => setEditor(ed => ({ ...ed, title: e.target.value }))}
                placeholder="Título (opcional)"
                style={{
                  width: "100%", border: 0, outline: "none", color: "var(--text)",
                  background: "transparent", fontSize: 20, fontWeight: 600,
                  fontFamily: "var(--font-heading)", marginBottom: 14
                }} />

              {preview ? (
                <div style={{
                  minHeight: 220, padding: "14px 16px", border: "1px solid var(--line)",
                  borderRadius: 10, background: "var(--surface)"
                }}>
                  <MarkdownViewer content={editor.content} />
                </div>
              ) : (
                <textarea autoFocus value={editor.content} onChange={e => setEditor(ed => ({ ...ed, content: e.target.value }))}
                  rows={10} placeholder="Escreva em markdown…&#10;&#10;Use @Nome para mencionar alguém."
                  style={{
                    width: "100%", padding: "14px 16px", border: "1px solid var(--line)",
                    borderRadius: 10, outline: "none", color: "var(--text)", background: "var(--surface)",
                    resize: "vertical", fontFamily: "'SF Mono','Fira Code',monospace", fontSize: 13
                  }} />
              )}

              {editor.type === "meeting" && (
                <div style={{ marginTop: 16 }}>
                  <label style={{ display: "block", marginBottom: 8, color: "var(--muted)", fontSize: 12, fontWeight: 600 }}>
                    Participantes da reunião
                  </label>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                    {profiles.map(p => {
                      const on = (editor.participants || []).map(String).includes(String(p.id));
                      return (
                        <button key={p.id} type="button" onClick={() => {
                          const cur = editor.participants || [];
                          setEditor(ed => ({ ...ed, participants: on ? cur.filter(x => String(x) !== String(p.id)) : [...cur, p.id] }));
                        }} style={{
                          display: "flex", alignItems: "center", gap: 7, padding: "5px 10px 5px 5px",
                          border: `1px solid ${on ? "var(--accent-border)" : "var(--line-soft)"}`,
                          borderRadius: 9999, background: on ? "var(--accent-soft)" : "transparent",
                          cursor: "pointer", fontSize: 11, color: "var(--text)"
                        }}>
                          {avatarCircle(p, 20)} {p.name}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              <button type="submit" disabled={saving}
                style={{
                  display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
                  width: "100%", height: 42, marginTop: 20, border: 0, borderRadius: 9,
                  color: "#fff", background: saving ? "var(--muted-2)" : "var(--accent)",
                  cursor: saving ? "not-allowed" : "pointer", fontSize: 14, fontWeight: 600,
                  fontFamily: "var(--font-body)"
                }}>
                <Plus size={18} /> {saving ? "Salvando..." : editor.id ? "Salvar alterações" : "Criar nota"}
              </button>
            </div>
          </form>
        </div>
      )}
    </>
  );
}

const iconBtn = {
  width: 35, height: 35, display: "grid", placeItems: "center",
  border: "1px solid var(--line)", borderRadius: 9, color: "var(--muted)",
  background: "var(--surface)", cursor: "pointer"
};