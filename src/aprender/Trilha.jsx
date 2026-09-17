import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Star, AlertTriangle, RotateCcw } from "lucide-react";
import { Topbar } from "../ui/Topbar.tsx";
import { PageHeader } from "../ui/PageHeader.tsx";
import { Button } from "../ui/Button.tsx";
import { RadarChart } from "../ui/RadarChart.tsx";
import ConceptCard from "./ConceptCard.tsx";
import { SYNC_EVENT } from "./SyncEstado.tsx";
import { CONCEITOS, MODULOS, CONCEITO_POR_ID, CONCEITO_PARA_AULA, NIVELAMENTO } from "./dados.ts";
import { useAuth } from "../contexts/AuthContext.jsx";
import { effectiveState, doneSetFrom } from "../lib/status.ts";
import { loadUserStatus } from "../lib/progress.ts";
import { loadPretestV2, loadRascunho, clearRascunho, pedirSync } from "../lib/pretest-storage.ts";
import { totalDaProva } from "../lib/nivelamento-rodada.ts";
import { loadLoopResults, dueForReview } from "../lib/loop-progress.ts";
import { COMPETENCIAS } from "../lib/competencias.ts";
import { corDoModulo, ORDEM_MODULOS } from "../lib/modulos.ts";
import { tarefasDoConceito } from "../lib/praticas.ts";
import { usePraticasCodigo } from "./usePraticasCodigo.ts";

/**
 * A trilha: o mapa do que o aluno já domina, o que está liberado e onde
 * começar. Clicar num conceito abre o hub da lição.
 *
 * Todo o estado vem do localStorage — que continua sendo a leitura síncrona
 * da UI mesmo com o sync ligado. Relê quando o sync termina.
 */
export default function Trilha() {
  const navegar = useNavigate();
  const [userStatus, setUserStatus] = useState({});
  const [nivelamento, setNivelamento] = useState(null);
  /** Nivelamento começado e não terminado ("terminar depois"). */
  const [rascunho, setRascunho] = useState(null);
  const { session } = useAuth();
  const userId = session?.user?.id ?? null;
  const [loopResults, setLoopResults] = useState({});
  const [agora, setAgora] = useState(0);
  const { resolvidas } = usePraticasCodigo();

  useEffect(() => {
    document.title = "Ligia — Trilha";
    window.scrollTo({ top: 0 });
  }, []);

  useEffect(() => {
    function reler() {
      setUserStatus(loadUserStatus());
      setLoopResults(loadLoopResults());
      setNivelamento(loadPretestV2());
      setRascunho(loadRascunho(userId));
      setAgora(Date.now());
    }
    reler();
    // O sync reescreve o localStorage depois da montagem; sem escutar, quem
    // acabou de entrar veria o estado velho até dar F5.
    window.addEventListener(SYNC_EVENT, reler);
    return () => window.removeEventListener(SYNC_EVENT, reler);
  }, [userId]);

  const doneSet = useMemo(() => doneSetFrom(userStatus), [userStatus]);
  const recomendacao = nivelamento?.recomendacao ?? null;
  const recomendados = useMemo(() => new Set(recomendacao?.starNodes ?? []), [recomendacao]);
  /** Módulos que o ALUNO confirmou dispensar — sugestão sozinha não pula nada. */
  const dispensados = useMemo(
    () => new Set(nivelamento?.dispensasConfirmadas ?? []),
    [nivelamento],
  );

  const paraRevisar = useMemo(() => {
    const s = new Set();
    if (!agora) return s;
    for (const [id, r] of Object.entries(loopResults)) if (dueForReview(r, agora)) s.add(id);
    return s;
  }, [loopResults, agora]);

  /**
   * Conceitos fracos dentro de módulos dispensados. Sem isto eles sumiriam do
   * radar: o módulo inteiro vira "concluído" e nunca entra na revisão.
   */
  const fracosDispensados = useMemo(() => {
    if (!recomendacao) return [];
    const ids = new Set();
    for (const d of recomendacao.dispensaveisSugeridos ?? []) {
      if (!dispensados.has(d.modulo)) continue;
      for (const c of d.conceitosFracos) ids.add(c);
    }
    return [...ids];
  }, [recomendacao, dispensados]);

  const grupos = useMemo(
    () =>
      ORDEM_MODULOS.map((m) => ({
        id: m,
        nome: MODULOS[m] ?? m,
        conceitos: CONCEITOS.filter((c) => c.module === m),
      })).filter((g) => g.conceitos.length > 0),
    [],
  );

  const total = CONCEITOS.length;
  const concluidos = Object.values(userStatus).filter((v) => v === "done").length;
  const pct = total ? Math.round((concluidos / total) * 100) : 0;

  return (
    <div>
      <Topbar crumb="Trilha" />
      <div className="lg-page">
        <PageHeader
          eyebrow="Aprender"
          title="Trilha."
          lede="Os fundamentos de IA em seis módulos. Cada conceito tem material, prática de recuperação e, quando cabe, exercício de código para resolver aqui mesmo."
        />

        <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 26, maxWidth: 420 }}>
          <div
            className="tr-barra"
            style={{ flex: 1 }}
            role="progressbar"
            aria-valuenow={concluidos}
            aria-valuemin={0}
            aria-valuemax={total}
            aria-label={`${concluidos} de ${total} conceitos concluídos`}
          >
            <div className="tr-barra__preenchimento" style={{ width: `${pct}%` }} />
          </div>
          <span style={{ color: "var(--muted)", fontSize: 12, whiteSpace: "nowrap" }}>
            {concluidos}/{total}
          </span>
        </div>

        {nivelamento && recomendacao ? (
          <div
            style={{
              display: "flex", flexWrap: "wrap", alignItems: "center", gap: 18,
              padding: 18, marginBottom: 26,
              border: "1px solid var(--accent-border)", borderRadius: "var(--radius)",
              background: "var(--accent-soft)",
            }}
          >
            <RadarChart
              axes={COMPETENCIAS.map((c) => ({ id: c.id, label: c.labelCurto }))}
              values={COMPETENCIAS.map((c) => (nivelamento.matriz[c.id]?.score ?? 0) / 100)}
              className="tr-radar"
            />
            <div style={{ flex: "1 1 280px", minWidth: 0, fontSize: 13, lineHeight: 1.7 }}>
              <p style={{ margin: 0 }}>
                <Star size={14} fill="currentColor" aria-hidden
                  style={{ color: "var(--accent)", verticalAlign: -2, marginRight: 6 }} />
                <strong style={{ fontFamily: "var(--font-heading)" }}>
                  Você começa em {recomendacao.fronteira} · {MODULOS[recomendacao.fronteira] ?? recomendacao.fronteira}:
                </strong>{" "}
                {recomendacao.mensagem}
              </p>

              {fracosDispensados.length > 0 && (
                <p style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: 6, margin: "10px 0 0", color: "var(--muted)" }}>
                  <AlertTriangle size={13} aria-hidden />
                  <span>Ficou devendo em módulo dispensado:</span>
                  {fracosDispensados.map((id) => (
                    <Link key={id} to={`/aprender/c/${id}`} className="lg-chip">
                      {CONCEITO_POR_ID[id]?.label ?? id}
                    </Link>
                  ))}
                </p>
              )}

              {(recomendacao.candidatasDispensa?.length ?? 0) > 0 && (
                <Link to="/aprender/nivelamento?ver=resultado"
                  style={{ display: "inline-block", marginTop: 10, marginRight: 16, color: "var(--accent-hover)", fontSize: 12, fontWeight: 600 }}>
                  Confirmar dispensa de {recomendacao.candidatasDispensa.map((d) => d.modulo).join(", ")} →
                </Link>
              )}
              <Link to="/aprender/nivelamento"
                style={{ display: "inline-block", marginTop: 10, color: rascunho ? "var(--accent-hover)" : "var(--muted)", fontSize: 12, fontWeight: rascunho ? 600 : 400 }}>
                {rascunho ? "Continuar nivelamento →" : "Refazer nivelamento →"}
              </Link>
            </div>
          </div>
        ) : (
          <div className="lg-card lg-card--md" style={{ marginBottom: 26, maxWidth: 560 }}>
            {rascunho ? (
              <>
                <p style={{ margin: "0 0 12px", fontSize: 13, lineHeight: 1.7, color: "var(--muted)" }}>
                  Você começou o nivelamento e respondeu{" "}
                  <strong style={{ color: "var(--text)" }}>
                    {Object.keys(rascunho.respostas).length} de {totalDaProva(NIVELAMENTO)}
                  </strong>{" "}
                  questões. Dá para continuar de onde parou.
                </p>
                <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: 14 }}>
                  <Button as={Link} to="/aprender/nivelamento" size="sm">Continuar nivelamento</Button>
                  <button
                    type="button"
                    onClick={() => {
                      if (!window.confirm("Descartar as respostas e recomeçar o nivelamento do zero?")) return;
                      clearRascunho(userId);
                      pedirSync();
                      setRascunho(null);
                    }}
                    style={{ padding: 0, border: "none", background: "none", color: "var(--muted)", fontSize: 12, cursor: "pointer", textDecoration: "underline" }}
                  >
                    Recomeçar
                  </button>
                </div>
              </>
            ) : (
              <>
                <p style={{ margin: "0 0 12px", fontSize: 13, lineHeight: 1.7, color: "var(--muted)" }}>
                  O nivelamento monta sua matriz de competências e decide onde a trilha começa —
                  inclusive quais módulos você pode dispensar.
                </p>
                <Button as={Link} to="/aprender/nivelamento" size="sm">Fazer o nivelamento</Button>
              </>
            )}
          </div>
        )}

        {paraRevisar.size > 0 && (
          <button
            type="button"
            onClick={() => {
              const primeiro = CONCEITOS.find((c) => paraRevisar.has(c.id));
              if (primeiro) navegar(`/aprender/c/${primeiro.id}`);
            }}
            style={{
              display: "flex", alignItems: "center", gap: 8, width: "100%",
              padding: "12px 16px", marginBottom: 26, textAlign: "left", cursor: "pointer",
              border: "1px solid var(--review)", borderRadius: "var(--radius)",
              background: "var(--review-bg)", color: "var(--warning)", fontSize: 13,
            }}
          >
            <RotateCcw size={15} aria-hidden style={{ flex: "0 0 auto" }} />
            <span>
              <strong style={{ fontFamily: "var(--font-heading)" }}>{paraRevisar.size}</strong>{" "}
              {paraRevisar.size === 1 ? "conceito para revisar" : "conceitos para revisar"} — abrir o primeiro.
            </span>
          </button>
        )}

        {grupos.map((g) => {
          const cor = corDoModulo(g.id);
          const pulado = dispensados.has(g.id);
          const feitos = g.conceitos.filter(
            (c) => effectiveState(c, userStatus, doneSet) === "done",
          ).length;

          return (
            <section key={g.id} className="tr-modulo" data-skipped={pulado || undefined}>
              <div className="tr-modulo__cabecalho">
                <span className="tr-modulo__marca" style={{ background: cor }} aria-hidden />
                <h2 className="tr-modulo__nome">
                  <span style={{ color: cor, marginRight: 8 }}>{g.id}</span>
                  {g.nome}
                </h2>
                <span className="tr-modulo__nota" style={{ marginLeft: "auto" }}>
                  {pulado ? "dispensado por você" : `${feitos}/${g.conceitos.length} concluídos`}
                </span>
              </div>

              <div className="tr-grade">
                {g.conceitos.map((c) => {
                  const tarefas = tarefasDoConceito(c.id);
                  return (
                    <ConceptCard
                      key={c.id}
                      concept={c}
                      state={effectiveState(c, userStatus, doneSet)}
                      recommended={recomendados.has(c.id)}
                      skipped={pulado}
                      hasAula={!!CONCEITO_PARA_AULA[c.id]}
                      unmetPrereqs={c.prereqs
                        .filter((p) => !doneSet.has(p))
                        .map((p) => CONCEITO_POR_ID[p]?.label ?? p)}
                      needsReview={paraRevisar.has(c.id)}
                      selected={false}
                      codigo={
                        tarefas.length
                          ? {
                              total: tarefas.length,
                              resolvidas: tarefas.filter((t) => resolvidas.has(t.slug)).length,
                            }
                          : undefined
                      }
                      onSelect={() => navegar(`/aprender/c/${c.id}`)}
                    />
                  );
                })}
              </div>
            </section>
          );
        })}
      </div>
    </div>
  );
}
