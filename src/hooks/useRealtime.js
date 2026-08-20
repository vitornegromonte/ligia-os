import { useEffect } from "react";
import { supabase } from "../lib/supabase.js";
import { isConfigured } from "../services/supabase.js";

export function useRealtime(table, onEvent) {
  useEffect(() => {
    if (!isConfigured()) return;

    const channel = supabase
      .channel(`realtime-${table}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table },
        payload => {
          if (typeof onEvent === "function") onEvent(payload);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [table, onEvent]);
}