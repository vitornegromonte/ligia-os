import { describe, it, expect, beforeEach } from "vitest";
import { render, screen, within } from "@testing-library/react";
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
