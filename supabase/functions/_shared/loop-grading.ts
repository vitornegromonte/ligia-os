import type { LLMMessage } from "./llm/types.ts";
import type { Verdict } from "./verdict.ts";

export type GradingResult = { veredito: Verdict; feedback: string; matched: boolean };

/**
 * Monta o prompt de avaliação. Formato STREAMÁVEL: 1ª linha = veredito,
 * resto = feedback (markdown). Inclui o CONTEXTO de referência quando houver.
 */
export function buildGradingPrompt(
  pergunta: string,
  rubrica: string,
  resposta: string,
  contexto?: string,
): LLMMessage[] {
  const system =
    "Você é um avaliador pedagógico da trilha de IA da LigIA. Julgue a RESPOSTA do aluno " +
    "comparando-a com a RUBRICA, ancorado no CONTEXTO de referência (não invente fatos além dele). " +
    "Aponte o que faltou de forma específica, em PT-BR, SEM entregar a resposta pronta. " +
    "FORMATO OBRIGATÓRIO: a PRIMEIRA LINHA deve conter APENAS uma destas palavras — acertei, parcial ou errei " +
    "(use 'acertei' se cobre o essencial da rubrica, 'parcial' se cobre em parte, 'errei' se não cobre/está incorreto). " +
    "Da SEGUNDA LINHA em diante, escreva o feedback (1 a 3 frases) em markdown, com $...$ para fórmulas quando útil.";
  const user =
    (contexto ? `CONTEXTO DE REFERÊNCIA (uso interno; não copie cru):\n${contexto}\n\n` : "") +
    `PERGUNTA:\n${pergunta}\n\nRUBRICA:\n${rubrica}\n\nRESPOSTA DO ALUNO:\n${resposta}`;
  return [
    { role: "system", content: system },
    { role: "user", content: user },
  ];
}

/**
 * Lê o veredito da 1ª linha e o feedback do resto. `matched` indica se uma das
 * três palavras-chave foi de fato reconhecida — quando false, o chamador deve
 * tratar como falha de avaliação (cair na autoavaliação honesta), em vez de
 * assumir 'parcial' silenciosamente (que seria um veredito fantasma).
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
