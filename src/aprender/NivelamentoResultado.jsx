import { useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowRight, ArrowLeft, RotateCcw, Check } from "lucide-react";
import { Topbar } from "../ui/Topbar.tsx";
import { Button } from "../ui/Button.tsx";
import { Card } from "../ui/Card.tsx";
import { RadarChart } from "../ui/RadarChart.tsx";
import PassoQuestao from "./PassoQuestao.jsx";
import RevisaoQuestoes from "./RevisaoQuestoes.jsx";
import { MODULOS, CONCEITOS_POR_MODULO, ROTULO_CONCEITO } from "./dados.ts";
import { COMPETENCIAS } from "../lib/competencias.ts";
import { GATE_DISPENSA } from "../lib/nivelamento.ts";
import { questoesDaEtapa } from "../lib/nivelamento-content.ts";
import {
  aplicarEtapa2,
  montarProva,
  resumoEtapa2,
  resumoProgramacao,
} from "../lib/nivelamento-rodada.ts";
import {
  loadQuestoesVistas,
  markDispensadosDone,
  registrarQuestoesVistas,
} from "../lib/pretest-storage.ts";
import { logEvent } from "../lib/events.ts";

const ROTULO_CONFIANCA = {
  alta: "sinal claro",
  media: "sinal parcial",
  baixa: "sinal ambíguo",
  "sem-evidencia": "sem evidência",
};

const MODULO_DA_COMPETENCIA = Object.fromEntries(COMPETENCIAS.map((c) => [c.id, c.modulo]));

/** Nº de questões da etapa 2 de uma competência (formas diferentes da mesma questão contam uma vez). */
function questoesNaConfirmacao(conteudo, competencia) {
  return new Set(questoesDaEtapa(conteudo, 2, [competencia]).map((q) => q.slot)).size;
}

/** Módulos aprovados na etapa 2 e ainda não dispensados: começam marcados. */
function marcacaoInicial(rodada) {
  const jaDispensados = new Set(rodada.dispensasConfirmadas);
  const marcadas = {};
  for (const d of rodada.recomendacao.dispensaveisSugeridos ?? []) {
    if (!jaDispensados.has(d.modulo)) marcadas[d.modulo] = true;
  }
  return marcadas;
}

/**
 * Resultado do nivelamento: matriz, ponto de partida e dispensa de módulos.
 *
 * Pular um módulo é em duas etapas. A etapa 1 só candidata o módulo; aqui o
 * aluno escolhe quais quer confirmar e responde mais questões de cada um. A
 * rodada salva é atualizada no lugar (mesmo `ts`), então dá para voltar a esta
 * tela depois pela trilha e confirmar o que ficou pendente.
 */
export default function NivelamentoResultado({ conteudo, rodada, onAtualizar, onRefazer, onIrParaTrilha }) {
  const [modo, setModo] = useState("resumo");
  const [selecionadas, setSelecionadas] = useState([]);
  const [passo, setPasso] = useState(0);
  const [respostas, setRespostas] = useState({});
  const [questoesEtapa2, setQuestoesEtapa2] = useState([]);
  const [dispensasMarcadas, setDispensasMarcadas] = useState(() => marcacaoInicial(rodada));
  const tituloRef = useRef(null);

  const { matriz, recomendacao } = rodada;
  const candidatas = recomendacao.candidatasDispensa ?? [];
  const aprovadas = recomendacao.dispensaveisSugeridos ?? [];
  const jaDispensados = new Set(rodada.dispensasConfirmadas);
  const pendentesDeConfirmar = aprovadas.filter((d) => !jaDispensados.has(d.modulo));
  const etapa2 = useMemo(() => resumoEtapa2(conteudo, rodada), [conteudo, rodada]);
  const reprovadas = COMPETENCIAS.filter((c) => etapa2[c.id] && !etapa2[c.id].aprovada);
  const programacao = useMemo(() => resumoProgramacao(conteudo, rodada), [conteudo, rodada]);

  useEffect(() => {
    if (modo === "confirmando") tituloRef.current?.focus();
  }, [modo, passo]);

  function comecarConfirmacao() {
    // Sorteada uma vez por confirmação; a seed da rodada deixa o sorteio estável.
    setQuestoesEtapa2(
      montarProva(conteudo, 2, {
        seed: rodada.ts,
        vistas: loadQuestoesVistas(),
        competencias: selecionadas,
      }),
    );
    setRespostas({});
    setPasso(0);
    setModo("confirmando");
    window.scrollTo({ top: 0 });
  }

  function concluirConfirmacao() {
    const nova = aplicarEtapa2(conteudo, rodada, questoesEtapa2, respostas);
    registrarQuestoesVistas(questoesEtapa2.map((q) => q.id), new Date().toISOString());
    const novasAprovadas = (nova.recomendacao.dispensaveisSugeridos ?? []).filter((d) =>
      selecionadas.includes(d.competencia),
    );
    setDispensasMarcadas((s) => {
      const out = { ...s };
      for (const d of novasAprovadas) out[d.modulo] = true;
      return out;
    });
    onAtualizar(nova);
    setSelecionadas([]);
    setModo("resumo");
    window.scrollTo({ top: 0 });
  }

  function confirmarEIr() {
    const confirmados = pendentesDeConfirmar.filter((d) => dispensasMarcadas[d.modulo]).map((d) => d.modulo);
    if (confirmados.length) {
      markDispensadosDone(confirmados.flatMap((m) => CONCEITOS_POR_MODULO[m] ?? []));
      for (const m of confirmados) logEvent("dispensa_confirmada", m);
      // União: confirmar agora não pode apagar dispensa confirmada antes.
      const dispensasConfirmadas = [...new Set([...rodada.dispensasConfirmadas, ...confirmados])];
      onAtualizar({ ...rodada, dispensasConfirmadas });
    }
    onIrParaTrilha();
  }

  if (modo === "confirmando") {
    const questao = questoesEtapa2[passo];
    const ultimo = passo === questoesEtapa2.length - 1;
    const respondidas = questoesEtapa2.filter((q) => respostas[q.id] !== undefined).length;
    const pct = Math.round((respondidas / questoesEtapa2.length) * 100);
    const nomeModulo = MODULOS[MODULO_DA_COMPETENCIA[questao.competencia]];

    return (
      <div>
        <Topbar crumb="Confirmar dispensa" />
        <div className="lg-page">
          <div className="nv-wizard">
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 26 }}>
              <div
                className="tr-barra"
                style={{ flex: 1, maxWidth: 200 }}
                role="progressbar"
                aria-valuenow={respondidas}
                aria-valuemin={0}
                aria-valuemax={questoesEtapa2.length}
                aria-label="Progresso da confirmação"
              >
                <div className="tr-barra__preenchimento" style={{ width: `${pct}%` }} />
              </div>
              <span style={{ color: "var(--muted)", fontSize: 12, fontVariantNumeric: "tabular-nums" }}>
                {respondidas}/{questoesEtapa2.length}
              </span>
            </div>

            <PassoQuestao
              questao={questao}
              rotulo={`Confirmação · ${nomeModulo} · questão ${passo + 1} de ${questoesEtapa2.length}`}
              seed={rodada.ts}
              resposta={respostas[questao.id]}
              onResponder={(i) => setRespostas((s) => ({ ...s, [questao.id]: i }))}
              tituloRef={tituloRef}
            />

            <div className="nv-rodape" style={{ marginTop: 34, justifyContent: "space-between" }}>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => (passo === 0 ? setModo("resumo") : setPasso((p) => p - 1))}
              >
                <ArrowLeft size={15} aria-hidden /> {passo === 0 ? "Voltar ao resultado" : "Voltar"}
              </Button>
              {ultimo ? (
                <Button disabled={respostas[questao.id] === undefined} onClick={concluirConfirmacao}>
                  Ver confirmação <ArrowRight size={16} aria-hidden />
                </Button>
              ) : (
                <Button disabled={respostas[questao.id] === undefined} onClick={() => setPasso((p) => p + 1)}>
                  Avançar <ArrowRight size={16} aria-hidden />
                </Button>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  }

  const axes = COMPETENCIAS.map((c) => ({ id: c.id, label: c.labelCurto }));
  const values = COMPETENCIAS.map((c) => (matriz[c.id].score ?? 0) / 100);
  const nSelecionadas = selecionadas.reduce((n, c) => n + questoesNaConfirmacao(conteudo, c), 0);

  return (
    <div>
      <Topbar crumb="Seu resultado" />
      <div className="lg-page">
        <div className="nv-wizard">
          <p className="nv-passo-rotulo">Sua matriz de competências</p>
          <h1 className="nv-titulo">
            Você começa em{" "}
            <span className="gradient-text">
              {recomendacao.fronteira} · {MODULOS[recomendacao.fronteira] ?? recomendacao.fronteira}
            </span>
          </h1>
          <p style={{ margin: "12px 0 0", color: "var(--muted)", fontSize: 13, lineHeight: 1.7 }}>
            {recomendacao.mensagem}
          </p>

          <Card style={{ marginTop: 26 }}>
            <RadarChart axes={axes} values={values} style={{ margin: "0 auto" }} />
            {/* Equivalente textual do radar, que é aria-hidden por contrato. */}
            <ul className="tr-lista" style={{ marginTop: 18 }}>
              {COMPETENCIAS.map((c) => {
                const e = matriz[c.id];
                const estado = recomendacao.estados[c.id];
                return (
                  <li key={c.id}>
                    <span>{c.label}</span>
                    <span className="tr-lista__valor" style={{ textAlign: "right" }}>
                      {e.score === null ? (
                        "sem evidência"
                      ) : (
                        <>
                          <strong style={{ color: "var(--text)", fontVariantNumeric: "tabular-nums" }}>
                            {Math.round(e.score)}
                          </strong>
                          /100 · {ROTULO_CONFIANCA[e.confianca] ?? e.confianca}
                          {estado === "dispensavel" && " · pode pular"}
                          {estado === "dispensa-a-confirmar" && " · confirme para pular"}
                        </>
                      )}
                    </span>
                  </li>
                );
              })}
            </ul>
          </Card>

          {recomendacao.starNodes.length > 0 && (
            <Card style={{ marginTop: 18 }}>
              <h2 style={{ margin: 0, fontSize: 14, fontWeight: 600 }}>Comece por estes conceitos</h2>
              <p style={{ margin: "6px 0 12px", color: "var(--muted)", fontSize: 12 }}>
                Saíram das questões que você errou ou marcou “Não sei”.
              </p>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                {recomendacao.starNodes.map((id) => (
                  <Link key={id} to={`/aprender/c/${id}`} className="lg-chip">
                    {ROTULO_CONCEITO[id] ?? id}
                  </Link>
                ))}
              </div>
            </Card>
          )}

          {candidatas.length > 0 && (
            <Card style={{ marginTop: 18 }}>
              <h2 style={{ margin: 0, fontSize: 14, fontWeight: 600 }}>Quer pular algum módulo?</h2>
              <p style={{ margin: "6px 0 12px", color: "var(--muted)", fontSize: 12, lineHeight: 1.6 }}>
                Você foi bem nestes. Para pular, confirme com mais algumas perguntas de cada módulo
                marcado. Só pula o que você confirmar.
              </p>
              <div style={{ display: "grid", gap: 8 }}>
                {candidatas.map((d) => {
                  const marcada = selecionadas.includes(d.competencia);
                  return (
                    <button
                      key={d.modulo}
                      type="button"
                      onClick={() =>
                        setSelecionadas((s) =>
                          marcada ? s.filter((c) => c !== d.competencia) : [...s, d.competencia],
                        )
                      }
                      aria-pressed={marcada}
                      className="nv-opcao"
                      style={{ alignItems: "flex-start" }}
                    >
                      <span className="nv-marca nv-marca--multi" style={{ marginTop: 2 }} aria-hidden>
                        {marcada && <Check size={11} color="#fff" />}
                      </span>
                      <span>
                        <strong style={{ fontFamily: "var(--font-heading)" }}>
                          {d.modulo} · {MODULOS[d.modulo] ?? d.modulo}
                        </strong>
                        <span style={{ display: "block", marginTop: 2, color: "var(--muted)", fontSize: 12 }}>
                          {questoesNaConfirmacao(conteudo, d.competencia)} perguntas
                          {d.conceitosFracos.length > 0 &&
                            ` · na primeira rodada você tropeçou em ${d.conceitosFracos
                              .map((c) => ROTULO_CONCEITO[c] ?? c)
                              .join(", ")}`}
                        </span>
                      </span>
                    </button>
                  );
                })}
              </div>
              <Button
                size="sm"
                style={{ marginTop: 14 }}
                disabled={selecionadas.length === 0}
                onClick={comecarConfirmacao}
              >
                {selecionadas.length === 0
                  ? "Marque um módulo para confirmar"
                  : `Responder ${nSelecionadas} perguntas`}{" "}
                <ArrowRight size={15} aria-hidden />
              </Button>
            </Card>
          )}

          {pendentesDeConfirmar.length > 0 && (
            <Card style={{ marginTop: 18 }}>
              <h2 style={{ margin: 0, fontSize: 14, fontWeight: 600 }}>Módulos confirmados</h2>
              <p style={{ margin: "6px 0 12px", color: "var(--muted)", fontSize: 12, lineHeight: 1.6 }}>
                Marcar dispensa os conceitos do módulo como concluídos — dá para desfazer na trilha
                depois.
              </p>
              <div style={{ display: "grid", gap: 8 }}>
                {pendentesDeConfirmar.map((d) => (
                  <button
                    key={d.modulo}
                    type="button"
                    onClick={() => setDispensasMarcadas((s) => ({ ...s, [d.modulo]: !s[d.modulo] }))}
                    aria-pressed={!!dispensasMarcadas[d.modulo]}
                    className="nv-opcao"
                    style={{ alignItems: "flex-start" }}
                  >
                    <span className="nv-marca nv-marca--multi" style={{ marginTop: 2 }} aria-hidden>
                      {dispensasMarcadas[d.modulo] && <Check size={11} color="#fff" />}
                    </span>
                    <span>
                      <strong style={{ fontFamily: "var(--font-heading)" }}>
                        {d.modulo} · {MODULOS[d.modulo] ?? d.modulo}
                      </strong>
                      {d.conceitosFracos.length > 0 && (
                        <span style={{ display: "block", marginTop: 2, color: "var(--muted)", fontSize: 12 }}>
                          Atenção: você tropeçou em{" "}
                          {d.conceitosFracos.map((c) => ROTULO_CONCEITO[c] ?? c).join(", ")}.
                        </span>
                      )}
                    </span>
                  </button>
                ))}
              </div>
            </Card>
          )}

          {reprovadas.length > 0 && (
            <Card style={{ marginTop: 18 }}>
              <h2 style={{ margin: 0, fontSize: 14, fontWeight: 600 }}>Ainda não deu para pular</h2>
              <p style={{ margin: "6px 0 12px", color: "var(--muted)", fontSize: 12, lineHeight: 1.6 }}>
                Somando as duas rodadas, a nota ficou abaixo de {GATE_DISPENSA}. Vale passar por
                estes conceitos antes de seguir.
              </p>
              <div style={{ display: "grid", gap: 10 }}>
                {reprovadas.map((c) => (
                  <div key={c.id}>
                    <strong style={{ fontFamily: "var(--font-heading)", fontSize: 13 }}>
                      {c.modulo} · {MODULOS[c.modulo] ?? c.modulo}
                    </strong>
                    <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginTop: 6 }}>
                      {etapa2[c.id].conceitosFracos.map((id) => (
                        <Link key={id} to={`/aprender/c/${id}`} className="lg-chip">
                          {ROTULO_CONCEITO[id] ?? id}
                        </Link>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          )}

          {programacao.pronto !== null && (
            <Card style={{ marginTop: 18 }}>
              <h2 style={{ margin: 0, fontSize: 14, fontWeight: 600 }}>
                Leitura de código · {programacao.acertos} de {programacao.total}
              </h2>
              <p style={{ margin: "6px 0 0", color: "var(--muted)", fontSize: 12, lineHeight: 1.6 }}>
                {programacao.pronto
                  ? "Você lê Python, NumPy e PyTorch sem tropeçar. Pode começar as práticas de código por qualquer nível."
                  : "Antes das práticas intermediárias e avançadas, vale fazer as de nível iniciante: elas treinam exatamente esse tipo de leitura."}
              </p>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 16, marginTop: 12, fontSize: 12, fontWeight: 600 }}>
                <Link
                  to={programacao.pronto ? "/aprender/codar" : "/aprender/codar?filtro=Iniciante"}
                  style={{ color: "var(--accent-hover)" }}
                >
                  {programacao.pronto ? "Abrir a Prática Torch →" : "Ver as práticas de nível iniciante →"}
                </Link>
                <a href={conteudo.codigo.notebook} target="_blank" rel="noreferrer" style={{ color: "var(--muted)" }}>
                  Notebook de regressão logística no Colab ↗
                </a>
              </div>
            </Card>
          )}

          <Card style={{ marginTop: 18 }}>
            <h2 style={{ margin: 0, fontSize: 14, fontWeight: 600 }}>Revise suas respostas</h2>
            <p style={{ margin: "6px 0 12px", color: "var(--muted)", fontSize: 12, lineHeight: 1.6 }}>
              A resposta certa de cada questão, por que ela é a certa e onde o assunto está na
              trilha.
            </p>
            <RevisaoQuestoes conteudo={conteudo} rodada={rodada} />
          </Card>

          <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: 12, marginTop: 26 }}>
            <Button onClick={confirmarEIr}>
              {pendentesDeConfirmar.some((d) => dispensasMarcadas[d.modulo])
                ? "Confirmar e ir pra trilha"
                : "Ir pra minha trilha"}{" "}
              <ArrowRight size={16} aria-hidden />
            </Button>
            <Button variant="ghost" size="sm" onClick={onRefazer}>
              <RotateCcw size={14} aria-hidden /> Refazer nivelamento
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
