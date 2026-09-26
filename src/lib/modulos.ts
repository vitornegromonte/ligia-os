import type { ModuleId } from "@/lib/content";

/**
 * Cor do módulo, como referência ao token CSS.
 *
 * Na plataforma antiga o mesmo hex aparecia em três lugares — tokens.css,
 * MODULE_HEX no ConceptCard e a página de styleguide — e nada impedia que
 * divergissem. Aqui existe um lugar só: `--m0`..`--m5` em src/styles/tokens.css.
 *
 * Devolver `var(--mN)` em vez do hex funciona em background, border, fill e
 * color-mix, então não há motivo para materializar o valor no JS.
 */
export function corDoModulo(modulo: string): string {
  return `var(--${modulo.toLowerCase()})`;
}

/** Ordem de apresentação da trilha. */
export const ORDEM_MODULOS: ModuleId[] = ["M0", "M1", "M2", "M3", "M4", "M5"];
