import { beforeEach, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import AdminUsers from "../src/pages/AdminUsers.jsx";
import { RoleRoute } from "../src/components/ProtectedRoute.jsx";
import { ADMIN_ROLES } from "../src/auth/access.js";
import { roleActionsFor } from "../src/auth/roleActions.js";

const { auth, api } = vi.hoisted(() => ({
  auth: { profile: { id: "actor", role: "diretor" }, session: { user: { id: "actor" } }, status: "authenticated" },
  api: { fetchProfiles: vi.fn(), updateRole: vi.fn() },
}));
vi.mock("../src/contexts/AuthContext.jsx", () => ({ useAuth: () => auth }));
vi.mock("../src/services/profiles.js", () => api);

const people = [
  { id: "actor", name: "Current Director", email: "director@example.test", role: "diretor", status_membro: "none" },
  { id: "member", name: "Ana Member", email: "ana@example.test", role: "membro", status_membro: "approved" },
  { id: "external", name: "Bruno External", email: "bruno@example.test", role: "externo", status_membro: "none" },
  { id: "coordinator", name: "Carla Coordinator", email: "carla@example.test", role: "coordenador", status_membro: "approved" },
];

function page() {
  return render(<MemoryRouter initialEntries={["/admin/usuarios"]}><Routes>
    <Route path="/admin/usuarios" element={<RoleRoute allowedRoles={ADMIN_ROLES}><AdminUsers /></RoleRoute>} />
  </Routes></MemoryRouter>);
}

beforeEach(() => {
  vi.clearAllMocks();
  auth.profile = { id: "actor", role: "diretor" };
  api.fetchProfiles.mockResolvedValue(people);
  api.updateRole.mockImplementation(async (id, role) => ({ ...people.find(person => person.id === id), role }));
});

it.each(["diretor", "coordenador"])("allows %s to open user management", async role => {
  auth.profile.role = role;
  page();
  expect(await screen.findByRole("heading", { name: "Gestão de usuários e cargos" })).toBeInTheDocument();
  expect(api.fetchProfiles).toHaveBeenCalledTimes(1);
});

it.each(["membro", "externo"])("denies %s access to user management", role => {
  auth.profile.role = role;
  page();
  expect(screen.getByText("Acesso não autorizado")).toBeInTheDocument();
  expect(api.fetchProfiles).not.toHaveBeenCalled();
});

it("shows no direct promotion for External and no self-change", async () => {
  page();
  const external = (await screen.findByText("Bruno External")).closest("article");
  const self = screen.getByText("Current Director").closest("article");
  expect(within(external).queryByRole("button", { name: /Alterar para/ })).toBeNull();
  expect(within(external).getByText(/Acesso de Membro necessário/)).toBeInTheDocument();
  expect(within(self).queryByRole("button", { name: /Alterar para|Rebaixar/ })).toBeNull();
});

it("searches by name or email and calls the role RPC service after confirmation", async () => {
  page();
  const search = screen.getByRole("searchbox", { name: "Pesquisar por nome ou email" });
  fireEvent.change(search, { target: { value: "ana@example" } });
  const member = (await screen.findByText("Ana Member")).closest("article");
  expect(screen.queryByText("Bruno External")).toBeNull();
  fireEvent.click(within(member).getByRole("button", { name: "Alterar para Diretor" }));
  expect(api.updateRole).not.toHaveBeenCalled();
  fireEvent.click(within(member).getByRole("button", { name: "Confirmar alteração" }));
  await waitFor(() => expect(api.updateRole).toHaveBeenCalledWith("member", "diretor"));
  expect(within(member).getByText("Diretor")).toBeInTheDocument();
});

it("offers only the allowed transitions", () => {
  expect(roleActionsFor(people[1], "actor")).toEqual(["diretor", "coordenador"]);
  expect(roleActionsFor(people[3], "actor")).toEqual(["diretor", "membro"]);
  expect(roleActionsFor(people[2], "actor")).toEqual([]);
  expect(roleActionsFor(people[0], "actor")).toEqual([]);
  expect(roleActionsFor({ ...people[1], status_membro: "pending" }, "actor")).toEqual([]);
});
