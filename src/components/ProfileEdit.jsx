import { useState } from "react";
import { X, GraduationCap, Github, Linkedin, Award, ExternalLink } from "lucide-react";
import { useAuth } from "../contexts/AuthContext.jsx";
import { updateProfile } from "../services/profiles.js";
import { showToast } from "../utils/toast.js";

const teams = ["NLP", "ML", "CV", "Comunicação"];

export default function ProfileEdit({ open, onClose }) {
  const { profile, setProfile } = useAuth();
  const [form, setForm] = useState(null);
  const [saving, setSaving] = useState(false);

  if (!open || !profile) return null;

  const f = form ?? { ...profile, skills_string: (profile.skills || []).join(", ") };

  function handleChange(key, value) {
    setForm({ ...(form || { ...profile, skills_string: (profile.skills || []).join(", ") }), [key]: value });
  }

  async function handleSave(e) {
    e.preventDefault();
    setSaving(true);
    try {
      const payload = { ...form };
      if (payload.skills_string !== undefined) {
        payload.skills = payload.skills_string.split(",").map(s => s.trim()).filter(Boolean);
        delete payload.skills_string;
      }
      const updated = await updateProfile(profile.id, payload);
      setProfile(updated);
      setForm(null);
      showToast("Perfil atualizado");
      onClose();
    } catch (err) {
      showToast("Erro ao salvar: " + err.message);
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
        width: "min(540px, 100%)", maxHeight: "90vh", overflowY: "auto",
        border: "1px solid #37362f", borderRadius: 18,
        background: "#181815", boxShadow: "var(--shadow)"
      }}>
        <div style={{
          position: "sticky", top: 0, zIndex: 2,
          display: "flex", alignItems: "center", justifyContent: "space-between",
          padding: "15px 20px", borderBottom: "1px solid var(--line-soft)",
          background: "rgba(24,24,21,.92)", backdropFilter: "blur(12px)"
        }}>
          <span style={{ color: "var(--muted)", fontSize: 11, textTransform: "uppercase", letterSpacing: ".1em" }}>
            Editar perfil
          </span>
          <button onClick={onClose} style={{
            width: 35, height: 35, display: "grid", placeItems: "center",
            border: "1px solid var(--line)", borderRadius: 9,
            color: "var(--muted)", background: "var(--surface)",
            cursor: "pointer"
          }}>
            <X size={16} />
          </button>
        </div>

        <form onSubmit={handleSave} style={{ padding: 24 }}>
          <div style={{ display: "grid", gap: 16, marginBottom: 24 }}>
            <div>
              <label style={{ display: "block", marginBottom: 6, color: "var(--muted)", fontSize: 12, fontWeight: 600 }}>Nome</label>
              <input value={f.name} onChange={e => handleChange("name", e.target.value)}
                style={{
                  width: "100%", height: 42, padding: "0 14px",
                  border: "1px solid var(--line)", borderRadius: 9,
                  outline: "none", color: "var(--text)", background: "var(--surface)"
                }} />
            </div>
            <div>
              <label style={{ display: "block", marginBottom: 6, color: "var(--muted)", fontSize: 12, fontWeight: 600 }}>Email</label>
              <input value={f.email} disabled
                style={{
                  width: "100%", height: 42, padding: "0 14px",
                  border: "1px solid var(--line)", borderRadius: 9,
                  outline: "none", color: "var(--muted)", background: "var(--surface-2)",
                  cursor: "not-allowed"
                }} />
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
              <div>
                <label style={{ display: "block", marginBottom: 6, color: "var(--muted)", fontSize: 12, fontWeight: 600 }}>Equipe</label>
                <select value={f.team || ""} onChange={e => handleChange("team", e.target.value)}
                  style={{
                    width: "100%", height: 42, padding: "0 14px",
                    border: "1px solid var(--line)", borderRadius: 9,
                    outline: "none", color: "var(--text)", background: "var(--surface)"
                  }}>
                  <option value="">Selecione</option>
                  {teams.map(t => <option key={t} value={t}>{t}</option>)}
                </select>
              </div>
              <div>
                <label style={{ display: "block", marginBottom: 6, color: "var(--muted)", fontSize: 12, fontWeight: 600 }}>Vínculo</label>
                <input value={f.affiliation || ""} onChange={e => handleChange("affiliation", e.target.value)}
                  placeholder="CIn-UFPE"
                  style={{
                    width: "100%", height: 42, padding: "0 14px",
                    border: "1px solid var(--line)", borderRadius: 9,
                    outline: "none", color: "var(--text)", background: "var(--surface)"
                  }} />
              </div>
            </div>
            <div>
              <label style={{ display: "block", marginBottom: 6, color: "var(--muted)", fontSize: 12, fontWeight: 600 }}>Bio</label>
              <textarea value={f.bio || ""} onChange={e => handleChange("bio", e.target.value)}
                rows={3} placeholder="Fale um pouco sobre você"
                style={{
                  width: "100%", padding: "11px 14px", resize: "vertical",
                  border: "1px solid var(--line)", borderRadius: 9,
                  outline: "none", color: "var(--text)", background: "var(--surface)",
                  fontFamily: "var(--font-body)", fontSize: 13
                }} />
            </div>
            <div>
              <label style={{ display: "block", marginBottom: 6, color: "var(--muted)", fontSize: 12, fontWeight: 600 }}>Habilidades (separadas por vírgula)</label>
              <input value={f.skills_string || ""} onChange={e => handleChange("skills_string", e.target.value)}
                placeholder="Python, PyTorch, NLP"
                style={{
                  width: "100%", height: 42, padding: "0 14px",
                  border: "1px solid var(--line)", borderRadius: 9,
                  outline: "none", color: "var(--text)", background: "var(--surface)"
                }} />
            </div>
            <div>
              <label style={{ display: "block", marginBottom: 6, color: "var(--muted)", fontSize: 12, fontWeight: 600 }}>Interesses de pesquisa</label>
              <textarea value={f.research_interests || ""} onChange={e => handleChange("research_interests", e.target.value)}
                rows={2} placeholder="Modelos de linguagem, análise de sentimentos…"
                style={{
                  width: "100%", padding: "11px 14px", resize: "vertical",
                  border: "1px solid var(--line)", borderRadius: 9,
                  outline: "none", color: "var(--text)", background: "var(--surface)",
                  fontFamily: "var(--font-body)", fontSize: 13
                }} />
            </div>
            <div>
              <label style={{ display: "block", marginBottom: 8, color: "var(--muted)", fontSize: 12, fontWeight: 600 }}>Redes acadêmicas</label>
              <div style={{ display: "grid", gap: 10 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <GraduationCap size={16} style={{ color: "var(--accent)", flexShrink: 0 }} />
                  <input value={f.lattes || ""} onChange={e => handleChange("lattes", e.target.value)}
                    placeholder="http://lattes.cnpq.br/..."
                    style={{
                      flex: 1, height: 42, padding: "0 14px",
                      border: "1px solid var(--line)", borderRadius: 9,
                      outline: "none", color: "var(--text)", background: "var(--surface)"
                    }} />
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <Github size={16} style={{ color: "var(--accent)", flexShrink: 0 }} />
                  <input value={f.github || ""} onChange={e => handleChange("github", e.target.value)}
                    placeholder="https://github.com/usuario"
                    style={{
                      flex: 1, height: 42, padding: "0 14px",
                      border: "1px solid var(--line)", borderRadius: 9,
                      outline: "none", color: "var(--text)", background: "var(--surface)"
                    }} />
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <Linkedin size={16} style={{ color: "var(--accent)", flexShrink: 0 }} />
                  <input value={f.linkedin || ""} onChange={e => handleChange("linkedin", e.target.value)}
                    placeholder="https://linkedin.com/in/usuario"
                    style={{
                      flex: 1, height: 42, padding: "0 14px",
                      border: "1px solid var(--line)", borderRadius: 9,
                      outline: "none", color: "var(--text)", background: "var(--surface)"
                    }} />
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <Award size={16} style={{ color: "var(--accent)", flexShrink: 0 }} />
                  <input value={f.kaggle || ""} onChange={e => handleChange("kaggle", e.target.value)}
                    placeholder="https://kaggle.com/usuario"
                    style={{
                      flex: 1, height: 42, padding: "0 14px",
                      border: "1px solid var(--line)", borderRadius: 9,
                      outline: "none", color: "var(--text)", background: "var(--surface)"
                    }} />
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <ExternalLink size={16} style={{ color: "var(--accent)", flexShrink: 0 }} />
                  <input value={f.cv || ""} onChange={e => handleChange("cv", e.target.value)}
                    placeholder="Link do CV (Google Drive, Dropbox…)"
                    style={{
                      flex: 1, height: 42, padding: "0 14px",
                      border: "1px solid var(--line)", borderRadius: 9,
                      outline: "none", color: "var(--text)", background: "var(--surface)"
                    }} />
                </div>
              </div>
            </div>
          </div>

          <button type="submit" disabled={saving}
            style={{
              width: "100%", height: 42, border: 0, borderRadius: 9,
              color: "#fff", background: saving ? "var(--muted-2)" : "var(--accent)",
              cursor: saving ? "not-allowed" : "pointer",
              fontSize: 14, fontWeight: 600, fontFamily: "var(--font-body)"
            }}>
            {saving ? "Salvando..." : "Salvar alterações"}
          </button>
        </form>
      </div>
    </div>
  );
}
