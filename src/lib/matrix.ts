/**
 * Matriz de avaliação de membros (F.2) — lógica pura da nota composta.
 *
 * Calcula uma nota `S` (0–100) por membro/período a partir de 5 dimensões
 * ponderadas e deriva o nível (iniciante/intermediário/avançado). Fonte da
 * verdade: pesquisa/briefing-plataforma-futura.md e plano-plataforma-v1.md.
 *
 * Sem DOM, sem DB, sem I/O — só o cálculo. O estado (scores por dimensão)
 * vem de Supabase (tabela `matrix_components`) numa fase posterior; aqui só
 * a fórmula, alvo principal de testes. As RUBRICAS que produzem o score de
 * cada projeto (dimensão `projetos`) dependem de calibração com a diretoria
 * e não moram aqui — este módulo consome o número já pronto.
 */

export type MatrixDimension = "aulas" | "projetos" | "agora" | "auto" | "peer";

/** Ordem canônica das dimensões (também a ordem de exibição no radar). */
export const MATRIX_DIMENSIONS: MatrixDimension[] = [
  "aulas",
  "projetos",
  "agora",
  "auto",
  "peer",
];

/** Pesos do briefing: 30/30/15/10/15. Somam 1. */
export const MATRIX_WEIGHTS: Record<MatrixDimension, number> = {
  aulas: 0.3,
  projetos: 0.3,
  agora: 0.15,
  auto: 0.1,
  peer: 0.15,
};

/** Rótulo legível de cada dimensão (eixos do radar). */
export const DIMENSION_META: Record<MatrixDimension, { label: string; comoMedir: string }> = {
  aulas: { label: "Progresso em aulas", comoMedir: "nós 🟢 / nós da trilha do membro" },
  projetos: { label: "Projetos entregues", comoMedir: "média das rubricas por projeto (0–100)" },
  agora: { label: "Participação Ágora", comoMedir: "presença auto-reportada + deu talk no ano?" },
  auto: { label: "Autoavaliação", comoMedir: "Likert trimestral (5 perguntas, 1–5)" },
  peer: { label: "Avaliação peer", comoMedir: "score médio recebido em peer reviews" },
};

/** Score 0–100 por dimensão. */
export type MatrixComponents = Record<MatrixDimension, number>;

export type Nivel = "iniciante" | "intermediario" | "avancado";

/** Thresholds do briefing: <40 iniciante, [40,70) intermediário, ≥70 avançado. */
export const NIVEL_THRESHOLDS = { intermediario: 40, avancado: 70 } as const;

export const NIVEL_META: Record<Nivel, { label: string; gatilho: string }> = {
  iniciante: { label: "Iniciante", gatilho: "mentoria 1-1" },
  intermediario: { label: "Intermediário", gatilho: "sugere ramo de Eixo (Acadêmico/Profissional/Fronteira)" },
  avancado: { label: "Avançado", gatilho: "qualificado pra ser mentor + contribuir conteúdo" },
};

/** Componentes zerados — ponto de partida seguro pra UI e testes. */
export function emptyComponents(): MatrixComponents {
  return { aulas: 0, projetos: 0, agora: 0, auto: 0, peer: 0 };
}

const clamp01to100 = (n: number): number => Math.min(100, Math.max(0, n));

/**
 * Nota composta `S = Σ peso_d · score_d`, com cada score preso a [0,100].
 * Resultado em [0,100].
 */
export function compositeScore(components: MatrixComponents): number {
  return MATRIX_DIMENSIONS.reduce(
    (s, d) => s + MATRIX_WEIGHTS[d] * clamp01to100(components[d]),
    0,
  );
}

/** Nível derivado da nota (limites inclusivos na borda de baixo). */
export function nivelFromScore(s: number): Nivel {
  if (s >= NIVEL_THRESHOLDS.avancado) return "avancado";
  if (s >= NIVEL_THRESHOLDS.intermediario) return "intermediario";
  return "iniciante";
}

export type MatrixSummary = {
  components: MatrixComponents;
  score: number;
  nivel: Nivel;
};

/** Empacota componentes + nota + nível — o que a tela de perfil consome. */
export function summarizeMatrix(components: MatrixComponents): MatrixSummary {
  const score = compositeScore(components);
  return { components, score, nivel: nivelFromScore(score) };
}
