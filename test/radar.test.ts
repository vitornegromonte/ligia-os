import { describe, it, expect } from "vitest";
import {
  radarAngle,
  radarPoint,
  radarVertices,
  radarAxisEnds,
  pointsToPath,
} from "@/lib/radar";

const near = (a: number, b: number) => expect(a).toBeCloseTo(b, 6);

describe("radarAngle", () => {
  it("o eixo 0 aponta pra cima (-90°)", () => {
    near(radarAngle(0, 5), -Math.PI / 2);
  });
  it("distribui os eixos uniformemente (passo 2π/count, sentido horário)", () => {
    near(radarAngle(1, 5), -Math.PI / 2 + (2 * Math.PI) / 5);
    near(radarAngle(4, 4), -Math.PI / 2 + 4 * ((2 * Math.PI) / 4));
  });
});

describe("radarPoint", () => {
  it("frac 0 cai no centro", () => {
    const p = radarPoint(100, 100, 80, 0, 5, 0);
    near(p.x, 100);
    near(p.y, 100);
  });
  it("eixo 0 com frac 1 fica no topo (cy - r)", () => {
    const p = radarPoint(100, 100, 80, 0, 5, 1);
    near(p.x, 100);
    near(p.y, 20);
  });
  it("faz clamp de frac fora de [0,1]", () => {
    const p = radarPoint(100, 100, 80, 0, 5, 5); // clamp → 1
    near(p.y, 20);
    const q = radarPoint(100, 100, 80, 0, 5, -3); // clamp → 0
    near(q.y, 100);
  });
});

describe("radarVertices", () => {
  it("gera um vértice por valor, na fração certa", () => {
    const vs = radarVertices(100, 100, 80, [1, 0.5, 0.5, 0.5, 0.5]);
    expect(vs).toHaveLength(5);
    near(vs[0].x, 100);
    near(vs[0].y, 20); // dim 0 no máximo
  });
});

describe("radarAxisEnds", () => {
  it("dá os extremos dos eixos (frac 1) — um por eixo", () => {
    const ends = radarAxisEnds(100, 100, 80, 5);
    expect(ends).toHaveLength(5);
    near(ends[0].x, 100);
    near(ends[0].y, 20);
  });
});

describe("pointsToPath", () => {
  it("serializa pontos no formato do atributo points do <polygon>", () => {
    expect(pointsToPath([{ x: 1, y: 2 }, { x: 3.5, y: 4 }])).toBe("1,2 3.5,4");
  });
});
