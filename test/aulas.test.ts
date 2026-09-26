import { describe, it, expect } from "vitest";
import rawConcepts from "@/content/concepts.json";
import { parseConcepts } from "@/lib/content";
import { getAllAulas, conceptToAulaMap, youtubeId } from "@/lib/aulas";

const conceptIds = new Set(parseConcepts(rawConcepts).concepts.map((c) => c.id));
const aulas = getAllAulas();

describe("aulas (conteúdo Git)", () => {
  it("tem ao menos uma aula seed", () => {
    expect(aulas.length).toBeGreaterThan(0);
  });

  it("toda aula tem título e frontmatter válido", () => {
    for (const a of aulas) expect(a.frontmatter.titulo).toBeTruthy();
  });

  it("conceitos_cobertos referenciam conceitos reais", () => {
    for (const a of aulas) {
      for (const cid of a.frontmatter.conceitos_cobertos) {
        expect(conceptIds.has(cid), `${a.slug} → ${cid}`).toBe(true);
      }
    }
  });

  it("youtube (quando presente) é uma URL do YouTube", () => {
    for (const a of aulas) {
      if (a.frontmatter.youtube) {
        expect(a.frontmatter.youtube).toMatch(/youtu\.?be|youtube\.com/);
      }
    }
  });

  it("conceptToAulaMap só aponta pra conceitos reais", () => {
    for (const cid of Object.keys(conceptToAulaMap())) {
      expect(conceptIds.has(cid)).toBe(true);
    }
  });
});

describe("youtubeId", () => {
  it("extrai o id das formas comuns de URL", () => {
    expect(youtubeId("https://www.youtube.com/watch?v=fNk_zzaMoSs")).toBe("fNk_zzaMoSs");
    expect(youtubeId("https://youtu.be/fNk_zzaMoSs")).toBe("fNk_zzaMoSs");
    expect(youtubeId("https://www.youtube.com/embed/fNk_zzaMoSs")).toBe("fNk_zzaMoSs");
  });
  it("retorna null p/ link de canal ou vazio", () => {
    expect(youtubeId("https://www.youtube.com/@3blue1brown")).toBeNull();
    expect(youtubeId(undefined)).toBeNull();
  });
});
