import { describe, it, expect } from "vitest";
import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";

const STYLES = join(process.cwd(), "src/styles");
/** Remove comentários: eles citam as regras ANTIGAS de propósito, e uma
 *  asserção ingênua casaria com a explicação em vez do CSS vigente. */
const semComentarios = (css: string) => css.replace(/\/\*[\s\S]*?\*\//g, "");
const read = (f: string) => semComentarios(readFileSync(join(STYLES, f), "utf8"));

describe("shell.css — regressões que já custaram caro", () => {
  const shell = read("shell.css");

  it("define o estado ativo da navegação", () => {
    // Estas classes eram aplicadas no JSX sem nenhuma regra CSS: o item
    // ativo da sidebar era visualmente idêntico aos demais.
    expect(shell).toMatch(/\.nav-item\.active\s*\{/);
    expect(shell).toMatch(/\.nav-item:hover\s*\{/);
    expect(shell).toMatch(/\.nav-item:focus-visible\s*\{/);
  });

  it("abre o drawer mobile por classe, não por transform inline", () => {
    expect(shell).toMatch(/\.sidebar\.is-open\s*\{\s*transform:\s*translateX\(0\)/);
  });

  it("desloca o conteúdo por padding, não por coluna de grid", () => {
    // A sidebar é `position: fixed` e portanto NÃO ocupa a coluna que o grid
    // reservava — quem a ocupava era o primeiro filho em fluxo da página.
    // Nas páginas existentes isso espremia o <header> sticky em 244px,
    // escondido atrás da própria sidebar; numa página com wrapper único, o
    // conteúdo INTEIRO ia para lá.
    const regra = shell.match(/\.app-shell\s*\{[^}]*\}/)?.[0] ?? "";
    expect(regra).toContain("padding-left: var(--sidebar-width)");
    expect(regra).not.toContain("grid-template-columns");
  });

  it("não usa !important no transform da sidebar", () => {
    // A regra original era `transform: translateX(-100%) !important`, que
    // vencia o translateX(0) inline aplicado ao abrir — o hambúrguer pintava
    // o overlay e a sidebar nunca entrava.
    const regra = shell.match(/\.sidebar\s*\{[^}]*\}/g)?.join("") ?? "";
    expect(regra).not.toContain("!important");
    expect(shell).not.toMatch(/transform:[^;]*!important/);
  });
});

describe("aprender.css — regressões", () => {
  it("o rodapé fixo do nivelamento não pinta fundo por cima do gradiente do body", () => {
    const regra = read("aprender.css").match(/\.nv-rodape\s*\{[^}]*\}/)?.[0] ?? "";
    expect(regra).toContain("background: transparent");
    expect(regra).toContain("backdrop-filter");
  });
});

describe("tokens.css — contrato de marca (style.md)", () => {
  const tokens = read("tokens.css");

  it("usa os hex oficiais exatos da marca", () => {
    expect(tokens).toContain("--ligia-orange-1: #FF4B1F");
    expect(tokens).toContain("--ligia-orange-2: #FF9068");
  });

  it("mantém Space Grotesk em títulos e Sora em texto", () => {
    expect(tokens).toMatch(/--font-heading:\s*'Space Grotesk'/);
    expect(tokens).toMatch(/--font-body:\s*'Sora'/);
  });

  it("não reintroduz as cores de módulo saturadas da plataforma antiga", () => {
    // style.md §4.2 proíbe inventar acentos que compitam com o laranja.
    for (const proibido of ["#8b5cf6", "#2563eb", "#0891b2", "#059669", "#d97706", "#dc2626"]) {
      expect(tokens.toLowerCase()).not.toContain(proibido);
    }
  });

  it("define os seis módulos da trilha", () => {
    for (let i = 0; i <= 5; i++) expect(tokens).toMatch(new RegExp(`--m${i}:`));
  });
});

describe("index.css é só a composição", () => {
  it("não carrega regra própria", () => {
    const index = readFileSync(join(process.cwd(), "src/index.css"), "utf8");
    const semComentarios = index.replace(/\/\*[\s\S]*?\*\//g, "").trim();
    const linhas = semComentarios.split("\n").map((l: string) => l.trim()).filter(Boolean);
    expect(linhas.every((l: string) => l.startsWith("@import"))).toBe(true);
  });

  it("importa todo arquivo de src/styles", () => {
    const index = readFileSync(join(process.cwd(), "src/index.css"), "utf8");
    for (const arquivo of readdirSync(STYLES).filter((f: string) => f.endsWith(".css"))) {
      expect(index).toContain(`./styles/${arquivo}`);
    }
  });
});
