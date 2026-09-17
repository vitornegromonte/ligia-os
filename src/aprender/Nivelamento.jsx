import { useEffect, useRef, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { ArrowRight, ArrowLeft } from "lucide-react";
import { Topbar } from "../ui/Topbar.tsx";
import { Button } from "../ui/Button.tsx";
import { Card } from "../ui/Card.tsx";
import QuestionCard from "./QuestionCard.tsx";
import PassoQuestao from "./PassoQuestao.jsx";
import NivelamentoResultado from "./NivelamentoResultado.jsx";
import { NIVELAMENTO } from "./dados.ts";
import { scoreCompetencias, recomendar } from "../lib/nivelamento.ts";
import { priorDeAr1, questoesDaEtapa, questoesParaEngine } from "../lib/nivelamento-content.ts";
import { corrigir, rodadaCompativel } from "../lib/nivelamento-rodada.ts";
import { loadPretestV2, savePretestV2, aplicarRetake } from "../lib/pretest-storage.ts";
import { logEvent } from "../lib/events.ts";

const RASCUNHO_KEY = "ligia-nivelamento:rascunho:v1";

/** Etapa 1: todo aluno responde. A etapa 2 mora na tela de resultado. */
const QUESTOES = questoesDaEtapa(NIVELAMENTO, 1);

/**
 * Nivelamento: cinco perguntas de auto-relato, vinte múltiplas escolhas e uma
 * tarefa opcional de Colab. O resultado é a matriz de cinco competências, que
 * define onde a trilha começa e quais módulos podem ser confirmados para
 * dispensa (NivelamentoResultado).
 *
 * `?ver=resultado` reabre a última rodada salva em vez de começar outra — é
 * por onde a trilha manda quem deixou dispensa por confirmar.
 *
 * "Não sei" é registrado como tal, e não como erro — é o que faz a matriz
 * distinguir lacuna de chute e acertar o ponto de partida.
 */
export default function Nivelamento() {
  const conteudo = NIVELAMENTO;
  const navegar = useNavigate();
  const [params, setParams] = useSearchParams();
  const totalPassos = QUESTOES.length + 2;

  const [passo, setPasso] = useState(0);
  const [respostas, setRespostas] = useState({});
  const [autoRelato, setAutoRelato] = useState({});
  const [colab, setColab] = useState(false);
  const [seed, setSeed] = useState("");
  const [resultado, setResultado] = useState(() => {
    if (params.get("ver") !== "resultado") return null;
    const salvo = loadPretestV2();
    return rodadaCompativel(NIVELAMENTO, salvo) ? salvo : null;
  });
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

  const respondidas = QUESTOES.filter((q) => respostas[q.id] !== undefined).length;
  const questaoAtual = passo >= 1 && passo <= QUESTOES.length ? QUESTOES[passo - 1] : null;

  function finalizar() {
    const ar1 = conteudo.auto_relato.find((p) => p.id === "ar1");
    const prior = ar1 ? priorDeAr1(ar1, autoRelato.ar1 ?? []) : {};
    const resultados = corrigir(QUESTOES, respostas);

    const matriz = scoreCompetencias(questoesParaEngine(QUESTOES), resultados, {
      prior,
      fezColab: colab,
    });
    const recomendacao = recomendar(matriz);
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

    setResultado(final);
    try {
      sessionStorage.removeItem(RASCUNHO_KEY);
    } catch {
      /* ignore */
    }
    window.scrollTo({ top: 0 });
  }

  /** A rodada cresce depois de salva (etapa 2, dispensas): grava no lugar, mesmo `ts`. */
  function atualizarRodada(rodada) {
    savePretestV2(rodada);
    setResultado(rodada);
  }

  function reiniciar() {
    setResultado(null);
    setRespostas({});
    setAutoRelato({});
    setColab(false);
    setPasso(0);
    setSeed(String(Date.now()));
    if (params.has("ver")) setParams({}, { replace: true });
    window.scrollTo({ top: 0 });
  }

  if (resultado) {
    return (
      <NivelamentoResultado
        key={resultado.ts}
        conteudo={conteudo}
        rodada={resultado}
        onAtualizar={atualizarRodada}
        onRefazer={reiniciar}
        onIrParaTrilha={() => navegar("/aprender")}
      />
    );
  }

  const ehAutoRelato = passo === 0;
  const ehColab = passo === totalPassos - 1;
  const podeAvancar = ehAutoRelato || ehColab || respostas[questaoAtual?.id] !== undefined;
  const progresso = Math.round((respondidas / QUESTOES.length) * 100);

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
              aria-valuenow={respondidas}
              aria-valuemin={0}
              aria-valuemax={QUESTOES.length}
              aria-label="Progresso do nivelamento"
            >
              <div className="tr-barra__preenchimento" style={{ width: `${progresso}%` }} />
            </div>
            <span style={{ color: "var(--muted)", fontSize: 12, fontVariantNumeric: "tabular-nums" }}>
              {respondidas}/{QUESTOES.length}
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

          {questaoAtual && seed && (
            <PassoQuestao
              questao={questaoAtual}
              rotulo={`Questão ${passo} de ${QUESTOES.length}`}
              seed={seed}
              resposta={respostas[questaoAtual.id]}
              onResponder={(i) => setRespostas((s) => ({ ...s, [questaoAtual.id]: i }))}
              tituloRef={tituloRef}
            />
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
