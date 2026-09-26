import { radarVertices, radarAxisEnds, radarPoint, pointsToPath } from "@/lib/radar";

/** Um eixo do radar: id estável (key do React) + rótulo curto desenhado no SVG. */
export type RadarAxis = { id: string; label: string };

// Folga horizontal generosa: o texto do eixo não quebra linha, então o corte
// na borda é o modo de falha típico. Rótulos longos devem usar forma curta
// (ver Competencia.labelCurto) — a largura extra é a segunda linha de defesa.
const CX = 170;
const CY = 118;
const R = 84;
const VIEW_W = 340;
const VIEW_H = 236;
const RINGS = [0.25, 0.5, 0.75, 1];

/** Âncora do rótulo conforme o lado do eixo. */
function anchorFor(x: number): "start" | "middle" | "end" {
  if (Math.abs(x - CX) < 4) return "middle";
  return x > CX ? "start" : "end";
}

/**
 * Radar (gráfico de teia) genérico com N eixos (N≥3). SVG próprio, sem lib de
 * gráfico — a geometria vem de lib/radar.ts.
 *
 * Acessibilidade: o SVG é decorativo (`aria-hidden`). O CHAMADOR é responsável
 * pelo equivalente textual — a lista de valores ao lado. Isso é contrato, não
 * detalhe: sem ele o painel fica ilegível para leitor de tela.
 *
 * @param axes   eixos, em ordem horária a partir do topo
 * @param values valores 0–1, um por eixo (clamp em radarPoint)
 * @param meta   opcional: polígono de referência, tracejado, atrás dos dados
 */
export function RadarChart({
  axes,
  values,
  meta,
  className = "",
}: {
  axes: RadarAxis[];
  values: number[];
  meta?: number[];
  className?: string;
}) {
  const count = axes.length;
  const dataPts = radarVertices(CX, CY, R, values);
  const axisEnds = radarAxisEnds(CX, CY, R, count);

  return (
    <svg
      viewBox={`0 0 ${VIEW_W} ${VIEW_H}`}
      role="img"
      aria-hidden="true"
      className={className}
      style={{ width: "100%", maxWidth: 320, display: "block" }}
    >
      {RINGS.map((f) => (
        <polygon
          key={f}
          points={pointsToPath(radarVertices(CX, CY, R, new Array(count).fill(f)))}
          style={{ fill: "none", stroke: "var(--line)" }}
          strokeWidth={1}
        />
      ))}

      {axisEnds.map((end, i) => {
        const label = radarPoint(CX, CY, R + 16, i, count, 1);
        return (
          <g key={axes[i].id}>
            <line
              x1={CX}
              y1={CY}
              x2={end.x}
              y2={end.y}
              style={{ stroke: "var(--line)" }}
              strokeWidth={1}
            />
            <text
              x={label.x}
              y={label.y}
              textAnchor={anchorFor(label.x)}
              dominantBaseline="middle"
              style={{ fill: "var(--muted)", fontSize: "11px" }}
            >
              {axes[i].label}
            </text>
          </g>
        );
      })}

      {meta && (
        <polygon
          points={pointsToPath(radarVertices(CX, CY, R, meta))}
          style={{ fill: "none", stroke: "var(--accent)" }}
          strokeWidth={1}
          strokeDasharray="4 3"
        />
      )}

      <polygon
        points={pointsToPath(dataPts)}
        style={{ fill: "var(--accent)", fillOpacity: 0.22, stroke: "var(--accent)" }}
        strokeWidth={2}
      />
      {dataPts.map((p, i) => (
        <circle key={i} cx={p.x} cy={p.y} r={2.5} style={{ fill: "var(--accent)" }} />
      ))}
    </svg>
  );
}

export default RadarChart;
