import { describe, it, expect } from "vitest";
import { canAccessInternalArea, canAccessLearning, canManageMembers, isAdmin, homeFor, requestedDestination } from "../src/auth/access.js";
import { authFailure } from "../src/auth/errors.js";

describe("access model", () => {
  it.each([undefined, null, "professor", "ex-membro", "visitante", "admin", "externo"])("does not grant internal access to %s", role => {
    expect(canAccessInternalArea({ role })).toBe(false);
    expect(canManageMembers({ role })).toBe(false);
  });
  it.each(["membro", "diretor", "coordenador"])("grants internal access to %s", role => expect(canAccessInternalArea({ role })).toBe(true));
  it.each(["diretor", "coordenador"])("grants equivalent administrative access to %s", role => {
    expect(isAdmin({ role })).toBe(true);
    expect(canManageMembers({ role })).toBe(true);
    expect(canAccessLearning({ role })).toBe(true);
  });
  it.each(["externo", "membro"])("denies administrative access to %s", role => expect(isAdmin({ role })).toBe(false));
  it("uses role, not organizational category", () => {
    expect(canManageMembers({ role: "membro", category: "diretor" })).toBe(false);
    expect(homeFor({ role: "externo" })).toBe("/aprender");
    expect(homeFor({ role: "diretor" })).toBe("/inicio");
  });
  it.each(["https://evil.test", "//evil.test", "/\\evil.test", "/login", "/register?next=x", "/reset-password#token", "/login/", " /projetos"])("rejects unsafe/loop destination %s", path => {
    expect(requestedDestination(path, { role: "externo" })).toBe("/aprender");
  });
  it("keeps path, query and fragment for the actual guard", () => {
    expect(requestedDestination({ pathname: "/projetos/123", search: "?tab=docs", hash: "#a" }, { role: "membro" })).toBe("/projetos/123?tab=docs#a");
  });
  it.each([[new TypeError("Failed to fetch"), "network"], [{code:"42501"}, "rls"], [{code:"PGRST301"}, "invalid_session"], [{code:"42P01"}, "supabase"]])("classifies %j", (error, kind) => expect(authFailure(error).kind).toBe(kind));
});
