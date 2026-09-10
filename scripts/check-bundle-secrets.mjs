#!/usr/bin/env node
/**
 * Prova final do invariante do `contexto`: varre o bundle JÁ CONSTRUÍDO
 * procurando trechos do material de fundamentação dos loops.
 *
 * Os testes de unidade checam o artefato gerado; este checa o que de fato
 * vai para o browser. É a diferença entre "o arquivo público está limpo" e
 * "nada no dist contém o gabarito" — só o segundo é a garantia real, porque
 * pega também um import direto de content/loops/ feito por engano.
 *
 * Uso: npm run build && node scripts/check-bundle-secrets.mjs
 */
import { readFileSync, readdirSync, existsSync, statSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const raiz = join(dirname(fileURLToPath(import.meta.url)), "..");
const DIST = join(raiz, "dist");
const DIR_LOOPS = join(raiz, "content", "loops");

/** Comprimento da sentinela. Longo o bastante para não colidir por acaso. */
const SENTINELA = 60;

function arquivosDe(dir) {
  const saida = [];
  for (const entrada of readdirSync(dir)) {
    const caminho = join(dir, entrada);
    if (statSync(caminho).isDirectory()) saida.push(...arquivosDe(caminho));
    else saida.push(caminho);
  }
  return saida;
}

function main() {
  if (!existsSync(DIST)) {
    console.error("dist/ não existe — rode `npm run build` antes.");
    process.exit(1);
  }

  const sentinelas = readdirSync(DIR_LOOPS)
    .filter((f) => f.endsWith(".json"))
    .map((f) => JSON.parse(readFileSync(join(DIR_LOOPS, f), "utf8")))
    .filter((l) => typeof l.contexto === "string" && l.contexto.length >= SENTINELA)
    .map((l) => ({ conceptId: l.conceptId, trecho: l.contexto.slice(0, SENTINELA) }));

  if (sentinelas.length === 0) {
    console.error("nenhum contexto encontrado em content/loops — verificação inútil, algo está errado.");
    process.exit(1);
  }

  const alvos = arquivosDe(DIST).filter((f) => /\.(js|css|html|json|map)$/.test(f));
  const vazamentos = [];

  for (const arquivo of alvos) {
    const conteudo = readFileSync(arquivo, "utf8");
    for (const { conceptId, trecho } of sentinelas) {
      // O bundler escapa aspas e quebras de linha ao embutir strings, então
      // compara também a forma escapada — senão um vazamento real passaria.
      const escapado = JSON.stringify(trecho).slice(1, -1);
      if (conteudo.includes(trecho) || conteudo.includes(escapado)) {
        vazamentos.push({ arquivo: arquivo.replace(`${raiz}/`, ""), conceptId });
      }
    }
  }

  if (vazamentos.length > 0) {
    console.error(`\nVAZAMENTO DE GABARITO — ${vazamentos.length} ocorrência(s) no bundle:\n`);
    for (const v of vazamentos) console.error(`  ${v.arquivo}  <-  contexto de "${v.conceptId}"`);
    console.error("\nAlgum import está alcançando content/loops/ direto em vez do artefato público.");
    process.exit(1);
  }

  console.log(`bundle limpo — ${sentinelas.length} contextos conferidos em ${alvos.length} arquivos do dist.`);
}

main();
