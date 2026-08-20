import { useOutletContext } from "react-router-dom";
import { useState, useEffect, useMemo, useCallback } from "react";
import { Menu, X, Check, Search } from "lucide-react";
import { showToast } from "../utils/toast.js";
import { openGlobalSearch } from "../utils/searchBus.js";
import NotificationsBell from "../components/NotificationsBell.jsx";
import { fetchEvents, createEvent, updateEvent, deleteEvent, setEventParticipants } from "../services/events.js";
import { fetchProfiles } from "../services/profiles.js";
import { useAuth } from "../contexts/AuthContext.jsx";
import { useRealtime } from "../hooks/useRealtime.js";
import DbView from "../components/db/DbView.jsx";
import { avatarCircle } from "../components/db/helpers.jsx";

const columns = [
  { key: "title", label: "Título", type: "title", editable: true },
  { key: "starts_at", label: "Início", type: "datetime", editable: true },
  { key: "location", label: "Local", type: "text", editable: true },
  { key: "all_day", label: "Dia todo", type: "checkbox", editable: true },
  { key: "participants", label: "Participantes", type: "people", editable: true },
  { key: "description", label: "Descrição", type: "longText" },
];

const config = {
  id: "agenda",
  title: "eventos",
  titleColumn: "title",
  columns,
  views: ["calendar", "table", "list"],
  defaultView: "calendar",
  calendarBy: "starts_at",
  createLabel: "Novo evento",
  filters: [],
  searchColumns: ["title", "location", "description"],
  toolbar: { search: true, viewSwitcher: true },
  emptyTitle: "Nenhum evento",
  emptyText: "Reuniões, prazos e compromissos da equipe aparecem aqui.",
};

export default function Agenda() {
  const { menuOpen, setMenuOpen } = useOutletContext();
  const { profile } = useAuth();
  const [events, setEvents] = useState([]);
  const [profiles, setProfiles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState({});

  useEffect(() => {
    document.title = "Ligia — Agenda";
    window.scrollTo({ top: 0 });
    loadData();
  }, []);

  async function loadData() {
    try {
      const [evs, profs] = await Promise.all([fetchEvents(), fetchProfiles()]);
      setEvents(evs);
      setProfiles(profs);
    } catch (e) {
      console.warn("Agenda load error:", e.message);
    } finally {
      setLoading(false);
    }
  }

  const refresh = useCallback(() => loadData(), []);
  useRealtime("events", refresh);
  useRealtime("event_participants", refresh);

  const ctx = useMemo(() => ({ profiles, projects: [], currentId: profile?.id }), [profiles, profile?.id]);

  function openCreate(payload = {}) {
    setEditing(null);
    setForm({
      title: "",
      starts_at: payload.starts_at ? toLocalInput(payload.starts_at) : "",
      ends_at: "",
      location: "",
      all_day: false,
      visibility: "internal",
      description: "",
      participants: [],
    });
    setModalOpen(true);
  }

  function openEdit(event) {
    setEditing(event);
    setForm({
      title: event.title || "",
      starts_at: toLocalInput(event.starts_at),
      ends_at: event.ends_at ? toLocalInput(event.ends_at) : "",
      location: event.location || "",
      all_day: event.all_day || false,
      visibility: event.visibility || "internal",
      description: event.description || "",
      participants: event.participants || [],
    });
    setModalOpen(true);
  }

  function setField(key, value) { setForm(f => ({ ...f, [key]: value })); }

  async function handleSave(e) {
    e.preventDefault();
    if (!form.title.trim()) return;
    try {
      if (editing) {
        await updateEvent(editing.id, {
          title: form.title.trim(),
          starts_at: form.starts_at ? new Date(form.starts_at).toISOString() : new Date().toISOString(),
          ends_at: form.ends_at ? new Date(form.ends_at).toISOString() : null,
          location: form.location,
          all_day: form.all_day,
          description: form.description,
          visibility: form.visibility,
        });
        await setEventParticipants(editing.id, form.participants);
        showToast("Evento atualizado");
      } else {
        const ev = await createEvent({
          title: form.title.trim(),
          starts_at: form.starts_at ? new Date(form.starts_at).toISOString() : new Date().toISOString(),
          ends_at: form.ends_at ? new Date(form.ends_at).toISOString() : null,
          location: form.location,
          all_day: form.all_day,
          description: form.description,
          visibility: form.visibility,
          created_by: profile?.id,
        }, form.participants);
        showToast(`"${ev.title}" criado`);
      }
      setModalOpen(false);
      loadData();
    } catch (err) {
      showToast("Erro: " + err.message);
    }
  }

  async function handleUpdate(id, patch) {
    try {
      if (patch.participants !== undefined) {
        await setEventParticipants(id, patch.participants);
        delete patch.participants;
      }
      if (Object.keys(patch).length > 0) await updateEvent(id, patch);
      setEvents(prev => prev.map(ev => ev.id === id ? { ...ev, ...patch } : ev));
    } catch (err) {
      showToast("Erro: " + err.message);
    }
  }

  async function handleDelete(id) {
    try {
      await deleteEvent(id);
      setEvents(prev => prev.filter(ev => ev.id !== id));
      showToast("Evento removido");
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
          Ligia &nbsp;/&nbsp; <strong style={{ color: "var(--text)", fontWeight: 550, fontFamily: "var(--font-heading)" }}>Agenda</strong>
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
            <span className="gradient-text">Agenda.</span>
          </h1>
          <div className="gradient-bar" style={{ width: 64, marginBottom: 14 }} />
          <p style={{ maxWidth: 560, color: "var(--muted)", fontSize: 13, lineHeight: 1.7, margin: 0 }}>
            Reuniões, eventos e compromissos da equipe — clique em um dia para agendar.
          </p>
        </div>

        {loading ? (
          <div style={{ padding: "80px 20px", textAlign: "center", color: "var(--muted)", fontSize: 13 }}>Carregando…</div>
        ) : (
          <DbView
            config={config}
            rows={events}
            ctx={ctx}
            onUpdated={handleUpdate}
            onDeleted={handleDelete}
            onCreate={openCreate}
            onOpenRow={openEdit}
          />
        )}
      </div>

      {modalOpen && (
        <div onClick={e => { if (e.target === e.currentTarget) setModalOpen(false); }} style={{
          position: "fixed", inset: 0, zIndex: 100,
          display: "flex", alignItems: "center", justifyContent: "center", padding: 20,
          background: "rgba(5,5,4,.72)", backdropFilter: "blur(9px)"
        }}>
          <form onSubmit={handleSave} style={{
            width: "min(480px, 100%)", maxHeight: "90vh", overflowY: "auto",
            border: "1px solid var(--line)", borderRadius: "var(--radius-lg)", background: "var(--surface)", boxShadow: "var(--shadow)"
          }}>
            <div style={{
              display: "flex", alignItems: "center", justifyContent: "space-between",
              padding: "15px 20px", borderBottom: "1px solid var(--line-soft)"
            }}>
              <span style={{ color: "var(--muted)", fontSize: 11, textTransform: "uppercase", letterSpacing: ".1em" }}>
                {editing ? "Editar evento" : "Novo evento"}
              </span>
              <button type="button" onClick={() => setModalOpen(false)} style={iconBtn}><X size={16} /></button>
            </div>
            <div style={{ padding: 24, display: "grid", gap: 16 }}>
              <Field label="Título">
                <input required autoFocus value={form.title} onChange={e => setField("title", e.target.value)}
                  placeholder="Ex: Reunião semanal" style={input} />
              </Field>
              <Field label="Início">
                <input type="datetime-local" value={form.starts_at} onChange={e => setField("starts_at", e.target.value)} style={input} />
              </Field>
              <Field label="Término (opcional)">
                <input type="datetime-local" value={form.ends_at} onChange={e => setField("ends_at", e.target.value)} style={input} />
              </Field>
              <Field label="Local">
                <input value={form.location} onChange={e => setField("location", e.target.value)}
                  placeholder="Online / Sala 3" style={input} />
              </Field>
              <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 12, color: "var(--muted)", cursor: "pointer" }}>
                <input type="checkbox" checked={form.all_day} onChange={e => setField("all_day", e.target.checked)} />
                Dia inteiro
              </label>
              <Field label="Visibilidade">
                <div style={{ display: "flex", gap: 6, padding: 4, borderRadius: 9, background: "var(--surface-2)" }}>
                  {[["internal", "Interno"], ["public", "Público"]].map(([val, label]) => (
                    <button key={val} type="button" onClick={() => setField("visibility", val)} style={{
                      flex: 1, height: 36, border: 0, borderRadius: 7, cursor: "pointer",
                      fontSize: 12.5, fontWeight: 600, fontFamily: "var(--font-body)",
                      color: form.visibility === val ? "#fff" : "var(--muted)",
                      background: form.visibility === val ? "var(--accent)" : "transparent",
                      transition: "background var(--transition), color var(--transition)"
                    }}>
                      {label}
                    </button>
                  ))}
                </div>
                <div style={{ marginTop: 6, color: "var(--muted-2)", fontSize: 11, lineHeight: 1.6 }}>
                  {form.visibility === "public"
                    ? "Visível publicamente na landing da liga."
                    : "Visível apenas para membros na plataforma."}
                </div>
              </Field>
              <Field label="Participantes">
                <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                  {profiles.map(p => {
                    const on = (form.participants || []).map(String).includes(String(p.id));
                    return (
                      <button key={p.id} type="button" onClick={() => {
                        const cur = form.participants || [];
                        setField("participants", on
                          ? cur.filter(x => String(x) !== String(p.id))
                          : [...cur, p.id]);
                      }} style={{
                        display: "flex", alignItems: "center", gap: 7, padding: "5px 10px 5px 5px",
                        border: `1px solid ${on ? "var(--accent-border)" : "var(--line-soft)"}`,
                        borderRadius: 9999, background: on ? "var(--accent-soft)" : "transparent",
                        cursor: "pointer", fontSize: 11, color: "var(--text)"
                      }}>
                        {avatarCircle(p, 20)} {p.name}
                        {on && <Check size={12} style={{ color: "var(--accent)" }} />}
                      </button>
                    );
                  })}
                </div>
              </Field>
              <Field label="Descrição">
                <textarea value={form.description} onChange={e => setField("description", e.target.value)} rows={3}
                  placeholder="Pauta ou notas da reunião…" style={{ ...input, height: "auto", resize: "vertical", fontFamily: "var(--font-body)", fontSize: 13 }} />
              </Field>
              <button type="submit"
                style={{
                  display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
                  width: "100%", height: 42, border: 0, borderRadius: 9,
                  color: "#fff", background: "var(--accent)", cursor: "pointer",
                  fontSize: 14, fontWeight: 600, fontFamily: "var(--font-body)"
                }}>
                {editing ? "Salvar alterações" : "Criar evento"}
              </button>
            </div>
          </form>
        </div>
      )}
    </>
  );
}

function Field({ label, children }) {
  return (
    <div>
      <label style={{ display: "block", marginBottom: 6, color: "var(--muted)", fontSize: 12, fontWeight: 600 }}>{label}</label>
      {children}
    </div>
  );
}

const input = {
  width: "100%", height: 42, padding: "0 14px", border: "1px solid var(--line)",
  borderRadius: 9, outline: "none", color: "var(--text)", background: "var(--surface)",
  fontFamily: "var(--font-body)", fontSize: 13
};

const iconBtn = {
  width: 35, height: 35, display: "grid", placeItems: "center",
  border: "1px solid var(--line)", borderRadius: 9, color: "var(--muted)",
  background: "var(--surface)", cursor: "pointer"
};

function toLocalInput(iso) {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  const pad = n => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}