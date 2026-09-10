import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Search, Star, Lightbulb, Flame, CheckCircle2 } from "lucide-react";
import { Topbar } from "../ui/Topbar.tsx";
import { PageHeader } from "../ui/PageHeader.tsx";
import { Card } from "../ui/Card.tsx";
import { Chip } from "../ui/Chip.tsx";
import { Input } from "../ui/Field.tsx";
import { SkeletonList } from "../ui/Skeleton.tsx";
import { EmptyState } from "../ui/EmptyState.tsx";
import { fetchChallenges } from "../services/challenges.js";
import { conceitosDaTarefa } from "../lib/praticas.ts";
import { CONCEITO_POR_ID } from "./dados.ts";
import { usePraticasCodigo } from "./usePraticasCodigo.ts";

const DIFICULDADE = {
  Easy: { label: "Iniciante", cor: "var(--success)", icone: Star },
  Medium: { label: "Intermediário", cor: "var(--warning)", icone: Lightbulb },
  Hard: { label: "Avançado", cor: "var(--danger)", icone: Flame },
};
const FILTROS = ["Todos", "Iniciante", "Intermediário", "Avançado", "A resolver"];

/**
 * Catálogo de exercícios de código.
 *
 * A diferença para a tela anterior é o ESTADO: antes os cards eram idênticos
 * independentemente do que o aluno já tinha resolvido — a página nem chamava
 * o histórico de submissões. Agora cada card diz se passou, e o cabeçalho
 * mostra o total.
 */
export default function Codar() {
  const navegar = useNavigate();
  const [tarefas, setTarefas] = useState([]);
  const [carregando, setCarregando] = useState(true);
  const [busca, setBusca] = useState("");
  const [filtro, setFiltro] = useState("Todos");
  const { resolvidas, porSlug } = usePraticasCodigo();

  useEffect(() => {
    document.title = "Ligia — Prática Torch";
    window.scrollTo({ top: 0 });
    fetchChallenges()
      .then(setTarefas)
      .catch(() => setTarefas([]))
      .finally(() => setCarregando(false));
  }, []);

  const filtradas = useMemo(() => {
    const q = busca.toLowerCase().trim();
    return tarefas.filter((t) => {
      const rotulo = DIFICULDADE[t.difficulty]?.label ?? t.difficulty;
      const casaFiltro =
        filtro === "Todos" ||
        (filtro === "A resolver" ? !resolvidas.has(t.slug) : rotulo === filtro);
      // A busca inclui a descrição, que a versão anterior ignorava.
      const palheiro = `${t.title} ${t.slug} ${t.function_name} ${t.hint} ${t.description}`.toLowerCase();
      return casaFiltro && (!q || palheiro.includes(q));
    });
  }, [tarefas, busca, filtro, resolvidas]);

  const feitas = tarefas.filter((t) => resolvidas.has(t.slug)).length;

  return (
    <div>
      <Topbar crumb="Prática Torch" />
      <div className="lg-page">
        <PageHeader
          eyebrow="Aprender"
          title="Prática Torch."
          lede={
            <>
              Implemente as peças de PyTorch do zero, no navegador. Cada exercício roda contra uma
              bateria de testes — e conta para o conceito correspondente na trilha.
            </>
          }
        />

        <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: 10, marginBottom: 22 }}>
          <div style={{ position: "relative", flex: "1 1 240px", maxWidth: 320 }}>
            <Search size={15} aria-hidden
              style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", color: "var(--muted-2)" }} />
            <Input
              size="sm"
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
              placeholder="Buscar exercício…"
              aria-label="Buscar exercício"
              style={{ paddingLeft: 34 }}
            />
          </div>
          {FILTROS.map((f) => (
            <Chip key={f} selected={filtro === f} onClick={() => setFiltro(f)}>
              {f}
            </Chip>
          ))}
          <span style={{ marginLeft: "auto", color: "var(--muted-2)", fontSize: 12 }}>
            {/* Antes esta contagem era a string "41 problemas curados", fixa no código. */}
            {feitas}/{tarefas.length} resolvidos
          </span>
        </div>

        {carregando ? (
          <SkeletonList count={6} height={120} />
        ) : filtradas.length === 0 ? (
          <EmptyState
            title="Nenhum exercício encontrado"
            text="Tente outro termo de busca ou remova o filtro de dificuldade."
          />
        ) : (
          <div className="cd-grade">
            {filtradas.map((t) => {
              const d = DIFICULDADE[t.difficulty] ?? { label: t.difficulty, cor: "var(--muted)", icone: Star };
              const Icone = d.icone;
              const feito = resolvidas.has(t.slug);
              const tentativas = porSlug.get(t.slug)?.tentativas ?? 0;
              const conceitos = conceitosDaTarefa(t.slug);

              return (
                <Card
                  key={t.slug}
                  as="article"
                  interactive
                  onClick={() => navegar(`/aprender/codar/${t.slug}`)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault();
                      navegar(`/aprender/codar/${t.slug}`);
                    }
                  }}
                  role="link"
                  aria-label={`${t.title} — ${d.label}${feito ? ", resolvido" : ""}`}
                >
                  <div className="cd-card__topo">
                    {feito ? (
                      <CheckCircle2 size={17} aria-hidden style={{ flex: "0 0 auto", color: "var(--success)" }} />
                    ) : (
                      <Icone size={17} aria-hidden style={{ flex: "0 0 auto", color: d.cor }} />
                    )}
                    <span className="lg-chip lg-chip--static" style={{ borderColor: "transparent", color: d.cor, padding: "2px 0" }}>
                      {d.label}
                    </span>
                    <span style={{ marginLeft: "auto", color: "var(--muted-2)", fontSize: 11 }}>
                      {t.tests_count} testes
                    </span>
                  </div>

                  <h2 className="cd-card__titulo">{t.title}</h2>
                  {t.function_name && <code className="cd-card__fn">{t.function_name}</code>}

                  {t.hint && (
                    <p className="cd-card__dica">{t.hint.replace(/\$|\\/g, "").slice(0, 140)}</p>
                  )}

                  <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: 6, marginTop: 10 }}>
                    {conceitos.slice(0, 2).map((id) => (
                      <Link
                        key={id}
                        to={`/aprender/c/${id}`}
                        onClick={(e) => e.stopPropagation()}
                        className="lg-chip"
                        style={{ fontSize: 11, padding: "3px 9px" }}
                      >
                        {CONCEITO_POR_ID[id]?.label ?? id}
                      </Link>
                    ))}
                    {!feito && tentativas > 0 && (
                      <span style={{ marginLeft: "auto", color: "var(--muted-2)", fontSize: 11 }}>
                        {tentativas} tentativa{tentativas > 1 ? "s" : ""}
                      </span>
                    )}
                  </div>
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
