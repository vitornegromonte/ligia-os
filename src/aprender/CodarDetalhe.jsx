import { learningStorage } from "../lib/learning-storage.ts";
import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import Editor from "@monaco-editor/react";
import {
  ArrowLeft, Play, Loader2, Copy, RotateCcw, Check, CheckCircle2, XCircle, AlertTriangle,
} from "lucide-react";
import { Topbar } from "../ui/Topbar.tsx";
import { Button } from "../ui/Button.tsx";
import { Card } from "../ui/Card.tsx";
import { SkeletonList } from "../ui/Skeleton.tsx";
import { Alert } from "../ui/Alert.tsx";
import MarkdownViewer from "../components/MarkdownViewer.jsx";
import NotFound from "../pages/NotFound.jsx";
import { showToast } from "../utils/toast.js";
import { fetchChallenge, submitToJudge, fetchMySubmissions } from "../services/challenges.js";
import { conceitosDaTarefa } from "../lib/praticas.ts";
import { CONCEITO_POR_ID } from "./dados.ts";

const RASCUNHO = (slug) => `ligia_code_${slug}`;

const OPCOES_MONACO = {
  fontSize: 13,
  minimap: { enabled: false },
  scrollBeyondLastLine: false,
  padding: { top: 12, bottom: 12 },
  fontFamily: "JetBrains Mono, SF Mono, Fira Code, monospace",
  tabSize: 4,
};

/** Bancada de código: enunciado à esquerda, editor e resultado à direita. */
export default function CodarDetalhe() {
  const { slug } = useParams();
  const [tarefa, setTarefa] = useState(null);
  const [carregando, setCarregando] = useState(true);
  const [naoExiste, setNaoExiste] = useState(false);
  const [code, setCode] = useState("");
  const [executando, setExecutando] = useState(false);
  const [resultado, setResultado] = useState(null);
  const [copiado, setCopiado] = useState(false);
  const [historico, setHistorico] = useState([]);

  useEffect(() => {
    let vivo = true;
    setCarregando(true);
    fetchChallenge(slug)
      .then((t) => {
        if (!vivo) return;
        if (!t) {
          setNaoExiste(true);
          return;
        }
        setTarefa(t);
        document.title = `Ligia — ${t.title}`;
        const salvo = learningStorage.getItem(RASCUNHO(t.slug)) || "";
        setCode(salvo || t.initial_code || t.starter_code || "");
        fetchMySubmissions(t.slug).then(setHistorico).catch(() => {});
      })
      .catch(() => vivo && setNaoExiste(true))
      .finally(() => vivo && setCarregando(false));
    window.scrollTo({ top: 0 });
    return () => {
      vivo = false;
    };
  }, [slug]);

  // Rascunho local, para não perder o trabalho ao trocar de página.
  useEffect(() => {
    if (tarefa && code) learningStorage.setItem(RASCUNHO(tarefa.slug), code);
  }, [code, tarefa]);

  async function executar() {
    if (!tarefa) return;
    setExecutando(true);
    setResultado(null);
    try {
      const res = await submitToJudge(tarefa.slug, code);
      setResultado(res);
      if (res.success) showToast("Passou em todos os testes");
      else showToast(`Erro: ${res.passed ?? 0}/${res.total ?? 0} testes passaram`);
      fetchMySubmissions(tarefa.slug).then(setHistorico).catch(() => {});
    } catch (e) {
      showToast(`Erro: ${e.message}`);
      setResultado({ success: false, error: e.message, tests: [] });
    } finally {
      setExecutando(false);
    }
  }

  if (naoExiste) return <NotFound />;

  if (carregando || !tarefa) {
    return (
      <div>
        <Topbar crumb="Prática Torch" />
        <div className="lg-page"><SkeletonList count={3} height={140} /></div>
      </div>
    );
  }

  const conceitos = conceitosDaTarefa(tarefa.slug);
  // Sem nenhum teste executado e com erro: o problema foi rodar, não o código.
  const naoRodou =
    !!resultado && !resultado.success && !(resultado.tests?.length) && !resultado.total && !!resultado.error;

  return (
    <div>
      <Topbar crumb={tarefa.title} />
      <div className="lg-page">
        <Link to="/aprender/codar" style={{ display: "inline-flex", alignItems: "center", gap: 6, marginBottom: 18, color: "var(--muted)", fontSize: 13 }}>
          <ArrowLeft size={14} aria-hidden /> Prática Torch
        </Link>

        <div className="cd-workbench">
          {/* ---------- Enunciado ---------- */}
          <div>
            <h1 style={{ margin: "0 0 10px", fontSize: "clamp(22px, 3vw, 28px)", fontWeight: 500, letterSpacing: "-.02em" }}>
              {tarefa.title}
            </h1>

            {conceitos.length > 0 && (
              <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: 6, marginBottom: 18 }}>
                <span style={{ color: "var(--muted-2)", fontSize: 12 }}>Pratica:</span>
                {conceitos.map((id) => (
                  <Link key={id} to={`/aprender/c/${id}`} className="lg-chip" style={{ fontSize: 11, padding: "3px 9px" }}>
                    {CONCEITO_POR_ID[id]?.label ?? id}
                  </Link>
                ))}
              </div>
            )}

            <Card>
              {tarefa.description ? (
                <MarkdownViewer content={tarefa.description} />
              ) : (
                <p style={{ margin: 0, color: "var(--muted)", fontSize: 13 }}>
                  Este exercício ainda não tem enunciado escrito. A assinatura esperada é{" "}
                  <code className="cd-card__fn">{tarefa.function_name}</code>, e são{" "}
                  {tarefa.tests_count} testes.
                </p>
              )}
            </Card>

            {tarefa.hint && (
              <details style={{ marginTop: 14 }}>
                <summary style={{ cursor: "pointer", color: "var(--muted)", fontSize: 13 }}>Ver dica</summary>
                <div style={{ marginTop: 10 }}><MarkdownViewer content={tarefa.hint} /></div>
              </details>
            )}

            {historico.length > 0 && (
              <div style={{ marginTop: 22 }}>
                <h2 className="eyebrow" style={{ marginBottom: 10 }}>Suas execuções</h2>
                <div style={{ display: "grid", gap: 6 }}>
                  {historico.slice(0, 5).map((s) => (
                    <div key={s.id} style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 12, color: "var(--muted)" }}>
                      <span style={{
                        width: 7, height: 7, borderRadius: 999, flex: "0 0 auto",
                        background: s.status === "passed" ? "var(--success)" : "var(--danger)",
                      }} aria-hidden />
                      <span>{new Date(s.created_at).toLocaleString("pt-BR")}</span>
                      <span style={{ marginLeft: "auto" }}>{s.passed}/{s.total}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* ---------- Editor ---------- */}
          <div className="cd-editor">
            <div className="cd-editor__barra">
              <span className="cd-editor__arquivo">{tarefa.slug}.py</span>
              <div style={{ marginLeft: "auto", display: "flex", gap: 6 }}>
                <Button size="sm" variant="ghost" onClick={async () => {
                  try {
                    await navigator.clipboard.writeText(code);
                    setCopiado(true);
                    setTimeout(() => setCopiado(false), 1500);
                  } catch {
                    showToast("Erro: copie manualmente");
                  }
                }}>
                  {copiado ? <Check size={14} aria-hidden /> : <Copy size={14} aria-hidden />} Copiar
                </Button>
                <Button size="sm" variant="ghost" onClick={() => {
                  setCode(tarefa.initial_code || tarefa.starter_code || "");
                  learningStorage.removeItem(RASCUNHO(tarefa.slug));
                }}>
                  <RotateCcw size={14} aria-hidden /> Reset
                </Button>
              </div>
            </div>

            <div className="cd-editor__monaco">
              <Editor
                height="min(56vh, 460px)"
                language="python"
                theme="vs-dark"
                value={code}
                onChange={(v) => setCode(v || "")}
                options={OPCOES_MONACO}
                loading={<div className="skeleton" style={{ height: 200 }} />}
              />
            </div>

            <div style={{ marginTop: 12 }}>
              <Button onClick={executar} disabled={executando || !code.trim()}>
                {executando ? <Loader2 size={15} className="pr-girar" aria-hidden /> : <Play size={15} aria-hidden />}
                {executando ? "Executando…" : "Rodar testes"}
              </Button>
            </div>

            {resultado && (
              <div className="cd-resultado">
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10, fontWeight: 600 }}>
                  {/* Nenhum teste rodou (juiz fora, sem conta, timeout): isso é
                      falha de EXECUÇÃO, não do aluno. Mostrar "Ainda não 0/0"
                      aqui faria ele achar que errou. */}
                  {naoRodou ? (
                    <><AlertTriangle size={16} aria-hidden style={{ color: "var(--warning)" }} />
                      <span style={{ color: "var(--warning)" }}>Não foi possível rodar os testes</span></>
                  ) : resultado.success ? (
                    <><CheckCircle2 size={16} aria-hidden style={{ color: "var(--success)" }} />
                      <span style={{ color: "var(--success)" }}>Passou</span></>
                  ) : (
                    <><XCircle size={16} aria-hidden style={{ color: "var(--danger)" }} />
                      <span style={{ color: "var(--danger)" }}>Ainda não</span></>
                  )}
                  {!naoRodou && (
                  <span style={{ marginLeft: "auto", color: "var(--muted)", fontWeight: 400 }}>
                    {resultado.passed ?? 0}/{resultado.total ?? 0}
                    {resultado.total_time_ms ? ` · ${Math.round(resultado.total_time_ms)}ms` : ""}
                  </span>
                  )}
                </div>

                {/* Honestidade: a submissão não entrou no histórico. Antes isso
                    era `catch {}` e a tela mostrava verde do mesmo jeito. */}
                {resultado.persistido === false && (
                  <Alert tone="warning">
                    <AlertTriangle size={13} aria-hidden style={{ verticalAlign: -2, marginRight: 4 }} />
                    O resultado não foi salvo no seu histórico.
                  </Alert>
                )}

                {(resultado.tests ?? []).map((t, i) => (
                  <div key={i} className="cd-teste">
                    {t.passed ? (
                      <CheckCircle2 size={14} aria-hidden style={{ marginTop: 2, flex: "0 0 auto", color: "var(--success)" }} />
                    ) : (
                      <XCircle size={14} aria-hidden style={{ marginTop: 2, flex: "0 0 auto", color: "var(--danger)" }} />
                    )}
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: "flex", gap: 8 }}>
                        <span style={{ flex: 1, minWidth: 0 }}>{t.name}</span>
                        {t.time_ms != null && (
                          <span style={{ color: "var(--muted-2)", fontSize: 11 }}>{Math.round(t.time_ms)}ms</span>
                        )}
                      </div>
                      {t.error_msg && <pre className="cd-saida">{t.error_msg}</pre>}
                      {/* O juiz sempre devolveu o traceback; a tela anterior o
                          descartava, e era a informação mais útil ao aluno. */}
                      {t.error_traceback && <pre className="cd-saida">{t.error_traceback}</pre>}
                      {t.stdout && <pre className="cd-saida cd-saida--neutra">{t.stdout}</pre>}
                    </div>
                  </div>
                ))}

                {resultado.error && (naoRodou
                  ? <p style={{ margin: 0, color: "var(--muted)", fontSize: 13 }}>{resultado.error}</p>
                  : <pre className="cd-saida">{resultado.error}</pre>)}
                {resultado.traceback && <pre className="cd-saida">{resultado.traceback}</pre>}
                {resultado.stderr && <pre className="cd-saida">{resultado.stderr}</pre>}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
