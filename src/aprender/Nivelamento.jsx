import { useEffect, useRef, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { ArrowRight, ArrowLeft } from "lucide-react";
import { Topbar } from "../ui/Topbar.tsx";
import { Button } from "../ui/Button.tsx";
import QuestionCard from "./QuestionCard.tsx";
import PassoQuestao from "./PassoQuestao.jsx";
import NivelamentoResultado from "./NivelamentoResultado.jsx";
import { NIVELAMENTO } from "./dados.ts";
import { scoreCompetencias, recomendar } from "../lib/nivelamento.ts";
import {
  ehQuestaoCodigo,
  priorDeAr1,
  questoesDaEtapa,
  questoesParaEngine,
} from "../lib/nivelamento-content.ts";
import {
  corrigir,
  respostasDe,
  montarProva,
  montarProvaCodigo,
  questoesPorIds,
  rodadaCompativel,
} from "../lib/nivelamento-rodada.ts";
import {
  loadPretestV2,
  savePretestV2,
  aplicarRetake,
  loadQuestoesVistas,
  registrarQuestoesVistas,
} from "../lib/pretest-storage.ts";
import { logEvent } from "../lib/events.ts";

const RASCUNHO_KEY = "ligia-nivelamento:rascunho:v1";

const contarSlots = (formas) => new Set(formas.map((q) => q.slot)).size;

/** Nº de MCQ da etapa 1 (uma forma de cada). A etapa 2 mora na tela de resultado. */
const TOTAL_MCQ = contarSlots(questoesDaEtapa(NIVELAMENTO, 1));
/** Nº de questões de leitura de código, que vêm depois das MCQ. */
const TOTAL_CODIGO = contarSlots(NIVELAMENTO.codigo.questoes);
const TOTAL_QUESTOES = TOTAL_MCQ + TOTAL_CODIGO;

/** MCQ da etapa 1 seguidas da leitura de código, uma forma de cada questão. */
function novaProva(seed) {
  const vistas = loadQuestoesVistas();
  return [
    ...montarProva(NIVELAMENTO, 1, { seed, vistas }),
    ...montarProvaCodigo(NIVELAMENTO, { seed, vistas }),
  ];
}

/**
 * Nivelamento: cinco perguntas de auto-relato, vinte múltiplas escolhas e
 * quatro de leitura de código. As múltiplas escolhas formam a matriz de cinco
 * competências, que define onde a trilha começa e quais módulos podem ser
 * confirmados para dispensa (NivelamentoResultado). A leitura de código fica
 * fora da matriz e orienta por qual nível de prática de código começar.
 *
 * `?ver=resultado` reabre a última rodada salva em vez de começar outra — é
 * por onde a trilha manda quem deixou dispensa por confirmar.
 *
 * "Não sei" vale zero na nota, como o erro, mas fica registrado como tal nos
 * resultados: é o que permite separar lacuna de engano na análise das questões.
 */
export default function Nivelamento() {
  const conteudo = NIVELAMENTO;
  const navegar = useNavigate();
  const [params, setParams] = useSearchParams();

  const [passo, setPasso] = useState(0);
  const [respostas, setRespostas] = useState({});
  const [autoRelato, setAutoRelato] = useState({});
  /** Texto livre das opções "Outro", por pergunta do auto-relato. */
  const [textosOutro, setTextosOutro] = useState({});
  const [seed, setSeed] = useState("");
  // Uma forma por questão, sorteada ao começar e guardada no rascunho: voltar
  // à página no meio do teste não troca as questões debaixo do aluno.
  const [prova, setProva] = useState([]);
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
        setTextosOutro(r.textosOutro ?? {});
        const s = r.seed || String(Date.now());
        setSeed(s);
        const salva = questoesPorIds(NIVELAMENTO, r.prova ?? []);
        setProva(salva.length === TOTAL_QUESTOES ? salva : novaProva(s));
        return;
      }
    } catch {
      /* rascunho corrompido: começa limpo */
    }
    const s = String(Date.now());
    setSeed(s);
    setProva(novaProva(s));
  }, []);

  // Persiste a cada mudança: abandonar e voltar não perde as respostas.
  useEffect(() => {
    if (!seed || resultado) return;
    try {
      sessionStorage.setItem(
        RASCUNHO_KEY,
        JSON.stringify({ passo, respostas, autoRelato, textosOutro, seed, prova: prova.map((q) => q.id) }),
      );
    } catch {
      /* storage cheio ou indisponível: segue sem rascunho */
    }
  }, [passo, respostas, autoRelato, textosOutro, seed, prova, resultado]);

  // Foco no título a cada passo, para o leitor de tela anunciar a pergunta nova.
  useEffect(() => {
    if (!resultado) tituloRef.current?.focus();
  }, [passo, resultado]);

  const respondidas = prova.filter((q) => respostas[q.id] !== undefined).length;
  const questaoAtual = passo >= 1 && passo <= TOTAL_QUESTOES ? (prova[passo - 1] ?? null) : null;

  function finalizar() {
    const ar1 = conteudo.auto_relato.find((p) => p.id === "ar1");
    const prior = ar1 ? priorDeAr1(ar1, autoRelato.ar1 ?? []) : {};
    const resultados = corrigir(prova, respostas);
    const mcq = prova.filter((q) => !ehQuestaoCodigo(q));

    const matriz = scoreCompetencias(questoesParaEngine(mcq), resultados, { prior });
    const recomendacao = recomendar(matriz);
    const novo = {
      version: 2,
      contentVersion: conteudo.version,
      matriz,
      resultados,
      respostas: respostasDe(prova, respostas),
      autoRelato,
      recomendacao,
      dispensasConfirmadas: [],
      ts: new Date().toISOString(),
    };

    // Refazer nunca desfaz dispensa já confirmada.
    const final = aplicarRetake(loadPretestV2(), novo);
    savePretestV2(final);
    registrarQuestoesVistas(prova.map((q) => q.id), novo.ts);
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
    setTextosOutro({});
    setPasso(0);
    const s = String(Date.now());
    setSeed(s);
    setProva(novaProva(s));
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
  const ehUltima = passo === TOTAL_QUESTOES;
  const podeAvancar = ehAutoRelato || respostas[questaoAtual?.id] !== undefined;
  const progresso = Math.round((respondidas / TOTAL_QUESTOES) * 100);

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
              aria-valuemax={TOTAL_QUESTOES}
              aria-label="Progresso do nivelamento"
            >
              <div className="tr-barra__preenchimento" style={{ width: `${progresso}%` }} />
            </div>
            <span style={{ color: "var(--muted)", fontSize: 12, fontVariantNumeric: "tabular-nums" }}>
              {respondidas}/{TOTAL_QUESTOES}
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
                    maxEscolhas={q.maxEscolhas}
                    textoOutro={textosOutro[q.id]}
                    onTextoOutro={(t) => setTextosOutro((s) => ({ ...s, [q.id]: t }))}
                  />
                ))}
              </div>
            </>
          )}

          {questaoAtual && seed && (
            <PassoQuestao
              questao={questaoAtual}
              rotulo={
                passo > TOTAL_MCQ
                  ? `Leitura de código · ${passo - TOTAL_MCQ} de ${TOTAL_CODIGO}`
                  : `Questão ${passo} de ${TOTAL_MCQ}`
              }
              seed={seed}
              resposta={respostas[questaoAtual.id]}
              onResponder={(i) => setRespostas((s) => ({ ...s, [questaoAtual.id]: i }))}
              tituloRef={tituloRef}
            />
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
            {ehUltima ? (
              <Button disabled={!podeAvancar} onClick={finalizar}>
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
