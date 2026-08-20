import { supabase } from "../lib/supabase.js";
import { isConfigured } from "./supabase.js";

const MAX_PER = 4;

export async function searchAll(query, profile) {
  const term = query.trim();
  if (!term || !isConfigured()) return [];

  const like = `%${term}%`;
  const results = [];

  const [profiles, projects, notes, tasks, events, docs] = await Promise.all([
    supabase.from("profiles").select("id,name,role,skills,initials,color").or(`name.ilike.${like},skills.ilike.${like}`).limit(MAX_PER),
    supabase.from("projects").select("id,name,description,color,status").or(`name.ilike.${like},description.ilike.${like}`).limit(MAX_PER),
    supabase.from("notes").select("id,title,content,type").eq("profile_id", profile?.id).or(`title.ilike.${like},content.ilike.${like}`).limit(MAX_PER),
    supabase.from("tasks").select("id,title,description,status").eq("profile_id", profile?.id).or(`title.ilike.${like},description.ilike.${like}`).limit(MAX_PER),
    supabase.from("events").select("id,title,starts_at,location").or(`title.ilike.${like},location.ilike.${like},description.ilike.${like}`).limit(MAX_PER),
    supabase.from("project_docs").select("id,title,project_id,type").or(`title.ilike.${like},content.ilike.${like}`).limit(MAX_PER),
  ]);

  if (!profiles.error) profiles.data.forEach(p => results.push({ type: "profile", label: p.name, meta: p.role, link: "/membros", color: p.color || "#e7c8a6" }));
  if (!projects.error) projects.data.forEach(p => results.push({ type: "project", label: p.name, meta: "Projeto", link: `/projetos/${p.id}`, color: p.color }));
  if (!notes.error) notes.data.forEach(n => results.push({ type: "note", label: n.title || "Nota", meta: "Nota", link: "/notas", color: "var(--muted)" }));
  if (!tasks.error) tasks.data.forEach(t => results.push({ type: "task", label: t.title, meta: "Tarefa", link: "/dia", color: "#6da87c" }));
  if (!events.error) events.data.forEach(ev => results.push({ type: "event", label: ev.title, meta: "Evento", link: "/agenda", color: "#c4a358" }));
  if (!docs.error) docs.data.forEach(d => results.push({ type: "doc", label: d.title, meta: "Documento", link: `/projetos/${d.project_id}/${d.id}`, color: "#6b8eb3" }));

  return results.slice(0, 24);
}