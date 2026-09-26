export const ROLES = Object.freeze(["visitante", "membro", "admin"]);
export const INTERNAL_ROLES = Object.freeze(["membro", "admin"]);
export const ADMIN_ROLES = Object.freeze(["admin"]);
export const isKnownRole = role => ROLES.includes(role);
export const canAccessInternalArea = profile => INTERNAL_ROLES.includes(profile?.role);
export const canManageMembers = profile => profile?.role === "admin";
export const homeFor = profile => canAccessInternalArea(profile) ? "/inicio" : "/perfil";

// The destination is still checked by its guard. Reject external URLs and auth loops.
export function requestedDestination(from, profile) {
  const path = typeof from === "string" ? from : from?.pathname;
  if (!path || !path.startsWith("/") || path.startsWith("//") || /[\\\s]/.test(path)) return homeFor(profile);
  if (/^\/(login|register|reset-password)(\/|[?#]|$)/i.test(path)) return homeFor(profile);
  if (typeof from === "string") return path;
  return path + (from.search?.startsWith("?") ? from.search : "") + (from.hash?.startsWith("#") ? from.hash : "");
}
