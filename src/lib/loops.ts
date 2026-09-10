import { z } from "zod";
import type { ConceptsFile } from "@/lib/content";
import publicos from "@/content/generated/loops.public.json";

/**
 * Contrato do conteúdo do loop "Praticar".
 *
 * A fonte é content/loops/<conceptId>.json, versionada em Git e COMPLETA —
 * inclusive o campo `contexto`, que é o material de fundamentação do
 * avaliador LLM e contém respostas de referência.
 *
 * Este módulo é de CLIENTE e importa apenas o artefato público, gerado sem
 * `contexto` por scripts/build-content.mjs. O tipo abaixo reflete isso: não
 * existe `contexto` em LoopContent. Quem precisa dele é a Edge Function, que
 * lê loops.full.json de supabase/functions/_shared/generated/.
 *
 * `rubrica` continua indo ao cliente de propósito: é o que permite a
 * auto-avaliação quando o LLM está fora do ar ou o aluno estourou a cota.
 */
const KEBAB = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

export const LoopCheckSchema = z.object({
  pergunta: z.string().min(1),
  rubrica: z.string().min(1),
  dica: z.string().optional(),
});

export const LoopContentSchema = z.object({
  conceptId: z.string().regex(KEBAB, "conceptId deve ser kebab-case"),
  orientacao: z.string().min(1),
  checagens: z.array(LoopCheckSchema).min(1),
  ponteiros: z.array(z.string()).default([]),
});

export type LoopCheck = z.infer<typeof LoopCheckSchema>;
export type LoopContent = z.infer<typeof LoopContentSchema>;

/** Parse + valida o shape. Lança ZodError com mensagens úteis se inválido. */
export function parseLoopContent(raw: unknown): LoopContent {
  return LoopContentSchema.parse(raw);
}

/** Integridade além do shape: conceptId aponta pra um conceito real. Erros = []. */
export function checkLoopIntegrity(loop: LoopContent, concepts: ConceptsFile): string[] {
  const ids = new Set(concepts.concepts.map((c) => c.id));
  const errors: string[] = [];
  if (!ids.has(loop.conceptId)) {
    errors.push(`loop: conceptId inexistente "${loop.conceptId}"`);
  }
  return errors;
}

const LOOPS: LoopContent[] = z.array(LoopContentSchema).parse(publicos);
const PORCONCEITO = new Map(LOOPS.map((l) => [l.conceptId, l]));

/** Lista os conceptIds que têm loop. */
export function getLoopConceptIds(): string[] {
  return LOOPS.map((l) => l.conceptId);
}

/** Carrega um loop pelo conceito. null se não existe. */
export function getLoop(conceptId: string): LoopContent | null {
  return PORCONCEITO.get(conceptId) ?? null;
}

export function getAllLoops(): LoopContent[] {
  return LOOPS;
}
