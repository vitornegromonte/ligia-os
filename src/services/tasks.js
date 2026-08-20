import { supabase } from "../lib/supabase.js";
import { isConfigured } from "./supabase.js";

export async function fetchTasks(profileId) {
  if (!isConfigured()) return [];

  const { data, error } = await supabase
    .from("tasks")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) throw error;
  return (data || []).map(mapTask);
}

export async function createTask(data) {
  if (!isConfigured()) return { id: `task-${Date.now()}`, ...data };

  const { data: created, error } = await supabase
    .from("tasks")
    .insert({
      title: data.title,
      description: data.description || "",
      status: data.status || "todo",
      priority: data.priority || "medium",
      due_date: data.due_date || null,
      project_id: data.project_id || null,
    })
    .select()
    .single();

  if (error) throw error;
  return mapTask(created);
}

export async function updateTask(id, updates) {
  if (!isConfigured()) return { id, ...updates };

  const dbUpdates = {};
  if (updates.title !== undefined) dbUpdates.title = updates.title;
  if (updates.description !== undefined) dbUpdates.description = updates.description;
  if (updates.status !== undefined) dbUpdates.status = updates.status;
  if (updates.priority !== undefined) dbUpdates.priority = updates.priority;
  if (updates.due_date !== undefined) dbUpdates.due_date = updates.due_date || null;
  if (updates.project_id !== undefined) dbUpdates.project_id = updates.project_id || null;

  const { data, error } = await supabase
    .from("tasks")
    .update(dbUpdates)
    .eq("id", id)
    .select()
    .single();

  if (error) throw error;
  return mapTask(data);
}

export async function deleteTask(id) {
  if (!isConfigured()) return { id };

  const { error } = await supabase.from("tasks").delete().eq("id", id);
  if (error) throw error;
  return { id };
}

function mapTask(t) {
  return {
    id: t.id,
    title: t.title || "",
    description: t.description || "",
    status: t.status || "todo",
    priority: t.priority || "medium",
    due_date: t.due_date || "",
    project_id: t.project_id || "",
  };
}