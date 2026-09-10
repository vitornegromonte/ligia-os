/**
 * Concatena classes condicionalmente.
 *
 * Substitui o `cn()` (clsx + tailwind-merge) da plataforma Next.js: aqui não
 * há Tailwind, então não existe conflito de utilitários para resolver — a
 * camada de estilo é CSS de verdade em src/styles/. Sobrou a parte que
 * interessa: ignorar false/null/undefined sem sujar o JSX.
 */
export type ClassValue = string | false | null | undefined;

export function cn(...classes: ClassValue[]): string {
  return classes.filter(Boolean).join(" ");
}
