import { useMemo } from "react";
import katex from "katex";
import "katex/dist/katex.min.css";

/**
 * Texto com fórmulas entre `$…$`, renderizadas pelo KaTeX.
 *
 * O KaTeX já era dependência do repositório (o MarkdownViewer usa via
 * rehype-katex), então as fórmulas do nivelamento saem com a mesma cara das
 * dos materiais. A alternativa de escrever "x²" e "dL/dw" no meio da frase
 * lia mal e não dava conta de frações; a de trazer MathJax acrescentaria um
 * segundo renderizador, assíncrono, para o mesmo trabalho.
 *
 * O texto ao redor continua na fonte da interface: só o que está entre `$`
 * troca para a fonte matemática, um pouco maior para casar com a altura das
 * letras ao redor (ver `.lg-mat` em ui.css).
 */
export type Parte = { tipo: "texto" | "mat"; valor: string };

/**
 * Quebra o texto em partes, alternando fora e dentro de `$…$`. `\$` escapa um
 * cifrão literal. `$` sem par fecha ninguém: o resto vira texto comum, porque
 * conteúdo com erro de digitação precisa aparecer, não sumir.
 */
export function partesDeTexto(texto: string): Parte[] {
  const partes: Parte[] = [];
  let atual = "";
  let dentro = false;

  for (let i = 0; i < texto.length; i++) {
    const c = texto[i];
    if (c === "\\" && texto[i + 1] === "$") {
      atual += "$";
      i += 1;
      continue;
    }
    if (c !== "$") {
      atual += c;
      continue;
    }
    if (!dentro) {
      // Abre fórmula só se houver um `$` de fechamento depois.
      const fecha = texto.indexOf("$", i + 1);
      if (fecha === -1) {
        atual += c;
        continue;
      }
      if (atual) partes.push({ tipo: "texto", valor: atual });
      atual = "";
      dentro = true;
      continue;
    }
    partes.push({ tipo: "mat", valor: atual });
    atual = "";
    dentro = false;
  }
  if (atual) partes.push({ tipo: "texto", valor: atual });
  return partes;
}

/** HTML do KaTeX para uma fórmula. Conteúdo é do repositório, não do usuário. */
function renderizar(tex: string): string {
  return katex.renderToString(tex, {
    throwOnError: false,
    // MathML junto do HTML: é o que o leitor de tela anuncia.
    output: "htmlAndMathml",
    strict: "ignore",
    trust: false,
  });
}

export function TextoMat({ texto }: { texto: string }) {
  const partes = useMemo(() => partesDeTexto(texto), [texto]);
  return (
    <>
      {partes.map((p, i) =>
        p.tipo === "texto" ? (
          <span key={i}>{p.valor}</span>
        ) : (
          <span key={i} className="lg-mat" dangerouslySetInnerHTML={{ __html: renderizar(p.valor) }} />
        ),
      )}
    </>
  );
}

/** Mesmo texto sem as marcas de fórmula — para `title`, `aria-label` e testes. */
export function textoSemMat(texto: string): string {
  return partesDeTexto(texto)
    .map((p) => p.valor)
    .join("");
}

export default TextoMat;
