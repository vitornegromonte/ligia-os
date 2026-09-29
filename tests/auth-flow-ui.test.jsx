import { beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter, Outlet, Route, Routes } from "react-router-dom";
import Register from "../src/pages/Register.jsx";
import Login from "../src/pages/Login.jsx";
import ResetPassword from "../src/pages/ResetPassword.jsx";
import Profile from "../src/pages/Profile.jsx";
import { authMessage } from "../src/auth/messages.js";

const auth = vi.hoisted(() => ({ signUp: vi.fn(), signIn: vi.fn(), resetPassword: vi.fn(), updatePassword: vi.fn(), signOut: vi.fn(), recovery: false, status: "unauthenticated" }));
vi.mock("../src/contexts/AuthContext.jsx", () => ({ useAuth: () => auth }));

function page(route = "/register") {
  return render(<MemoryRouter initialEntries={[route]}><Routes>
    <Route path="/register" element={<Register />} />
    <Route path="/login" element={<Login />} />
    <Route path="/reset-password" element={<ResetPassword />} />
  </Routes></MemoryRouter>);
}

function fillRegister({ confirmation = "secret123" } = {}) {
  fireEvent.change(screen.getByLabelText("Nome completo"), { target: { value: "Ada Lovelace" } });
  fireEvent.change(screen.getByLabelText("Email"), { target: { value: "ada@example.test" } });
  fireEvent.change(screen.getByLabelText("Senha"), { target: { value: "secret123" } });
  fireEvent.change(screen.getByLabelText("Confirmar senha"), { target: { value: confirmation } });
}

beforeEach(() => {
  vi.clearAllMocks();
  auth.recovery = false;
  auth.status = "unauthenticated";
  auth.signUp.mockResolvedValue({ session: null });
  auth.signIn.mockResolvedValue({});
  auth.resetPassword.mockResolvedValue({});
  auth.updatePassword.mockResolvedValue({});
  auth.signOut.mockResolvedValue({});
  auth.profile = { id: "ada", name: "Ada", email: "ada@example.test", role: "externo", status_membro: "none" };
});

describe("registration", () => {
  it("submits only basic identity and matching password, with no organizational fields", async () => {
    page(); fillRegister();
    expect(screen.queryByLabelText("Equipe")).toBeNull();
    expect(screen.queryByLabelText("GitHub")).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: "Criar conta" }));
    await waitFor(() => expect(auth.signUp).toHaveBeenCalledWith("ada@example.test", "secret123", { name: "Ada Lovelace" }));
    expect(screen.getByText(/Conta criada/)).toBeInTheDocument();
    expect(screen.getByText(/Enviamos um email de confirmação/)).toBeInTheDocument();
    expect(screen.queryByText(/se a confirmação por email estiver ativada/i)).toBeNull();
  });
  it("rejects different passwords before calling Auth", () => {
    page(); fillRegister({ confirmation: "different" });
    fireEvent.click(screen.getByRole("button", { name: "Criar conta" }));
    expect(screen.getByText("As senhas não coincidem.")).toBeInTheDocument();
    expect(auth.signUp).not.toHaveBeenCalled();
  });
  it("requires valid email and a password of at least six characters", () => {
    page(); fillRegister();
    const email = screen.getByLabelText("Email");
    fireEvent.change(email, { target: { value: "invalid" } });
    expect(email.validity.typeMismatch).toBe(true);
    const password = screen.getByLabelText("Senha");
    fireEvent.change(password, { target: { value: "short" } });
    expect(password).toHaveAttribute("minlength", "6");
    expect(auth.signUp).not.toHaveBeenCalled();
  });
  it("prevents a second submit while the first signup is pending", async () => {
    let finish;
    auth.signUp.mockReturnValue(new Promise(resolve => { finish = resolve; }));
    page(); fillRegister();
    const form = screen.getByRole("button", { name: "Criar conta" }).closest("form");
    fireEvent.submit(form); fireEvent.submit(form);
    expect(auth.signUp).toHaveBeenCalledTimes(1);
    expect(screen.getByRole("button", { name: /Criando conta/ })).toBeDisabled();
    finish({ session: null });
    await screen.findByText(/Conta criada/);
  });
  it("shows a neutral message when signup reports an existing account", async () => {
    auth.signUp.mockRejectedValue({ code: "user_already_exists", message: "User already registered" });
    page(); fillRegister(); fireEvent.click(screen.getByRole("button", { name: "Criar conta" }));
    expect(await screen.findByText(/Não foi possível concluir o cadastro/)).toBeInTheDocument();
    expect(screen.queryByText(/already registered/)).toBeNull();
  });
  it("does not keep an unexpected signup session active", async () => {
    auth.signUp.mockResolvedValue({ session: { user: { id: "new-user" } } });
    page(); fillRegister(); fireEvent.click(screen.getByRole("button", { name: "Criar conta" }));
    await waitFor(() => expect(auth.signOut).toHaveBeenCalledTimes(1));
    expect(await screen.findByText(/Enviamos um email de confirmação/)).toBeInTheDocument();
  });
});

describe("login and recovery", () => {
  it("normalizes invalid credentials", async () => {
    auth.signIn.mockRejectedValue({ code: "invalid_credentials", message: "Invalid login credentials" });
    page("/login");
    fireEvent.change(screen.getByLabelText("Email"), { target: { value: "ada@example.test" } });
    fireEvent.change(screen.getByLabelText("Senha"), { target: { value: "wrong" } });
    fireEvent.click(screen.getByRole("button", { name: "Entrar" }));
    expect(await screen.findByText("Email ou senha inválidos.")).toBeInTheDocument();
  });
  it("explains that email confirmation is required before login", async () => {
    auth.signIn.mockRejectedValue({ code: "email_not_confirmed", message: "Email not confirmed" });
    page("/login");
    fireEvent.change(screen.getByLabelText("Email"), { target: { value: "ada@example.test" } });
    fireEvent.change(screen.getByLabelText("Senha"), { target: { value: "secret123" } });
    fireEvent.click(screen.getByRole("button", { name: "Entrar" }));
    expect(await screen.findByText("Confirme seu email antes de entrar.")).toBeInTheDocument();
  });
  it("does not reveal account existence in recovery errors", async () => {
    auth.resetPassword.mockRejectedValue({ message: "User not found" });
    page("/login"); fireEvent.click(screen.getByText("Esqueci minha senha"));
    fireEvent.change(screen.getByLabelText("Email"), { target: { value: "unknown@example.test" } });
    fireEvent.click(screen.getByRole("button", { name: /Enviar link/ }));
    expect(await screen.findByText(/Se um email válido foi informado/)).toBeInTheDocument();
    expect(screen.queryByText(/User not found/)).toBeNull();
  });
  it("shows missing and expired recovery links", () => {
    page("/reset-password?error=access_denied&error_code=otp_expired");
    expect(screen.getByText(/link de recuperação é inválido ou expirou/)).toBeInTheDocument();
    expect(screen.queryByLabelText("Nova senha")).toBeNull();
  });
  it("updates the password, signs out and returns to login", async () => {
    auth.recovery = true;
    page("/reset-password");
    fireEvent.change(screen.getByLabelText("Nova senha"), { target: { value: "newSecret123" } });
    fireEvent.change(screen.getByLabelText("Confirmar nova senha"), { target: { value: "newSecret123" } });
    fireEvent.click(screen.getByRole("button", { name: "Salvar nova senha" }));
    await waitFor(() => expect(auth.updatePassword).toHaveBeenCalledWith("newSecret123"));
    await waitFor(() => expect(auth.signOut).toHaveBeenCalledTimes(1));
    expect(await screen.findByText(/Senha atualizada. Entre com sua nova senha/)).toBeInTheDocument();
  });
  it("rejects different new passwords before updating", () => {
    auth.recovery = true;
    page("/reset-password");
    fireEvent.change(screen.getByLabelText("Nova senha"), { target: { value: "newSecret123" } });
    fireEvent.change(screen.getByLabelText("Confirmar nova senha"), { target: { value: "different" } });
    fireEvent.click(screen.getByRole("button", { name: "Salvar nova senha" }));
    expect(screen.getByText("As senhas não coincidem.")).toBeInTheDocument();
    expect(auth.updatePassword).not.toHaveBeenCalled();
  });
  it("maps expired links and weak passwords to product messages", () => {
    expect(authMessage({ code: "otp_expired" }, "password-update")).toMatch(/expirou/);
    expect(authMessage({ code: "weak_password" }, "signup")).toMatch(/senha mais forte/);
  });
});

describe("external profile entry", () => {
  function renderProfile(status_membro) {
    auth.profile = { ...auth.profile, status_membro };
    render(<MemoryRouter initialEntries={["/perfil"]}><Routes>
      <Route element={<Outlet context={{ setMenuOpen: vi.fn() }} />}><Route path="/perfil" element={<Profile />} /></Route>
    </Routes></MemoryRouter>);
  }
  it("shows the membership action for a new or rejected external", () => {
    renderProfile("rejected");
    expect(screen.getByRole("link", { name: /solicite acesso interno/i })).toHaveAttribute("href", "/solicitar-entrada");
  });
  it("shows pending status without inviting another application", () => {
    renderProfile("pending");
    expect(screen.getByText("Aguardando validação do acesso interno.")).toBeInTheDocument();
    expect(screen.queryByRole("link", { name: /solicite acesso interno/i })).toBeNull();
  });
});
