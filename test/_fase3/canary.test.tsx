import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { Button } from "@/components/ui/button";

/**
 * Teste-canário da F0: prova que o pipeline de testes (Vitest + jsdom +
 * Testing Library + React 19 + alias @/) está vivo de ponta a ponta.
 */
describe("canário F0", () => {
  it("o ambiente de testes roda", () => {
    expect(1 + 1).toBe(2);
  });

  it("renderiza um componente da UI com o alias @/", () => {
    render(<Button>Começar trilha</Button>);
    expect(
      screen.getByRole("button", { name: "Começar trilha" }),
    ).toBeInTheDocument();
  });
});
