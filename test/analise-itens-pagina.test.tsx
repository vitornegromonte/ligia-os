import { describe, it, expect, vi, afterEach, beforeEach } from "vitest";
import { render, screen, within } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { NIVELAMENTO } from "@/aprender/dados";
import { recomendar, scoreCompetencias } from "@/lib/nivelamento";
import { questoesParaEngine } from "@/lib/nivelamento-content";
import { corrigir, montarProva, respostasDe } from "@/lib/nivelamento-rodada";
import { savePretestV2 } from "@/lib/pretest-storage";

afterEach(() => {
  vi.doUnmock("../src/contexts/AuthContext.jsx");
});

describe("Análise do nivelamento — página", () => {
  beforeEach(() => localStorage.clear());

  it("sem Supabase, analisa a rodada local e mostra a alternativa marcada", async () => {
    const prova = montarProva(NIVELAMENTO, 1, { seed: "x" });
    const escolhas = Object.fromEntries(prova.map((q) => [q.id, q.correta]));
    const resultados = corrigir(prova, escolhas);
    const matriz = scoreCompetencias(questoesParaEngine(prova), resultados, {});
    savePretestV2({
      version: 2,
      contentVersion: NIVELAMENTO.version,
      matriz,
      resultados,
      respostas: respostasDe(prova, escolhas),
      autoRelato: {},
      recomendacao: recomendar(matriz),
      dispensasConfirmadas: [],
      ts: "2026-09-17T12:00:00.000Z",
    });

    vi.resetModules();
    vi.doMock("../src/contexts/AuthContext.jsx", () => ({
      useAuth: () => ({ session: null, profile: null, loading: false }),
    }));
    const { default: AnaliseItens } = await import("../src/aprender/AnaliseItens.jsx");
    render(
      <MemoryRouter>
        <AnaliseItens />
      </MemoryRouter>,
    );

    expect(screen.getByRole("status")).toHaveTextContent("rodada deste navegador");
    const card = document.querySelector(`[data-item="${prova[0].id}"]`) as HTMLElement;
    expect(card).not.toBeNull();
    expect(within(card).getByText("menos de 30 respostas")).toBeInTheDocument();
    expect(within(card).getByText("100%")).toBeInTheDocument();
    expect(within(card).getByText(/1 com a escolha registrada/)).toBeInTheDocument();
    expect(within(card).getByText("1 · 100%")).toBeInTheDocument();
  });
});

describe("Sidebar — item de staff", () => {
  async function sidebarCom(role: string) {
    vi.resetModules();
    vi.doMock("../src/contexts/AuthContext.jsx", () => ({
      useAuth: () => ({ profile: { role, name: "Teste" }, signOut: () => {} }),
    }));
    const { default: Sidebar } = await import("../src/components/Sidebar.jsx");
    return render(
      <MemoryRouter initialEntries={["/aprender"]}>
        <Sidebar open={false} onClose={() => {}} />
      </MemoryRouter>,
    );
  }

  it("admin vê a análise do nivelamento; membro não", async () => {
    const admin = await sidebarCom("admin");
    expect(screen.getByRole("link", { name: /Análise do nivelamento/ })).toBeInTheDocument();
    admin.unmount();
    await sidebarCom("membro");
    expect(screen.queryByRole("link", { name: /Análise do nivelamento/ })).toBeNull();
    expect(screen.getByRole("link", { name: /Trilha/ })).toBeInTheDocument();
  });
});
