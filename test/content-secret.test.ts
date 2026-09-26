import { describe, it, expect } from "vitest";
import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import publicos from "../src/content/generated/loops.public.json";
import completos from "../supabase/functions/_shared/generated/loops.full.json";

/**
 * O invariante mais importante do conteúdo: `contexto` é o material de
 * fundamentação do avaliador LLM e contém respostas de referência. Na
 * plataforma Next.js ele era removido no servidor a cada request; aqui a
 * separação é feita em build por scripts/build-content.mjs.
 *
 * Estes testes cobrem o ARTEFATO. A prova de que nada disso chega ao browser
 * é scripts/check-bundle-secrets.mjs, que varre o dist depois do build.
 */
const DIR_LOOPS = join(process.cwd(), "content", "loops");

const fontes = readdirSync(DIR_LOOPS)
  .filter((f) => f.endsWith(".json"))
  .map((f) => JSON.parse(readFileSync(join(DIR_LOOPS, f), "utf8")));

describe("artefato público dos loops", () => {
  it("cobre todos os loops da fonte", () => {
    expect(publicos).toHaveLength(fontes.length);
    expect(publicos.map((l) => l.conceptId).sort()).toEqual(fontes.map((l) => l.conceptId).sort());
  });

  it("nenhum objeto carrega a chave contexto", () => {
    for (const loop of publicos) {
      expect(Object.keys(loop)).not.toContain("contexto");
    }
  });

  it("nenhum trecho de contexto sobrevive em lugar nenhum do artefato", () => {
    // Checagem por conteúdo, não por chave: pega o caso em que o texto foi
    // copiado para outro campo em vez de removido.
    const serializado = JSON.stringify(publicos);
    for (const fonte of fontes) {
      if (typeof fonte.contexto !== "string" || fonte.contexto.length < 60) continue;
      expect(serializado).not.toContain(fonte.contexto.slice(0, 60));
    }
  });

  it("preserva orientacao, checagens e ponteiros", () => {
    // O gerador remove `contexto` de uma CÓPIA, em vez de escolher campos a
    // manter — assim um campo novo no schema não some por esquecimento.
    for (const fonte of fontes) {
      const publico = publicos.find((l) => l.conceptId === fonte.conceptId);
      expect(publico).toBeDefined();
      expect(publico!.orientacao).toBe(fonte.orientacao);
      expect(publico!.checagens).toEqual(fonte.checagens);
      expect(publico!.ponteiros ?? []).toEqual(fonte.ponteiros ?? []);
    }
  });
});

describe("artefato do servidor", () => {
  it("mantém o contexto — é ele que fundamenta a correção", () => {
    const comContexto = completos.filter(
      (l: { contexto?: string }) => typeof l.contexto === "string" && l.contexto.length > 0,
    );
    expect(comContexto.length).toBeGreaterThan(0);
    expect(comContexto).toHaveLength(fontes.filter((f) => f.contexto).length);
  });

  it("é idêntico à fonte", () => {
    expect(completos).toHaveLength(fontes.length);
    for (const fonte of fontes) {
      const completo = completos.find((l: { conceptId: string }) => l.conceptId === fonte.conceptId);
      expect(completo).toEqual(fonte);
    }
  });
});

describe("os artefatos estão em sincronia com a fonte", () => {
  it("regenerar não muda nada — o commitado é o gerado", () => {
    // Se este teste falhar, alguém editou content/ sem rodar `npm run content`,
    // e o que está versionado não corresponde mais à fonte.
    const esperado = fontes
      .slice()
      .sort((a, b) => a.conceptId.localeCompare(b.conceptId))
      .map(({ contexto: _c, ...resto }) => resto);
    const atual = publicos.slice().sort((a, b) => a.conceptId.localeCompare(b.conceptId));
    expect(atual).toEqual(esperado);
  });
});
