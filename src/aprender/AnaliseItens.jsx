import { useEffect, useMemo, useState } from "react";
import { Check } from "lucide-react";
import { Topbar } from "../ui/Topbar.tsx";
import { PageHeader } from "../ui/PageHeader.tsx";
import { Card } from "../ui/Card.tsx";
import { Chip } from "../ui/Chip.tsx";
import { EmptyState } from "../ui/EmptyState.tsx";
import { NIVELAMENTO, MODULOS, CONCEITOS } from "./dados.ts";
import { COMPETENCIAS } from "../lib/competencias.ts";
import {
  analisarItens,
  resumirPerfis,
  N_CORRELACAO,
  N_MINIMO,
  P_DIFICIL,
  P_FACIL,
  RPB_MINIMO,
} from "../lib/analise-itens.ts";
import {
  prereqsPorCompetencia,
  simularAdaptativo,
  CASOS_MINIMOS,
  ESCONDIDO_CANDIDATA_MAX,
  ESCONDIDO_REVISAO_MAX,
  RODADAS_MINIMAS,
} from "../lib/adaptativo.ts";
import { loadPerfil, loadPretestV2 } from "../lib/pretest-storage.ts";
import { supabase } from "../lib/supabase.js";
import { isConfigured } from "../services/supabase.js";

const ROTULO_ALERTA = {
  "amostra-pequena": `menos de ${N_MINIMO} respostas`,
  "facil-demais": "fácil demais",
  "dificil-demais": "difícil demais",
  "discrimina-pouco": "discrimina pouco",
  "gabarito-suspeito": "gabarito suspeito",
  "distrator-morto": "alternativa que ninguém marca",
  "peso-diferente": "peso diferente do sugerido",
};

const COR_ALERTA = {
  "amostra-pequena": "var(--muted)",
  "gabarito-suspeito": "var(--danger)",
};

const TIPOS = [
  { id: "etapa1", rotulo: "Etapa 1" },
  { id: "etapa2", rotulo: "Confirmação" },
  { id: "codigo", rotulo: "Código" },
];

const FORMAS = new Map([...NIVELAMENTO.mcq, ...NIVELAMENTO.codigo.questoes].map((q) => [q.id, q]));
const pct = (v) => (v === null ? "—" : `${Math.round(v * 100)}%`);
const PREREQS = prereqsPorCompetencia(CONCEITOS);

const VEREDITO = {
  "dados-insuficientes": `Dados insuficientes: a simulação só recomenda com ${RODADAS_MINIMAS}+ rodadas completas e ${CASOS_MINIMOS}+ competências puladas.`,
  "regra-segura": "Com estes dados, a regra esconderia pouco conhecimento. Dá para considerar ligar.",
  "regra-esconde-demais": "Com estes dados, a regra esconderia conhecimento demais. Não ligar.",
};

/**
 * Análise de itens do nivelamento, para staff (rota só de admin).
 *
 * Lê todas as rodadas de `pretest_results` (a RLS de staff libera a leitura)
 * e mostra, por questão: taxa de acerto, "Não sei", correlação com o resto do
 * teste, peso sugerido e as alternativas marcadas. Serve para recalibrar os
 * pesos de dificuldade e achar questão com gabarito ou distrator ruim.
 *
 * Sem Supabase configurado (preview local), analisa a rodada deste navegador,
 * o que só serve para ver a tela funcionando.
 */
export default function AnaliseItens() {
  const [rodadas, setRodadas] = useState(null);
  /** Perfis do "quem é você", no formato de resumirPerfis. */
  const [perfis, setPerfis] = useState(null);
  const [erroPerfis, setErroPerfis] = useState(null);
  const [origem, setOrigem] = useState("banco");
  const [erro, setErro] = useState(null);
  const [tipo, setTipo] = useState("etapa1");
  const [soAlertas, setSoAlertas] = useState(false);

  useEffect(() => {
    document.title = "Ligia — Análise do nivelamento";
    if (!isConfigured()) {
      const local = loadPretestV2();
      setOrigem("local");
      setRodadas(local ? [local] : []);
      const perfil = loadPerfil();
      setPerfis(perfil ? [perfil] : []);
      return;
    }
    let vivo = true;
    (async () => {
      const { data, error } = await supabase.from("pretest_results").select("resultados, respostas");
      if (!vivo) return;
      if (error) {
        setErro(error.message);
        setRodadas([]);
        return;
      }
      setRodadas(data ?? []);
    })();
    (async () => {
      const { data, error } = await supabase
        .from("learner_profiles")
        .select("auto_relato, textos_outro");
      if (!vivo) return;
      if (error) {
        setErroPerfis(error.message);
        setPerfis([]);
        return;
      }
      setPerfis((data ?? []).map((r) => ({ autoRelato: r.auto_relato, textosOutro: r.textos_outro })));
    })();
    return () => {
      vivo = false;
    };
  }, []);

  const analise = useMemo(
    () => (rodadas ? analisarItens(NIVELAMENTO, rodadas) : null),
    [rodadas],
  );
  const resumo = useMemo(() => (perfis ? resumirPerfis(NIVELAMENTO, perfis) : null), [perfis]);
  const simulacao = useMemo(
    () => (rodadas ? simularAdaptativo(NIVELAMENTO, rodadas, PREREQS) : null),
    [rodadas],
  );

  const itens = useMemo(() => {
    if (!analise) return [];
    return analise.itens.filter(
      (it) => it.tipo === tipo && (it.n > 0 || !it.aposentada) && (!soAlertas || it.alertas.some((a) => a !== "amostra-pequena")),
    );
  }, [analise, tipo, soAlertas]);

  const grupos = useMemo(() => {
    if (tipo === "codigo") return [{ id: "codigo", nome: "Leitura de código", itens }];
    return COMPETENCIAS.map((c) => ({
      id: c.id,
      nome: `${c.modulo} · ${MODULOS[c.modulo] ?? c.label}`,
      itens: itens.filter((it) => it.competencia === c.id),
    })).filter((g) => g.itens.length > 0);
  }, [itens, tipo]);

  return (
    <div>
      <Topbar crumb="Análise do nivelamento" />
      <div className="lg-page">
        <PageHeader
          eyebrow="Aprender · staff"
          title="Análise do nivelamento."
          lede="Como cada questão se comporta nas rodadas reais: quem acerta, quem marca “Não sei”, se ela separa quem vai bem de quem vai mal e quais alternativas atraem alguém."
        />

        {origem === "local" && (
          <p className="ai-aviso" role="status">
            Sem Supabase configurado: mostrando só a rodada deste navegador.
          </p>
        )}
        {erro && (
          <p className="ai-aviso ai-aviso--erro" role="alert">
            Não foi possível ler as rodadas: {erro}. Se a mensagem cita a coluna “respostas”, falta
            aplicar a migração 0104.
          </p>
        )}

        {resumo && (
          <Card style={{ marginBottom: 18 }} data-quem-respondeu>
            <h2 className="ai-titulo">
              Quem respondeu · {resumo.pessoas} {resumo.pessoas === 1 ? "pessoa" : "pessoas"}
            </h2>
            <p className="ai-legenda">
              Respostas mais recentes do “quem é você”, inclusive de quem não terminou o nivelamento.
              Cada pessoa aparece no próprio perfil em Membros.
            </p>
            {erroPerfis && (
              <p className="ai-aviso ai-aviso--erro" role="alert" style={{ marginTop: 10 }}>
                Não foi possível ler os perfis: {erroPerfis}. Se a tabela não existe, falta aplicar a
                migração 0105.
              </p>
            )}
            {resumo.pessoas > 0 && (
              <div style={{ display: "grid", gap: 8, marginTop: 12 }}>
                {resumo.perguntas.map((p) => (
                  <details key={p.id}>
                    <summary className="ai-legenda" style={{ cursor: "pointer", color: "var(--text)" }}>
                      {p.pergunta} <span style={{ color: "var(--muted)" }}>({p.respondentes})</span>
                    </summary>
                    <ul className="ai-alternativas">
                      {p.contagens.map((c) => {
                        const fracao = p.respondentes ? c.n / p.respondentes : 0;
                        return (
                          <li key={c.texto}>
                            <span className="ai-alternativas__texto">{c.texto}</span>
                            <span className="ai-alternativas__barra" aria-hidden>
                              <span style={{ width: `${Math.round(fracao * 100)}%` }} />
                            </span>
                            <span className="ai-alternativas__valor">{c.n}</span>
                          </li>
                        );
                      })}
                    </ul>
                    {p.outros.length > 0 && (
                      <p className="ai-legenda">“Outro”: {p.outros.join(" · ")}</p>
                    )}
                  </details>
                ))}
              </div>
            )}
          </Card>
        )}

        {analise && (
          <div className="ai-resumo">
            <span>
              <strong>{analise.rodadas}</strong> {analise.rodadas === 1 ? "rodada" : "rodadas"}
            </span>
            <span>
              <strong>{analise.itens.filter((it) => it.alertas.some((a) => a !== "amostra-pequena")).length}</strong>{" "}
              questões com alerta
            </span>
            <span>
              <strong>{analise.formasDesiguais.length}</strong> variantes desiguais
            </span>
          </div>
        )}

        <div style={{ display: "flex", flexWrap: "wrap", gap: 8, margin: "18px 0" }}>
          {TIPOS.map((t) => (
            <Chip key={t.id} selected={tipo === t.id} onClick={() => setTipo(t.id)}>
              {t.rotulo}
            </Chip>
          ))}
          <Chip selected={soAlertas} onClick={() => setSoAlertas((v) => !v)}>
            Só com alerta
          </Chip>
        </div>

        {analise?.formasDesiguais.length > 0 && (
          <Card style={{ marginBottom: 18 }}>
            <h2 className="ai-titulo">Variantes com dificuldade diferente</h2>
            <p className="ai-legenda">
              Formas da mesma questão deveriam ter taxa de acerto parecida. Com diferença acima de 15
              pontos, refazer o nivelamento muda a dificuldade.
            </p>
            <ul className="ai-lista-simples">
              {analise.formasDesiguais.map((d) => (
                <li key={d.slot}>
                  <code>{d.slot}</code>: {d.formas.map((f) => `${f.id} ${pct(f.p)} (n=${f.n})`).join(" · ")}
                </li>
              ))}
            </ul>
          </Card>
        )}

        {simulacao && (
          <Card style={{ marginBottom: 18 }} data-simulacao>
            <h2 className="ai-titulo">Teste adaptativo (simulação, não está ligado)</h2>
            <p className="ai-legenda">
              Regra: pular as questões de uma competência quando um pré-requisito dela, pelo grafo da
              trilha, ficou abaixo de 40. Simulada sobre as rodadas completas: quanto encurtaria o teste
              e quantas vezes esconderia alguém que ia bem na competência pulada.
            </p>
            <dl className="ai-metricas">
              <div><dt>Rodadas completas</dt><dd>{simulacao.rodadasCompletas}</dd></div>
              <div><dt>Com pulo</dt><dd>{simulacao.rodadasComPulo}</dd></div>
              <div><dt>Questões poupadas</dt><dd>{simulacao.questoesPoupadas.toFixed(1)}</dd></div>
              <div><dt>Esconde ≥ 40</dt><dd>{pct(simulacao.escondidoRevisao)}</dd></div>
              <div><dt>Esconde ≥ 75</dt><dd>{pct(simulacao.escondidoCandidata)}</dd></div>
            </dl>
            <p className="ai-legenda" style={{ marginTop: 10 }}>
              {VEREDITO[simulacao.veredito]} Limites: até {pct(ESCONDIDO_CANDIDATA_MAX)} dos pulos
              escondendo candidata à dispensa e {pct(ESCONDIDO_REVISAO_MAX)} escondendo nota de
              revisão.
            </p>
          </Card>
        )}

        {rodadas === null ? (
          <p className="ai-legenda">Carregando rodadas…</p>
        ) : grupos.length === 0 ? (
          <EmptyState
            title="Nada para mostrar"
            text={soAlertas ? "Nenhuma questão deste tipo com alerta." : "Ainda não há rodadas com questões deste tipo."}
          />
        ) : (
          grupos.map((g) => (
            <section key={g.id} style={{ marginBottom: 26 }}>
              <h2 className="ai-titulo" style={{ marginBottom: 10 }}>{g.nome}</h2>
              <div style={{ display: "grid", gap: 10 }}>
                {g.itens.map((it) => (
                  <ItemAnalise key={it.id} item={it} />
                ))}
              </div>
            </section>
          ))
        )}

        <Card style={{ marginTop: 10 }}>
          <h2 className="ai-titulo">Como ler</h2>
          <ul className="ai-lista-simples">
            <li><strong>Acerto</strong>: fração de quem acertou. Acima de {pct(P_FACIL)} é fácil demais; abaixo de {pct(P_DIFICIL)}, difícil demais.</li>
            <li><strong>Peso sugerido</strong>: acerto ≥ 70% → 1; ≥ 40% → 2; abaixo → 3.</li>
            <li><strong>r<sub>pb</sub></strong>: correlação entre acertar a questão e acertar o resto da etapa 1. Abaixo de {RPB_MINIMO} a questão discrimina pouco; negativa sugere gabarito errado ou enunciado ambíguo. Só vira alerta com {N_CORRELACAO}+ respostas, porque o erro padrão é ~1/√n.</li>
            <li>Com menos de {N_MINIMO} respostas, nenhum número é confiável o bastante para alertar.</li>
          </ul>
        </Card>
      </div>
    </div>
  );
}

function ItemAnalise({ item }) {
  const forma = FORMAS.get(item.id);
  const total = item.nComEscolha;
  return (
    <div className="ai-item" data-item={item.id}>
      <div className="ai-item__cabecalho">
        <code className="ai-item__id">{item.id}</code>
        {item.aposentada && <span className="lg-chip lg-chip--static">aposentada</span>}
        <span className="ai-item__pergunta" title={forma?.pergunta}>{forma?.pergunta}</span>
      </div>
      <dl className="ai-metricas">
        <div><dt>Peso</dt><dd>{item.dificuldade}{item.pesoSugerido !== null && item.pesoSugerido !== item.dificuldade ? ` → ${item.pesoSugerido}` : ""}</dd></div>
        <div><dt>n</dt><dd>{item.n}</dd></div>
        <div><dt>Acerto</dt><dd>{pct(item.p)}</dd></div>
        <div><dt>Não sei</dt><dd>{pct(item.taxaNaoSei)}</dd></div>
        <div><dt>r<sub>pb</sub></dt><dd>{item.rpb === null ? "—" : item.rpb.toFixed(2)}</dd></div>
      </dl>
      {item.alertas.length > 0 && (
        <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginTop: 8 }}>
          {item.alertas.map((a) => (
            <span key={a} className="ai-alerta" style={{ color: COR_ALERTA[a] ?? "var(--warning)" }}>
              {ROTULO_ALERTA[a]}
            </span>
          ))}
        </div>
      )}
      {forma && (
        <details style={{ marginTop: 8 }}>
          <summary className="ai-legenda" style={{ cursor: "pointer" }}>
            Alternativas {total > 0 ? `(${total} com a escolha registrada)` : "(escolha não registrada)"}
          </summary>
          <ul className="ai-alternativas">
            {forma.opcoes.map((o, i) => {
              const v = item.escolhas[i] ?? 0;
              const fracao = total ? v / total : 0;
              return (
                <li key={i}>
                  <span className="ai-alternativas__texto">
                    {i === forma.correta && <Check size={12} aria-label="correta" style={{ color: "var(--success)", marginRight: 4 }} />}
                    {o.texto}
                    {o.equivoco && <span className="ai-alternativas__equivoco">{o.equivoco}</span>}
                  </span>
                  <span className="ai-alternativas__barra" aria-hidden>
                    <span style={{ width: `${Math.round(fracao * 100)}%` }} />
                  </span>
                  <span className="ai-alternativas__valor">{total ? `${v} · ${pct(fracao)}` : "—"}</span>
                </li>
              );
            })}
          </ul>
        </details>
      )}
    </div>
  );
}
