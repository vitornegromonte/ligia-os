import { describe, it, expect, beforeEach, vi, afterEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { MemoryRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "../src/contexts/AuthContext.jsx";
import Praticar from "@/aprender/Praticar";
import { parseGrading } from "../supabase/functions/_shared/verdict.ts";

vi.mock("@/aprender/edge", async () => {
  const real = await vi.importActual<typeof import("@/aprender/edge")>("@/aprender/edge");
  return {
    ...real,
    correcaoAoVivoDisponivel: () => mockAoVivo(),
    chamarEdgeStream: (...args: unknown[]) => mockChamar(...args),
  };
});

let mockAoVivo = () => false;
let mockChamar: (...args: unknown[]) => Promise<Response> = async () => {
  throw new Error("não configurado");
};

function renderizar(conceptId = "regressao-linear") {
  return render(
    <AuthProvider>
      <MemoryRouter initialEntries={[`/aprender/c/${conceptId}/praticar`]}>
        <Routes>
          <Route path="/aprender/c/:conceptId/praticar" element={<Praticar />} />
        </Routes>
      </MemoryRouter>
    </AuthProvider>,
  );
}

/** Response de texto em streaming, como a Edge Function devolve. */
function respostaStream(texto: string): Response {
  return new Response(texto, { headers: { "Content-Type": "text/plain" } });
}

describe("parseGrading — o contrato do avaliador", () => {
  it("lê o veredito da primeira linha e o feedback do resto", () => {
    const r = parseGrading("acertei\nVocê cobriu o essencial.");
    expect(r).toEqual({ veredito: "acertei", feedback: "Você cobriu o essencial.", matched: true });
  });

  it("marca matched:false quando nenhuma palavra é reconhecida", () => {
    // É este flag que impede o veredito fantasma: sem ele, o default
    // 'parcial' entraria como se o avaliador tivesse dito isso.
    const r = parseGrading("Desculpe, não entendi.\nblá");
    expect(r.matched).toBe(false);
    expect(r.veredito).toBe("parcial");
  });

  it("texto vazio não casa", () => {
    expect(parseGrading("").matched).toBe(false);
  });
});

describe("Praticar — sem correção ao vivo", () => {
  beforeEach(() => {
    localStorage.clear();
    mockAoVivo = () => false;
  });

  it("oferece revelar a rubrica em vez de enviar", () => {
    renderizar();
    expect(screen.getByRole("button", { name: /Ver o que esperávamos/ })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /Enviar resposta/ })).toBeNull();
  });

  it("mostra a orientação desde o início, sem passo intermediário", () => {
    renderizar();
    expect(document.querySelector(".pr-orientacao")?.textContent).toBeTruthy();
  });

  it("revelar exige uma resposta escrita", () => {
    renderizar();
    const botao = screen.getByRole("button", { name: /Ver o que esperávamos/ });
    expect(botao).toBeDisabled();
    fireEvent.change(screen.getByLabelText("Sua resposta"), { target: { value: "minha tentativa" } });
    expect(botao).toBeEnabled();
  });

  it("revelada a rubrica, oferece os três vereditos de auto-avaliação", () => {
    renderizar();
    fireEvent.change(screen.getByLabelText("Sua resposta"), { target: { value: "x" } });
    fireEvent.click(screen.getByRole("button", { name: /Ver o que esperávamos/ }));
    expect(screen.getByText("O que uma boa resposta tem")).toBeInTheDocument();
    for (const v of ["Acertei", "Parcial", "Não acertei"]) {
      expect(screen.getByRole("button", { name: v })).toBeInTheDocument();
    }
  });
});

describe("Praticar — com correção ao vivo", () => {
  beforeEach(() => {
    localStorage.clear();
    mockAoVivo = () => true;
  });
  afterEach(() => vi.clearAllMocks());

  async function responder(texto: string) {
    renderizar();
    fireEvent.change(screen.getByLabelText("Sua resposta"), { target: { value: "minha resposta" } });
    fireEvent.click(screen.getByRole("button", { name: /Enviar resposta/ }));
    return texto;
  }

  it("mostra o veredito quando o avaliador responde no formato", async () => {
    mockChamar = async () => respostaStream("acertei\nBoa — cobriu a rubrica.");
    await responder("");
    await waitFor(() => expect(screen.getByText("Acertei")).toBeInTheDocument());
    expect(screen.getByRole("button", { name: /Próxima checagem/ })).toBeInTheDocument();
  });

  it("NÃO inventa veredito quando a resposta sai fora do formato", async () => {
    // Este é o comportamento mais importante da tela: um 'parcial' fantasma
    // corromperia o agendamento de revisão e a matriz de competências.
    mockChamar = async () => respostaStream("não consegui avaliar isso");
    await responder("");
    await waitFor(() => expect(screen.getByRole("alert")).toBeInTheDocument());
    expect(screen.getByRole("alert").textContent).toMatch(/autoavalie/);
    expect(screen.queryByRole("button", { name: /Próxima checagem/ })).toBeNull();
    // E cai na auto-avaliação, com a rubrica à mostra.
    expect(screen.getByText("O que uma boa resposta tem")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Acertei" })).toBeInTheDocument();
  });

  it("stream vazio também é falha, não sucesso silencioso", async () => {
    mockChamar = async () => respostaStream("");
    await responder("");
    await waitFor(() => expect(screen.getByRole("alert")).toBeInTheDocument());
  });

  it("429 explica que é cota, e não erro genérico", async () => {
    mockChamar = async () => {
      const e = new Error("sem cota") as Error & { status: number };
      e.status = 429;
      throw e;
    };
    await responder("");
    await waitFor(() => expect(screen.getByRole("alert").textContent).toMatch(/sem cota/i));
  });

  it("falha de rede degrada para auto-avaliação, não para tela quebrada", async () => {
    mockChamar = async () => {
      throw new Error("network");
    };
    await responder("");
    await waitFor(() => expect(screen.getByRole("alert")).toBeInTheDocument());
    expect(screen.getByRole("button", { name: "Parcial" })).toBeInTheDocument();
  });
});
