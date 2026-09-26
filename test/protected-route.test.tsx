import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter, Routes, Route } from "react-router-dom";

/**
 * O ProtectedRoute lê o modo na carga do módulo, então cada cenário importa
 * uma cópia nova depois de ajustar o ambiente.
 */
async function montar(auth: { session: unknown; profile: unknown; loading: boolean }, allowedRoles?: string[]) {
  vi.resetModules();
  vi.doMock("../src/contexts/AuthContext.jsx", () => ({ useAuth: () => ({ ...auth, status: auth.loading ? "profile_loading" : auth.session ? "authenticated" : "unauthenticated", session: auth.session ? {user:{id:"test"}} : null, profile: auth.profile ? {id:"test", ...auth.profile as object} : null }) }));
  const { default: ProtectedRoute } = await import("../src/components/ProtectedRoute.jsx");
  return render(
    <MemoryRouter initialEntries={["/aprender"]}>
      <Routes>
        <Route path="/login" element={<p>tela de login</p>} />
        <Route
          path="/aprender"
          element={
            <ProtectedRoute allowedRoles={allowedRoles}>
              <p>conteúdo protegido</p>
            </ProtectedRoute>
          }
        />
      </Routes>
    </MemoryRouter>,
  );
}

const SEM_SESSAO = { session: null, profile: null, loading: false };

afterEach(() => {
  vi.unstubAllEnvs();
  vi.doUnmock("../src/contexts/AuthContext.jsx");
});

describe("ProtectedRoute", () => {
  it("sem sessão, manda para o login", async () => {
    await montar(SEM_SESSAO);
    expect(screen.getByText("tela de login")).toBeInTheDocument();
    expect(screen.queryByText("conteúdo protegido")).toBeNull();
  });

  it("com sessão, mostra o conteúdo", async () => {
    await montar({ session: {}, profile: { role: "visitante" }, loading: false });
    expect(screen.getByText("conteúdo protegido")).toBeInTheDocument();
  });

  it("com gate de papel e perfil nulo, NEGA — não falha aberto", async () => {
    await montar({ session: {}, profile: null, loading: false }, ["admin"]);
    expect(screen.queryByText("conteúdo protegido")).toBeNull();
    expect(screen.getByText(/verificar seu acesso/)).toBeInTheDocument();
  });
});

describe("ProtectedRoute — preview sem login", () => {
  it("modo legado sem-login continua exigindo autenticacao", async () => {
    vi.stubEnv("MODE", "sem-login");
    await montar(SEM_SESSAO);
    expect(screen.getByText("tela de login")).toBeInTheDocument();
  });

  it("fora do dev, o mesmo modo NÃO libera nada", async () => {
    vi.stubEnv("MODE", "sem-login");
    vi.stubEnv("DEV", false);
    await montar(SEM_SESSAO);
    expect(screen.getByText("tela de login")).toBeInTheDocument();
  });

  it("dev comum, sem o modo, continua exigindo login", async () => {
    vi.stubEnv("MODE", "development");
    await montar(SEM_SESSAO);
    expect(screen.getByText("tela de login")).toBeInTheDocument();
  });
});
