import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import QuestionCard from "@/components/pretest/QuestionCard";
import type { OpcaoRenderizavel } from "@/components/pretest/QuestionCard";

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
