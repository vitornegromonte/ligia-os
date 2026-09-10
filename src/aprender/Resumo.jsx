import { useState } from "react";
import { Link } from "react-router-dom";
import { Check, RotateCcw, BookOpen } from "lucide-react";
import { Button } from "../ui/Button.tsx";
import { scoreOf } from "../lib/loop-session.ts";
import { saveLoopResult, loopMastery } from "../lib/loop-progress.ts";

/** Fechamento da prática: placar, ponteiros de aprofundamento e ações. */
export default function Resumo({ loop, session, conceptId, onRestart, headingRef }) {
  const s = scoreOf(session);
  const total = loop.checagens.length;
  const dominado = loopMastery(s, total) === "dominado";
  const [salvo, setSalvo] = useState(false);

  return (
    <section className="pr-checagem">
      <h2 ref={headingRef} tabIndex={-1} style={{ margin: 0, fontSize: 18, fontWeight: 600, outline: "none" }}>
        Prática concluída
      </h2>

      <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: 8, marginTop: 8 }}>
        <span
          className="lg-chip lg-chip--static"
          style={{
            borderColor: `color-mix(in srgb, var(${dominado ? "--success" : "--warning"}) 45%, var(--line))`,
            color: `var(${dominado ? "--success" : "--warning"})`,
          }}
        >
          {dominado ? "Dominado" : "Praticado"}
        </span>
        <span style={{ color: "var(--muted)", fontSize: 13 }}>
          {s.acertei} acertei · {s.parcial} parcial · {s.errei} não acertei
        </span>
      </div>

      {!dominado && (
        <p style={{ margin: "10px 0 0", color: "var(--muted)", fontSize: 13 }}>
          Você acertou {s.acertei} de {total} — refazer agora ajuda a fixar.
        </p>
      )}

      {loop.ponteiros.length > 0 && (
        <div style={{ marginTop: 18 }}>
          <h3 className="eyebrow" style={{ marginBottom: 8 }}>Ir mais fundo</h3>
          <ul style={{ margin: 0, padding: 0, listStyle: "none", display: "grid", gap: 6, fontSize: 13 }}>
            {loop.ponteiros.map((p, i) => (
              <li key={i} style={{ display: "flex", gap: 8, color: "color-mix(in srgb, var(--text) 88%, var(--muted))" }}>
                <BookOpen size={14} aria-hidden style={{ marginTop: 3, flex: "0 0 auto", color: "var(--muted)" }} />
                {p}
              </li>
            ))}
          </ul>
        </div>
      )}

      <div style={{ display: "flex", flexWrap: "wrap", gap: 10, marginTop: 20 }}>
        {/* A prática só conta quando o aluno conclui explicitamente — é isso que
            alimenta o agendamento de revisão. */}
        <Button
          size="sm"
          disabled={salvo}
          onClick={() => {
            saveLoopResult(conceptId, s, total);
            setSalvo(true);
          }}
        >
          <Check size={15} aria-hidden /> {salvo ? "Marcada como feita" : "Concluir prática"}
        </Button>
        <Button size="sm" variant="secondary" onClick={onRestart}>
          <RotateCcw size={15} aria-hidden /> Refazer
        </Button>
        <Button as={Link} to={`/aprender/c/${conceptId}`} size="sm" variant="ghost">
          Voltar à lição
        </Button>
      </div>
    </section>
  );
}
