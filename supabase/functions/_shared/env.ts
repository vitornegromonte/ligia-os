/**
 * Leitura de variável de ambiente que funciona nos dois runtimes onde este
 * módulo roda: Deno (Edge Functions em produção) e Node (Vitest).
 *
 * Nas Edge Functions os valores vêm de `supabase secrets set`. Nada aqui
 * chega ao browser — este diretório não é importado pelo cliente.
 */
export function env(nome: string, padrao = ""): string {
  const deno = (globalThis as { Deno?: { env?: { get(k: string): string | undefined } } }).Deno;
  if (deno?.env?.get) return deno.env.get(nome) ?? padrao;

  const proc = (globalThis as { process?: { env?: Record<string, string | undefined> } }).process;
  return proc?.env?.[nome] ?? padrao;
}
