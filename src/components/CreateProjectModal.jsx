import { useState } from "react";
import { X, Plus } from "lucide-react";
import { createProject } from "../services/projects.js";
import { showToast } from "../utils/toast.js";
import IconPicker from "./IconPicker.jsx";

const palette = ["#6b8eb3", "#6da87c", "#c4a358", "#c76b60", "#b77cb8", "#d1ba9e"];

export default function CreateProjectModal({ open, onClose, onCreated }) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [icon, setIcon] = useState("Sparkles");
  const [color, setColor] = useState(palette[0]);
  const [deadline, setDeadline] = useState("");
  const [saving, setSaving] = useState(false);

  if (!open) return null;

  async function handleSubmit(e) {
    e.preventDefault();
    if (!name.trim()) return;
    setSaving(true);
    try {
      const p = await createProject({
        name: name.trim(),
        description: description.trim(),
        icon: icon.toLowerCase(),
        color,
        deadline,
      });
      showToast(`Projeto "${p.name}" criado`);
      onCreated(p);
      onClose();
      setName(""); setDescription(""); setIcon("Sparkles"); setColor(palette[0]); setDeadline("");
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
        width: "min(500px, 100%)", maxHeight: "90vh", overflowY: "auto",
        border: "1px solid #37362f", borderRadius: 18,
        background: "#181815", boxShadow: "var(--shadow)"
      }}>
        <div style={{
          display: "flex", alignItems: "center", justifyContent: "space-between",
          padding: "15px 20px", borderBottom: "1px solid var(--line-soft)",
          background: "rgba(24,24,21,.92)", backdropFilter: "blur(12px)"
        }}>
          <span style={{ color: "var(--muted)", fontSize: 11, textTransform: "uppercase", letterSpacing: ".1em" }}>
            Novo projeto
          </span>
          <button onClick={onClose} style={{
            width: 35, height: 35, display: "grid", placeItems: "center",
            border: "1px solid var(--line)", borderRadius: 9,
            color: "var(--muted)", background: "var(--surface)", cursor: "pointer"
          }}><X size={16} /></button>
        </div>
        <form onSubmit={handleSubmit} style={{ padding: 24 }}>
          <div style={{ display: "grid", gap: 16 }}>
            <div>
              <label style={{ display: "block", marginBottom: 6, color: "var(--muted)", fontSize: 12, fontWeight: 600 }}>Nome</label>
              <input required autoFocus value={name} onChange={e => setName(e.target.value)}
                style={{ width: "100%", height: 42, padding: "0 14px", border: "1px solid var(--line)", borderRadius: 9, outline: "none", color: "var(--text)", background: "var(--surface)" }} />
            </div>
            <div>
              <label style={{ display: "block", marginBottom: 6, color: "var(--muted)", fontSize: 12, fontWeight: 600 }}>Descrição</label>
              <textarea value={description} onChange={e => setDescription(e.target.value)} rows={3}
                style={{ width: "100%", padding: "11px 14px", border: "1px solid var(--line)", borderRadius: 9, outline: "none", color: "var(--text)", background: "var(--surface)", fontFamily: "var(--font-body)", fontSize: 13, resize: "vertical" }} />
            </div>
            <div>
              <label style={{ display: "block", marginBottom: 6, color: "var(--muted)", fontSize: 12, fontWeight: 600 }}>Ícone</label>
              <IconPicker value={icon} onChange={setIcon} />
            </div>
            <div>
              <label style={{ display: "block", marginBottom: 6, color: "var(--muted)", fontSize: 12, fontWeight: 600 }}>Cor</label>
              <div style={{ display: "flex", gap: 8 }}>
                {palette.map(c => (
                  <button key={c} type="button" onClick={() => setColor(c)}
                    style={{
                      width: 36, height: 36, borderRadius: 9, border: color === c ? "2px solid #fff" : "2px solid transparent",
                      background: c, cursor: "pointer", transition: "all var(--transition)"
                    }} />
                ))}
              </div>
            </div>
            <div>
              <label style={{ display: "block", marginBottom: 6, color: "var(--muted)", fontSize: 12, fontWeight: 600 }}>Prazo</label>
              <input value={deadline} onChange={e => setDeadline(e.target.value)} placeholder="Dezembro 2025"
                style={{ width: "100%", height: 42, padding: "0 14px", border: "1px solid var(--line)", borderRadius: 9, outline: "none", color: "var(--text)", background: "var(--surface)" }} />
            </div>
          </div>
          <button type="submit" disabled={saving}
            style={{
              display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
              width: "100%", height: 42, marginTop: 24, border: 0, borderRadius: 9,
              color: "#fff", background: saving ? "var(--muted-2)" : "var(--accent)",
              cursor: saving ? "not-allowed" : "pointer",
              fontSize: 14, fontWeight: 600, fontFamily: "var(--font-body)"
            }}>
            <Plus size={18} /> {saving ? "Criando..." : "Criar projeto"}
          </button>
        </form>
      </div>
    </div>
  );
}
