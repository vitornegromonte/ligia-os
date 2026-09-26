import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import QuestionCard from "@/aprender/QuestionCard";
import type { OpcaoRenderizavel } from "@/aprender/QuestionCard";

/**
 * Mecanismo de opção exclusiva no QuestionCard (pergunta multi):
 * marcar uma opção `exclusiva` (tipo "Nenhum destes") desmarca as demais, e
 * marcar uma opção normal remove a exclusiva do array. `single` inalterado.
 * Props sintéticas — o conteúdo com "Nenhum" entra em outra wave.
 */

// A, B normais + "Nenhum destes" exclusiva
const OPCOES: OpcaoRenderizavel[] = [
  { texto: "A", exclusiva: false },
  { texto: "B", exclusiva: false },
  { texto: "Nenhum destes", exclusiva: true },
];

function setup(tipo: "single" | "multi", selected: number[]) {
  const onSelect = vi.fn();
  render(
    <QuestionCard
      id="q-teste"
      pergunta="Pergunta de teste?"
      opcoes={OPCOES}
      tipo={tipo}
      selected={selected}
      onSelect={onSelect}
    />,
  );
  return { onSelect };
}

describe("QuestionCard multi: opção exclusiva", () => {
  it("marcar a exclusiva desmarca todas as outras", () => {
    const { onSelect } = setup("multi", [0, 1]);
    fireEvent.click(screen.getByRole("button", { name: "Nenhum destes" }));
    expect(onSelect).toHaveBeenCalledWith([2]);
  });

  it("marcar uma normal remove a exclusiva selecionada", () => {
    const { onSelect } = setup("multi", [2]);
    fireEvent.click(screen.getByRole("button", { name: "A" }));
    expect(onSelect).toHaveBeenCalledWith([0]);
  });

  it("desmarcar uma normal continua funcionando", () => {
    const { onSelect } = setup("multi", [0, 1]);
    fireEvent.click(screen.getByRole("button", { name: "A" }));
    expect(onSelect).toHaveBeenCalledWith([1]);
  });

  it("desmarcar a exclusiva esvazia a seleção", () => {
    const { onSelect } = setup("multi", [2]);
    fireEvent.click(screen.getByRole("button", { name: "Nenhum destes" }));
    expect(onSelect).toHaveBeenCalledWith([]);
  });

  it("marcar uma normal sem exclusiva selecionada só acumula", () => {
    const { onSelect } = setup("multi", [0]);
    fireEvent.click(screen.getByRole("button", { name: "B" }));
    expect(onSelect).toHaveBeenCalledWith([0, 1]);
  });
});

describe("QuestionCard single: inalterado", () => {
  it("clicar em qualquer opção (exclusiva ou não) seleciona só ela", () => {
    const { onSelect } = setup("single", [0]);
    fireEvent.click(screen.getByRole("button", { name: "B" }));
    expect(onSelect).toHaveBeenCalledWith([1]);
    fireEvent.click(screen.getByRole("button", { name: "Nenhum destes" }));
    expect(onSelect).toHaveBeenCalledWith([2]);
  });
});

describe("QuestionCard multi: limite de escolhas", () => {
  const AREAS: OpcaoRenderizavel[] = [
    { texto: "CV" },
    { texto: "NLP" },
    { texto: "RL" },
    { texto: "Ainda não sei", exclusiva: true },
  ];

  function comLimite(selected: number[]) {
    const onSelect = vi.fn();
    render(
      <QuestionCard pergunta="Áreas?" opcoes={AREAS} tipo="multi" selected={selected} onSelect={onSelect} maxEscolhas={2} />,
    );
    return { onSelect };
  }

  it("mostra a dica e, abaixo do limite, deixa tudo habilitado", () => {
    comLimite([0]);
    expect(screen.getByText("Escolha até 2.")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "RL" })).toBeEnabled();
  });

  it("no limite, desabilita as não marcadas mas não a exclusiva nem as marcadas", () => {
    const { onSelect } = comLimite([0, 1]);
    expect(screen.getByRole("button", { name: "RL" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "CV" })).toBeEnabled();
    fireEvent.click(screen.getByRole("button", { name: "Ainda não sei" }));
    expect(onSelect).toHaveBeenCalledWith([3]);
  });
});

describe("QuestionCard: texto de \"Outro\"", () => {
  const LINGUAGENS: OpcaoRenderizavel[] = [
    { texto: "Python" },
    { texto: "Outra", outro: true },
  ];

  function comOutro(selected: number[], texto = "") {
    const onTextoOutro = vi.fn();
    render(
      <QuestionCard
        pergunta="Linguagens?"
        opcoes={LINGUAGENS}
        tipo="multi"
        selected={selected}
        onSelect={() => {}}
        textoOutro={texto}
        onTextoOutro={onTextoOutro}
      />,
    );
    return { onTextoOutro };
  }

  it("o campo só aparece com \"Outro\" marcada", () => {
    comOutro([0]);
    expect(screen.queryByLabelText("Qual? (opcional)")).toBeNull();
  });

  it("com \"Outro\" marcada, o campo aparece, não é obrigatório e repassa o texto", () => {
    const { onTextoOutro } = comOutro([1], "Rust");
    const campo = screen.getByLabelText("Qual? (opcional)");
    expect(campo).toHaveValue("Rust");
    expect(campo).not.toBeRequired();
    expect(campo).toHaveAttribute("maxLength", "80");
    fireEvent.change(campo, { target: { value: "Go" } });
    expect(onTextoOutro).toHaveBeenCalledWith("Go");
  });
});

describe("QuestionCard: a11y", () => {
  it("aria-pressed reflete a seleção atual", () => {
    setup("multi", [0, 2]);
    expect(screen.getByRole("button", { name: "A" })).toHaveAttribute("aria-pressed", "true");
    expect(screen.getByRole("button", { name: "B" })).toHaveAttribute("aria-pressed", "false");
    expect(screen.getByRole("button", { name: "Nenhum destes" })).toHaveAttribute(
      "aria-pressed",
      "true",
    );
  });
});
