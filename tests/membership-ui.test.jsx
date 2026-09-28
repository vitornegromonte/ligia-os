import { beforeEach, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import MembershipRequest from "../src/pages/MembershipRequest.jsx";
import MembershipAdmin from "../src/pages/MembershipAdmin.jsx";

const { auth, api } = vi.hoisted(() => ({
  auth: { profile: { id: "external", role: "externo", status_membro: "none", name: "Student" }, refreshProfile: vi.fn() },
  api: { fetchMyMembershipRequests: vi.fn(), submitMembershipRequest: vi.fn(), fetchMembershipRequests: vi.fn(), reviewMembershipRequest: vi.fn() },
}));
vi.mock("../src/contexts/AuthContext.jsx", () => ({ useAuth: () => auth }));
vi.mock("../src/services/membership.js", () => api);

beforeEach(() => {
  vi.clearAllMocks();
  auth.profile = { id: "external", role: "externo", status_membro: "none", name: "Student" };
  api.fetchMyMembershipRequests.mockResolvedValue([]);
  api.fetchMembershipRequests.mockResolvedValue([]);
});

it("lets an external submit a complete request and then shows pending", async () => {
  api.submitMembershipRequest.mockResolvedValue({ id: "request", status: "pending", requested_at: "2026-09-27", details: { name: "Student" } });
  render(<MemoryRouter><MembershipRequest /></MemoryRouter>);
  fireEvent.change(await screen.findByLabelText("Nome completo"), { target: { value: "Student Name" } });
  fireEvent.change(screen.getByLabelText("Equipe de interesse"), { target: { value: "Machine Learning" } });
  fireEvent.change(screen.getByLabelText("Área de atuação"), { target: { value: "Engineering" } });
  fireEvent.change(screen.getByLabelText("Por que deseja participar?"), { target: { value: "I want to contribute to applied research." } });
  fireEvent.click(screen.getByRole("button", { name: "Enviar solicitação" }));
  await waitFor(() => expect(api.submitMembershipRequest).toHaveBeenCalledWith(expect.objectContaining({ team: "Machine Learning" })));
  expect(await screen.findByText(/Solicitação em análise/)).toBeInTheDocument();
  expect(auth.refreshProfile).toHaveBeenCalled();
});

it("prevents duplicate submission while pending and permits a new attempt after rejection", async () => {
  auth.profile.status_membro = "pending";
  const view = render(<MemoryRouter><MembershipRequest /></MemoryRouter>);
  expect(await screen.findByText(/Solicitação em análise/)).toBeInTheDocument();
  expect(screen.queryByRole("button", { name: "Enviar solicitação" })).toBeNull();
  view.unmount();
  auth.profile.status_membro = "rejected";
  render(<MemoryRouter><MembershipRequest /></MemoryRouter>);
  expect(await screen.findByText(/solicitação anterior foi rejeitada/)).toBeInTheDocument();
  expect(screen.getByRole("button", { name: "Enviar solicitação" })).toBeInTheDocument();
});

it("shows the applicant details and sends an administrative decision", async () => {
  api.fetchMembershipRequests.mockResolvedValue([{ id: "request", status: "pending", requested_at: "2026-09-27", details: {
    name: "Student Name", team: "ML", discipline: "Engineering", motivation: "I want to contribute to applied research."
  } }]);
  api.reviewMembershipRequest.mockResolvedValue({ id: "request", status: "approved", requested_at: "2026-09-27", details: { name: "Student Name", team: "ML", discipline: "Engineering" } });
  render(<MembershipAdmin />);
  expect(await screen.findByText("Student Name")).toBeInTheDocument();
  fireEvent.click(screen.getByRole("button", { name: "Aprovar" }));
  await waitFor(() => expect(api.reviewMembershipRequest).toHaveBeenCalledWith("request", true));
  expect(screen.queryByRole("button", { name: "Aprovar" })).toBeNull();
});
