import { useState } from "react";
import { X, Circle, Clock, CheckCircle2, Package, Save } from "lucide-react";
import { updateMilestone } from "../services/projects.js";
import { showToast } from "../utils/toast.js";

const statusOptions = [
  { value: "backlog", label: "Backlog", icon: Package, color: "var(--muted-3)", bg: "transparent" },
  { value: "todo", label: "A fazer", icon: Circle, color: "var(--muted-2)", bg: "transparent" },
  { value: "in_progress", label: "Em andamento", icon: Clock, color: "#c4a358", bg: "rgba(196,163,88,.15)" },
  { value: "done", label: "Concluído", icon: CheckCircle2, color: "#6da87c", bg: "rgba(109,168,124,.15)" },
];

export default function MilestoneDetail({ milestone, profiles, onClose, onUpdated }) {
  const [status, setStatus] = useState(milestone?.status);
  const [description, setDescription] = useState(milestone?.description || "");
  const [saving, setSaving] = useState(false);

  if (!milestone) return null;

  const current = statusOptions.find(s => s.value === status) || statusOptions[0];
  const StatusIcon = current.icon;

  async function handleSave() {
    setSaving(true);
    try {
      const updated = await updateMilestone(milestone.id, { status, description });
      showToast("Atividade atualizada");
      onUpdated({ ...milestone, status, description });
      onClose();
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
        width: "min(520px, 100%)", maxHeight: "90vh", overflowY: "auto",
        border: "1px solid #37362f", borderRadius: 18,
        background: "#181815", boxShadow: "var(--shadow)"
      }}>
        <div style={{
          display: "flex", alignItems: "center", justifyContent: "space-between",
          padding: "15px 20px", borderBottom: "1px solid var(--line-soft)",
          background: "rgba(24,24,21,.92)", backdropFilter: "blur(12px)"
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <StatusIcon size={15} style={{ color: current.color }} />
            <span style={{ color: "var(--muted)", fontSize: 11, textTransform: "uppercase", letterSpacing: ".1em" }}>
              Atividade
            </span>
          </div>
          <button onClick={onClose} style={{
            width: 35, height: 35, display: "grid", placeItems: "center",
            border: "1px solid var(--line)", borderRadius: 9,
            color: "var(--muted)", background: "var(--surface)", cursor: "pointer"
          }}><X size={16} /></button>
        </div>

        <div style={{ padding: 24 }}>
          <h2 style={{ fontSize: 18, fontWeight: 650, color: "var(--text)", margin: "0 0 16px", fontFamily: "var(--font-heading)" }}>
            {milestone.name}
          </h2>

          <div style={{ marginBottom: 20 }}>
            <label style={{ display: "block", marginBottom: 6, color: "var(--muted)", fontSize: 12, fontWeight: 600 }}>Descrição</label>
            <textarea value={description} onChange={e => setDescription(e.target.value)}
              rows={5}
              placeholder="Nenhuma descrição."
              style={{ width: "100%", padding: "10px 14px", border: "1px solid var(--line)", borderRadius: 9, outline: "none", color: "var(--text)", background: "var(--surface)", resize: "vertical", fontFamily: "var(--font-body)", fontSize: 13 }} />
          </div>

          <div style={{ marginBottom: 20 }}>
            <label style={{ display: "block", marginBottom: 8, color: "var(--muted)", fontSize: 12, fontWeight: 600 }}>Status</label>
            <div style={{ display: "flex", gap: 8 }}>
              {statusOptions.map(opt => {
                const Icon = opt.icon;
                const selected = status === opt.value;
                return (
                  <button key={opt.value} onClick={() => setStatus(opt.value)}
                    style={{
                      flex: 1, display: "flex", alignItems: "center", justifyContent: "center", gap: 6,
                      padding: "10px 8px", border: `1px solid ${selected ? opt.color : "var(--line-soft)"}`,
                      borderRadius: 9, background: selected ? opt.bg : "transparent",
                      cursor: "pointer", color: selected ? opt.color : "var(--muted-2)",
                      fontSize: 11, fontWeight: 600, fontFamily: "var(--font-body)",
                      transition: "all var(--transition)"
                    }}>
                    <Icon size={14} />
                    {opt.label}
                  </button>
                );
              })}
            </div>
          </div>

          <div style={{ marginBottom: 24 }}>
            <label style={{ display: "block", marginBottom: 8, color: "var(--muted)", fontSize: 12, fontWeight: 600 }}>
              Membros alocados ({milestone.members?.length || 0})
            </label>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
              {(milestone.members || []).length === 0 ? (
                <span style={{ fontSize: 12, color: "var(--muted-2)" }}>Nenhum membro</span>
              ) : milestone.members.map(id => {
                const p = profiles.find(prof => String(prof.id) === String(id));
                return (
                  <div key={id} style={{
                    display: "flex", alignItems: "center", gap: 8,
                    padding: "5px 10px 5px 5px", borderRadius: 8,
                    border: "1px solid var(--line-soft)", background: "var(--surface-2)"
                  }}>
                    <div style={{
                      width: 24, height: 24, borderRadius: 6, display: "grid", placeItems: "center",
                      background: p?.color || "#b7c2d2", color: "#0f0f0d",
                      fontSize: 9, fontWeight: 700, fontFamily: "var(--font-heading)"
                    }}>
                      {p?.initials || p?.name?.slice(0, 2).toUpperCase() || "??"}
                    </div>
                    <span style={{ fontSize: 12, color: "var(--text)", fontWeight: 550 }}>
                      {p?.name || "Desconhecido"}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

          <button onClick={handleSave} disabled={saving}
            style={{
              display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
              width: "100%", height: 42, border: 0, borderRadius: 9,
              color: "#fff", background: saving ? "var(--muted-2)" : "var(--accent)",
              cursor: saving ? "not-allowed" : "pointer",
              fontSize: 14, fontWeight: 600, fontFamily: "var(--font-body)"
            }}>
            <Save size={17} /> {saving ? "Salvando..." : "Salvar alterações"}
          </button>
        </div>
      </div>
    </div>
  );
}
