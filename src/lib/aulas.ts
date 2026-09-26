import { z } from "zod";
import geradas from "@/content/generated/aulas.json";

/**
 * Camada de conteúdo das aulas.
 *
 * A fonte segue sendo content/aulas/<slug>.md, versionada em Git. O que
 * mudou ao sair do Next.js: não há mais servidor para ler o disco por
 * request, então `scripts/build-content.mjs` parseia o frontmatter em tempo
 * de build e emite src/content/generated/aulas.json. Aqui só validamos e
 * indexamos — nenhum acesso a filesystem, nenhum gray-matter no bundle.
 */
export const AulaFrontmatterSchema = z.object({
  aula: z.union([z.string(), z.number()]).optional(),
  titulo: z.string().min(1),
  autor: z.string().optional(),
  linkedin: z.string().optional(),
  area: z.string().optional(),
  youtube: z.string().optional(),
  duracao_min: z.number().optional(),
  conceitos_cobertos: z.array(z.string()).default([]),
  publicado_em: z.union([z.string(), z.date()]).optional(),
  colab: z.string().optional(),
  slides: z.string().optional(),
});

export type AulaFrontmatter = z.infer<typeof AulaFrontmatterSchema>;
export type Aula = { slug: string; frontmatter: AulaFrontmatter; content: string };

const AulaGeradaSchema = z.object({
  slug: z.string().min(1),
  frontmatter: AulaFrontmatterSchema,
  body: z.string(),
});

/**
 * Valida o artefato gerado uma vez, na carga do módulo. Falha aqui é falha
 * de build de conteúdo e deve estourar cedo, não virar tela quebrada.
 */
const AULAS: Aula[] = z
  .array(AulaGeradaSchema)
  .parse(geradas)
  .map((a) => ({ slug: a.slug, frontmatter: a.frontmatter, content: a.body }));

const PORSLUG = new Map(AULAS.map((a) => [a.slug, a]));

export function getAulaSlugs(): string[] {
  return AULAS.map((a) => a.slug);
}

export function getAula(slug: string): Aula | null {
  return PORSLUG.get(slug) ?? null;
}

export function getAllAulas(): Aula[] {
  return AULAS;
}

/** Mapa conceptId → slug da aula que o cobre (primeira a listar o id). */
export function conceptToAulaMap(): Record<string, string> {
  const map: Record<string, string> = {};
  for (const a of AULAS) {
    for (const cid of a.frontmatter.conceitos_cobertos) {
      if (!map[cid]) map[cid] = a.slug;
    }
  }
  return map;
}

/** Extrai o id de 11 chars de uma URL do YouTube (watch/embed/youtu.be/shorts). */
export function youtubeId(url?: string): string | null {
  if (!url) return null;
  const m = url.match(/(?:youtu\.be\/|[?&]v=|embed\/|shorts\/)([\w-]{11})/);
  return m ? m[1] : null;
}
