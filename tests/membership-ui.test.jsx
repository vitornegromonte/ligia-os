import { beforeEach, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import MembershipRequest from "../src/pages/MembershipRequest.jsx";
import MembershipAdmin from "../src/pages/MembershipAdmin.jsx";

const { auth, api } = vi.hoisted(() => ({
  auth: { profile: { id: "external", role: "externo", status_membro: "none", name: "Student", team: "NLP", discipline: "Research" }, refreshProfile: vi.fn() },
  api: { fetchMyMembershipRequests: vi.fn(), submitMembershipRequest: vi.fn(), fetchMembershipRequests: vi.fn(), reviewMembershipRequest: vi.fn() },
}));
vi.mock("../src/contexts/AuthContext.jsx", () => ({ useAuth: () => auth }));
vi.mock("../src/services/membership.js", () => api);

beforeEach(() => {
  vi.clearAllMocks();
  auth.profile = { id: "external", role: "externo", status_membro: "none", name: "Student", team: "NLP", discipline: "Research" };
  api.fetchMyMembershipRequests.mockResolvedValue([]);
  api.fetchMembershipRequests.mockResolvedValue([]);
});

it("explains that internal access is only for existing Ligia members", async () => {
  render(<MemoryRouter><MembershipRequest /></MemoryRouter>);
  expect(await screen.findByText(/exclusiva para quem já é membro efetivo da Ligia/i)).toBeInTheDocument();
  expect(screen.getByLabelText(/Confirmo que já sou membro efetivo/)).toBeInTheDocument();
  expect(screen.queryByLabelText(/motivação|participar/i)).toBeNull();
});

it("submits identity and organizational details without motivation, then shows pending", async () => {
  api.submitMembershipRequest.mockResolvedValue({ id: "request", status: "pending", requested_at: "2026-09-27", details: { name: "Student Name" } });
  render(<MemoryRouter><MembershipRequest /></MemoryRouter>);
  fireEvent.change(await screen.findByLabelText("Nome completo"), { target: { value: "Student Name" } });
  fireEvent.change(screen.getByLabelText("Equipe"), { target: { value: "ML" } });
  fireEvent.click(screen.getByRole("button", { name: "ML" }));
  fireEvent.click(screen.getByRole("button", { name: "NLP" }));
  expect(screen.queryByLabelText("Sobre você")).toBeNull();
  fireEvent.click(screen.getByLabelText(/Confirmo que já sou membro efetivo/));
  fireEvent.click(screen.getByRole("button", { name: "Solicitar acesso interno" }));
  await waitFor(() => expect(api.submitMembershipRequest).toHaveBeenCalledWith(expect.objectContaining({ team: "ML", discipline: "ML, NLP" })));
  expect(api.submitMembershipRequest.mock.calls[0][0]).not.toHaveProperty("bio");
  expect(api.submitMembershipRequest.mock.calls[0][0]).not.toHaveProperty("motivation");
  expect(await screen.findByText(/Aguardando validação do acesso/)).toBeInTheDocument();
  expect(auth.refreshProfile).toHaveBeenCalled();
});

it("requires the existing-member declaration before submission", async () => {
  render(<MemoryRouter><MembershipRequest /></MemoryRouter>);
  await screen.findByLabelText("Nome completo");
  expect(screen.getByRole("button", { name: "Solicitar acesso interno" })).toBeDisabled();
  expect(api.submitMembershipRequest).not.toHaveBeenCalled();
});

it("blocks duplicate pending requests and allows a new access request after rejection", async () => {
  auth.profile.status_membro = "pending";
  const view = render(<MemoryRouter><MembershipRequest /></MemoryRouter>);
  expect(await screen.findByText(/Aguardando validação do acesso/)).toBeInTheDocument();
  expect(screen.queryByRole("button", { name: "Solicitar acesso interno" })).toBeNull();
  view.unmount();
  auth.profile.status_membro = "rejected";
  render(<MemoryRouter><MembershipRequest /></MemoryRouter>);
  expect(await screen.findByText(/acesso interno não foi validado/i)).toBeInTheDocument();
  expect(screen.getByRole("button", { name: "Solicitar acesso interno" })).toBeInTheDocument();
});

it("shows identity data to reviewers and records an access decision", async () => {
  api.fetchMembershipRequests.mockResolvedValue([{ id: "request", profile_id: "external", applicant_email: "student@example.test", status: "pending", requested_at: "2026-09-27", details: {
    name: "Student Name", team: "ML", discipline: "Engineering", affiliation: "CIn-UFPE", bio: "Researcher", github: "https://github.com/student", linkedin: "https://linkedin.com/in/student"
  } }]);
  api.reviewMembershipRequest.mockResolvedValue({ id: "request", status: "approved", requested_at: "2026-09-27", details: { name: "Student Name", team: "ML", discipline: "Engineering" } });
  render(<MembershipAdmin />);
  expect(await screen.findByText("Solicitações de acesso de membro")).toBeInTheDocument();
  expect(screen.getByText(/já ser membros efetivos/)).toBeInTheDocument();
  expect(screen.getByText(/student@example\.test/)).toBeInTheDocument();
  expect(screen.getByText("Researcher")).toBeInTheDocument();
  fireEvent.click(screen.getByRole("button", { name: "Aprovar acesso" }));
  await waitFor(() => expect(api.reviewMembershipRequest).toHaveBeenCalledWith("request", true));
  expect(screen.queryByRole("button", { name: "Aprovar acesso" })).toBeNull();
});
