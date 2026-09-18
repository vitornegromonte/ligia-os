import { describe, it, expect, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { MemoryRouter, Routes, Route, Outlet, useLocation, useOutletContext } from "react-router-dom";
import { AuthenticatedRoute, RoleRoute, GuestRoute } from "../src/components/ProtectedRoute.jsx";
const { auth } = vi.hoisted(() => ({ auth: {} }));
vi.mock("../src/contexts/AuthContext.jsx", () => ({ useAuth: () => auth }));

function Location() { const location = useLocation(); return <pre data-testid="location">{JSON.stringify(location)}</pre>; }
function setup({ role = "visitante", status = "authenticated", profile = { id: "u", role }, session = { user: { id: "u" } }, allowedRoles, path = "/private" } = {}) {
  Object.assign(auth, { profile, session, status, recovery: false, error: null });
  render(<MemoryRouter initialEntries={[path]}><Location /><Routes>
    <Route path="/private" element={allowedRoles ? <RoleRoute allowedRoles={allowedRoles}><p>Secret content</p></RoleRoute> : <AuthenticatedRoute><p>Secret content</p></AuthenticatedRoute>} />
    <Route path="/login" element={<GuestRoute><p>Login form</p></GuestRoute>} />
    <Route path="/register" element={<GuestRoute><p>Register form</p></GuestRoute>} />
    <Route path="/perfil" element={<p>Visitor home</p>} /><Route path="/inicio" element={<p>Member home</p>} />
  </Routes></MemoryRouter>);
}

describe("route guards", () => {
  it("sends unauthenticated users to login with full destination", async () => {
    setup({ profile: null, session: null, status: "unauthenticated", path: "/private?tab=docs#test" });
    expect(await screen.findByText("Login form")).toBeInTheDocument();
    expect(JSON.parse(screen.getByTestId("location").textContent).state.from).toEqual({ pathname: "/private", search: "?tab=docs", hash: "#test" });
  });
  it.each(["visitante", "membro", "admin"])("allows %s on authenticated routes", role => {
    setup({ role }); expect(screen.getByText("Secret content")).toBeInTheDocument();
  });
  it.each([["visitante", ["membro", "admin"], false], ["membro", ["membro", "admin"], true], ["membro", ["admin"], false], ["admin", ["admin"], true]])("checks %s against %j", (role, allowedRoles, allowed) => {
    setup({ role, allowedRoles });
    expect(!!screen.queryByText("Secret content")).toBe(allowed);
    if (!allowed) expect(screen.getByText("Acesso não autorizado")).toBeInTheDocument();
  });
  it.each(["session_loading", "profile_loading", "profile_error", "session_error", "authenticated"])("denies unresolved identity in %s", status => {
    setup({ status, profile: null, allowedRoles: ["admin"] });
    expect(screen.queryByText("Secret content")).not.toBeInTheDocument();
  });
  it("rejects previous account profile", () => { setup({ profile: {id:"old",role:"admin"} }); expect(screen.queryByText("Secret content")).not.toBeInTheDocument(); });
  it.each(["/login", "/register"])("redirects authenticated visitor from %s", path => {
    setup({ path }); expect(screen.getByText("Visitor home")).toBeInTheDocument();
  });
  it("redirects authenticated members to their home", () => { setup({ path: "/login", role: "membro" }); expect(screen.getByText("Member home")).toBeInTheDocument(); });
  it.each(["membro", "visitante"])("restores destination for %s and authorizes without loops", role => {
    Object.assign(auth, { session:null, profile:null, status:"unauthenticated", recovery:false });
    function Login() { return <GuestRoute><button onClick={() => {
      Object.assign(auth, { session:{user:{id:"u"}}, profile:{id:"u",role}, status:"authenticated" });
      rerender(<Tree />);
    }}>Sign in</button></GuestRoute>; }
    function Tree() { return <MemoryRouter initialEntries={["/project/123?tab=docs#test"]}><Location /><Routes>
      <Route path="/project/:id" element={<RoleRoute allowedRoles={["membro","admin"]}><p>Project content</p></RoleRoute>} />
      <Route path="/login" element={<Login />} />
    </Routes></MemoryRouter>; }
    const { rerender } = render(<Tree />);
    fireEvent.click(screen.getByText("Sign in"));
    const location = JSON.parse(screen.getByTestId("location").textContent);
    expect(location).toMatchObject({ pathname:"/project/123", search:"?tab=docs", hash:"#test" });
    expect(screen.getByText(role === "membro" ? "Project content" : "Acesso não autorizado")).toBeInTheDocument();
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
