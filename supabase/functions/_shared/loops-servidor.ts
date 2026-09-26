import loopsCompletos from "./generated/loops.full.json" with { type: "json" };

export type ChecagemCompleta = { pergunta: string; rubrica: string; dica?: string };
export type LoopCompleto = {
  conceptId: string;
  orientacao: string;
  /** Fundamentação do avaliador. Contém respostas de referência: NUNCA sai daqui. */
  contexto?: string;
  checagens: ChecagemCompleta[];
  ponteiros?: string[];
};

const PORCONCEITO = new Map<string, LoopCompleto>(
  (loopsCompletos as LoopCompleto[]).map((l) => [l.conceptId, l]),
);

/**
 * Loop COM `contexto`, para uso exclusivo das Edge Functions.
 *
 * O artefato lido aqui é gerado por scripts/build-content.mjs e vive dentro
 * de supabase/functions/, fora de src/ — o cliente não tem como importá-lo.
 */
export function getLoopCompleto(conceptId: string): LoopCompleto | null {
  return PORCONCEITO.get(conceptId) ?? null;
}
