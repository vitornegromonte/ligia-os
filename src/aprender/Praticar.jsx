import { useState, useRef, useEffect } from "react";
import { Link, useParams } from "react-router-dom";
import { ArrowLeft, Eye, Check, MinusCircle, CircleSlash, Lightbulb, Send, Loader2 } from "lucide-react";
import { Topbar } from "../ui/Topbar.tsx";
import { Button } from "../ui/Button.tsx";
import MarkdownViewer from "../components/MarkdownViewer.jsx";
import NotFound from "../pages/NotFound.jsx";
import Resumo from "./Resumo.jsx";
import PerguntarPanel from "./PerguntarPanel.jsx";
import { CONCEITO_POR_ID } from "./dados.ts";
import { getLoop } from "../lib/loops.ts";
import { initSession, revealRubric, recordVerdict, isComplete } from "../lib/loop-session.ts";
import { parseGrading } from "../../supabase/functions/_shared/verdict.ts";
import { streamText } from "../lib/stream.ts";
import { chamarEdgeStream, correcaoAoVivoDisponivel } from "./edge.ts";

const VEREDITOS = {
  acertei: { label: "Acertei", icone: Check },
  parcial: { label: "Parcial", icone: MinusCircle },
  errei: { label: "Não acertei", icone: CircleSlash },
};
const ORDEM_VEREDITOS = ["acertei", "parcial", "errei"];

/**
 * Prática de recuperação: perguntas abertas sobre o conceito, corrigidas pelo
 * avaliador com base na rubrica.
 *
 * Regra que não se negocia: quando a correção falha, NUNCA se inventa um
 * veredito. Cai na auto-avaliação honesta contra a rubrica — um "parcial"
 * fantasma corromperia o agendamento de revisão e a matriz de competências.
 */
export default function Praticar() {
  const { conceptId } = useParams();
  const conceito = CONCEITO_POR_ID[conceptId];
  const loop = conceito ? getLoop(conceptId) : null;
  const aoVivo = correcaoAoVivoDisponivel();

  const [session, setSession] = useState(initSession);
  const [resposta, setResposta] = useState("");
  const [mostrarDica, setMostrarDica] = useState(false);
  const [corrigindo, setCorrigindo] = useState(false);
  const [streamParcial, setStreamParcial] = useState("");
  const [resultado, setResultado] = useState(null);
  const [erro, setErro] = useState(null);

  const perguntaRef = useRef(null);
  const resumoRef = useRef(null);
  const rubricaRef = useRef(null);
  const erroRef = useRef(null);
  const jaAvancou = useRef(false);

  useEffect(() => {
    if (conceito) {
      document.title = `Ligia — Praticar: ${conceito.label}`;
      window.scrollTo({ top: 0 });
    }
  }, [conceito]);

  const total = loop?.checagens.length ?? 0;
  const concluido = isComplete(session, total);
  const check = concluido ? null : loop?.checagens[session.index];

  // Ao trocar de checagem (ou concluir), leva o foco ao conteúdo novo — senão o
  // teclado cai no body, já que o botão clicado deixou de existir. Pula o
  // primeiro render para não roubar o foco ao abrir a página.
  useEffect(() => {
    if (!jaAvancou.current) {
      jaAvancou.current = true;
      return;
    }
    (concluido ? resumoRef : perguntaRef).current?.focus();
  }, [session.index, concluido]);

  // Ao revelar a rubrica, leva o foco ao bloco de resultado. Não dispara no
  // erro — ali quem cuida do foco é o alerta.
  useEffect(() => {
    if (session.revealed && !erro) {
      rubricaRef.current?.focus();
      rubricaRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
    }
  }, [session.revealed, erro]);

  useEffect(() => {
    if (erro) {
      erroRef.current?.focus();
      erroRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
    }
  }, [erro]);

  if (!conceito || !loop) return <NotFound />;

  function limparUI() {
    setResposta("");
    setMostrarDica(false);
    setCorrigindo(false);
    setStreamParcial("");
    setResultado(null);
    setErro(null);
  }
  function avancar(v) {
    setSession(recordVerdict(session, v));
    limparUI();
  }
  function reiniciar() {
    setSession(initSession());
    limparUI();
  }

  async function enviar() {
    setCorrigindo(true);
    setErro(null);
    setStreamParcial("");
    setResultado(null);
    try {
      const res = await chamarEdgeStream("loop-avaliar", {
        conceptId,
        checkIndex: session.index,
        resposta,
      });
      setSession(revealRubric(session));
      const completo = await streamText(res, (acc) => setStreamParcial(acc));
      const lido = parseGrading(completo);
      // Stream vazio OU sem veredito reconhecível é falha — nunca um veredito
      // inventado.
      if (!completo.trim() || !lido.matched) throw new Error("avaliação inválida");
      setResultado(lido);
    } catch (e) {
      setResultado(null);
      setErro(
        e?.status === 429
          ? "Estamos sem cota de avaliação agora — confira a rubrica abaixo e se autoavalie."
          : "Não consegui avaliar agora — confira a rubrica abaixo e se autoavalie.",
      );
      setSession(revealRubric(session));
    } finally {
      setCorrigindo(false);
    }
  }

  const metaResultado = resultado ? VEREDITOS[resultado.veredito] : null;
  const IconeResultado = metaResultado?.icone;
  const feedbackParcial = streamParcial.includes("\n") ? parseGrading(streamParcial).feedback : "";

  return (
    <div>
      <Topbar crumb={`Praticar: ${conceito.label}`} />
      <div className="lg-page" style={{ maxWidth: 760 }}>
        <Link
          to={`/aprender/c/${conceptId}`}
          style={{ display: "inline-flex", alignItems: "center", gap: 6, marginBottom: 18, color: "var(--muted)", fontSize: 13 }}
        >
          <ArrowLeft size={14} aria-hidden /> {conceito.label}
        </Link>

        <h1 style={{ margin: "0 0 18px", fontSize: "clamp(22px, 3vw, 28px)", fontWeight: 500, letterSpacing: "-.02em" }}>
          Prática de recuperação
        </h1>

        {/* Orientação: sempre visível, nunca escondida atrás de um passo. */}
        <div className="pr-orientacao">{loop.orientacao}</div>

        {!concluido && check && (
          <section className="pr-checagem">
            <div className="pr-checagem__contador">
              Checagem {session.index + 1} de {total}
            </div>
            <h2 ref={perguntaRef} tabIndex={-1} className="pr-checagem__pergunta">
              {check.pergunta}
            </h2>

            <textarea
              className="pr-resposta"
              value={resposta}
              onChange={(e) => setResposta(e.target.value)}
              readOnly={session.revealed || corrigindo}
              aria-label="Sua resposta"
              placeholder="Tente responder do seu jeito antes de enviar…"
            />

            {!session.revealed ? (
              <>
                <p style={{ margin: "6px 0 0", color: "var(--muted-2)", fontSize: 11 }}>
                  Enter quebra linha — use o botão abaixo para enviar.
                </p>
                <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: 10, marginTop: 12 }}>
                  {aoVivo ? (
                    <Button size="sm" onClick={enviar} disabled={!resposta.trim() || corrigindo}>
                      {corrigindo ? <Loader2 size={15} className="pr-girar" aria-hidden /> : <Send size={15} aria-hidden />}
                      {corrigindo ? "Avaliando…" : "Enviar resposta"}
                    </Button>
                  ) : (
                    <Button size="sm" onClick={() => setSession(revealRubric(session))} disabled={!resposta.trim()}>
                      <Eye size={15} aria-hidden /> Ver o que esperávamos
                    </Button>
                  )}
                  {check.dica && (
                    <Button size="sm" variant="ghost" onClick={() => setMostrarDica((d) => !d)} aria-expanded={mostrarDica}>
                      <Lightbulb size={14} aria-hidden /> {mostrarDica ? "Esconder dica" : "Dica"}
                    </Button>
                  )}
                  {mostrarDica && check.dica && (
                    <p style={{ flexBasis: "100%", margin: 0, color: "var(--muted)", fontSize: 13 }}>{check.dica}</p>
                  )}
                </div>
              </>
            ) : (
              <div style={{ marginTop: 18 }}>
                {/* Leitor de tela anuncia só o veredito FINAL, não o stream token a token. */}
                <span className="sr-only" role="status" aria-live="polite">
                  {metaResultado ? `Avaliação: ${metaResultado.label}` : ""}
                </span>

                {!erro && resultado && (
                  <div className={`pr-veredito pr-veredito--${resultado.veredito}`}>
                    <div className="pr-veredito__titulo">
                      <IconeResultado size={15} aria-hidden /> {metaResultado.label}
                    </div>
                    {resultado.feedback && <MarkdownViewer content={resultado.feedback} />}
                  </div>
                )}

                {/* Durante o stream a caixa é NEUTRA: o feedback aparece, o
                    veredito não, para não piscar de cor no meio da correção. */}
                {!erro && !resultado && corrigindo && (
                  <div className="pr-veredito pr-veredito--neutro" aria-busy="true">
                    <div className="pr-veredito__titulo">
                      <Loader2 size={14} className="pr-girar" aria-hidden /> Avaliando sua resposta…
                    </div>
                    {feedbackParcial && <MarkdownViewer content={feedbackParcial} />}
                  </div>
                )}

                {erro && (
                  <p ref={erroRef} tabIndex={-1} role="alert"
                     style={{ margin: "0 0 12px", color: "var(--danger)", fontSize: 14, outline: "none" }}>
                    {erro}
                  </p>
                )}

                <div className="pr-rubrica">
                  <h3 ref={rubricaRef} tabIndex={-1} className="pr-rubrica__titulo">
                    O que uma boa resposta tem
                  </h3>
                  <p style={{ margin: 0, color: "color-mix(in srgb, var(--text) 88%, var(--muted))" }}>
                    {check.rubrica}
                  </p>
                </div>

                {resultado ? (
                  <Button size="sm" style={{ marginTop: 18 }} onClick={() => avancar(resultado.veredito)}>
                    Próxima checagem
                  </Button>
                ) : !corrigindo ? (
                  <div style={{ marginTop: 18 }}>
                    <div style={{ marginBottom: 8, color: "var(--muted)", fontSize: 12 }}>Como foi a sua?</div>
                    <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                      {ORDEM_VEREDITOS.map((v) => {
                        const m = VEREDITOS[v];
                        const Icone = m.icone;
                        return (
                          <button key={v} type="button" className={`pr-autoaval pr-autoaval--${v}`} onClick={() => avancar(v)}>
                            <Icone size={15} aria-hidden /> {m.label}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                ) : null}
              </div>
            )}
          </section>
        )}

        {concluido && (
          <Resumo loop={loop} session={session} conceptId={conceptId} onRestart={reiniciar} headingRef={resumoRef} />
        )}

        {aoVivo && <PerguntarPanel conceptId={conceptId} />}
      </div>
    </div>
  );
}
