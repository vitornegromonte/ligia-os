import { supabase } from "../lib/supabase.js";
import { isConfigured } from "./supabase.js";

export async function fetchInitiatives() {
  if (!isConfigured()) return [];
  const { data, error } = await supabase.from("initiatives").select("*").order("created_at", { ascending: true });
  if (error) {
    console.warn("Failed to fetch initiatives:", error.message);
    return [];
  }
  return (data || []).map(r => ({
    id: r.id,
    name: r.name,
    team: r.team || "Iniciativa",
    description: r.description || "",
    image_url: r.image_url || "",
    img: r.image_url || "",
    desc: r.description || "",
  }));
}
