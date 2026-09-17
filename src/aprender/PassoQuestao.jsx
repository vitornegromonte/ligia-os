import { useMemo } from "react";
import QuestionCard from "./QuestionCard.tsx";
import { ordemDasOpcoes } from "../lib/embaralhar.ts";

/**
 * Um passo de múltipla escolha do nivelamento — usado nas duas etapas.
 *
 * As opções aparecem embaralhadas por `${seed}:${id}` (estável na sessão,
 * "Não sei" sempre por último), mas a resposta sobe como índice da opção
 * ORIGINAL, que é o que a correção entende.
 */
export default function PassoQuestao({ questao, rotulo, seed, resposta, onResponder, tituloRef }) {
  const ordem = useMemo(
    () => ordemDasOpcoes(questao.opcoes, `${seed}:${questao.id}`, (o) => o.naoSei),
    [questao, seed],
  );

  return (
    <>
      <p className="nv-passo-rotulo">{rotulo}</p>
      <h1 ref={tituloRef} tabIndex={-1} className="nv-titulo">
        {questao.pergunta}
      </h1>
      <div style={{ marginTop: 24 }}>
        <QuestionCard
          id={questao.id}
          pergunta=""
          opcoes={ordem.map((i) => questao.opcoes[i])}
          tipo="single"
          selected={resposta !== undefined ? [ordem.indexOf(resposta)] : []}
          onSelect={(next) => onResponder(ordem[next[0]])}
        />
      </div>
      <p style={{ margin: "14px 0 0", color: "var(--muted)", fontSize: 12 }}>
        Sem certeza? <strong style={{ color: "var(--text)" }}>“Não sei”</strong> vale mais que
        chutar — é assim que a trilha acerta seu ponto de partida.
      </p>
    </>
  );
}
