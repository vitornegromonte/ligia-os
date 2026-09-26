import type { LLMMessage } from "./llm/types.ts";
export type { GradingResult } from "./verdict.ts";

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

// O parser do formato mora em verdict.ts: ele é a metade CLIENTE do
// contrato, e o cliente não pode importar este arquivo (que carrega o prompt).
export { parseGrading } from "./verdict.ts";
