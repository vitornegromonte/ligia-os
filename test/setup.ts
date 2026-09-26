import "@testing-library/jest-dom/vitest";

// jsdom não implementa estas duas, e as páginas as chamam em efeitos de foco.
// Sem os stubs, o efeito LANÇA e derruba a árvore — o que aparece como falhas
// sem relação nenhuma com o que o teste checa.
window.scrollTo = () => {};
Element.prototype.scrollIntoView = () => {};

/**
 * O KaTeX emite um bloco MathML junto do HTML (é o que o leitor de tela
 * anuncia), e o jsdom estoura ao calcular estilo de elemento MathML — o que
 * derruba qualquer consulta por papel numa tela com fórmula. Só para esses
 * elementos, devolve um estilo neutro.
 */
const estiloReal = window.getComputedStyle.bind(window);
const NS_MATHML = "http://www.w3.org/1998/Math/MathML";
window.getComputedStyle = ((elemento: Element, pseudo?: string | null) => {
  if (elemento?.namespaceURI === NS_MATHML) {
    return {
      visibility: "visible",
      display: "inline",
      content: "",
      getPropertyValue: () => "",
    } as unknown as CSSStyleDeclaration;
  }
  return estiloReal(elemento, pseudo ?? undefined);
}) as typeof window.getComputedStyle;
