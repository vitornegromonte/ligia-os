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
  it.each([["externo", "/aprender"], ["membro", "/inicio"], ["diretor", "/inicio"], ["coordenador", "/inicio"]])(
    "uses the role home for %s",
    (role, home) => expect(homeFor({ role })).toBe(home),
  );
  it.each(["none", "pending", "rejected"])("does not let external membership status %s change the home", status_membro => {
    expect(homeFor({ role: "externo", status_membro })).toBe("/aprender");
  });
  it.each(["https://evil.test", "//evil.test", "/\\evil.test", "/login", "/register?next=x", "/reset-password#token", "/login/", " /projetos"])("rejects unsafe/loop destination %s", path => {
    expect(requestedDestination(path, { role: "externo" })).toBe("/aprender");
  });
  it.each(["externo", "membro"])("does not restore /inicio for %s unless permitted", role => {
    const destination = requestedDestination({ pathname: "/inicio", search: "?tab=docs", hash: "#a" }, { role });
    expect(destination).toBe(role === "externo" ? "/aprender" : "/inicio?tab=docs#a");
  });
  it.each([
    ["externo", "/admin/solicitacoes", "/aprender"],
    ["membro", "/admin/solicitacoes", "/inicio"],
    ["diretor", "/admin/solicitacoes", "/admin/solicitacoes"],
    ["coordenador", "/aprender/itens", "/aprender/itens"],
    ["externo", "/admin/usuarios", "/aprender"],
    ["membro", "/admin/usuarios", "/inicio"],
    ["diretor", "/admin/usuarios", "/admin/usuarios"],
    ["coordenador", "/admin/usuarios", "/admin/usuarios"],
  ])("checks previous restricted route for %s at %s", (role, path, destination) => {
    expect(requestedDestination(path, { role })).toBe(destination);
  });
  it("keeps path, query and fragment for the actual guard", () => {
    expect(requestedDestination({ pathname: "/projetos/123", search: "?tab=docs", hash: "#a" }, { role: "membro" })).toBe("/projetos/123?tab=docs#a");
  });
  it.each([[new TypeError("Failed to fetch"), "network"], [{code:"42501"}, "rls"], [{code:"PGRST301"}, "invalid_session"], [{code:"42P01"}, "supabase"]])("classifies %j", (error, kind) => expect(authFailure(error).kind).toBe(kind));
});
