#!/usr/bin/env node
/**
 * Gera os artefatos de conteúdo a partir de content/.
 *
 * O motivo de existir é o campo `contexto` dos loops: é o material de
 * fundamentação que o LLM usa para corrigir, e contém respostas de
 * referência. Na plataforma Next.js ele era removido no servidor, a cada
 * request. Num SPA não há servidor, então a separação precisa acontecer
 * aqui — e ser verificável.
 *
 *   content/loops/*.json  (completo, fonte única)
 *        ├─> src/content/generated/loops.public.json          SEM contexto
 *        └─> supabase/functions/_shared/generated/loops.full.json  COM contexto
 *
 *   content/aulas/*.md    ├─> src/content/generated/aulas.json
 *
 * Os gerados são commitados: o deploy das Edge Functions precisa do arquivo
 * presente, e versioná-los faz um eventual vazamento aparecer no diff.
 */
import { readFileSync, writeFileSync, readdirSync, mkdirSync } from "node:fs";
import { join, dirname, basename } from "node:path";
import { fileURLToPath } from "node:url";
import matter from "gray-matter";

const raiz = join(dirname(fileURLToPath(import.meta.url)), "..");
const p = (...partes) => join(raiz, ...partes);

const DIR_LOOPS = p("content", "loops");
const DIR_AULAS = p("content", "aulas");
const TORCH_TASKS = p("src", "data", "torch_tasks.json");
const SAIDA_CLIENTE = p("src", "content", "generated");
const SAIDA_SERVIDOR = p("supabase", "functions", "_shared", "generated");

function escrever(caminho, dados) {
  mkdirSync(dirname(caminho), { recursive: true });
  writeFileSync(caminho, `${JSON.stringify(dados, null, 2)}\n`, "utf8");
  return caminho;
}

function lerLoops() {
  return readdirSync(DIR_LOOPS)
    .filter((f) => f.endsWith(".json"))
    .sort()
    .map((f) => {
      const loop = JSON.parse(readFileSync(join(DIR_LOOPS, f), "utf8"));
      const esperado = basename(f, ".json");
      if (loop.conceptId !== esperado) {
        throw new Error(`${f}: conceptId "${loop.conceptId}" não bate com o nome do arquivo`);
      }
      return loop;
    });
}

function lerAulas() {
  return readdirSync(DIR_AULAS)
    .filter((f) => f.endsWith(".md"))
    .sort()
    .map((f) => {
      const { data, content } = matter(readFileSync(join(DIR_AULAS, f), "utf8"));
      return {
        slug: basename(f, ".md"),
        // Datas do frontmatter viram Date no YAML; serializa para ISO
        // estável, senão o JSON gerado muda conforme o fuso da máquina.
        frontmatter: JSON.parse(JSON.stringify(data)),
        body: content,
      };
    });
}

/**
 * Índice enxuto do catálogo Torch. Serve de referência de integridade para
 * src/content/praticas.json: se um slug for renomeado no catálogo, a
 * validação de lib/praticas.ts quebra o build em vez de deixar um card morto
 * na lição.
 */
function indiceDeTarefas() {
  const tasks = JSON.parse(readFileSync(TORCH_TASKS, "utf8"));
  return {
    $schema_note:
      "GERADO de src/data/torch_tasks.json por scripts/build-content.mjs. Não editar à mão.",
    version: "1",
    tasks: tasks
      .map((t) => ({ slug: t.slug, title: t.title, difficulty: t.difficulty }))
      .sort((a, b) => a.slug.localeCompare(b.slug)),
  };
}

function main() {
  const loops = lerLoops();
  const aulas = lerAulas();

  // O artefato público nasce de uma cópia com `contexto` deletado — nunca de
  // um pick de campos, para que um campo novo no schema não seja esquecido
  // aqui e simplesmente sumir do cliente.
  const publicos = loops.map(({ contexto: _contexto, ...resto }) => resto);

  const comContexto = loops.filter((l) => typeof l.contexto === "string" && l.contexto.length > 0);

  const indice = indiceDeTarefas();

  const escritos = [
    escrever(join(SAIDA_CLIENTE, "loops.public.json"), publicos),
    escrever(join(SAIDA_CLIENTE, "aulas.json"), aulas),
    escrever(join(SAIDA_CLIENTE, "torch-tasks.index.json"), indice),
    escrever(join(SAIDA_SERVIDOR, "loops.full.json"), loops),
  ];

  // Trava de sanidade: se `contexto` sobreviveu ao artefato público, o build
  // para aqui em vez de publicar o gabarito.
  const publicoSerializado = JSON.stringify(publicos);
  for (const loop of comContexto) {
    if (publicoSerializado.includes(loop.contexto.slice(0, 60))) {
      throw new Error(`VAZAMENTO: contexto de "${loop.conceptId}" está no artefato público`);
    }
  }

  console.log(
    `conteúdo gerado — ${loops.length} loops (${comContexto.length} com contexto), ` +
      `${aulas.length} aulas, ${indice.tasks.length} tarefas Torch indexadas`,
  );
  for (const c of escritos) console.log(`  ${c.replace(`${raiz}/`, "")}`);
}

main();
