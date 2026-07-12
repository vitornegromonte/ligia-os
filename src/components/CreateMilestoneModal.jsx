import { useState, useEffect } from "react";
import { X, Plus, Check } from "lucide-react";
import { createMilestone } from "../services/projects.js";
import { fetchProfiles } from "../services/profiles.js";
import { showToast } from "../utils/toast.js";

export default function CreateMilestoneModal({ open, projectId, projectName, onClose, onCreated }) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [members, setMembers] = useState([]);
  const [profiles, setProfiles] = useState([]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) fetchProfiles().then(setProfiles);
  }, [open]);

  if (!open) return null;

  function toggleMember(id) {
    setMembers(prev => prev.includes(id) ? prev.filter(m => m !== id) : [...prev, id]);
  }

  async function handleSubmit(e) {
    e.preventDefault();
    if (!name.trim()) return;
    setSaving(true);
    try {
      const m = await createMilestone(projectId, name.trim(), description.trim(), members);
      showToast(`Marco "${m.name}" criado`);
      onCreated(m);
      onClose();
      setName(""); setDescription(""); setMembers([]);
    } catch (err) {
      showToast("Erro: " + err.message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div onClick={e => { if (e.target === e.currentTarget) onClose(); }} style={{
      position: "fixed", inset: 0, zIndex: 100,
      display: "flex", alignItems: "center", justifyContent: "center",
      padding: 20, background: "rgba(5,5,4,.72)", backdropFilter: "blur(9px)",
    }}>
      <div style={{
        width: "min(480px, 100%)", maxHeight: "90vh", overflowY: "auto",
        border: "1px solid #37362f", borderRadius: 18,
        background: "#181815", boxShadow: "var(--shadow)"
      }}>
        <div style={{
          display: "flex", alignItems: "center", justifyContent: "space-between",
          padding: "15px 20px", borderBottom: "1px solid var(--line-soft)",
          background: "rgba(24,24,21,.92)", backdropFilter: "blur(12px)"
        }}>
          <span style={{ color: "var(--muted)", fontSize: 11, textTransform: "uppercase", letterSpacing: ".1em" }}>
            Novo marco · {projectName}
          </span>
          <button onClick={onClose} style={{
            width: 35, height: 35, display: "grid", placeItems: "center",
            border: "1px solid var(--line)", borderRadius: 9,
            color: "var(--muted)", background: "var(--surface)", cursor: "pointer"
          }}><X size={16} /></button>
        </div>
        <form onSubmit={handleSubmit} style={{ padding: 24 }}>
          <div style={{ marginBottom: 20 }}>
            <label style={{ display: "block", marginBottom: 6, color: "var(--muted)", fontSize: 12, fontWeight: 600 }}>Nome da atividade</label>
            <input required autoFocus value={name} onChange={e => setName(e.target.value)}
              placeholder="Ex: Coleta de dados"
              style={{ width: "100%", height: 42, padding: "0 14px", border: "1px solid var(--line)", borderRadius: 9, outline: "none", color: "var(--text)", background: "var(--surface)" }} />
          </div>

          <div style={{ marginBottom: 20 }}>
            <label style={{ display: "block", marginBottom: 6, color: "var(--muted)", fontSize: 12, fontWeight: 600 }}>Descrição</label>
            <textarea value={description} onChange={e => setDescription(e.target.value)}
              placeholder="Descreva o que será feito..."
              rows={4}
              style={{ width: "100%", padding: "10px 14px", border: "1px solid var(--line)", borderRadius: 9, outline: "none", color: "var(--text)", background: "var(--surface)", resize: "vertical", fontFamily: "var(--font-body)", fontSize: 13 }} />
          </div>

          <div style={{ marginBottom: 20 }}>
            <label style={{ display: "block", marginBottom: 8, color: "var(--muted)", fontSize: 12, fontWeight: 600 }}>
              Alocar membros ({members.length} selecionado{members.length !== 1 ? "s" : ""})
            </label>
            <div style={{ display: "flex", flexDirection: "column", gap: 4, maxHeight: 260, overflowY: "auto" }}>
              {profiles.map(p => {
                const selected = members.includes(p.id);
                return (
                  <button key={p.id} type="button" onClick={() => toggleMember(p.id)}
                    style={{
                      display: "flex", alignItems: "center", gap: 10,
                      padding: "9px 12px", border: `1px solid ${selected ? "var(--accent-border)" : "var(--line-soft)"}`,
                      borderRadius: 8, background: selected ? "var(--accent-soft)" : "transparent",
                      cursor: "pointer", textAlign: "left",
                      transition: "all var(--transition)"
                    }}>
                    <div style={{
                      width: 28, height: 28, borderRadius: 7, display: "grid", placeItems: "center",
                      background: p.color || "#e7c8a6", color: "#17140f",
                      fontSize: 10, fontWeight: 700, fontFamily: "var(--font-heading)", flexShrink: 0
                    }}>
                      {p.initials || p.name?.slice(0, 2).toUpperCase() || "??"}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 13, fontWeight: 550, color: "var(--text)" }}>{p.name}</div>
                      <div style={{ fontSize: 10, color: "var(--muted-2)" }}>{p.team || p.affiliation || ""}</div>
                    </div>
                    {selected && <Check size={16} style={{ color: "var(--accent)", flexShrink: 0 }} />}
                  </button>
                );
              })}
            </div>
          </div>

          <button type="submit" disabled={saving}
            style={{
              display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
              width: "100%", height: 42, border: 0, borderRadius: 9,
              color: "#fff", background: saving ? "var(--muted-2)" : "var(--accent)",
              cursor: saving ? "not-allowed" : "pointer",
              fontSize: 14, fontWeight: 600, fontFamily: "var(--font-body)"
            }}>
            <Plus size={18} /> {saving ? "Criando..." : "Criar marco"}
          </button>
        </form>
      </div>
    </div>
  );
}
