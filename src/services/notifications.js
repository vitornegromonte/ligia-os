import { supabase } from "../lib/supabase.js";
import { isConfigured } from "./supabase.js";

export async function fetchNotifications(profileId) {
  if (!isConfigured()) return [];

  const { data, error } = await supabase
    .from("notifications")
    .select("*")
    .eq("profile_id", profileId)
    .order("created_at", { ascending: false })
    .limit(40);

  if (error) throw error;
  return data || [];
}

export async function createNotification(profileId, data) {
  if (!isConfigured()) return { id: `n-${Date.now()}`, profile_id: profileId, ...data };

  const { data: created, error } = await supabase
    .from("notifications")
    .insert({
      profile_id: profileId,
      type: data.type || "info",
      title: data.title || "",
      body: data.body || "",
      link: data.link || "",
    })
    .select()
    .single();

  if (error) throw error;
  return created;
}

export async function markNotificationsRead(ids) {
  if (!isConfigured()) return {};

  const { error } = await supabase
    .from("notifications")
    .update({ read: true })
    .in("id", ids);

  if (error) throw error;
  return {};
}

export async function markAllNotificationsRead(profileId) {
  if (!isConfigured()) return {};

  const { error } = await supabase
    .from("notifications")
    .update({ read: true })
    .eq("profile_id", profileId)
    .eq("read", false);

  if (error) throw error;
  return {};
}