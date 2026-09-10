import { describe, it, expect } from "vitest";
import { render } from "@testing-library/react";
import { RadarChart } from "@/components/ui/RadarChart";

/** 6 eixos genéricos — prova que o componente não depende das 5 dimensões da matriz. */
const AXES = [
  { id: "logica", label: "Lógica" },
  { id: "python", label: "Python" },
  { id: "dados", label: "Dados" },
  { id: "ml", label: "ML" },
  { id: "etica", label: "Ética" },
  { id: "comunicacao", label: "Comunicação" },
];
const VALUES = [0.8, 0.6, 0.4, 0.9, 0.5, 0.7];
const RING_COUNT = 4; // anéis de referência [0.25, 0.5, 0.75, 1]

describe("RadarChart (componente genérico)", () => {
  it("renderiza um rótulo de texto por eixo", () => {
    const { container } = render(<RadarChart axes={AXES} values={VALUES} />);
    const labels = Array.from(container.querySelectorAll("text")).map(
      (t) => t.textContent,
    );
    expect(labels).toEqual(AXES.map((a) => a.label));
  });

  it("desenha o polígono de dados preenchido (além dos anéis vazados)", () => {
    const { container } = render(<RadarChart axes={AXES} values={VALUES} />);
    const polygons = Array.from(container.querySelectorAll("polygon"));
    const filled = polygons.filter((p) => p.style.fill !== "none");
    expect(filled).toHaveLength(1);
  });

  it("sem meta → só anéis + 1 polígono de dados", () => {
    const { container } = render(<RadarChart axes={AXES} values={VALUES} />);
    expect(container.querySelectorAll("polygon")).toHaveLength(RING_COUNT + 1);
  });

  it("com meta → um segundo polígono tracejado, sem fill", () => {
    const meta = [1, 1, 0.8, 1, 0.9, 1];
    const { container } = render(
      <RadarChart axes={AXES} values={VALUES} meta={meta} />,
    );
    const polygons = Array.from(container.querySelectorAll("polygon"));
    expect(polygons).toHaveLength(RING_COUNT + 2);
    const dashed = polygons.filter((p) => p.getAttribute("stroke-dasharray"));
    expect(dashed).toHaveLength(1);
    expect(dashed[0].style.fill).toBe("none");
  });

  it("o SVG é decorativo (aria-hidden) — o chamador fornece o equivalente textual", () => {
    const { container } = render(<RadarChart axes={AXES} values={VALUES} />);
    expect(container.querySelector("svg")).toHaveAttribute("aria-hidden", "true");
  });
});
