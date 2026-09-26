import { z } from "zod";
import type { ConceptsFile } from "@/lib/content";
import rawPraticas from "@/content/praticas.json";
import rawTasks from "@/content/generated/torch-tasks.index.json";

/**
 * Ponte entre a trilha e o catálogo de código do ligia-os.
 *
 * Cada conceito aponta para zero ou mais tarefas Torch. O mapeamento vive em
 * content/praticas.json, separado de concepts.json porque referencia um
 * catálogo de propriedade conjunta, que muda em outra cadência.
 *
 * A validação é fail-fast como a de lib/content.ts: um slug renomeado no
 * catálogo quebra o build em vez de virar um card morto na lição.
 */
const DIFICULDADES = ["Easy", "Medium", "Hard"] as const;
export type Dificuldade = (typeof DIFICULDADES)[number];

/** Ordem didática: o aluno encontra `attention` antes de `flash_attention`. */
const PESO_DIFICULDADE: Record<Dificuldade, number> = { Easy: 0, Medium: 1, Hard: 2 };

export const TaskIndexSchema = z.object({
  version: z.string(),
  tasks: z.array(
    z.object({
      slug: z.string().min(1),
      title: z.string().min(1),
      difficulty: z.enum(DIFICULDADES),
    }),
  ),
});

export const PraticasSchema = z.object({
  version: z.string(),
  mapeamento: z.record(
    z.string(),
    z.object({ tasks: z.array(z.string()).default([]), nota: z.string().optional() }),
  ),
});

export type TaskIndex = z.infer<typeof TaskIndexSchema>;
export type TarefaCodigo = TaskIndex["tasks"][number];
export type PraticasFile = z.infer<typeof PraticasSchema>;

const CATALOGO: TaskIndex = TaskIndexSchema.parse(rawTasks);
const PRATICAS: PraticasFile = PraticasSchema.parse(rawPraticas);

const PORSLUG = new Map(CATALOGO.tasks.map((t) => [t.slug, t]));

/**
 * Integridade além do shape. Devolve lista de erros (vazia = ok).
 * Conceitos sem tarefa e tarefas sem conceito NÃO são erro — são informação,
 * exposta por `lacunas()`.
 */
export function checkPraticasIntegrity(
  praticas: PraticasFile,
  concepts: ConceptsFile,
  catalogo: TaskIndex = CATALOGO,
): string[] {
  const erros: string[] = [];
  const idsConceito = new Set(concepts.concepts.map((c) => c.id));
  const slugs = new Set(catalogo.tasks.map((t) => t.slug));

  for (const [conceptId, entrada] of Object.entries(praticas.mapeamento)) {
    if (!idsConceito.has(conceptId)) {
      erros.push(`praticas: conceito inexistente "${conceptId}"`);
    }
    const vistos = new Set<string>();
    for (const slug of entrada.tasks) {
      if (!slugs.has(slug)) {
        erros.push(`praticas: task inexistente "${slug}" em "${conceptId}"`);
      }
      if (vistos.has(slug)) {
        erros.push(`praticas: task duplicada "${slug}" em "${conceptId}"`);
      }
      vistos.add(slug);
    }
  }

  for (const c of concepts.concepts) {
    if (!(c.id in praticas.mapeamento)) {
      // Ausência é diferente de lista vazia: uma diz "ninguém decidiu", a
      // outra diz "decidimos que não há". Só a primeira é erro.
      erros.push(`praticas: conceito "${c.id}" não foi mapeado (use tasks: [] se for proposital)`);
    }
  }

  return erros;
}

/** Diagnóstico, não erro: onde a cobertura de prática de código não chega. */
export function lacunas(
  praticas: PraticasFile = PRATICAS,
  catalogo: TaskIndex = CATALOGO,
): { conceitosSemCodigo: string[]; tasksSemConceito: string[] } {
  const usados = new Set(Object.values(praticas.mapeamento).flatMap((e) => e.tasks));
  return {
    conceitosSemCodigo: Object.entries(praticas.mapeamento)
      .filter(([, e]) => e.tasks.length === 0)
      .map(([id]) => id),
    tasksSemConceito: catalogo.tasks.map((t) => t.slug).filter((s) => !usados.has(s)),
  };
}

/**
 * Tarefas de um conceito, ordenadas por dificuldade crescente.
 *
 * Dentro da mesma dificuldade vale a ordem escrita em praticas.json, que é
 * intenção didática: em `multi-head-attention` as sete tarefas são quase
 * todas Hard, e a lista começa em `mha` de propósito. Desempatar por título
 * jogaria `flash_attention` na frente — exatamente o que a ordenação existe
 * para evitar. `Array.prototype.sort` é estável desde ES2019, então basta
 * comparar a dificuldade.
 */
export function tarefasDoConceito(conceptId: string): TarefaCodigo[] {
  const entrada = PRATICAS.mapeamento[conceptId];
  if (!entrada) return [];
  return entrada.tasks
    .map((slug) => PORSLUG.get(slug))
    .filter((t): t is TarefaCodigo => t !== undefined)
    .sort((a, b) => PESO_DIFICULDADE[a.difficulty] - PESO_DIFICULDADE[b.difficulty]);
}

/** Conceitos que praticam uma tarefa — uma task pode servir a mais de um. */
export function conceitosDaTarefa(slug: string): string[] {
  return Object.entries(PRATICAS.mapeamento)
    .filter(([, e]) => e.tasks.includes(slug))
    .map(([id]) => id);
}

export function notaDoConceito(conceptId: string): string | undefined {
  return PRATICAS.mapeamento[conceptId]?.nota;
}

export function catalogoDeTarefas(): TarefaCodigo[] {
  return CATALOGO.tasks;
}

export function getPraticas(): PraticasFile {
  return PRATICAS;
}
