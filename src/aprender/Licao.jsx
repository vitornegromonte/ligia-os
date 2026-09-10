import { useEffect, useMemo, useState } from "react";
import { Link, useParams, useNavigate } from "react-router-dom";
import {
  ArrowLeft, BookOpen, Code2, Brain, CheckCircle2, Circle, CircleDot, Lock,
  RotateCcw, ExternalLink, Video, FileText, GraduationCap, Star,
} from "lucide-react";
import { Topbar } from "../ui/Topbar.tsx";
import { Button } from "../ui/Button.tsx";
import { Card } from "../ui/Card.tsx";
import { Chip } from "../ui/Chip.tsx";
import { EmptyState } from "../ui/EmptyState.tsx";
import MarkdownViewer from "../components/MarkdownViewer.jsx";
import NotFound from "../pages/NotFound.jsx";
import { SYNC_EVENT } from "./SyncEstado.tsx";
import { CONCEITOS, MODULOS, CONCEITO_POR_ID, CONCEITO_PARA_AULA, CONCEITOS_COM_LOOP } from "./dados.ts";
import { effectiveState, doneSetFrom } from "../lib/status.ts";
import { loadUserStatus, setNodeStatus } from "../lib/progress.ts";
import { getAula, youtubeId } from "../lib/aulas.ts";
import { getLoopResult, loopMastery, dueForReview, daysSince } from "../lib/loop-progress.ts";
import { tarefasDoConceito, notaDoConceito } from "../lib/praticas.ts";
import { corDoModulo } from "../lib/modulos.ts";
import { usePraticasCodigo } from "./usePraticasCodigo.ts";

const ICONE_ESTADO = { available: Circle, "in-progress": CircleDot, done: CheckCircle2, locked: Lock };
const ROTULO_ESTADO = {
  available: "Liberado", "in-progress": "Em andamento", done: "Concluído", locked: "Bloqueado",
};
const ICONE_MATERIAL = { video: Video, doc: FileText, course: GraduationCap, book: BookOpen };
const COR_DIFICULDADE = { Easy: "var(--success)", Medium: "var(--warning)", Hard: "var(--danger)" };
const ROTULO_DIFICULDADE = { Easy: "Iniciante", Medium: "Intermediário", Hard: "Avançado" };

function Secao({ icone: Icone, titulo, acessorio, children }) {
  return (
    <section style={{ marginBottom: 34 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 14 }}>
        <Icone size={16} aria-hidden style={{ color: "var(--muted-2)" }} />
        <h2 style={{ margin: 0, fontSize: 15, fontWeight: 600 }}>{titulo}</h2>
        {acessorio && <div style={{ marginLeft: "auto" }}>{acessorio}</div>}
      </div>
      {children}
    </section>
  );
}

/**
 * Hub da lição — o centro da área de aprendizado.
 *
 * Reúne num lugar só o que antes exigia três telas: o material, a aula, a
 * prática de recuperação e o exercício de código. O aluno não sai do sistema
 * para praticar, que é o ponto inteiro da integração.
 */
export default function Licao() {
  const { conceptId } = useParams();
  const navegar = useNavigate();
  const conceito = CONCEITO_POR_ID[conceptId];

  const [userStatus, setUserStatus] = useState({});
  const [agora, setAgora] = useState(0);
  const { resolvidas, porSlug } = usePraticasCodigo();

  useEffect(() => {
    if (conceito) {
      document.title = `Ligia — ${conceito.label}`;
      window.scrollTo({ top: 0 });
    }
  }, [conceito]);

  useEffect(() => {
    function reler() {
      setUserStatus(loadUserStatus());
      setAgora(Date.now());
    }
    reler();
    window.addEventListener(SYNC_EVENT, reler);
    return () => window.removeEventListener(SYNC_EVENT, reler);
  }, []);

  const doneSet = useMemo(() => doneSetFrom(userStatus), [userStatus]);
  const tarefas = useMemo(() => (conceito ? tarefasDoConceito(conceito.id) : []), [conceito]);
  const aula = conceito ? getAula(CONCEITO_PARA_AULA[conceito.id] ?? "") : null;
  const loop = conceito ? getLoopResult(conceito.id) : null;
  const temLoop = conceito ? CONCEITOS_COM_LOOP.has(conceito.id) : false;

  // Conceito inexistente na URL é 404 de verdade, não tela vazia.
  if (!conceito) return <NotFound />;

  const estado = effectiveState(conceito, userStatus, doneSet);
  const IconeEstado = ICONE_ESTADO[estado];
  const cor = corDoModulo(conceito.module);
  const pendentes = conceito.prereqs.filter((p) => !doneSet.has(p));
  const precisaRevisar = loop && agora ? dueForReview(loop, agora) : false;
  const dominio = loop ? loopMastery(loop, loop.total) : null;
  const resolvidasAqui = tarefas.filter((t) => resolvidas.has(t.slug)).length;

  const marcar = (valor) => setUserStatus((prev) => setNodeStatus(prev, conceito.id, valor));

  // O aluno declara a conclusão; o sistema não decide por ele. O que muda com
  // a evidência é o convite, não a permissão.
  const evidenciaCompleta =
    (!temLoop || dominio === "dominado") && (tarefas.length === 0 || resolvidasAqui === tarefas.length);

  return (
    <div>
      <Topbar crumb={conceito.label} />
      <div className="lg-page" style={{ maxWidth: 860 }}>
        <Link to="/aprender" style={{ display: "inline-flex", alignItems: "center", gap: 6, marginBottom: 18, color: "var(--muted)", fontSize: 13 }}>
          <ArrowLeft size={14} aria-hidden /> Trilha
        </Link>

        <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: 10, marginBottom: 8 }}>
          <span style={{ color: cor, fontFamily: "var(--font-heading)", fontSize: 13, fontWeight: 700 }}>
            {conceito.module} · {MODULOS[conceito.module] ?? conceito.module}
          </span>
          <span style={{ display: "inline-flex", alignItems: "center", gap: 5, color: "var(--muted)", fontSize: 12 }}>
            <IconeEstado size={13} aria-hidden /> {ROTULO_ESTADO[estado]}
          </span>
          {precisaRevisar && (
            <span className="tr-fita tr-fita--revisar" style={{ position: "static" }}>
              <RotateCcw size={11} aria-hidden /> Hora de revisar
            </span>
          )}
        </div>

        <h1 style={{ margin: "0 0 18px", fontSize: "clamp(24px, 3.5vw, 32px)", fontWeight: 500, letterSpacing: "-.03em" }}>
          {conceito.label}
        </h1>

        {pendentes.length > 0 && (
          <Card padding="sm" style={{ marginBottom: 26, borderColor: "var(--line)" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 8, color: "var(--muted)", fontSize: 12 }}>
              <Lock size={13} aria-hidden /> Antes deste conceito, conclua:
            </div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
              {pendentes.map((p) => (
                <Link key={p} to={`/aprender/c/${p}`} className="lg-chip">
                  {CONCEITO_POR_ID[p]?.label ?? p}
                </Link>
              ))}
            </div>
          </Card>
        )}

        {/* ---------- Aula, embutida: praticar sem sair do sistema ---------- */}
        {aula && (
          <Secao
            icone={BookOpen}
            titulo="Aula"
            acessorio={
              <span style={{ color: "var(--muted-2)", fontSize: 11 }}>
                {aula.frontmatter.autor}
                {aula.frontmatter.duracao_min ? ` · ${aula.frontmatter.duracao_min} min` : ""}
              </span>
            }
          >
            {youtubeId(aula.frontmatter.youtube) && (
              <div style={{ position: "relative", paddingTop: "56.25%", marginBottom: 18, borderRadius: "var(--radius)", overflow: "hidden", border: "1px solid var(--line-soft)" }}>
                <iframe
                  src={`https://www.youtube.com/embed/${youtubeId(aula.frontmatter.youtube)}`}
                  title={aula.frontmatter.titulo}
                  allow="accelerometer; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                  style={{ position: "absolute", inset: 0, width: "100%", height: "100%", border: 0 }}
                />
              </div>
            )}
            <Card>
              <MarkdownViewer content={aula.content} />
            </Card>
            {(aula.frontmatter.colab || aula.frontmatter.slides) && (
              <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
                {aula.frontmatter.colab && (
                  <Button as="a" href={aula.frontmatter.colab} target="_blank" rel="noreferrer" size="sm" variant="secondary">
                    <ExternalLink size={13} aria-hidden /> Colab
                  </Button>
                )}
                {aula.frontmatter.slides && (
                  <Button as="a" href={aula.frontmatter.slides} target="_blank" rel="noreferrer" size="sm" variant="secondary">
                    <ExternalLink size={13} aria-hidden /> Slides
                  </Button>
                )}
              </div>
            )}
          </Secao>
        )}

        {/* ---------- Materiais ---------- */}
        {conceito.materials.length > 0 && (
          <Secao icone={FileText} titulo="Materiais">
            <div style={{ display: "grid", gap: 8 }}>
              {conceito.materials.map((m) => {
                const Icone = ICONE_MATERIAL[m.type] ?? FileText;
                return (
                  <a
                    key={m.url}
                    href={m.url}
                    target="_blank"
                    rel="noreferrer"
                    className="lg-card lg-card--sm lg-card--interactive"
                    style={{ display: "flex", alignItems: "center", gap: 12 }}
                  >
                    <Icone size={16} aria-hidden style={{ flex: "0 0 auto", color: cor }} />
                    <span style={{ flex: 1, minWidth: 0, fontSize: 13 }}>{m.title}</span>
                    {m.duration_min ? (
                      <span style={{ color: "var(--muted-2)", fontSize: 11 }}>{m.duration_min} min</span>
                    ) : null}
                    <ExternalLink size={13} aria-hidden style={{ color: "var(--muted-2)" }} />
                  </a>
                );
              })}
            </div>
          </Secao>
        )}

        {/* ---------- Prática conceitual ---------- */}
        <Secao icone={Brain} titulo="Prática de recuperação">
          {temLoop ? (
            <Card>
              <p style={{ margin: "0 0 14px", color: "var(--muted)", fontSize: 13, lineHeight: 1.7 }}>
                Perguntas abertas sobre o conceito, corrigidas na hora. Serve para descobrir o que
                você <em>acha</em> que sabe — e o intervalo até a próxima revisão sai do resultado.
              </p>
              {loop && (
                <div style={{ display: "flex", flexWrap: "wrap", gap: 14, marginBottom: 14, fontSize: 12, color: "var(--muted)" }}>
                  <span>
                    Último resultado:{" "}
                    <strong style={{ color: dominio === "dominado" ? "var(--success)" : "var(--warning)" }}>
                      {dominio === "dominado" ? "dominado" : "praticado"}
                    </strong>
                  </span>
                  <span>{loop.acertei}/{loop.total} acertos</span>
                  <span>{loop.times}× praticado</span>
                  {agora ? <span>há {daysSince(loop.at, agora)} dia(s)</span> : null}
                </div>
              )}
              <Button as={Link} to={`/aprender/c/${conceito.id}/praticar`} size="sm">
                {loop ? (precisaRevisar ? "Revisar agora" : "Praticar de novo") : "Começar a prática"}
              </Button>
            </Card>
          ) : (
            <EmptyState
              title="Sem prática de recuperação ainda"
              text="Este conceito ainda não tem roteiro de perguntas. Os materiais acima cobrem o conteúdo."
            />
          )}
        </Secao>

        {/* ---------- Prática de código ---------- */}
        <Secao
          icone={Code2}
          titulo="Prática de código"
          acessorio={
            tarefas.length > 0 ? (
              <span style={{ color: "var(--muted-2)", fontSize: 11 }}>
                {resolvidasAqui}/{tarefas.length} resolvidas
              </span>
            ) : null
          }
        >
          {tarefas.length > 0 ? (
            <div style={{ display: "grid", gap: 8 }}>
              {tarefas.map((t) => {
                const feito = resolvidas.has(t.slug);
                const estadoTask = porSlug.get(t.slug);
                return (
                  <Link
                    key={t.slug}
                    to={`/aprender/codar/${t.slug}`}
                    className="lg-card lg-card--sm lg-card--interactive"
                    style={{ display: "flex", alignItems: "center", gap: 12 }}
                  >
                    {feito ? (
                      <CheckCircle2 size={16} aria-hidden style={{ flex: "0 0 auto", color: "var(--success)" }} />
                    ) : (
                      <Circle size={16} aria-hidden style={{ flex: "0 0 auto", color: "var(--muted-3)" }} />
                    )}
                    <span style={{ flex: 1, minWidth: 0, fontSize: 13 }}>{t.title}</span>
                    {!feito && estadoTask?.tentativas ? (
                      <span style={{ color: "var(--muted-2)", fontSize: 11 }}>
                        {estadoTask.tentativas} tentativa(s)
                      </span>
                    ) : null}
                    <span style={{ color: COR_DIFICULDADE[t.difficulty], fontSize: 11, whiteSpace: "nowrap" }}>
                      {ROTULO_DIFICULDADE[t.difficulty]}
                    </span>
                  </Link>
                );
              })}
            </div>
          ) : (
            <EmptyState
              title="Sem exercício de código para este conceito"
              text={notaDoConceito(conceito.id) ?? "A prática aqui é conceitual."}
            />
          )}
        </Secao>

        {/* ---------- Conclusão declarada pelo aluno ---------- */}
        <Card>
          <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: 12 }}>
            <div style={{ flex: "1 1 260px", minWidth: 0 }}>
              <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 4 }}>
                {estado === "done" ? "Você marcou este conceito como concluído" : "Já domina este conceito?"}
              </div>
              <p style={{ margin: 0, color: "var(--muted)", fontSize: 12, lineHeight: 1.6 }}>
                {estado === "done"
                  ? "Concluir libera os conceitos que dependem deste."
                  : evidenciaCompleta
                    ? "Sua prática indica que sim — mas quem decide é você."
                    : "Marcar como concluído libera os conceitos que dependem deste."}
              </p>
            </div>
            <div style={{ display: "flex", gap: 8 }}>
              {estado === "done" ? (
                <Button size="sm" variant="secondary" onClick={() => marcar(null)}>
                  Desmarcar
                </Button>
              ) : (
                <>
                  {estado !== "in-progress" && (
                    <Button size="sm" variant="secondary" onClick={() => marcar("in-progress")}>
                      Estou estudando
                    </Button>
                  )}
                  <Button size="sm" onClick={() => marcar("done")}>
                    {evidenciaCompleta && <Star size={13} fill="currentColor" aria-hidden />}
                    Marcar como concluído
                  </Button>
                </>
              )}
            </div>
          </div>
        </Card>

        <div style={{ marginTop: 26 }}>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              const i = CONCEITOS.findIndex((c) => c.id === conceito.id);
              const proximo = CONCEITOS[i + 1];
              navegar(proximo ? `/aprender/c/${proximo.id}` : "/aprender");
            }}
          >
            Próximo conceito →
          </Button>
        </div>
      </div>
    </div>
  );
}
