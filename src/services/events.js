import { supabase } from "../lib/supabase.js";
import { isConfigured } from "./supabase.js";

export async function fetchEvents() {
  if (!isConfigured()) return [];

  const { data: events, error } = await supabase
    .from("events")
    .select("*")
    .order("starts_at", { ascending: true });

  if (error) throw error;

  const { data: parts } = await supabase.from("event_participants").select("*");

  const partsByEvent = {};
  (parts || []).forEach(p => {
    if (!partsByEvent[p.event_id]) partsByEvent[p.event_id] = [];
    partsByEvent[p.event_id].push(p.profile_id);
  });

  return (events || []).map(e => ({
    id: e.id,
    title: e.title || "",
    description: e.description || "",
    starts_at: e.starts_at || "",
    ends_at: e.ends_at || "",
    all_day: e.all_day || false,
    location: e.location || "",
    created_by: e.created_by || "",
    participants: partsByEvent[e.id] || [],
  }));
}

export async function createEvent(data, participantIds = []) {
  if (!isConfigured()) return { id: `event-${Date.now()}`, ...data, participants: participantIds };

  const { data: created, error } = await supabase
    .from("events")
    .insert({
      title: data.title,
      description: data.description || "",
      starts_at: data.starts_at || new Date().toISOString(),
      ends_at: data.ends_at || null,
      all_day: data.all_day || false,
      location: data.location || "",
      created_by: data.created_by || null,
    })
    .select()
    .single();

  if (error) throw error;

  if (participantIds.length > 0) {
    const rows = participantIds.map(profile_id => ({ event_id: created.id, profile_id }));
    const { error: pErr } = await supabase.from("event_participants").insert(rows);
    if (pErr) console.warn("Failed to add participants:", pErr.message);
  }

  return { ...created, participants: participantIds };
}

export async function updateEvent(id, updates) {
  if (!isConfigured()) return { id, ...updates };

  const dbUpdates = {};
  if (updates.title !== undefined) dbUpdates.title = updates.title;
  if (updates.description !== undefined) dbUpdates.description = updates.description;
  if (updates.starts_at !== undefined) dbUpdates.starts_at = updates.starts_at;
  if (updates.ends_at !== undefined) dbUpdates.ends_at = updates.ends_at || null;
  if (updates.all_day !== undefined) dbUpdates.all_day = updates.all_day;
  if (updates.location !== undefined) dbUpdates.location = updates.location || "";

  const { data, error } = await supabase
    .from("events")
    .update(dbUpdates)
    .eq("id", id)
    .select()
    .single();

  if (error) throw error;
  return { ...data, participants: updates.participants !== undefined ? updates.participants : [] };
}

export async function deleteEvent(id) {
  if (!isConfigured()) return { id };

  const { error } = await supabase.from("events").delete().eq("id", id);
  if (error) throw error;
  return { id };
}

export async function setEventParticipants(eventId, participantIds) {
  if (!isConfigured()) return { event_id: eventId, participant_ids: participantIds };

  const { error: delError } = await supabase
    .from("event_participants")
    .delete()
    .eq("event_id", eventId);

  if (delError) throw delError;

  if (participantIds.length > 0) {
    const rows = participantIds.map(profile_id => ({ event_id: eventId, profile_id }));
    const { error: insError } = await supabase.from("event_participants").insert(rows);
    if (insError) throw insError;
  }

  return { event_id: eventId, participant_ids: participantIds };
}