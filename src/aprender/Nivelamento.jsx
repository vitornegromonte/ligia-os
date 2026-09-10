import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { ArrowRight, ArrowLeft, RotateCcw, Check } from "lucide-react";
import { Topbar } from "../ui/Topbar.tsx";
import { Button } from "../ui/Button.tsx";
import { Card } from "../ui/Card.tsx";
import { RadarChart } from "../ui/RadarChart.tsx";
import QuestionCard from "./QuestionCard.tsx";
import { NIVELAMENTO, MODULOS, CONCEITOS_POR_MODULO, ROTULO_CONCEITO } from "./dados.ts";
import { ordemDasOpcoes } from "../lib/embaralhar.ts";
import { COMPETENCIAS } from "../lib/competencias.ts";
import { scoreCompetencias, recomendar } from "../lib/nivelamento.ts";
import { priorDeAr1, questoesParaEngine } from "../lib/nivelamento-content.ts";
import { loadPretestV2, savePretestV2, aplicarRetake, markDispensadosDone } from "../lib/pretest-storage.ts";
import { logEvent } from "../lib/events.ts";

const RASCUNHO_KEY = "ligia-nivelamento:rascunho:v1";

const ROTULO_CONFIANCA = {
  alta: "sinal claro",
  media: "sinal parcial",
  baixa: "sinal ambíguo",
  "sem-evidencia": "sem evidência",
};

/**
 * Nivelamento: cinco perguntas de auto-relato, vinte múltiplas escolhas e uma
 * tarefa opcional de Colab. O resultado é a matriz de cinco competências, que
 * define onde a trilha começa e o que dá para dispensar.
 *
 * "Não sei" é registrado como tal, e não como erro — é o que faz a matriz
 * distinguir lacuna de chute e acertar o ponto de partida.
 */
export default function Nivelamento() {
  const conteudo = NIVELAMENTO;
  const navegar = useNavigate();
  const totalPassos = conteudo.mcq.length + 2;

  const [passo, setPasso] = useState(0);
  const [respostas, setRespostas] = useState({});
  const [autoRelato, setAutoRelato] = useState({});
  const [colab, setColab] = useState(false);
  const [seed, setSeed] = useState("");
  const [resultado, setResultado] = useState(null);
  const [dispensasMarcadas, setDispensasMarcadas] = useState({});
  const [aplicado, setAplicado] = useState(false);
  const tituloRef = useRef(null);
  const hidratado = useRef(false);

  useEffect(() => {
    document.title = "Ligia — Nivelamento";
    window.scrollTo({ top: 0 });
  }, []);

  // Hidrata o rascunho da sessão (ou cria a seed do embaralhamento).
  useEffect(() => {
    if (hidratado.current) return;
    hidratado.current = true;
    try {
      const cru = sessionStorage.getItem(RASCUNHO_KEY);
      if (cru) {
        const r = JSON.parse(cru);
        setPasso(r.passo ?? 0);
        setRespostas(r.respostas ?? {});
        setAutoRelato(r.autoRelato ?? {});
        setColab(r.colab ?? false);
        setSeed(r.seed || String(Date.now()));
        return;
      }
    } catch {
      /* rascunho corrompido: começa limpo */
    }
    setSeed(String(Date.now()));
  }, []);

  // Persiste a cada mudança: abandonar e voltar não perde as respostas.
  useEffect(() => {
    if (!seed || resultado) return;
    try {
      sessionStorage.setItem(
        RASCUNHO_KEY,
        JSON.stringify({ passo, respostas, autoRelato, colab, seed }),
      );
    } catch {
      /* storage cheio ou indisponível: segue sem rascunho */
    }
  }, [passo, respostas, autoRelato, colab, seed, resultado]);

  // Foco no título a cada passo, para o leitor de tela anunciar a pergunta nova.
  useEffect(() => {
    if (!resultado) tituloRef.current?.focus();
  }, [passo, resultado]);

  const respondidas = Object.keys(respostas).length;
  const questaoAtual = passo >= 1 && passo <= conteudo.mcq.length ? conteudo.mcq[passo - 1] : null;

  // Ordem embaralhada estável por questão; "Não sei" fica sempre por último.
  const ordemAtual = useMemo(() => {
    if (!questaoAtual || !seed) return null;
    return ordemDasOpcoes(questaoAtual.opcoes, `${seed}:${questaoAtual.id}`, (o) => o.naoSei);
  }, [questaoAtual, seed]);

  function finalizar() {
    const questoes = questoesParaEngine(conteudo);
    const ar1 = conteudo.auto_relato.find((p) => p.id === "ar1");
    const prior = ar1 ? priorDeAr1(ar1, autoRelato.ar1 ?? []) : {};

    const resultados = {};
    for (const q of conteudo.mcq) {
      const escolhida = respostas[q.id];
      if (escolhida === undefined || q.opcoes[escolhida]?.naoSei) {
        resultados[q.id] = "nao-sei";
      } else {
        resultados[q.id] = escolhida === q.correta ? "acerto" : "erro";
      }
    }

    const matriz = scoreCompetencias(questoes, resultados, { prior, fezColab: colab });
    const recomendacao = recomendar(matriz, { prior });
    const novo = {
      version: 2,
      contentVersion: conteudo.version,
      matriz,
      resultados,
      autoRelato,
      recomendacao,
      dispensasConfirmadas: [],
      ts: new Date().toISOString(),
    };

    // Refazer nunca desfaz dispensa já confirmada.
    const final = aplicarRetake(loadPretestV2(), novo);
    savePretestV2(final);
    logEvent("pretest_completed", "nivelamento", {
      contentVersion: conteudo.version,
      fronteira: recomendacao.fronteira,
      acertos: Object.values(resultados).filter((r) => r === "acerto").length,
    });

    // 4/4 vem pré-marcada; 3/4 exige o aluno confirmar.
    const marcadas = {};
    for (const d of recomendacao.dispensaveisSugeridos) {
      marcadas[d.modulo] = d.sugestao === "pre-marcada";
    }
    setDispensasMarcadas(marcadas);
    setResultado(final);
    try {
      sessionStorage.removeItem(RASCUNHO_KEY);
    } catch {
      /* ignore */
    }
    window.scrollTo({ top: 0 });
  }

  function aplicarDispensas() {
    if (!resultado) return;
    const confirmados = Object.entries(dispensasMarcadas).filter(([, v]) => v).map(([m]) => m);
    if (confirmados.length) {
      markDispensadosDone(confirmados.flatMap((m) => CONCEITOS_POR_MODULO[m] ?? []));
      for (const m of confirmados) logEvent("dispensa_confirmada", m);
    }
    savePretestV2({ ...resultado, dispensasConfirmadas: confirmados });
    setAplicado(true);
  }

  function reiniciar() {
    setResultado(null);
    setRespostas({});
    setAutoRelato({});
    setColab(false);
    setPasso(0);
    setAplicado(false);
    setSeed(String(Date.now()));
  }

  if (resultado) {
    return (
      <Resultado
        resultado={resultado}
        dispensasMarcadas={dispensasMarcadas}
        onToggleDispensa={(m) => setDispensasMarcadas((s) => ({ ...s, [m]: !s[m] }))}
        onAplicar={aplicarDispensas}
        aplicado={aplicado}
        onRefazer={reiniciar}
        onIrParaTrilha={() => navegar("/aprender")}
      />
    );
  }

  const ehAutoRelato = passo === 0;
  const ehColab = passo === totalPassos - 1;
  const podeAvancar = ehAutoRelato || ehColab || respostas[questaoAtual?.id] !== undefined;
  const progresso = Math.round(
    (Math.min(respondidas, conteudo.mcq.length) / conteudo.mcq.length) * 100,
  );

  return (
    <div>
      <Topbar crumb="Nivelamento" />
      <div className="lg-page">
        <div className="nv-wizard">
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 26 }}>
            <div
              className="tr-barra"
              style={{ flex: 1, maxWidth: 200 }}
              role="progressbar"
              aria-valuenow={Math.min(respondidas, conteudo.mcq.length)}
              aria-valuemin={0}
              aria-valuemax={conteudo.mcq.length}
              aria-label="Progresso do nivelamento"
            >
              <div className="tr-barra__preenchimento" style={{ width: `${progresso}%` }} />
            </div>
            <span style={{ color: "var(--muted)", fontSize: 12, fontVariantNumeric: "tabular-nums" }}>
              {Math.min(respondidas, conteudo.mcq.length)}/{conteudo.mcq.length}
            </span>
          </div>

          {ehAutoRelato && (
            <>
              <h1 ref={tituloRef} tabIndex={-1} className="nv-titulo">
                Antes de começar: <span className="gradient-text">quem é você?</span>
              </h1>
              <p style={{ margin: "10px 0 0", color: "var(--muted)", fontSize: 13, lineHeight: 1.7 }}>
                Nada aqui vale nota — só ajuda a personalizar a leitura do resultado. Pode pular.
              </p>
              <div style={{ display: "grid", gap: 14, marginTop: 26 }}>
                {conteudo.auto_relato.map((q) => (
                  <QuestionCard
                    key={q.id}
                    id={q.id}
                    pergunta={q.pergunta}
                    opcoes={q.opcoes}
                    tipo={q.tipo}
                    selected={autoRelato[q.id] ?? []}
                    onSelect={(next) => setAutoRelato((s) => ({ ...s, [q.id]: next }))}
                  />
                ))}
              </div>
            </>
          )}

          {questaoAtual && ordemAtual && (
            <>
              <p className="nv-passo-rotulo">
                Questão {passo} de {conteudo.mcq.length}
              </p>
              <h1 ref={tituloRef} tabIndex={-1} className="nv-titulo">
                {questaoAtual.pergunta}
              </h1>
              <div style={{ marginTop: 24 }}>
                <QuestionCard
                  id={questaoAtual.id}
                  pergunta=""
                  opcoes={ordemAtual.map((i) => questaoAtual.opcoes[i])}
                  tipo="single"
                  selected={
                    respostas[questaoAtual.id] !== undefined
                      ? [ordemAtual.indexOf(respostas[questaoAtual.id])]
                      : []
                  }
                  onSelect={(next) =>
                    setRespostas((s) => ({ ...s, [questaoAtual.id]: ordemAtual[next[0]] }))
                  }
                />
              </div>
              <p style={{ margin: "14px 0 0", color: "var(--muted)", fontSize: 12 }}>
                Sem certeza? <strong style={{ color: "var(--text)" }}>“Não sei”</strong> vale mais que
                chutar — é assim que a trilha acerta seu ponto de partida.
              </p>
            </>
          )}

          {ehColab && (
            <>
              <h1 ref={tituloRef} tabIndex={-1} className="nv-titulo">
                Mão na massa <span style={{ color: "var(--muted)" }}>(opcional)</span>
              </h1>
              <Card style={{ marginTop: 24 }}>
                <button
                  type="button"
                  onClick={() => setColab((c) => !c)}
                  aria-pressed={colab}
                  className="nv-opcao"
                >
                  <span className="nv-marca nv-marca--multi" aria-hidden>
                    {colab && <span className="nv-marca__ponto" />}
                  </span>
                  {conteudo.colab.pergunta}
                </button>
                <a
                  href={conteudo.colab.url}
                  target="_blank"
                  rel="noreferrer"
                  style={{ display: "inline-block", marginTop: 12, color: "var(--accent-hover)", fontSize: 12, fontWeight: 600 }}
                >
                  Abrir o notebook no Colab →
                </a>
              </Card>
            </>
          )}

          <div className="nv-rodape" style={{ marginTop: 34, justifyContent: "space-between" }}>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setPasso((p) => Math.max(0, p - 1))}
              style={{ visibility: passo === 0 ? "hidden" : "visible" }}
            >
              <ArrowLeft size={15} aria-hidden /> Voltar
            </Button>
            {ehColab ? (
              <Button onClick={finalizar}>
                Ver meu resultado <ArrowRight size={16} aria-hidden />
              </Button>
            ) : (
              <Button disabled={!podeAvancar} onClick={() => setPasso((p) => p + 1)}>
                {ehAutoRelato ? "Começar" : "Avançar"} <ArrowRight size={16} aria-hidden />
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------

function Resultado({
  resultado,
  dispensasMarcadas,
  onToggleDispensa,
  onAplicar,
  aplicado,
  onRefazer,
  onIrParaTrilha,
}) {
  const { matriz, recomendacao } = resultado;
  const axes = COMPETENCIAS.map((c) => ({ id: c.id, label: c.labelCurto }));
  const values = COMPETENCIAS.map((c) => (matriz[c.id].score ?? 0) / 100);

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

          {recomendacao.dispensaveisSugeridos.length > 0 && (
            <Card style={{ marginTop: 18 }}>
              <h2 style={{ margin: 0, fontSize: 14, fontWeight: 600 }}>Quer pular algum módulo?</h2>
              <p style={{ margin: "6px 0 12px", color: "var(--muted)", fontSize: 12, lineHeight: 1.6 }}>
                Você foi bem nestes. Marcar dispensa os conceitos do módulo como concluídos — dá
                para desfazer na trilha depois.
              </p>
              <div style={{ display: "grid", gap: 8 }}>
                {recomendacao.dispensaveisSugeridos.map((d) => (
                  <button
                    key={d.modulo}
                    type="button"
                    onClick={() => onToggleDispensa(d.modulo)}
                    aria-pressed={!!dispensasMarcadas[d.modulo]}
                    disabled={aplicado}
                    className="nv-opcao"
                    style={{ alignItems: "flex-start", opacity: aplicado ? 0.6 : 1 }}
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

          <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: 12, marginTop: 26 }}>
            {recomendacao.dispensaveisSugeridos.length > 0 && !aplicado ? (
              <Button onClick={onAplicar}>
                Confirmar e ir pra trilha <ArrowRight size={16} aria-hidden />
              </Button>
            ) : (
              <Button onClick={onIrParaTrilha}>
                Ir pra minha trilha <ArrowRight size={16} aria-hidden />
              </Button>
            )}
            <Button variant="ghost" size="sm" onClick={onRefazer}>
              <RotateCcw size={14} aria-hidden /> Refazer nivelamento
            </Button>
          </div>

          {aplicado && (
            <p style={{ marginTop: 12, color: "var(--muted)", fontSize: 12 }} role="status">
              Dispensas aplicadas. Sua trilha já reflete isso.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
