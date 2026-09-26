/**
 * O contrato do avaliador, nos dois lados.
 *
 * A Edge Function devolve texto em streaming cuja PRIMEIRA LINHA é o veredito
 * e o resto é o feedback em markdown. Este módulo define esse formato e sabe
 * lê-lo — por isso é importado tanto pela função (que o produz) quanto pelo
 * cliente (que o consome).
 *
 * Regra de direção das dependências: supabase/functions/_shared NUNCA importa
 * de src/ — o bundle do Deno só enxerga o que está dentro de
 * supabase/functions/, então um import assim quebraria o deploy. O caminho
 * inverso é livre.
 */
export type Verdict = "acertei" | "parcial" | "errei";

export type GradingResult = { veredito: Verdict; feedback: string; matched: boolean };

/**
 * Lê o veredito da 1ª linha e o feedback do resto.
 *
 * `matched` diz se uma das três palavras foi de fato reconhecida. Quando é
 * false, o chamador DEVE tratar como falha e cair na auto-avaliação — assumir
 * 'parcial' em silêncio seria um veredito fantasma, e ele contaminaria o
 * agendamento de revisão e a matriz de competências.
 */
export function parseGrading(text: string): GradingResult {
  const nl = text.indexOf("\n");
  const head = (nl === -1 ? text : text.slice(0, nl)).toLowerCase();
  const acertou = /\bacertei\b/.test(head);
  const errou = /\berrei\b/.test(head);
  const parcial = /\bparcial\b/.test(head);
  const veredito: Verdict = acertou ? "acertei" : errou ? "errei" : "parcial";
  const feedback = (nl === -1 ? "" : text.slice(nl + 1)).trim();
  return { veredito, feedback, matched: acertou || errou || parcial };
}
