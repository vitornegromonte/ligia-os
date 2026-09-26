import { describe, it, expect } from "vitest";
import { render, screen, within } from "@testing-library/react";
import { MatrixRadar } from "@/components/matriz/MatrixRadar";
import { summarizeMatrix, DIMENSION_META, MATRIX_DIMENSIONS } from "@/lib/matrix";

describe("MatrixRadar (legenda acessível)", () => {
  it("mostra o nível e a nota derivados do summary", () => {
    // aulas 100 + projetos 100 → S = 60 → intermediário
    const summary = summarizeMatrix({
      aulas: 100,
      projetos: 100,
      agora: 0,
      auto: 0,
      peer: 0,
    });
    render(<MatrixRadar summary={summary} />);
    expect(screen.getByText(/Nível:\s*Intermediário/i)).toBeInTheDocument();
    const caption = screen.getByRole("figure");
    expect(within(caption).getByText("60")).toBeInTheDocument();
  });

  it("lista as 5 dimensões com seus rótulos completos na legenda", () => {
    const summary = summarizeMatrix({
      aulas: 80,
      projetos: 70,
      agora: 60,
      auto: 90,
      peer: 50,
    });
    render(<MatrixRadar summary={summary} />);
    const caption = screen.getByRole("figure");
    for (const d of MATRIX_DIMENSIONS) {
      expect(within(caption).getByText(DIMENSION_META[d].label)).toBeInTheDocument();
    }
  });

  it("o SVG é decorativo (aria-hidden) — o texto carrega a informação", () => {
    const summary = summarizeMatrix({
      aulas: 0,
      projetos: 0,
      agora: 0,
      auto: 0,
      peer: 0,
    });
    const { container } = render(<MatrixRadar summary={summary} />);
    const svg = container.querySelector("svg");
    expect(svg).toHaveAttribute("aria-hidden", "true");
    // nível iniciante quando tudo é 0
    expect(screen.getByText(/Nível:\s*Iniciante/i)).toBeInTheDocument();
  });
});
