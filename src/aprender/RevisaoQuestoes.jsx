import { Link } from "react-router-dom";
import { Check, X, HelpCircle } from "lucide-react";
import { MODULOS, ROTULO_CONCEITO } from "./dados.ts";
import { COMPETENCIAS } from "../lib/competencias.ts";

const STATUS = {
  acerto: { rotulo: "Você acertou", Icone: Check },
  erro: { rotulo: "Você errou", Icone: X },
  "nao-sei": { rotulo: "Você marcou “Não sei”", Icone: HelpCircle },
};

/**
 * Revisão por questão: resposta certa, explicação e link para o conceito.
 *
 * O pré-teste melhora o aprendizado justamente do que foi perguntado, e o
 * efeito cresce com feedback (Pan & Carpenter, 2023) — daí mostrar a
 * explicação logo no resultado.
 *
 * Módulo com dispensa por confirmar fica fechado: as questões da confirmação
 * cobrem os mesmos assuntos, e ler as explicações antes mediria leitura, não
 * domínio. A revisão dele abre quando a confirmação é feita.
 */
export default function RevisaoQuestoes({ conteudo, rodada }) {
  const vistas = conteudo.mcq.filter((q) => rodada.resultados[q.id] !== undefined);

  return (
    <div className="nv-revisao">
      {COMPETENCIAS.map((c) => {
        const questoes = vistas.filter((q) => q.competencia === c.id);
        if (questoes.length === 0) return null;
        const acertos = questoes.filter((q) => rodada.resultados[q.id] === "acerto").length;
        const bloqueada = rodada.recomendacao.estados[c.id] === "dispensa-a-confirmar";

        return (
          <details key={c.id} className="nv-revisao__grupo">
            <summary className="nv-revisao__resumo">
              <span>
                {c.modulo} · {MODULOS[c.modulo] ?? c.label}
              </span>
              <span>
                {bloqueada ? "abre após a confirmação" : `${acertos} de ${questoes.length}`}
              </span>
            </summary>
            {bloqueada ? (
              <p className="nv-revisao__certa" style={{ padding: "0 14px 14px" }}>
                Você pode confirmar a dispensa deste módulo. Como as perguntas da confirmação
                cobrem os mesmos assuntos, a revisão abre depois dela.
              </p>
            ) : (
              <ol className="nv-revisao__lista">
                {questoes.map((q) => {
                  const resultado = rodada.resultados[q.id];
                  const { rotulo, Icone } = STATUS[resultado] ?? STATUS["nao-sei"];
                  return (
                    <li key={q.id} className="nv-revisao__item" data-questao={q.id}>
                      <span className={`nv-revisao__status nv-revisao__status--${resultado}`}>
                        <Icone size={13} aria-hidden /> {rotulo}
                        {q.etapa === 2 && <span style={{ color: "var(--muted)" }}>· confirmação</span>}
                      </span>
                      <p className="nv-revisao__pergunta">{q.pergunta}</p>
                      <p className="nv-revisao__certa">
                        Resposta: <strong>{q.opcoes[q.correta].texto}</strong>
                      </p>
                      <p className="nv-revisao__explicacao">{q.explicacao}</p>
                      <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginTop: 8 }}>
                        {q.conceitos.map((id) => (
                          <Link key={id} to={`/aprender/c/${id}`} className="lg-chip">
                            {ROTULO_CONCEITO[id] ?? id}
                          </Link>
                        ))}
                      </div>
                    </li>
                  );
                })}
              </ol>
            )}
          </details>
        );
      })}
    </div>
  );
}
