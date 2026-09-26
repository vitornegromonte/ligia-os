import { beforeEach, describe, expect, it, vi } from "vitest";
import { StrictMode } from "react";
import { act, renderHook, waitFor } from "@testing-library/react";
import { AuthProvider, useAuth } from "../src/contexts/AuthContext.jsx";

const { client, callbacks } = vi.hoisted(() => ({
  client: { auth: { getSession: vi.fn(), getUser: vi.fn(), onAuthStateChange: vi.fn(), signInWithPassword: vi.fn(), signUp: vi.fn(), signOut: vi.fn(), resetPasswordForEmail: vi.fn(), updateUser: vi.fn() }, from: vi.fn() },
  callbacks: new Set(),
}));
vi.mock("../src/lib/supabase.js", () => ({ supabase: client }));
const session = id => ({ user: { id } });
const row = (id = "a", role = "visitante") => ({ id, name: id, email: `${id}@example.test`, role });
function deferred() { let resolve; const promise = new Promise(r => { resolve = r; }); return { promise, resolve }; }
function query(result) { const builder = { select: vi.fn(() => builder), eq: vi.fn(() => builder), abortSignal: vi.fn(() => builder), maybeSingle: vi.fn(() => result) }; return builder; }
function wrapper({ children }) { return <StrictMode><AuthProvider>{children}</AuthProvider></StrictMode>; }
function emit(event, value) { act(() => { callbacks.forEach(callback => callback(event, value)); }); }

beforeEach(() => {
  callbacks.clear();
  client.auth.onAuthStateChange.mockImplementation(callback => { callbacks.add(callback); return { data: { subscription: { unsubscribe: () => callbacks.delete(callback) } } }; });
  client.auth.getSession.mockResolvedValue({ data: { session: session("a") }, error: null });
  client.auth.getUser.mockResolvedValue({ data: { user: { id: "a" } }, error: null });
  client.from.mockImplementation(() => query(Promise.resolve({ data: row(), error: null })));
  client.auth.signOut.mockResolvedValue({ error: null });
});

describe("AuthProvider", () => {
  it.each(["visitante", "membro", "admin"])("authenticates %s only after resolving profile", async role => {
    client.auth.getSession.mockResolvedValue({ data: { session: null } });
    client.from.mockImplementation(() => query(Promise.resolve({ data: row("a", role) })));
    const { result } = renderHook(useAuth, { wrapper });
    await waitFor(() => expect(result.current.status).toBe("unauthenticated"));
    client.auth.signInWithPassword.mockImplementation(async () => { callbacks.forEach(cb => cb("SIGNED_IN", session("a"))); return { data: { session: session("a") } }; });
    await act(async () => { await result.current.signIn("a@example.test", "password"); });
    await waitFor(() => expect(result.current.status).toBe("authenticated"));
    expect(result.current.profile.role).toBe(role);
  });
  it("distinguishes initial session and profile loading", async () => {
    const restored = deferred(), profile = deferred();
    client.auth.getSession.mockReturnValue(restored.promise);
    client.from.mockImplementation(() => query(profile.promise));
    const { result } = renderHook(useAuth, { wrapper });
    expect(result.current.status).toBe("session_loading");
    await act(async () => restored.resolve({ data: { session: session("a") } }));
    expect(result.current.status).toBe("profile_loading");
    expect(result.current.profile).toBeNull();
    await act(async () => profile.resolve({ data: row() }));
    expect(result.current.status).toBe("authenticated");
  });
  it.each([[null, null, "profile_unavailable"], [null, { code: "42501" }, "rls"], [null, { message: "Failed to fetch" }, "network"], [null, { code: "42P01" }, "supabase"], [row("a", "diretor"), null, "invalid_profile"]])("blocks profile failure %s / %j without provisioning", async (data, error, kind) => {
    const builder = query(Promise.resolve({ data, error }));
    client.from.mockReturnValue(builder);
    const { result } = renderHook(useAuth, { wrapper });
    await waitFor(() => expect(result.current.status).toBe("profile_error"));
    expect(result.current.error.kind).toBe(kind);
    expect(result.current.profile).toBeNull();
    expect(Object.keys(builder)).not.toContain("insert");
    expect(client.from).toHaveBeenCalledWith("profiles");
  });
  it("rejects invalid sessions before querying profiles", async () => {
    client.auth.getUser.mockResolvedValue({ data: { user: null }, error: { code: "session_not_found" } });
    const { result } = renderHook(useAuth, { wrapper });
    await waitFor(() => expect(result.current.error?.kind).toBe("invalid_session"));
    expect(client.from).not.toHaveBeenCalled();
  });
  it("exposes session restore failures", async () => {
    client.auth.getSession.mockResolvedValue({ data: {}, error: { status: 401 } });
    const { result } = renderHook(useAuth, { wrapper });
    await waitFor(() => expect(result.current.status).toBe("session_error"));
  });
  it("clears identity on successful logout", async () => {
    const { result } = renderHook(useAuth, { wrapper });
    await waitFor(() => expect(result.current.status).toBe("authenticated"));
    await act(async () => result.current.signOut());
    expect(result.current.status).toBe("unauthenticated");
    expect(result.current.session).toBeNull(); expect(result.current.profile).toBeNull();
  });
  it.each(["returned", "thrown"])("retains identity on %s logout error", async mode => {
    const error = new Error("offline");
    if (mode === "returned") client.auth.signOut.mockResolvedValue({ error });
    else client.auth.signOut.mockRejectedValue(error);
    const { result } = renderHook(useAuth, { wrapper });
    await waitFor(() => expect(result.current.status).toBe("authenticated"));
    await act(async () => { await expect(result.current.signOut()).rejects.toThrow("offline"); });
    expect(result.current.profile.id).toBe("a"); expect(result.current.status).toBe("authenticated");
  });
  it("ignores stale session restoration after a newer auth event", async () => {
    const restored = deferred(); client.auth.getSession.mockReturnValue(restored.promise);
    const { result } = renderHook(useAuth, { wrapper });
    emit("SIGNED_OUT", null);
    await act(async () => restored.resolve({ data: { session: session("a") } }));
    expect(result.current.status).toBe("unauthenticated");
  });
  it("does not restore an old profile after rapid account switching or logout", async () => {
    const oldProfile = deferred();
    client.from.mockImplementationOnce(() => query(oldProfile.promise));
    const { result } = renderHook(useAuth, { wrapper });
    await waitFor(() => expect(client.from).toHaveBeenCalled());
    client.auth.getUser.mockResolvedValue({ data: { user: { id: "b" } } });
    client.from.mockImplementation(() => query(Promise.resolve({ data: row("b", "membro") })));
    emit("SIGNED_IN", session("b"));
    expect(result.current.profile).toBeNull();
    await waitFor(() => expect(result.current.profile?.id).toBe("b"));
    await act(async () => oldProfile.resolve({ data: row("a", "admin") }));
    expect(result.current.profile.id).toBe("b");
    emit("SIGNED_OUT", null);
    expect(result.current.profile).toBeNull();
  });
  it("ignores a pending profile after logout", async () => {
    const pending = deferred(); client.from.mockImplementation(() => query(pending.promise));
    const { result } = renderHook(useAuth, { wrapper });
    await waitFor(() => expect(client.from).toHaveBeenCalled());
    emit("SIGNED_OUT", null);
    await act(async () => pending.resolve({ data: row() }));
    expect(result.current.profile).toBeNull(); expect(result.current.status).toBe("unauthenticated");
  });
  it("does not let a delayed logout completion clear a newer session", async () => {
    const pending = deferred(); client.auth.signOut.mockReturnValue(pending.promise);
    const { result } = renderHook(useAuth, { wrapper });
    await waitFor(() => expect(result.current.status).toBe("authenticated"));
    let operation; act(() => { operation = result.current.signOut(); });
    client.auth.getUser.mockResolvedValue({ data: { user: { id: "b" } } });
    client.from.mockImplementation(() => query(Promise.resolve({ data: row("b") })));
    emit("SIGNED_IN", session("b"));
    await waitFor(() => expect(result.current.profile?.id).toBe("b"));
    await act(async () => { pending.resolve({ error: null }); await operation; });
    expect(result.current.profile.id).toBe("b");
  });
  it("filters registration metadata, leaving role assignment to the database", async () => {
    client.auth.signUp.mockResolvedValue({ data: { session: null } });
    const { result } = renderHook(useAuth, { wrapper });
    await act(async () => result.current.signUp("a@example.test", "password", { name: "A", role: "admin", category: "diretor" }));
    expect(client.auth.signUp).toHaveBeenCalledWith({ email: "a@example.test", password: "password", options: { data: { name: "A" } } });
  });
  it("handles recovery without changing role", async () => {
    const { result } = renderHook(useAuth, { wrapper });
    await waitFor(() => expect(result.current.status).toBe("authenticated"));
    emit("PASSWORD_RECOVERY", session("a"));
    await waitFor(() => expect(result.current.status).toBe("authenticated"));
    expect(result.current.recovery).toBe(true);
    client.auth.updateUser.mockResolvedValue({ data: {} });
    await act(async () => result.current.updatePassword("newPassword"));
    expect(result.current.recovery).toBe(false); expect(result.current.profile.role).toBe("visitante");
  });
});
