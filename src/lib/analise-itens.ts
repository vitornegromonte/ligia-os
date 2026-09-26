/**
 * Análise de itens do nivelamento pela teoria clássica dos testes (TCT).
 *
 * Os pesos de dificuldade {1,2,2,3} foram arbitrados na escrita das questões.
 * Com rodadas reais dá para conferir: a questão "difícil" é mesmo menos
 * acertada? Ela separa quem vai bem de quem vai mal no resto do teste? Alguma
 * alternativa errada nunca é marcada (e portanto não distrai ninguém)?
 *
 * Pura: recebe o conteúdo e as rodadas, devolve números e alertas. Quem busca
 * as rodadas (todas, via RLS de staff) é a página.
 *
 * Referência dos cortes: p fora de [0,20; 0,90] e ponto-bisserial < 0,20 são
 * as convenções usuais da TCT. O erro padrão de uma correlação é ~1/√N, então
 * o alerta de discriminação só dispara com N ≥ 100 respostas (erro ~0,1).
 */

import type { CompetenciaId } from "./competencias";
import type { ResultadoQuestao } from "./nivelamento";
import { ehQuestaoMCQ, type FormaQuestao, type NivelamentoContent } from "./nivelamento-content";

export type RodadaAnalise = {
  resultados: Record<string, ResultadoQuestao>;
  respostas?: Record<string, number>;
};

/** Abaixo disto, a questão só recebe o alerta de amostra pequena. */
export const N_MINIMO = 30;
/** A partir disto, a correlação é confiável o bastante para alertar (erro padrão ~0,1). */
export const N_CORRELACAO = 100;
export const P_FACIL = 0.9;
export const P_DIFICIL = 0.2;
export const RPB_MINIMO = 0.2;
/** Diferença de taxa de acerto entre formas da mesma questão que indica variantes não equivalentes. */
export const DIFERENCA_FORMAS = 0.15;

export type Alerta =
  | "amostra-pequena"
  | "facil-demais"
  | "dificil-demais"
  | "discrimina-pouco"
  | "gabarito-suspeito"
  | "distrator-morto"
  | "peso-diferente";

export type TipoItem = "etapa1" | "etapa2" | "codigo";

export type EstatisticaItem = {
  id: string;
  slot: string;
  tipo: TipoItem;
  competencia: CompetenciaId | null;
  dificuldade: 1 | 2 | 3;
  aposentada: boolean;
  /** Rodadas em que a questão apareceu. */
  n: number;
  acertos: number;
  naoSei: number;
  /** Taxa de acerto (o "p" da TCT; quanto maior, mais fácil). */
  p: number | null;
  taxaNaoSei: number | null;
  /**
   * Correlação ponto-bisserial entre acertar a questão e o nº de acertos no
   * resto da etapa 1. Negativa: quem vai bem no resto erra esta — sinal de
   * gabarito errado ou enunciado ambíguo.
   */
  rpb: number | null;
  /** Vezes que cada alternativa foi marcada, nas rodadas que guardam a escolha. */
  escolhas: number[];
  nComEscolha: number;
  /** Peso que a taxa de acerto sugere: p ≥ 0,70 → 1; ≥ 0,40 → 2; abaixo → 3. */
  pesoSugerido: 1 | 2 | 3 | null;
  alertas: Alerta[];
};

export type FormasDesiguais = { slot: string; formas: { id: string; n: number; p: number }[] };

export type AnaliseItens = {
  rodadas: number;
  itens: EstatisticaItem[];
  formasDesiguais: FormasDesiguais[];
};

// ---------------------------------------------------------------------------
// "Quem é você" — resumo dos perfis
// ---------------------------------------------------------------------------

export type PerfilParaResumo = {
  autoRelato: Record<string, number[]>;
  textosOutro?: Record<string, string> | null;
};

export type ResumoPergunta = {
  id: string;
  pergunta: string;
  /** Quantas pessoas marcaram cada opção, na ordem do conteúdo. */
  contagens: { texto: string; n: number }[];
  /** Pessoas que marcaram ao menos uma opção nesta pergunta. */
  respondentes: number;
  /** Textos escritos em "Outro". */
  outros: string[];
};

/** Conta as respostas do auto-relato de todos os perfis, por pergunta e opção. */
export function resumirPerfis(
  conteudo: NivelamentoContent,
  perfis: readonly PerfilParaResumo[],
): { pessoas: number; perguntas: ResumoPergunta[] } {
  const perguntas = conteudo.auto_relato.map((p): ResumoPergunta => {
    const contagens = p.opcoes.map((o) => ({ texto: o.texto, n: 0 }));
    let respondentes = 0;
    const outros: string[] = [];
    for (const perfil of perfis) {
      const marcadas = (perfil.autoRelato?.[p.id] ?? []).filter(
        (i) => Number.isInteger(i) && i >= 0 && i < contagens.length,
      );
      if (marcadas.length) respondentes += 1;
      for (const i of new Set(marcadas)) contagens[i].n += 1;
      const texto = perfil.textosOutro?.[p.id]?.trim();
      if (texto) outros.push(texto);
    }
    return { id: p.id, pergunta: p.pergunta, contagens, respondentes, outros };
  });
  return { pessoas: perfis.length, perguntas };
}

function tipoDe(q: FormaQuestao): TipoItem {
  if (!ehQuestaoMCQ(q)) return "codigo";
  return q.etapa === 2 ? "etapa2" : "etapa1";
}

/** Correlação de Pearson; null sem variância em um dos lados ou com menos de 3 pares. */
export function pearson(x: readonly number[], y: readonly number[]): number | null {
  const n = x.length;
  if (n < 3 || n !== y.length) return null;
  const mx = x.reduce((a, b) => a + b, 0) / n;
  const my = y.reduce((a, b) => a + b, 0) / n;
  let sxy = 0;
  let sxx = 0;
  let syy = 0;
  for (let i = 0; i < n; i++) {
    const dx = x[i] - mx;
    const dy = y[i] - my;
    sxy += dx * dy;
    sxx += dx * dx;
    syy += dy * dy;
  }
  if (sxx === 0 || syy === 0) return null;
  return sxy / Math.sqrt(sxx * syy);
}

export function pesoSugerido(p: number): 1 | 2 | 3 {
  if (p >= 0.7) return 1;
  if (p >= 0.4) return 2;
  return 3;
}

export function analisarItens(
  conteudo: NivelamentoContent,
  rodadas: readonly RodadaAnalise[],
): AnaliseItens {
  const formas: FormaQuestao[] = [...conteudo.mcq, ...conteudo.codigo.questoes];
  const etapa1 = new Set(formas.filter((q) => tipoDe(q) === "etapa1").map((q) => q.id));

  // Acertos na etapa 1 por rodada: a medida de "desempenho no resto do teste".
  const acertosEtapa1 = rodadas.map((r) =>
    Object.entries(r.resultados).filter(([id, res]) => etapa1.has(id) && res === "acerto").length,
  );

  const itens = formas.map((q): EstatisticaItem => {
    const tipo = tipoDe(q);
    const acertou: number[] = [];
    const resto: number[] = [];
    let naoSei = 0;
    let nComEscolha = 0;
    const escolhas = q.opcoes.map(() => 0);

    rodadas.forEach((r, i) => {
      const res = r.resultados[q.id];
      if (res === undefined) return;
      const a = res === "acerto" ? 1 : 0;
      acertou.push(a);
      // Questão da etapa 1 sai do próprio total, senão a correlação se infla sozinha.
      resto.push(acertosEtapa1[i] - (tipo === "etapa1" ? a : 0));
      if (res === "nao-sei") naoSei += 1;
      const escolha = r.respostas?.[q.id];
      if (escolha !== undefined && escolha >= 0 && escolha < escolhas.length) {
        escolhas[escolha] += 1;
        nComEscolha += 1;
      }
    });

    const n = acertou.length;
    const acertos = acertou.reduce((s, v) => s + v, 0);
    const p = n ? acertos / n : null;
    const rpb = pearson(acertou, resto);
    const sugerido = p === null ? null : pesoSugerido(p);

    const alertas: Alerta[] = [];
    if (n < N_MINIMO) {
      alertas.push("amostra-pequena");
    } else {
      if (p! > P_FACIL) alertas.push("facil-demais");
      if (p! < P_DIFICIL) alertas.push("dificil-demais");
      if (sugerido !== q.dificuldade) alertas.push("peso-diferente");
      if (nComEscolha >= N_MINIMO) {
        const morto = q.opcoes.some(
          (o, i) => i !== q.correta && !o.naoSei && escolhas[i] === 0,
        );
        if (morto) alertas.push("distrator-morto");
      }
      if (n >= N_CORRELACAO && rpb !== null) {
        if (rpb < 0) alertas.push("gabarito-suspeito");
        else if (rpb < RPB_MINIMO) alertas.push("discrimina-pouco");
      }
    }

    return {
      id: q.id,
      slot: q.slot,
      tipo,
      competencia: ehQuestaoMCQ(q) ? q.competencia : null,
      dificuldade: q.dificuldade,
      aposentada: q.aposentada,
      n,
      acertos,
      naoSei,
      p,
      taxaNaoSei: n ? naoSei / n : null,
      rpb,
      escolhas,
      nComEscolha,
      pesoSugerido: sugerido,
      alertas,
    };
  });

  // Variantes deveriam ser equivalentes: taxa de acerto muito diferente entre
  // formas da mesma questão quer dizer que refazer muda a dificuldade.
  const porSlot = new Map<string, EstatisticaItem[]>();
  for (const it of itens) porSlot.set(it.slot, [...(porSlot.get(it.slot) ?? []), it]);
  const formasDesiguais: FormasDesiguais[] = [];
  for (const [slot, doSlot] of porSlot) {
    const medidas = doSlot.filter((it) => it.n >= N_MINIMO && it.p !== null);
    if (medidas.length < 2) continue;
    const ps = medidas.map((it) => it.p!);
    if (Math.max(...ps) - Math.min(...ps) > DIFERENCA_FORMAS) {
      formasDesiguais.push({
        slot,
        formas: medidas.map((it) => ({ id: it.id, n: it.n, p: it.p! })),
      });
    }
  }

  return { rodadas: rodadas.length, itens, formasDesiguais };
}
