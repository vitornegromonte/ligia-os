import type { UserStatus, UserState } from "./status";
import { logEvent } from "./events";

/**
 * Persistência do progresso por membro. Na F3 (sem auth) é localStorage anônimo;
 * a partir de F6 o logado vai pro Supabase (esta interface fica como fallback).
 * Mesma chave do MVP Vite — compatibilidade de estado.
 */
const STORAGE_KEY = "ligia-skill-tree:status:v1";

export function loadUserStatus(): UserStatus {
  if (typeof window === "undefined") return {};
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as UserStatus) : {};
  } catch {
    return {};
  }
}

export function saveUserStatus(status: UserStatus): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(status));
}

/** Aplica/limpa o estado de um nó e persiste. Devolve o novo mapa. */
export function setNodeStatus(
  prev: UserStatus,
  id: string,
  value: UserState | null,
): UserStatus {
  const next = { ...prev };
  const anterior = prev[id] ?? null;
  if (value == null) delete next[id];
  else next[id] = value;
  saveUserStatus(next);
  // O tipo `node_status_changed` existia em lib/events.ts desde o início e
  // nunca era emitido — por isso o export de progresso reportava `at: null`.
  if (anterior !== value) {
    logEvent("node_status_changed", id, { de: anterior, para: value });
  }
  return next;
}
