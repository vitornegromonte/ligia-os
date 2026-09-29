export const ROLE_LABELS = Object.freeze({ externo: "Externo", membro: "Membro", diretor: "Diretor", coordenador: "Coordenador" });
export const MEMBERSHIP_LABELS = Object.freeze({ none: "Sem solicitação", pending: "Em análise", approved: "Aprovado", rejected: "Não aprovado" });

export function roleActionsFor(person, actorId) {
  if (!person || person.id === actorId || person.status_membro === "pending") return [];
  if (person.role === "membro") return ["diretor", "coordenador"];
  if (person.role === "diretor") return ["coordenador", "membro"];
  if (person.role === "coordenador") return ["diretor", "membro"];
  return [];
}
