import { describe, it, expect, beforeEach } from "vitest";
import { fireEvent, render, screen, within } from "@testing-library/react";
import { MemoryRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "../src/contexts/AuthContext.jsx";
import Nivelamento from "@/aprender/Nivelamento";
import { NIVELAMENTO } from "@/aprender/dados";
import { recomendar, scoreCompetencias } from "@/lib/nivelamento";
import { questoesDaEtapa, questoesParaEngine } from "@/lib/nivelamento-content";
import { corrigir, montarProva } from "@/lib/nivelamento-rodada";
import { loadPerfil, loadPretestV2, loadRascunho, savePretestV2 } from "@/lib/pretest-storage";

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

  it("sorteia uma forma por questão (20 MCQ + 4 de código) e guarda a prova no rascunho", () => {
    renderizar("/aprender/nivelamento");
    fireEvent.click(screen.getByRole("button", { name: /Começar/ }));
    const rascunho = JSON.parse(localStorage.getItem("ligia-nivelamento:rascunho:v2")!);
    expect(rascunho.prova).toHaveLength(24);
    const formas = [...NIVELAMENTO.mcq, ...NIVELAMENTO.codigo.questoes];
    const slots = rascunho.prova.map((id: string) => formas.find((q) => q.id === id)!.slot);
    expect(new Set(slots).size).toBe(24);
    expect(slots.slice(20).every((s: string) => s.startsWith("n-codigo-"))).toBe(true);
    const primeira = NIVELAMENTO.mcq.find((q) => q.id === rascunho.prova[0])!;
    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent(primeira.pergunta);
  });

  it("do fim do wizard ao resultado, com a leitura de código fora do radar", () => {
    renderizar("/aprender/nivelamento");
    fireEvent.click(screen.getByRole("button", { name: /Começar/ }));
    const formas = [...NIVELAMENTO.mcq, ...NIVELAMENTO.codigo.questoes];
    for (let i = 0; i < 24; i++) {
      const titulo = screen.getByRole("heading", { level: 1 }).textContent;
      // Várias formas de código têm o mesmo enunciado: desempata pelo trecho mostrado.
      const trecho = document.querySelector(".nv-codigo code")?.textContent;
      const q = formas.find((f) => f.pergunta === titulo && (f.codigo ?? undefined) === (trecho ?? undefined))!;
      const opcao = i >= 20 ? q.opcoes[q.correta].texto : "Não sei";
      fireEvent.click(screen.getByRole("button", { name: opcao }));
      fireEvent.click(screen.getByRole("button", { name: i === 23 ? /Ver meu resultado/ : /Avançar/ }));
    }
    expect(screen.getByText("Leitura de código · 4 de 4")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /Abrir a Prática Torch/ })).toHaveAttribute("href", "/aprender/codar");
    const salvo = loadPretestV2()!;
    expect(Object.keys(salvo.resultados)).toHaveLength(24);
    expect(Object.keys(salvo.respostas ?? {})).toHaveLength(24);
    // Terminar o teste apaga o rascunho: a trilha não pode oferecer "continuar".
    expect(loadRascunho()).toBeNull();
    for (const c of Object.values(salvo.matriz)) expect(c.score).toBe(0);
  });

  it("na revisão, erro com alternativa registrada mostra o que foi marcado e o equívoco", () => {
    const prova = montarProva(NIVELAMENTO, 1, { seed: "teste" });
    const alvo = prova.find((q) => q.competencia === "ml-classico")!;
    const errada = alvo.opcoes.findIndex((o, i) => i !== alvo.correta && !o.naoSei);
    const escolhas = Object.fromEntries(
      prova.map((q) => [q.id, q.id === alvo.id ? errada : q.opcoes.findIndex((o) => o.naoSei)]),
    );
    const resultados = corrigir(prova, escolhas);
    const matriz = scoreCompetencias(questoesParaEngine(prova), resultados, {});
    savePretestV2({
      version: 2,
      contentVersion: NIVELAMENTO.version,
      matriz,
      resultados,
      respostas: escolhas,
      autoRelato: {},
      recomendacao: recomendar(matriz),
      dispensasConfirmadas: [],
      ts: "2026-09-17T12:00:00.000Z",
    });
    renderizar("/aprender/nivelamento?ver=resultado");
    const item = document.querySelector(`[data-questao="${alvo.id}"]`)!;
    expect(item).toHaveTextContent(`Você marcou “${alvo.opcoes[errada].texto}”.`);
    expect(item).toHaveTextContent(alvo.opcoes[errada].equivoco!);
    // "Não sei" não é erro: não aponta equívoco.
    const outra = prova.find((q) => q.competencia === "matematica")!;
    expect(document.querySelector(`[data-questao="${outra.id}"] .nv-revisao__equivoco`)).toBeNull();
  });

  it("só abrir a página não cria rascunho", () => {
    renderizar("/aprender/nivelamento");
    expect(loadRascunho()).toBeNull();
  });

  it("terminar depois guarda onde parou e, ao voltar, retoma na mesma questão", () => {
    const primeira = renderizar("/aprender/nivelamento");
    fireEvent.click(screen.getByRole("button", { name: /Começar/ }));
    for (let i = 0; i < 2; i++) {
      fireEvent.click(screen.getAllByRole("button", { name: "Não sei" })[0]);
      fireEvent.click(screen.getByRole("button", { name: /Avançar/ }));
    }
    const tituloDaTerceira = screen.getByRole("heading", { level: 1 }).textContent;
    fireEvent.click(screen.getByRole("button", { name: /Terminar depois/ }));
    expect(screen.getByText("trilha")).toBeInTheDocument();

    const r = loadRascunho()!;
    expect(r.passo).toBe(3);
    expect(Object.keys(r.respostas)).toHaveLength(2);
    primeira.unmount();

    renderizar("/aprender/nivelamento");
    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent(tituloDaTerceira!);
    expect(screen.getByText("2/24")).toBeInTheDocument();
  });

  it("começar grava o \"quem é você\" como perfil, com o texto de \"Outro\"", () => {
    renderizar("/aprender/nivelamento");
    const ar2 = document.querySelector('[data-q="ar2"]') as HTMLElement;
    fireEvent.click(within(ar2).getByRole("button", { name: "Outra" }));
    fireEvent.change(within(ar2).getByLabelText("Qual? (opcional)"), { target: { value: "Rust" } });
    fireEvent.click(screen.getByRole("button", { name: /Começar/ }));
    const perfil = loadPerfil()!;
    const iOutra = NIVELAMENTO.auto_relato.find((p) => p.id === "ar2")!.opcoes.findIndex((o) => o.outro);
    expect(perfil.autoRelato.ar2).toEqual([iOutra]);
    expect(perfil.textosOutro).toEqual({ ar2: "Rust" });
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
