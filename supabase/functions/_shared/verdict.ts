/**
 * O veredito de uma checagem. Mora aqui, e não em src/lib/, porque é o
 * contrato de saída do avaliador: a Edge Function o produz e o cliente o
 * consome.
 *
 * Regra de direção das dependências: supabase/functions/_shared NUNCA pode
 * importar de src/ — o bundle do Deno só enxerga o que está dentro de
 * supabase/functions/, então um import assim quebraria o deploy. O caminho
 * inverso (src/ importando daqui) é livre; o Vite resolve normalmente.
 */
export type Verdict = "acertei" | "parcial" | "errei";

/** Primeira linha da resposta do avaliador. Formato do contrato de stream. */
export function parseVerdict(linha: string): Verdict | null {
  const v = linha.trim().toLowerCase();
  return v === "acertei" || v === "parcial" || v === "errei" ? v : null;
}
