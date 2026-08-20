import { supabase } from "../lib/supabase.js";
import { isConfigured } from "./supabase.js";
import { fetchProfiles } from "./profiles.js";

export async function fetchNotes(profileId) {
  if (!isConfigured()) return [];

  const { data, error } = await supabase
    .from("notes")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) throw error;

  return (data || []).map(n => ({
    id: n.id,
    title: n.title || "",
    content: n.content || "",
    type: n.type || "quick",
    pinned: n.pinned || false,
    event_id: n.event_id || "",
    participants: n.participants || [],
    created_at: n.created_at || "",
  }));
}

export async function createNote(data) {
  if (!isConfigured()) return { id: `note-${Date.now()}`, ...data };

  const { data: created, error } = await supabase
    .from("notes")
    .insert({
      title: data.title || "",
      content: data.content || "",
      type: data.type || "quick",
      pinned: data.pinned || false,
      event_id: data.event_id || null,
      participants: data.participants || [],
    })
    .select()
    .single();

  if (error) throw error;
  return created;
}

export async function updateNote(id, updates) {
  if (!isConfigured()) return { id, ...updates };

  const dbUpdates = {};
  if (updates.title !== undefined) dbUpdates.title = updates.title;
  if (updates.content !== undefined) dbUpdates.content = updates.content;
  if (updates.type !== undefined) dbUpdates.type = updates.type;
  if (updates.pinned !== undefined) dbUpdates.pinned = updates.pinned;
  if (updates.event_id !== undefined) dbUpdates.event_id = updates.event_id || null;
  if (updates.participants !== undefined) dbUpdates.participants = updates.participants;

  const { data, error } = await supabase
    .from("notes")
    .update(dbUpdates)
    .eq("id", id)
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function deleteNote(id) {
  if (!isConfigured()) return { id };

  const { error } = await supabase.from("notes").delete().eq("id", id);
  if (error) throw error;
  return { id };
}

// Resolve @Menções no texto -> lista de profiles correspondentes
export async function findMentions(text) {
  if (!text) return [];
  const matches = text.match(/@([\p{L}][\p{L}\s]*?)(?=\s|$|[.,;!?])/gu) || [];
  if (matches.length === 0) return [];

  const query = text.toLowerCase();
  const profiles = await fetchProfiles();
  return profiles.filter(p =>
    p.name && matches.some(m =>
      m.slice(1).toLowerCase().trim() === p.name.toLowerCase().trim()
      || m.slice(1).toLowerCase().trim() === (p.name.split(" ")[0] || "").toLowerCase().trim()
    )
  );
}