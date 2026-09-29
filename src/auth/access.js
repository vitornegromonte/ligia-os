export const ROLES = Object.freeze(["externo", "membro", "diretor", "coordenador"]);
export const LEARNING_ROLES = ROLES;
export const EXTERNAL_ROLES = Object.freeze(["externo"]);
export const INTERNAL_ROLES = Object.freeze(["membro", "diretor", "coordenador"]);
export const ADMIN_ROLES = Object.freeze(["diretor", "coordenador"]);
export const isKnownRole = role => ROLES.includes(role);
export const canAccessLearning = profile => LEARNING_ROLES.includes(profile?.role);
export const canAccessInternalArea = profile => INTERNAL_ROLES.includes(profile?.role);
export const isAdmin = profile => ADMIN_ROLES.includes(profile?.role);
export const isMember = profile => profile?.role === "membro";
export const isExternal = profile => profile?.role === "externo";
export const canManageMembers = isAdmin;
export const homeFor = profile => canAccessInternalArea(profile) ? "/inicio" : "/aprender";

const INTERNAL_PATH = /^\/(?:inicio|dia|agenda|notas|membros|docs|certificados|dashboard|projetos)(?:\/|$)/i;
const ADMIN_PATH = /^\/(?:admin\/(?:solicitacoes|usuarios)|aprender\/itens)(?:\/|$)/i;

export function canAccessPath(profile, pathname) {
  const path = pathname.split(/[?#]/, 1)[0];
  if (INTERNAL_PATH.test(path)) return canAccessInternalArea(profile);
  if (ADMIN_PATH.test(path)) return isAdmin(profile);
  return isKnownRole(profile?.role);
}

// Restore only safe, role-appropriate destinations; otherwise use the single home rule.
export function requestedDestination(from, profile) {
  const path = typeof from === "string" ? from : from?.pathname;
  if (!path || !path.startsWith("/") || path.startsWith("//") || /[\\\s]/.test(path)) return homeFor(profile);
  if (/^\/(login|register|reset-password)(\/|[?#]|$)/i.test(path)) return homeFor(profile);
  const pathname = path.split(/[?#]/, 1)[0];
  if (!canAccessPath(profile, pathname)) return homeFor(profile);
  if (typeof from === "string") return path;
  return path + (from.search?.startsWith("?") ? from.search : "") + (from.hash?.startsWith("#") ? from.hash : "");
}
