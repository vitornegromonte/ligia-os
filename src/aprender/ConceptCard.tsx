import { Circle, CircleDot, CheckCircle2, Lock, Star, RotateCcw, Code2, type LucideIcon } from "lucide-react";
import type { NodeState } from "@/lib/status";
import type { Concept } from "@/lib/content";
import { corDoModulo } from "@/lib/modulos";

const ICONE_ESTADO: Record<NodeState, LucideIcon> = {
  available: Circle,
  "in-progress": CircleDot,
  done: CheckCircle2,
  locked: Lock,
};

const ROTULO_VALIDACAO: Record<string, string> = {
  quiz: "quiz",
  project: "projeto",
  report: "report",
};

export type ConceptCardProps = {
  concept: Concept;
  state: NodeState;
  recommended: boolean;
  skipped: boolean;
  hasAula: boolean;
  unmetPrereqs: string[];
  needsReview?: boolean;
  selected: boolean;
  /** Prática de código: quantas resolvidas de quantas mapeadas. */
  codigo?: { resolvidas: number; total: number };
  onSelect: () => void;
};

export default function ConceptCard({
  concept,
  state,
  recommended,
  skipped,
  hasAula,
  unmetPrereqs,
  needsReview,
  selected,
  codigo,
  onSelect,
}: ConceptCardProps) {
  const cor = corDoModulo(concept.module);
  const Icone = ICONE_ESTADO[state];
  const corIcone =
    state === "done" ? "var(--success)" : state === "locked" ? "var(--muted)" : cor;
  const validacao = concept.validation ? ROTULO_VALIDACAO[concept.validation.type] : null;

  return (
    <button
      type="button"
      onClick={onSelect}
      className="tr-card"
      // Atributos de dado, não classes: são o gancho tanto do CSS de estado
      // quanto dos testes e2e, e sobrevivem a renomear classe.
      data-concept={concept.id}
      data-state={state}
      data-recommended={recommended || undefined}
      data-skipped={skipped || undefined}
      data-review={needsReview || undefined}
      data-selected={selected || undefined}
      aria-pressed={selected}
    >
      {recommended && (
        <span className="tr-fita tr-fita--destaque">
          <Star size={11} fill="currentColor" aria-hidden /> Comece aqui
        </span>
      )}
      {!recommended && needsReview && (
        <span className="tr-fita tr-fita--revisar">
          <RotateCcw size={11} aria-hidden /> Revisar
        </span>
      )}

      <div className="tr-card__topo">
        <Icone size={17} color={corIcone} strokeWidth={2} style={{ flex: "0 0 auto" }} aria-hidden />
        <span className="tr-card__titulo">{concept.label}</span>
      </div>

      <div className="tr-card__rodape">
        {state === "locked" && unmetPrereqs.length > 0 ? (
          <span>requer: {unmetPrereqs.slice(0, 2).join(", ")}</span>
        ) : (
          <span style={{ display: "inline-flex", alignItems: "center", gap: 8 }}>
            <span className="tr-card__ponto" style={{ background: cor }} aria-hidden />
            {concept.materials.length}{" "}
            {concept.materials.length === 1 ? "material" : "materiais"}
            {validacao ? ` · ${validacao}` : ""}
          </span>
        )}
        {hasAula && <span className="tr-card__selo">Aula</span>}
        {codigo && codigo.total > 0 && (
          <span
            style={{ display: "inline-flex", alignItems: "center", gap: 4 }}
            title={`${codigo.resolvidas} de ${codigo.total} práticas de código resolvidas`}
          >
            <Code2 size={12} aria-hidden />
            {codigo.resolvidas}/{codigo.total}
          </span>
        )}
      </div>
    </button>
  );
}
