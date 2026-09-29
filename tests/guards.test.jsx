import { describe, it, expect, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { MemoryRouter, Routes, Route, Outlet, useLocation, useOutletContext } from "react-router-dom";
import { AuthenticatedRoute, RoleRoute, GuestRoute } from "../src/components/ProtectedRoute.jsx";
import { ADMIN_ROLES, INTERNAL_ROLES } from "../src/auth/access.js";
const { auth } = vi.hoisted(() => ({ auth: {} }));
vi.mock("../src/contexts/AuthContext.jsx", () => ({ useAuth: () => auth }));

function Location() { const location = useLocation(); return <pre data-testid="location">{JSON.stringify(location)}</pre>; }
function setup({ role = "externo", status = "authenticated", profile = { id: "u", role }, session = { user: { id: "u" } }, allowedRoles, path = "/private" } = {}) {
  Object.assign(auth, { profile, session, status, recovery: false, error: null });
  const makeUi = () => <MemoryRouter initialEntries={[path]}><Location /><Routes>
    <Route path="/private" element={allowedRoles ? <RoleRoute allowedRoles={allowedRoles}><p>Secret content</p></RoleRoute> : <AuthenticatedRoute><p>Secret content</p></AuthenticatedRoute>} />
    <Route path="/login" element={<GuestRoute><p>Login form</p></GuestRoute>} />
    <Route path="/register" element={<GuestRoute><p>Register form</p></GuestRoute>} />
    <Route path="/aprender" element={<p>Visitor home</p>} />
    <Route path="/inicio" element={<RoleRoute allowedRoles={INTERNAL_ROLES}><p>Member home</p></RoleRoute>} />
    <Route path="/projetos/:id" element={<RoleRoute allowedRoles={INTERNAL_ROLES}><p>Project content</p></RoleRoute>} />
    <Route path="/admin/solicitacoes" element={<RoleRoute allowedRoles={ADMIN_ROLES}><p>Admin content</p></RoleRoute>} />
  </Routes></MemoryRouter>;
  return { ...render(makeUi()), makeUi };
}

describe("route guards", () => {
  it("sends unauthenticated users to login with full destination", async () => {
    setup({ profile: null, session: null, status: "unauthenticated", path: "/private?tab=docs#test" });
    expect(await screen.findByText("Login form")).toBeInTheDocument();
    expect(JSON.parse(screen.getByTestId("location").textContent).state.from).toEqual({ pathname: "/private", search: "?tab=docs", hash: "#test" });
  });
  it.each(["externo", "membro", "diretor", "coordenador"])("allows %s on authenticated routes", role => {
    setup({ role }); expect(screen.getByText("Secret content")).toBeInTheDocument();
  });
  it.each([["externo", ["membro", "diretor"], false], ["membro", ["membro", "diretor"], true], ["membro", ["diretor"], false], ["diretor", ["diretor"], true]])("checks %s against %j", (role, allowedRoles, allowed) => {
    setup({ role, allowedRoles });
    expect(!!screen.queryByText("Secret content")).toBe(allowed);
    if (!allowed) expect(screen.getByText("Acesso não autorizado")).toBeInTheDocument();
  });
  it.each(["session_loading", "profile_loading", "profile_error", "session_error", "authenticated"])("denies unresolved identity in %s", status => {
    setup({ status, profile: null, allowedRoles: ["diretor"] });
    expect(screen.queryByText("Secret content")).not.toBeInTheDocument();
  });
  it("rejects previous account profile", () => { setup({ profile: {id:"old",role:"diretor"} }); expect(screen.queryByText("Secret content")).not.toBeInTheDocument(); });
  it.each(["/login", "/register"])("redirects authenticated visitor from %s", path => {
    setup({ path }); expect(screen.getByText("Visitor home")).toBeInTheDocument();
  });
  it("redirects authenticated members to their home", () => { setup({ path: "/login", role: "membro" }); expect(screen.getByText("Member home")).toBeInTheDocument(); });
  it.each([["externo", "none", "/aprender"], ["externo", "pending", "/aprender"], ["externo", "rejected", "/aprender"], ["membro", undefined, "/inicio"], ["diretor", undefined, "/inicio"], ["coordenador", undefined, "/inicio"]])(
    "sends a direct login for %s/%s to %s",
    (role, status_membro, destination) => {
      setup({ path: "/login", role, profile: { id: "u", role, status_membro } });
      expect(JSON.parse(screen.getByTestId("location").textContent).pathname).toBe(destination);
      expect(screen.queryByText("Acesso não autorizado")).not.toBeInTheDocument();
    },
  );
  it("does not choose a role destination until the profile is loaded", async () => {
    const view = setup({ path: "/login", status: "profile_loading", profile: null });
    expect(screen.getByRole("status")).toHaveTextContent("Verificando perfil");
    expect(JSON.parse(screen.getByTestId("location").textContent).pathname).toBe("/login");
    auth.profile = { id: "u", role: "externo", status_membro: "none" };
    auth.status = "authenticated";
    view.rerender(view.makeUi());
    expect(await screen.findByText("Visitor home")).toBeInTheDocument();
    expect(JSON.parse(screen.getByTestId("location").textContent).pathname).toBe("/aprender");
    expect(screen.queryByText("Acesso não autorizado")).not.toBeInTheDocument();
  });
  it("keeps the denied page for a manual external visit to /inicio", () => {
    setup({ path: "/inicio", role: "externo" });
    expect(screen.getByText("Acesso não autorizado")).toBeInTheDocument();
  });
  it.each(["membro", "externo"])("restores a requested project route safely for %s", role => {
    Object.assign(auth, { session:null, profile:null, status:"unauthenticated", recovery:false });
    function Login() { return <GuestRoute><button onClick={() => {
      Object.assign(auth, { session:{user:{id:"u"}}, profile:{id:"u",role}, status:"authenticated" });
      rerender(<Tree />);
    }}>Sign in</button></GuestRoute>; }
    function Tree() { return <MemoryRouter initialEntries={["/projetos/123?tab=docs#test"]}><Location /><Routes>
      <Route path="/projetos/:id" element={<RoleRoute allowedRoles={INTERNAL_ROLES}><p>Project content</p></RoleRoute>} />
      <Route path="/login" element={<Login />} />
      <Route path="/aprender" element={<p>Visitor home</p>} />
    </Routes></MemoryRouter>; }
    const { rerender } = render(<Tree />);
    fireEvent.click(screen.getByText("Sign in"));
    const location = JSON.parse(screen.getByTestId("location").textContent);
    if (role === "membro") {
      expect(location).toMatchObject({ pathname:"/projetos/123", search:"?tab=docs", hash:"#test" });
      expect(screen.getByText("Project content")).toBeInTheDocument();
    } else {
      expect(location.pathname).toBe("/aprender");
      expect(screen.getByText("Visitor home")).toBeInTheDocument();
      expect(screen.queryByText("Acesso não autorizado")).not.toBeInTheDocument();
    }
  });
  it("preserves layout outlet context through nested role guards", () => {
    Object.assign(auth,{session:{user:{id:"u"}},profile:{id:"u",role:"membro"},status:"authenticated",recovery:false});
    function Child() { const { marker } = useOutletContext(); return <p>{marker}</p>; }
    render(<MemoryRouter initialEntries={["/child"]}><Routes>
      <Route element={<Outlet context={{marker:"layout context"}} />}><Route element={<RoleRoute allowedRoles={["membro"]} />}>
        <Route path="/child" element={<Child />} />
      </Route></Route>
    </Routes></MemoryRouter>);
    expect(screen.getByText("layout context")).toBeInTheDocument();
  });
});
