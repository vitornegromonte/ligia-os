import { describe, it, expect, beforeEach, vi } from "vitest";
import { fireEvent, render, screen, within } from "@testing-library/react";
import { loadRascunho, saveRascunho, savePretestV2, type PretestResultV2 } from "@/lib/pretest-storage";
import { saveUserStatus } from "@/lib/progress";
import { COMPETENCIAS } from "@/lib/competencias";
import { MemoryRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "../src/contexts/AuthContext.jsx";
import Trilha from "@/aprender/Trilha";
import Licao from "@/aprender/Licao";
import { CONCEITOS } from "@/aprender/dados";

/**
 * Renderiza a área de aprendizado de ponta a ponta em jsdom.
 *
 * A verificação visual da área autenticada depende de acesso ao Supabase do
 * ligia-os, que ainda não temos. Isto cobre o que dá para cobrir sem sessão:
 * que as páginas montam, leem o localStorage e mostram o conteúdo certo.
 */
function renderizar(rota: string) {
  // O AuthProvider é necessário porque o Topbar renderiza o sino de
  // notificações, que lê o contexto. Sem Supabase configurado ele resolve
  // para "sem sessão" e não faz rede — o mesmo caminho de um visitante.
  return render(
    <AuthProvider>
      <MemoryRouter initialEntries={[rota]}>
        <Routes>
          <Route path="/aprender" element={<Trilha />} />
          <Route path="/aprender/c/:conceptId" element={<Licao />} />
        </Routes>
      </MemoryRouter>
    </AuthProvider>,
  );
}

describe("Trilha", () => {
  beforeEach(() => localStorage.clear());

  it("mostra os seis módulos e todos os conceitos", () => {
    renderizar("/aprender");
    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent("Trilha");
    for (const m of ["M0", "M1", "M2", "M3", "M4", "M5"]) {
      expect(screen.getByText(m)).toBeInTheDocument();
    }
    expect(document.querySelectorAll("[data-concept]")).toHaveLength(CONCEITOS.length);
  });

  it("com nivelamento em andamento, oferece continuar em vez de começar", () => {
    saveRascunho({
      passo: 4,
      respostas: { a: 0, b: 1, c: 2 },
      autoRelato: {},
      textosOutro: {},
      seed: "s",
      prova: [],
      contentVersion: "8",
      atualizadoEm: "2026-09-17T10:00:00.000Z",
    });
    renderizar("/aprender");
    expect(screen.getByRole("link", { name: "Continuar nivelamento" })).toBeInTheDocument();
    expect(screen.queryByRole("link", { name: "Fazer o nivelamento" })).toBeNull();
    expect(screen.getByText(/3 de 24/)).toBeInTheDocument();

    // Recomeçar pede confirmação e descarta o rascunho.
    const confirmar = vi.spyOn(window, "confirm").mockReturnValue(true);
    fireEvent.click(screen.getByRole("button", { name: "Recomeçar" }));
    expect(confirmar).toHaveBeenCalled();
    expect(loadRascunho()).toBeNull();
    expect(screen.getByRole("link", { name: "Fazer o nivelamento" })).toBeInTheDocument();
    confirmar.mockRestore();
  });

  it("“Comece aqui” some quando o conceito é concluído", () => {
    const matriz = Object.fromEntries(
      COMPETENCIAS.map((c) => [c.id, { score: 0, mcqScore: 0, priorBoost: 0, confianca: "alta", acertos: 0, total: 4, conceitosFracos: [] }]),
    );
    savePretestV2({
      version: 2,
      contentVersion: "10",
      matriz,
      resultados: {},
      autoRelato: {},
      recomendacao: {
        fronteira: "M0",
        estados: {},
        starNodes: ["algebra-linear-basica"],
        dispensaveisSugeridos: [],
        candidatasDispensa: [],
        mensagem: "",
      },
      dispensasConfirmadas: [],
      ts: "2026-09-17T12:00:00.000Z",
    } as unknown as PretestResultV2);

    const antes = renderizar("/aprender");
    expect(document.querySelector('[data-concept="algebra-linear-basica"]')).toHaveAttribute(
      "data-recommended",
      "true",
    );
    antes.unmount();

    saveUserStatus({ "algebra-linear-basica": "done" });
    renderizar("/aprender");
    const card = document.querySelector('[data-concept="algebra-linear-basica"]')!;
    expect(card).toHaveAttribute("data-state", "done");
    expect(card).not.toHaveAttribute("data-recommended");
  });

  it("sem nivelamento, convida a fazer o teste", () => {
    renderizar("/aprender");
    expect(screen.getByRole("link", { name: "Fazer o nivelamento" })).toBeInTheDocument();
  });

  it("deriva os estados: sem pré-requisito liberado, com pré-requisito trancado", () => {
    renderizar("/aprender");
    const semPrereq = CONCEITOS.find((c) => c.prereqs.length === 0)!;
    const comPrereq = CONCEITOS.find((c) => c.prereqs.length > 0)!;
    expect(document.querySelector(`[data-concept="${semPrereq.id}"]`)).toHaveAttribute("data-state", "available");
    expect(document.querySelector(`[data-concept="${comPrereq.id}"]`)).toHaveAttribute("data-state", "locked");
  });

  it("concluir um pré-requisito destranca quem depende dele", () => {
    const comPrereq = CONCEITOS.find((c) => c.prereqs.length > 0)!;
    const prereqs = Object.fromEntries(comPrereq.prereqs.map((p) => [p, "done"]));
    localStorage.setItem("ligia-skill-tree:status:v1", JSON.stringify(prereqs));
    renderizar("/aprender");
    expect(document.querySelector(`[data-concept="${comPrereq.id}"]`)).toHaveAttribute("data-state", "available");
  });

  it("reporta o avanço na barra de progresso", () => {
    localStorage.setItem(
      "ligia-skill-tree:status:v1",
      JSON.stringify({ [CONCEITOS[0].id]: "done", [CONCEITOS[1].id]: "done" }),
    );
    renderizar("/aprender");
    const barra = screen.getByRole("progressbar", { name: /conceitos concluídos/ });
    expect(barra).toHaveAttribute("aria-valuenow", "2");
    expect(barra).toHaveAttribute("aria-valuemax", String(CONCEITOS.length));
  });

  it("anuncia conceitos vencidos para revisão", () => {
    const antigo = new Date(Date.now() - 40 * 864e5).toISOString();
    localStorage.setItem(
      "ligia-loop:results:v1",
      JSON.stringify({
        atencao: { at: antigo, times: 1, streak: 1, acertei: 5, parcial: 0, errei: 0, total: 5 },
      }),
    );
    renderizar("/aprender");
    expect(screen.getByText(/conceito para revisar/)).toBeInTheDocument();
  });
});

describe("Hub da lição", () => {
  beforeEach(() => localStorage.clear());

  it("reúne material, prática conceitual e prática de código numa tela", () => {
    // multi-head-attention é o caso mais carregado: sete tarefas de código.
    renderizar("/aprender/c/multi-head-attention");
    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent("Multi-Head Attention");
    expect(screen.getByRole("heading", { name: "Prática de recuperação" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Prática de código" })).toBeInTheDocument();
    expect(screen.getByText("0/7 resolvidas")).toBeInTheDocument();
  });

  it("ordena as tarefas de código por dificuldade", () => {
    renderizar("/aprender/c/ativacoes");
    const secao = screen.getByRole("heading", { name: "Prática de código" }).closest("section")!;
    const rotulos = within(secao).getAllByText(/Iniciante|Intermediário|Avançado/).map((e) => e.textContent);
    expect(rotulos[0]).toBe("Iniciante");
  });

  it("lista os pré-requisitos pendentes como links navegáveis", () => {
    renderizar("/aprender/c/backprop");
    expect(screen.getByText(/Antes deste conceito, conclua/)).toBeInTheDocument();
  });

  it("conceito sem exercício de código explica por quê", () => {
    renderizar("/aprender/c/knn");
    expect(screen.getByText(/Sem exercício de código/)).toBeInTheDocument();
    // A nota do mapeamento vira a explicação ao aluno.
    expect(screen.getByText(/kNN não tem task no catálogo/)).toBeInTheDocument();
  });

  it("conceito inexistente cai no 404, não em tela vazia", () => {
    renderizar("/aprender/c/nao-existe");
    expect(screen.getByText(/Nada aqui/)).toBeInTheDocument();
  });
});
