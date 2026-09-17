import { describe, it, expect, beforeEach } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { MemoryRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "../src/contexts/AuthContext.jsx";
import Nivelamento from "@/aprender/Nivelamento";
import { NIVELAMENTO } from "@/aprender/dados";
import { recomendar, scoreCompetencias } from "@/lib/nivelamento";
import { questoesDaEtapa, questoesParaEngine } from "@/lib/nivelamento-content";
import { corrigir, montarProva } from "@/lib/nivelamento-rodada";
import { loadPretestV2, savePretestV2 } from "@/lib/pretest-storage";

/** Rodada salva com matemática gabaritada (candidata) e o resto em "Não sei". */
function salvarRodada() {
  const questoes = montarProva(NIVELAMENTO, 1, { seed: "teste" });
  const respostas = Object.fromEntries(
    questoes.map((q) => [
      q.id,
      q.competencia === "matematica" ? q.correta : q.opcoes.findIndex((o) => o.naoSei),
    ]),
  );
  const resultados = corrigir(questoes, respostas);
  const matriz = scoreCompetencias(questoesParaEngine(questoes), resultados, {});
  savePretestV2({
    version: 2,
    contentVersion: NIVELAMENTO.version,
    matriz,
    resultados,
    autoRelato: {},
    recomendacao: recomendar(matriz),
    dispensasConfirmadas: [],
    ts: "2026-09-17T12:00:00.000Z",
  });
}

function renderizar(rota: string) {
  return render(
    <AuthProvider>
      <MemoryRouter initialEntries={[rota]}>
        <Routes>
          <Route path="/aprender/nivelamento" element={<Nivelamento />} />
          <Route path="/aprender" element={<p>trilha</p>} />
        </Routes>
      </MemoryRouter>
    </AuthProvider>,
  );
}

describe("Nivelamento — página", () => {
  beforeEach(() => {
    localStorage.clear();
    sessionStorage.clear();
  });

  it("o texto do 'Não sei' não promete que ele vale mais que chutar", () => {
    renderizar("/aprender/nivelamento");
    fireEvent.click(screen.getByRole("button", { name: /Começar/ }));
    const dica = screen.getByText(/Sem certeza\?/);
    expect(dica).toHaveTextContent(/vale o mesmo que errar na nota/);
    expect(dica).not.toHaveTextContent(/vale mais/);
  });

  it("sorteia uma forma por questão e guarda a prova no rascunho", () => {
    renderizar("/aprender/nivelamento");
    fireEvent.click(screen.getByRole("button", { name: /Começar/ }));
    const rascunho = JSON.parse(sessionStorage.getItem("ligia-nivelamento:rascunho:v1")!);
    expect(rascunho.prova).toHaveLength(20);
    const slots = rascunho.prova.map((id: string) => NIVELAMENTO.mcq.find((q) => q.id === id)!.slot);
    expect(new Set(slots).size).toBe(20);
    const primeira = NIVELAMENTO.mcq.find((q) => q.id === rascunho.prova[0])!;
    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent(primeira.pergunta);
  });

  it("sem rodada salva, ?ver=resultado cai no wizard", () => {
    renderizar("/aprender/nivelamento?ver=resultado");
    expect(screen.getByRole("button", { name: /Começar/ })).toBeInTheDocument();
  });

  it("candidata só vira dispensa depois da etapa 2, e a dispensa é gravada na rodada", () => {
    salvarRodada();
    renderizar("/aprender/nivelamento?ver=resultado");

    expect(screen.getByText(/confirme para pular/)).toBeInTheDocument();
    expect(screen.queryByText("Módulos confirmados")).not.toBeInTheDocument();
    // Revisão de módulo candidato fica fechada até a confirmação; a dos outros abre.
    expect(document.querySelector('[data-questao="n-matematica-1"]')).toBeNull();
    const naoSei = document.querySelector('[data-questao="n-ml-classico-1"]');
    expect(naoSei).toHaveTextContent("Não sei");
    expect(naoSei).toHaveTextContent(
      NIVELAMENTO.mcq.find((q) => q.id === "n-ml-classico-1")!.explicacao,
    );

    fireEvent.click(screen.getByRole("button", { name: /M0 · / }));
    fireEvent.click(screen.getByRole("button", { name: /Responder 4 perguntas/ }));

    // A forma de cada questão é sorteada: acha pelo enunciado na tela.
    const formas = questoesDaEtapa(NIVELAMENTO, 2, ["matematica"]);
    for (let i = 0; i < 4; i++) {
      const titulo = screen.getByRole("heading", { level: 1 }).textContent;
      const q = formas.find((f) => f.pergunta === titulo)!;
      expect(q, titulo ?? "").toBeDefined();
      fireEvent.click(screen.getByRole("button", { name: q.opcoes[q.correta].texto }));
      fireEvent.click(screen.getByRole("button", { name: i === 3 ? /Ver confirmação/ : /Avançar/ }));
    }

    expect(screen.getByText("Módulos confirmados")).toBeInTheDocument();
    expect(loadPretestV2()?.recomendacao.estados.matematica).toBe("dispensavel");

    // Com a confirmação feita, a revisão de matemática abre, com as 8 questões.
    const revisaoMat = screen.getByText(/M0 · /, { selector: ".nv-revisao__resumo span" });
    expect(revisaoMat.nextElementSibling).toHaveTextContent("8 de 8");

    fireEvent.click(screen.getByRole("button", { name: /Confirmar e ir pra trilha/ }));
    expect(screen.getByText("trilha")).toBeInTheDocument();
    expect(loadPretestV2()?.dispensasConfirmadas).toEqual(["M0"]);
  });
});
