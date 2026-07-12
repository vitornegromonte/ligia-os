import { supabase } from "../lib/supabase.js";

export function isConfigured() {
  const url = import.meta.env.VITE_SUPABASE_URL;
  return url && url !== "https://xxxxxxxxxxxxxxxxxxxx.supabase.co";
}
