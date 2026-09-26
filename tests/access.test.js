import { describe, it, expect } from "vitest";
import { canAccessInternalArea, canManageMembers, homeFor, requestedDestination } from "../src/auth/access.js";
import { authFailure } from "../src/auth/errors.js";

describe("access model", () => {
  it.each([undefined, null, "diretor", "professor", "ex-membro", "visitante"])("does not grant internal access to %s", role => {
    expect(canAccessInternalArea({ role })).toBe(false);
    expect(canManageMembers({ role })).toBe(false);
  });
  it.each(["membro", "admin"])("grants internal access to %s", role => expect(canAccessInternalArea({ role })).toBe(true));
  it("uses role, not organizational category", () => {
    expect(canManageMembers({ role: "membro", category: "diretor" })).toBe(false);
    expect(homeFor({ role: "visitante" })).toBe("/perfil");
    expect(homeFor({ role: "admin" })).toBe("/inicio");
  });
  it.each(["https://evil.test", "//evil.test", "/\\evil.test", "/login", "/register?next=x", "/reset-password#token", "/login/", " /projetos"])("rejects unsafe/loop destination %s", path => {
    expect(requestedDestination(path, { role: "visitante" })).toBe("/perfil");
  });
  it("keeps path, query and fragment for the actual guard", () => {
    expect(requestedDestination({ pathname: "/projetos/123", search: "?tab=docs", hash: "#a" }, { role: "membro" })).toBe("/projetos/123?tab=docs#a");
  });
  it.each([[new TypeError("Failed to fetch"), "network"], [{code:"42501"}, "rls"], [{code:"PGRST301"}, "invalid_session"], [{code:"42P01"}, "supabase"]])("classifies %j", (error, kind) => expect(authFailure(error).kind).toBe(kind));
});
