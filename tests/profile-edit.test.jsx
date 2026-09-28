import { beforeEach, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import ProfileEdit from "../src/components/ProfileEdit.jsx";

const { auth, updateProfile, showToast } = vi.hoisted(() => ({
  auth: { profile: null, refreshProfile: vi.fn() },
  updateProfile: vi.fn(),
  showToast: vi.fn(),
}));
vi.mock("../src/contexts/AuthContext.jsx", () => ({ useAuth: () => auth }));
vi.mock("../src/services/profiles.js", () => ({ updateProfile }));
vi.mock("../src/utils/toast.js", () => ({ showToast }));

beforeEach(() => {
  vi.clearAllMocks();
  auth.profile = {
    id: "profile-1", role: "externo", name: "Ana", email: "ana@example.test", bio: "Perfil externo",
    avatar_url: "https://example.test/avatar.png", team: "NLP", affiliation: "CIn-UFPE",
    skills: ["Python"], researchInterests: "AI", lattes: "https://lattes.test/a",
    github: "https://github.com/ana", linkedin: "https://linkedin.com/in/ana", kaggle: "https://kaggle.com/ana",
  };
  updateProfile.mockResolvedValue({});
});

it("shows external basic profile fields and omits internal and academic fields", () => {
  render(<ProfileEdit open onClose={vi.fn()} />);
  expect(screen.getByLabelText("Nome")).toBeInTheDocument();
  expect(screen.getByLabelText("Bio")).toBeInTheDocument();
  for (const label of ["Equipe", "Vínculo", "Habilidades (separadas por vírgula)", "Interesses de pesquisa", "Redes acadêmicas"]) {
    expect(screen.queryByLabelText(label)).toBeNull();
  }
  for (const id of ["profile-lattes", "profile-github", "profile-linkedin", "profile-kaggle"]) {
    expect(document.getElementById(id)).toBeNull();
  }
});

it("updates only permitted external fields, preserving hidden legacy values", async () => {
  render(<ProfileEdit open onClose={vi.fn()} />);
  fireEvent.change(screen.getByLabelText("Nome"), { target: { value: "Ana Nova" } });
  fireEvent.change(screen.getByLabelText("Bio"), { target: { value: "Nova apresentação" } });
  fireEvent.click(screen.getByRole("button", { name: /Salvar alterações/i }));
  await waitFor(() => expect(updateProfile).toHaveBeenCalledWith("profile-1", expect.objectContaining({
    name: "Ana Nova", bio: "Nova apresentação", avatar_url: "https://example.test/avatar.png",
  })));
  const payload = updateProfile.mock.calls[0][1];
  for (const field of ["team", "affiliation", "skills", "research_interests", "researchInterests", "lattes", "github", "linkedin", "kaggle", "email", "role"]) {
    expect(payload).not.toHaveProperty(field);
  }
});

it("keeps the full profile editor available to internal members", () => {
  auth.profile = { ...auth.profile, role: "membro" };
  render(<ProfileEdit open onClose={vi.fn()} />);
  expect(screen.getByLabelText("Equipe")).toBeInTheDocument();
  expect(screen.getByLabelText("Habilidades (separadas por vírgula)")).toBeInTheDocument();
  expect(document.getElementById("profile-github")).toBeInTheDocument();
});
