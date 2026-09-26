/**
 * Geometria pura de um radar (gráfico de teia) com N eixos. Sem React, sem
 * SVG — só as coordenadas, alvo de testes. O componente MatrixRadar consome
 * isto pra desenhar o SVG. Escolha de projeto: visual próprio em vez de lib de
 * gráfico (mesmo racional do skill tree, que largou @xyflow por layout próprio).
 *
 * Convenção: eixo 0 aponta pra cima (-90°), eixos seguem no sentido horário.
 * Sistema de coordenadas do SVG (y cresce pra baixo).
 */

export type RadarPoint = { x: number; y: number };

const clamp01 = (n: number): number => Math.min(1, Math.max(0, n));

/** Ângulo (radianos) do eixo i de um total `count`. Eixo 0 = topo. */
export function radarAngle(i: number, count: number): number {
  return -Math.PI / 2 + (i * 2 * Math.PI) / count;
}

/** Ponto no eixo i a uma fração `frac` (0–1, com clamp) do raio r a partir do centro. */
export function radarPoint(
  cx: number,
  cy: number,
  r: number,
  i: number,
  count: number,
  frac: number,
): RadarPoint {
  const a = radarAngle(i, count);
  const d = r * clamp01(frac);
  return { x: cx + d * Math.cos(a), y: cy + d * Math.sin(a) };
}

/** Vértices do polígono de dados: um por valor (fração 0–1). */
export function radarVertices(
  cx: number,
  cy: number,
  r: number,
  fracs: number[],
): RadarPoint[] {
  return fracs.map((f, i) => radarPoint(cx, cy, r, i, fracs.length, f));
}

/** Extremos dos eixos (frac 1) — pontas das hastes / âncoras dos rótulos. */
export function radarAxisEnds(cx: number, cy: number, r: number, count: number): RadarPoint[] {
  return Array.from({ length: count }, (_, i) => radarPoint(cx, cy, r, i, count, 1));
}

/** Serializa pontos pro atributo `points` de um <polygon>/<polyline>. */
export function pointsToPath(points: RadarPoint[]): string {
  return points.map((p) => `${p.x},${p.y}`).join(" ");
}
