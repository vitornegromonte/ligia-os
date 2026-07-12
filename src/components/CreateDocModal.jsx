import { useState, useEffect } from "react";
import { X, Plus, BookOpen, FlaskConical, FolderOpen } from "lucide-react";
import { createGuide, createResearchDoc, createProjectDoc, fetchProjectDocs } from "../services/docs.js";
import { showToast } from "../utils/toast.js";
import IconPicker from "./IconPicker.jsx";

const guideCategories = ["processos", "marca", "eventos", "infraestrutura"];
const researchAreas = ["nlp", "cv", "ml", "geral"];
const docCategories = ["dados", "técnico", "experimentos", "referências", "métricas", "geral"];

const tabConfig = {
  guias: { icon: BookOpen, label: "Guia", createFn: createGuide, },
  pesquisa: { icon: FlaskConical, label: "Doc de Pesquisa", createFn: createResearchDoc, },
  projetos: { icon: FolderOpen, label: "Doc de Projeto", createFn: createProjectDoc, },
};

export default function CreateDocModal({ open, onClose, onCreated, defaultTab }) {
  const [tab, setTab] = useState(defaultTab || "guias");
  const [title, setTitle] = useState("");
  const [icon, setIcon] = useState("FileText");
  const [category, setCategory] = useState("");
  const [area, setArea] = useState("");
  const [content, setContent] = useState("");
  const [projectId, setProjectId] = useState("");
  const [projects, setProjects] = useState([]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (tab === "projetos") fetchProjectDocs().then(setProjects);
  }, [tab]);

  if (!open) return null;

  async function handleSubmit(e) {
    e.preventDefault();
    if (!title.trim()) return;
    setSaving(true);
    try {
      const cfg = tabConfig[tab];
      const data = { title: title.trim(), icon: icon.toLowerCase(), content };
      if (tab === "guias") {
        data.category = category;
        data.readTime = `${Math.max(1, Math.ceil(content.split(/\s+/).filter(Boolean).length / 200))} min`;
      } else if (tab === "pesquisa") {
        data.area = area;
        data.readTime = `${Math.max(1, Math.ceil(content.split(/\s+/).filter(Boolean).length / 200))} min`;
      } else if (tab === "projetos") {
        if (!projectId) { showToast("Selecione um projeto"); setSaving(false); return; }
        data.project_id = projectId;
        data.category = category;
      }
      const result = await cfg.createFn(data);
      showToast(`"${result.title}" criado`);
      onCreated(result);
      onClose();
      setTitle(""); setIcon("FileText"); setCategory(""); setArea(""); setContent(""); setProjectId("");
    } catch (err) {
      showToast("Erro: " + err.message);
    } finally {
      setSaving(false);
    }
  }

  const tabs = [
    { id: "guias", icon: BookOpen, label: "Guia" },
    { id: "pesquisa", icon: FlaskConical, label: "Pesquisa" },
    { id: "projetos", icon: FolderOpen, label: "Projeto" },
  ];

  return (
    <div onClick={e => { if (e.target === e.currentTarget) onClose(); }} style={{
      position: "fixed", inset: 0, zIndex: 100,
      display: "flex", alignItems: "center", justifyContent: "center",
      padding: 20, background: "rgba(5,5,4,.72)", backdropFilter: "blur(9px)",
    }}>
      <div style={{
        width: "min(580px, 100%)", maxHeight: "90vh", overflowY: "auto",
        border: "1px solid #37362f", borderRadius: 18,
        background: "#181815", boxShadow: "var(--shadow)"
      }}>
        <div style={{
          display: "flex", alignItems: "center", justifyContent: "space-between",
          padding: "15px 20px", borderBottom: "1px solid var(--line-soft)",
          background: "rgba(24,24,21,.92)", backdropFilter: "blur(12px)"
        }}>
          <span style={{ color: "var(--muted)", fontSize: 11, textTransform: "uppercase", letterSpacing: ".1em" }}>
            Nova documentação
          </span>
          <button onClick={onClose} style={{
            width: 35, height: 35, display: "grid", placeItems: "center",
            border: "1px solid var(--line)", borderRadius: 9,
            color: "var(--muted)", background: "var(--surface)", cursor: "pointer"
          }}><X size={16} /></button>
        </div>

        <div style={{ display: "flex", gap: 4, padding: "16px 20px 0", background: "var(--surface-2)" }}>
          {tabs.map(t => {
            const TabIcon = t.icon;
            return (
              <button key={t.id} onClick={() => { setTab(t.id); setCategory(""); setArea(""); }}
                style={{
                  display: "flex", alignItems: "center", gap: 6,
                  padding: "8px 16px", border: 0, cursor: "pointer",
                  borderRadius: "8px 8px 0 0",
                  background: tab === t.id ? "var(--surface)" : "transparent",
                  color: tab === t.id ? "var(--text)" : "var(--muted)",
                  fontSize: 12, fontWeight: 550, fontFamily: "var(--font-body)"
                }}>
                <TabIcon size={15} /> {t.label}
              </button>
            );
          })}
        </div>

        <form onSubmit={handleSubmit} style={{ padding: 24 }}>
          <div style={{ display: "grid", gap: 16 }}>
            <div>
              <label style={{ display: "block", marginBottom: 6, color: "var(--muted)", fontSize: 12, fontWeight: 600 }}>Título</label>
              <input required autoFocus value={title} onChange={e => setTitle(e.target.value)}
                style={{ width: "100%", height: 42, padding: "0 14px", border: "1px solid var(--line)", borderRadius: 9, outline: "none", color: "var(--text)", background: "var(--surface)" }} />
            </div>

            <div>
              <label style={{ display: "block", marginBottom: 6, color: "var(--muted)", fontSize: 12, fontWeight: 600 }}>Ícone</label>
              <IconPicker value={icon} onChange={setIcon} />
            </div>

            {tab === "guias" && (
              <div>
                <label style={{ display: "block", marginBottom: 6, color: "var(--muted)", fontSize: 12, fontWeight: 600 }}>Categoria</label>
                <select value={category} onChange={e => setCategory(e.target.value)}
                  style={{ width: "100%", height: 42, padding: "0 14px", border: "1px solid var(--line)", borderRadius: 9, outline: "none", color: "var(--text)", background: "var(--surface)" }}>
                  <option value="">Selecione</option>
                  {guideCategories.map(c => <option key={c} value={c}>{c.charAt(0).toUpperCase() + c.slice(1)}</option>)}
                </select>
              </div>
            )}

            {tab === "pesquisa" && (
              <div>
                <label style={{ display: "block", marginBottom: 6, color: "var(--muted)", fontSize: 12, fontWeight: 600 }}>Área</label>
                <select value={area} onChange={e => setArea(e.target.value)}
                  style={{ width: "100%", height: 42, padding: "0 14px", border: "1px solid var(--line)", borderRadius: 9, outline: "none", color: "var(--text)", background: "var(--surface)" }}>
                  <option value="">Selecione</option>
                  {researchAreas.map(a => <option key={a} value={a}>{a.toUpperCase()}</option>)}
                </select>
              </div>
            )}

            {tab === "projetos" && (
              <>
                <div>
                  <label style={{ display: "block", marginBottom: 6, color: "var(--muted)", fontSize: 12, fontWeight: 600 }}>Projeto</label>
                  <select value={projectId} onChange={e => setProjectId(e.target.value)}
                    style={{ width: "100%", height: 42, padding: "0 14px", border: "1px solid var(--line)", borderRadius: 9, outline: "none", color: "var(--text)", background: "var(--surface)" }}>
                    <option value="">Selecione um projeto</option>
                    {projects.map(p => <option key={p.id} value={p.id}>{p.title}</option>)}
                  </select>
                </div>
                <div>
                  <label style={{ display: "block", marginBottom: 6, color: "var(--muted)", fontSize: 12, fontWeight: 600 }}>Categoria</label>
                  <select value={category} onChange={e => setCategory(e.target.value)}
                    style={{ width: "100%", height: 42, padding: "0 14px", border: "1px solid var(--line)", borderRadius: 9, outline: "none", color: "var(--text)", background: "var(--surface)" }}>
                    <option value="">Selecione</option>
                    {docCategories.map(c => <option key={c} value={c}>{c.charAt(0).toUpperCase() + c.slice(1)}</option>)}
                  </select>
                </div>
              </>
            )}

            <div>
              <label style={{ display: "block", marginBottom: 6, color: "var(--muted)", fontSize: 12, fontWeight: 600 }}>Conteúdo (Markdown)</label>
              <textarea required value={content} onChange={e => setContent(e.target.value)} rows={12}
                placeholder="# Título&#10;&#10;Escreva o conteúdo em markdown..."
                style={{ width: "100%", padding: "11px 14px", border: "1px solid var(--line)", borderRadius: 9, outline: "none", color: "var(--text)", background: "var(--surface)", fontFamily: "'SF Mono','Fira Code',monospace", fontSize: 12, resize: "vertical" }} />
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
            <Plus size={18} /> {saving ? "Criando..." : `Criar ${tabConfig[tab].label}`}
          </button>
        </form>
      </div>
    </div>
  );
}
