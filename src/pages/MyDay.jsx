import { useOutletContext } from "react-router-dom";
import { useState, useEffect, useMemo, useCallback } from "react";
import { Menu, Plus, Search } from "lucide-react";
import { showToast } from "../utils/toast.js";
import { openGlobalSearch } from "../utils/searchBus.js";
import NotificationsBell from "../components/NotificationsBell.jsx";
import { fetchTasks, createTask, updateTask, deleteTask } from "../services/tasks.js";
import { fetchProjectsWithMilestones, updateMilestone, deleteMilestone } from "../services/projects.js";
import { fetchProfiles } from "../services/profiles.js";
import { useAuth } from "../contexts/AuthContext.jsx";
import { useRealtime } from "../hooks/useRealtime.js";
import DbView from "../components/db/DbView.jsx";

const statusOptions = [
  { value: "backlog", label: "Backlog", color: "var(--muted-3)", bg: "rgba(90,87,79,.15)" },
  { value: "todo", label: "A fazer", color: "var(--muted-2)", bg: "rgba(180,177,168,.12)" },
  { value: "in_progress", label: "Em andamento", color: "#c4a358", bg: "rgba(196,163,88,.15)" },
  { value: "done", label: "Concluído", color: "#6da87c", bg: "rgba(109,168,124,.15)" },
  { value: "canceled", label: "Cancelado", color: "#c76b60", bg: "rgba(199,107,96,.12)" },
];

const priorityOptions = [
  { value: "low", label: "Baixa", color: "#6da87c", bg: "rgba(109,168,124,.12)" },
  { value: "medium", label: "Média", color: "#c4a358", bg: "rgba(196,163,88,.12)" },
  { value: "high", label: "Alta", color: "#ff4b1f", bg: "rgba(255,75,31,.12)" },
];

const columns = [
  { key: "title", label: "Título", type: "title", editable: true },
  {
    key: "source", label: "Tipo", type: "tag",
    options: [
      { value: "task", label: "Tarefa", color: "var(--accent)", bg: "rgba(255,75,31,.12)" },
      { value: "milestone", label: "Marco", color: "#6b8eb3", bg: "rgba(107,142,179,.12)" },
    ],
  },
  { key: "project_id", label: "Projeto", type: "relation", relation: "projects", editable: true },
  { key: "status", label: "Status", type: "status", options: statusOptions, editable: true },
  { key: "priority", label: "Prioridade", type: "tag", options: priorityOptions, editable: true },
  { key: "due_date", label: "Vencimento", type: "date", editable: true },
  { key: "members", label: "Pessoas", type: "people" },
  { key: "description", label: "Descrição", type: "longText" },
];

const config = {
  id: "myday",
  title: "tarefas",
  titleColumn: "title",
  columns,
  views: ["board", "table", "calendar", "list"],
  defaultView: "board",
  boardBy: "status",
  calendarBy: "due_date",
  createLabel: "Nova tarefa",
  filters: [
    { key: "status", label: "Status", options: statusOptions },
    { key: "priority", label: "Prioridade", options: priorityOptions },
    { key: "source", label: "Tipo", options: [{ value: "task", label: "Tarefa" }, { value: "milestone", label: "Marco" }] },
  ],
  searchColumns: ["title", "description"],
  toolbar: { search: true, viewSwitcher: true },
  emptyTitle: "Você está em dia 🎉",
  emptyText: "Suas tarefas e marcos atribuídos aparecem aqui. Crie sua primeira tarefa acima.",
};

export default function MyDay() {
  const { menuOpen, setMenuOpen } = useOutletContext();
  const { profile } = useAuth();
  const [rows, setRows] = useState([]);
  const [profiles, setProfiles] = useState([]);
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [quick, setQuick] = useState("");

  useEffect(() => {
    document.title = "Ligia — Meu Dia";
    window.scrollTo({ top: 0 });
    loadData();
  }, []);

  async function loadData() {
    try {
      const [tasks, proj, profs] = await Promise.all([
        fetchTasks(profile?.id),
        fetchProjectsWithMilestones(profile?.id, profile?.role),
        fetchProfiles(),
      ]);
      setProfiles(profs);
      const projectList = proj.map(p => ({ id: p.id, name: p.name, color: p.color }));
      setProjects(projectList);
      const myMilestones = [];
      proj.forEach(p => {
        (p.milestones || []).forEach(m => {
          if ((m.members || []).map(String).includes(String(profile?.id))) {
            myMilestones.push({
              id: m.id,
              title: m.name,
              description: m.description || "",
              status: m.status || "todo",
              due_date: m.due_date || "",
              project_id: p.id,
              members: m.members || [],
              source: "milestone",
            });
          }
        });
      });
      setRows([
        ...(tasks || []).map(t => ({ ...t, members: [], source: "task" })),
        ...myMilestones,
      ]);
    } catch (e) {
      console.warn("MyDay load error:", e.message);
    } finally {
      setLoading(false);
    }
  }

  const refresh = useCallback(() => loadData(), [profile?.id, profile?.role]);
  useRealtime("tasks", refresh);
  useRealtime("milestones", refresh);

  const ctx = useMemo(() => ({ profiles, projects, currentId: profile?.id }), [profiles, projects, profile?.id]);

  async function handleUpdate(id, patch) {
    const row = rows.find(r => r.id === id);
    if (!row) return;
    try {
      if (row.source === "milestone") {
        const updates = {};
        if (patch.status !== undefined) updates.status = patch.status;
        if (patch.description !== undefined) updates.description = patch.description;
        if (patch.due_date !== undefined) updates.due_date = patch.due_date || null;
        if (patch.title !== undefined) updates.name = patch.title;
        await updateMilestone(id, updates);
      } else {
        await updateTask(id, patch);
      }
      setRows(prev => prev.map(r => r.id === id ? { ...r, ...patch } : r));
    } catch (e) {
      showToast("Erro: " + e.message);
    }
  }

  async function handleDelete(id) {
    const row = rows.find(r => r.id === id);
    if (!row) return;
    try {
      if (row.source === "milestone") {
        await deleteMilestone(id);
      } else {
        await deleteTask(id);
      }
      setRows(prev => prev.filter(r => r.id !== id));
      showToast("Item removido");
    } catch (e) {
      showToast("Erro: " + e.message);
    }
  }

  async function handleCreate() {
    try {
      const t = await createTask({ title: "Nova tarefa", status: "todo", priority: "medium" });
      setRows(prev => [{ ...t, source: "task", members: [] }, ...prev]);
      showToast("Tarefa criada — edite no lugar");
    } catch (e) {
      showToast("Erro: " + e.message);
    }
  }

  async function quickAdd(e) {
    e.preventDefault();
    const title = quick.trim();
    if (!title) return;
    try {
      const t = await createTask({ title, status: "todo", priority: "medium" });
      setRows(prev => [{ ...t, source: "task", members: [] }, ...prev]);
      setQuick("");
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
          Ligia &nbsp;/&nbsp; <strong style={{ color: "var(--text)", fontWeight: 550, fontFamily: "var(--font-heading)" }}>Meu Dia</strong>
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
            <span className="gradient-text">Meu Dia.</span>
          </h1>
          <div className="gradient-bar" style={{ width: 64, marginBottom: 14 }} />
          <p style={{ maxWidth: 560, color: "var(--muted)", fontSize: 13, lineHeight: 1.7, margin: 0 }}>
            Suas tarefas pessoais e os marcos de projetos atribuídos a você, em um só lugar.
          </p>
        </div>

        <form onSubmit={quickAdd} style={{
          display: "flex", gap: 8, alignItems: "center", marginBottom: 18,
          padding: "6px 8px 6px 16px", border: "1px solid var(--line-soft)",
          borderRadius: "var(--radius-sm)", background: "var(--surface)"
        }}>
          <Plus size={16} style={{ color: "var(--muted-3)", flexShrink: 0 }} />
          <input value={quick} onChange={e => setQuick(e.target.value)}
            placeholder="Adicionar tarefa e pressionar Enter…"
            style={{
              flex: 1, height: 34, border: 0, outline: "none", color: "var(--text)",
              background: "transparent", fontSize: 13, fontFamily: "var(--font-body)"
            }} />
          {!loading && (
            <span style={{ color: "var(--muted-2)", fontSize: 11, whiteSpace: "nowrap" }}>
              {rows.length} {rows.length === 1 ? "item" : "itens"}
            </span>
          )}
        </form>

        {loading ? (
          <div style={{ padding: "80px 20px", textAlign: "center", color: "var(--muted)", fontSize: 13 }}>
            Carregando…
          </div>
        ) : (
          <DbView
            config={config}
            rows={rows}
            ctx={ctx}
            onUpdated={handleUpdate}
            onDeleted={handleDelete}
            onCreate={handleCreate}
            onOpenRow={() => {}}
          />
        )}
      </div>
    </>
  );
}