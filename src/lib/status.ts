/**
 * Derivação de estado dos nós do skill tree (lógica pura — porte de
 * skill-tree/app/src/status.js). O usuário só marca explicitamente
 * "in-progress"/"done"; "available"/"locked" saem dos pré-requisitos.
 * Sem DOM/localStorage aqui — isso vive em lib/progress.ts. Alvo de testes.
 */

export type UserState = "in-progress" | "done";
export type NodeState = UserState | "available" | "locked";

/** Mapa id-do-nó → estado explícito marcado pelo usuário. */
export type UserStatus = Record<string, UserState>;

/** Forma mínima necessária pra derivar estado (desacoplado de Concept). */
export type ConceptLike = { id: string; prereqs: string[] };

export const USER_STATES: UserState[] = ["in-progress", "done"];

export const STATE_META: Record<NodeState, { emoji: string; label: string }> = {
  done: { emoji: "🟢", label: "Concluído" },
  "in-progress": { emoji: "🟡", label: "Em progresso" },
  available: { emoji: "⚪", label: "Disponível" },
  locked: { emoji: "🔒", label: "Bloqueado" },
};

/** Conjunto de ids marcados como done. */
export function doneSetFrom(userStatus: UserStatus): Set<string> {
  return new Set(
    Object.entries(userStatus)
      .filter(([, v]) => v === "done")
      .map(([id]) => id),
  );
}

/**
 * Estado efetivo de um conceito: o explícito (done/in-progress) prevalece;
 * senão, "available" se todos os prereqs estão done, "locked" caso contrário.
 */
export function effectiveState(
  concept: ConceptLike,
  userStatus: UserStatus,
  doneSet: Set<string>,
): NodeState {
  const explicit = userStatus[concept.id];
  if (explicit === "done") return "done";
  if (explicit === "in-progress") return "in-progress";
  const prereqsDone = concept.prereqs.every((p) => doneSet.has(p));
  return prereqsDone ? "available" : "locked";
}
