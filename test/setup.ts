import "@testing-library/jest-dom/vitest";

// jsdom não implementa estas duas, e as páginas as chamam em efeitos de foco.
// Sem os stubs, o efeito LANÇA e derruba a árvore — o que aparece como falhas
// sem relação nenhuma com o que o teste checa.
window.scrollTo = () => {};
Element.prototype.scrollIntoView = () => {};
