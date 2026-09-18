import { useState } from "react";
import { X, GraduationCap, Github, Linkedin, Award, ExternalLink, CalendarDays, FileText, Image as ImageIcon } from "lucide-react";
import { useAuth } from "../contexts/AuthContext.jsx";
import { updateProfile } from "../services/profiles.js";
import { showToast } from "../utils/toast.js";

const teams = ["NLP", "ML", "CV", "Comunicação"];

export default function ProfileEdit({ open, onClose }) {
  const { profile, refreshProfile } = useAuth();
  const [form, setForm] = useState(null);
  const [saving, setSaving] = useState(false);

  if (!open || !profile) return null;

  const f = form ?? {
    ...profile,
    skills_string: (profile.skills || []).join(", "),
    research_interests: profile.researchInterests || profile.research_interests || "",
    avatar_url: profile.avatar_url || "",
  };

  function handleChange(key, value) {
    setForm({
      ...(form || {
        ...profile,
        skills_string: (profile.skills || []).join(", "),
        research_interests: profile.researchInterests || profile.research_interests || "",
        avatar_url: profile.avatar_url || "",
      }),
      [key]: value,
    });
  }

  async function handleSave(e) {
    e.preventDefault();
    setSaving(true);
    try {
      const payload = { ...(form || {}) };
      delete payload.role;
      if (payload.skills_string !== undefined) {
        payload.skills = payload.skills_string.split(",").map(s => s.trim()).filter(Boolean);
        delete payload.skills_string;
      }
      if (payload.avatar_url !== undefined) {
        payload.avatar_url = String(payload.avatar_url).trim();
      }
      // Garante que interesses vão como research_interests (coluna do banco)
      if (payload.researchInterests !== undefined && payload.research_interests === undefined) {
        payload.research_interests = payload.researchInterests;
        delete payload.researchInterests;
      }
      await updateProfile(profile.id, payload);
      refreshProfile();
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
        border: "1px solid var(--line)", borderRadius: "var(--radius-lg)",
        background: "var(--surface)", boxShadow: "var(--shadow)"
      }}>
        <div style={{
          position: "sticky", top: 0, zIndex: 2,
          display: "flex", alignItems: "center", justifyContent: "space-between",
          padding: "15px 20px", borderBottom: "1px solid var(--line-soft)",
          background: "rgba(24,21,18,.92)", backdropFilter: "blur(12px)"
        }}>
          <span style={{ color: "var(--muted)", fontSize: 11, textTransform: "uppercase", letterSpacing: ".1em" }}>
            Editar perfil
          </span>
          <button aria-label="Fechar" onClick={onClose} style={{
            width: 35, height: 35, display: "grid", placeItems: "center",
            border: "1px solid var(--line)", borderRadius: 9,
            color: "var(--muted)", background: "var(--surface)",
            cursor: "pointer"
          }}>
            <X size={16} aria-hidden="true" />
          </button>
        </div>

        <form onSubmit={handleSave} style={{ padding: 24 }}>
          <div style={{ display: "grid", gap: 16, marginBottom: 24 }}>
            <div>
              <label style={{ display: "block", marginBottom: 6, color: "var(--muted)", fontSize: 12, fontWeight: 600 }}>Foto de perfil</label>
              <div style={{ display: "flex", gap: 14, alignItems: "center" }}>
                <div style={{
                  width: 64, height: 64, borderRadius: "50%", overflow: "hidden",
                  border: "1px solid var(--line-soft)", background: "var(--surface-2)",
                  display: "grid", placeItems: "center", flex: "0 0 auto"
                }}>
                  {f.avatar_url ? (
                    <img src={f.avatar_url} alt="Prévia" width="64" height="64" style={{ width: "100%", height: "100%", objectFit: "cover" }}
                      onError={e => { e.currentTarget.style.display = "none"; }} />
                  ) : (
                    <span style={{ color: "#17140f", background: profile.color || "#e7c8a6", width: "100%", height: "100%", display: "grid", placeItems: "center", fontWeight: 750, fontSize: 16, fontFamily: "var(--font-heading)" }}>
                      {profile.initials || profile.name?.slice(0, 2).toUpperCase() || "??"}
                    </span>
                  )}
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <ImageIcon size={16} style={{ color: "var(--accent)", flexShrink: 0 }} />
                    <input id="profile-avatar" name="avatar_url" type="url" autoComplete="photo" spellCheck={false} value={f.avatar_url || ""} onChange={e => handleChange("avatar_url", e.target.value)}
                      placeholder="https://exemplo.com/foto.jpg…"
                      style={{
                        flex: 1, height: 42, padding: "0 14px",
                        border: "1px solid var(--line)", borderRadius: 9,
                        outline: "none", color: "var(--text)", background: "var(--surface)"
                      }} />
                  </div>
                  <div style={{ color: "var(--muted-2)", fontSize: 11, marginTop: 6 }}>Cole a URL da imagem. Deixe em branco para usar iniciais.</div>
                </div>
              </div>
            </div>
            <div>
              <label htmlFor="profile-name" style={{ display: "block", marginBottom: 6, color: "var(--muted)", fontSize: 12, fontWeight: 600 }}>Nome</label>
              <input id="profile-name" name="name" autoComplete="name" value={f.name} onChange={e => handleChange("name", e.target.value)}
                style={{
                  width: "100%", height: 42, padding: "0 14px",
                  border: "1px solid var(--line)", borderRadius: 9,
                  outline: "none", color: "var(--text)", background: "var(--surface)"
                }} />
            </div>
            <div>
              <label htmlFor="profile-email" style={{ display: "block", marginBottom: 6, color: "var(--muted)", fontSize: 12, fontWeight: 600 }}>Email</label>
              <input id="profile-email" name="email" autoComplete="email" spellCheck={false} value={f.email} disabled
                style={{
                  width: "100%", height: 42, padding: "0 14px",
                  border: "1px solid var(--line)", borderRadius: 9,
                  outline: "none", color: "var(--muted)", background: "var(--surface-2)",
                  cursor: "not-allowed"
                }} />
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
              <div>
                <label htmlFor="profile-team" style={{ display: "block", marginBottom: 6, color: "var(--muted)", fontSize: 12, fontWeight: 600 }}>Equipe</label>
                <select id="profile-team" name="team" value={f.team || ""} onChange={e => handleChange("team", e.target.value)}
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
                <label htmlFor="profile-affiliation" style={{ display: "block", marginBottom: 6, color: "var(--muted)", fontSize: 12, fontWeight: 600 }}>Vínculo</label>
                <input id="profile-affiliation" name="affiliation" autoComplete="organization" value={f.affiliation || ""} onChange={e => handleChange("affiliation", e.target.value)}
                  placeholder="CIn-UFPE"
                  style={{
                    width: "100%", height: 42, padding: "0 14px",
                    border: "1px solid var(--line)", borderRadius: 9,
                    outline: "none", color: "var(--text)", background: "var(--surface)"
                  }} />
              </div>
            </div>
            <div>
              <label htmlFor="profile-bio" style={{ display: "block", marginBottom: 6, color: "var(--muted)", fontSize: 12, fontWeight: 600 }}>Bio</label>
              <textarea id="profile-bio" name="bio" value={f.bio || ""} onChange={e => handleChange("bio", e.target.value)}
                rows={3} placeholder="Fale um pouco sobre você"
                style={{
                  width: "100%", padding: "11px 14px", resize: "vertical",
                  border: "1px solid var(--line)", borderRadius: 9,
                  outline: "none", color: "var(--text)", background: "var(--surface)",
                  fontFamily: "var(--font-body)", fontSize: 13
                }} />
            </div>
            <div>
              <label htmlFor="profile-skills" style={{ display: "block", marginBottom: 6, color: "var(--muted)", fontSize: 12, fontWeight: 600 }}>Habilidades (separadas por vírgula)</label>
              <input id="profile-skills" name="skills" autoComplete="off" value={f.skills_string || ""} onChange={e => handleChange("skills_string", e.target.value)}
                placeholder="Python, PyTorch, NLP"
                style={{
                  width: "100%", height: 42, padding: "0 14px",
                  border: "1px solid var(--line)", borderRadius: 9,
                  outline: "none", color: "var(--text)", background: "var(--surface)"
                }} />
            </div>
            <div>
              <label htmlFor="profile-research" style={{ display: "block", marginBottom: 6, color: "var(--muted)", fontSize: 12, fontWeight: 600 }}>Interesses de pesquisa</label>
              <textarea id="profile-research" name="research_interests" value={f.research_interests || ""} onChange={e => handleChange("research_interests", e.target.value)}
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
                  <GraduationCap aria-hidden="true" size={16} style={{ color: "var(--accent)", flexShrink: 0 }} />
                  <input id="profile-lattes" name="lattes" type="url" autoComplete="url" spellCheck={false} value={f.lattes || ""} onChange={e => handleChange("lattes", e.target.value)}
                    placeholder="http://lattes.cnpq.br/…"
                    style={{
                      flex: 1, height: 42, padding: "0 14px",
                      border: "1px solid var(--line)", borderRadius: 9,
                      outline: "none", color: "var(--text)", background: "var(--surface)"
                    }} />
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <Github aria-hidden="true" size={16} style={{ color: "var(--accent)", flexShrink: 0 }} />
                  <input id="profile-github" name="github" type="url" autoComplete="url" spellCheck={false} value={f.github || ""} onChange={e => handleChange("github", e.target.value)}
                    placeholder="https://github.com/usuario…"
                    style={{
                      flex: 1, height: 42, padding: "0 14px",
                      border: "1px solid var(--line)", borderRadius: 9,
                      outline: "none", color: "var(--text)", background: "var(--surface)"
                    }} />
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <Linkedin aria-hidden="true" size={16} style={{ color: "var(--accent)", flexShrink: 0 }} />
                  <input id="profile-linkedin" name="linkedin" type="url" autoComplete="url" spellCheck={false} value={f.linkedin || ""} onChange={e => handleChange("linkedin", e.target.value)}
                    placeholder="https://linkedin.com/in/usuario…"
                    style={{
                      flex: 1, height: 42, padding: "0 14px",
                      border: "1px solid var(--line)", borderRadius: 9,
                      outline: "none", color: "var(--text)", background: "var(--surface)"
                    }} />
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <Award aria-hidden="true" size={16} style={{ color: "var(--accent)", flexShrink: 0 }} />
                  <input id="profile-kaggle" name="kaggle" type="url" autoComplete="url" spellCheck={false} value={f.kaggle || ""} onChange={e => handleChange("kaggle", e.target.value)}
                    placeholder="https://kaggle.com/usuario…"
                    style={{
                      flex: 1, height: 42, padding: "0 14px",
                      border: "1px solid var(--line)", borderRadius: 9,
                      outline: "none", color: "var(--text)", background: "var(--surface)"
                    }} />
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <ExternalLink aria-hidden="true" size={16} style={{ color: "var(--accent)", flexShrink: 0 }} />
                  <input id="profile-cv" name="cv" type="url" autoComplete="url" spellCheck={false} value={f.cv || ""} onChange={e => handleChange("cv", e.target.value)}
                    placeholder="Link do CV (Google Drive, Dropbox…)…"
                    style={{
                      flex: 1, height: 42, padding: "0 14px",
                      border: "1px solid var(--line)", borderRadius: 9,
                      outline: "none", color: "var(--text)", background: "var(--surface)"
                    }} />
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <CalendarDays aria-hidden="true" size={16} style={{ color: "var(--accent)", flexShrink: 0 }} />
                  <input id="profile-calendar" name="calendar_url" type="url" autoComplete="url" spellCheck={false} value={f.calendar_url || ""} onChange={e => handleChange("calendar_url", e.target.value)}
                    placeholder="Link da agenda pública (Google Calendar…)…"
                    style={{
                      flex: 1, height: 42, padding: "0 14px",
                      border: "1px solid var(--line)", borderRadius: 9,
                      outline: "none", color: "var(--text)", background: "var(--surface)"
                    }} />
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <FileText aria-hidden="true" size={16} style={{ color: "var(--accent)", flexShrink: 0 }} />
                  <input id="profile-resume" name="resume_text" autoComplete="off" value={f.resume_text || ""} onChange={e => handleChange("resume_text", e.target.value)}
                    placeholder="Texto integral do currículo (para o buscador de vagas)…"
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
