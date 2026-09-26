/**
 * Resíduo do nivelamento v1 — SÓ os tipos necessários pra ler resultados
 * antigos do localStorage e convertê-los pro v2 (ver migrarV1ParaV2 em
 * lib/pretest-storage.ts).
 *
 * O motor v1 (scoreAnswers/levelsOf/selectProfile), os 4 perfis-arquétipo
 * (lib/profiles.ts + content/score-to-nodes.json) e o banco de 12 questões
 * (content/pretest.json) foram removidos: quem pontua agora é
 * lib/nivelamento.ts sobre content/nivelamento.json.
 *
 * Este arquivo some quando não houver mais navegador com a chave
 * `ligia-pretest:result:v1` — ou seja, depois de um ciclo de uso.
 */

/** Eixos do v1. O v2 usa 5 competências, não 3 eixos — ver lib/competencias.ts. */
export type Eixo = "matematica" | "ml_classico" | "dl_pratico";

export const EIXOS: Eixo[] = ["matematica", "ml_classico", "dl_pratico"];

/** Faixa de nível do v1 (o v2 usa score contínuo 0–100 + confiança). */
export type Nivel = "baixo" | "medio" | "alto";

export type EixoScores = Record<Eixo, number>;
export type EixoNiveis = Record<Eixo, Nivel>;
