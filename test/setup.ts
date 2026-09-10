import "@testing-library/jest-dom/vitest";

// jsdom não implementa scrollTo, e as páginas chamam no mount. Sem o stub,
// cada render polui a saída dos testes com "Not implemented".
window.scrollTo = () => {};
