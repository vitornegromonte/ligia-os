/**
 * Embaralhamento determinístico das opções do nivelamento.
 *
 * Duas exigências que o Math.random() não atende: (1) a ordem tem que ser
 * estável durante a sessão (voltar uma questão não pode reordenar as opções
 * debaixo do aluno) e (2) tem que variar entre alunos/rodadas, pra ninguém
 * decorar "a resposta é a terceira". Daí a permutação derivada de uma seed +
 * o id da questão.
 *
 * Opções marcadas como "âncora" (o "Não sei") nunca entram no sorteio: ficam
 * sempre no fim, na ordem original.
 */

/** PRNG mulberry32 — determinístico, suficiente pra embaralhar 4 opções. */
function prng(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Hash estável de string (djb2 xor) — junta a seed da sessão ao id da questão. */
export function hashSeed(seed: string): number {
  let h = 5381;
  for (let i = 0; i < seed.length; i++) h = ((h << 5) + h) ^ seed.charCodeAt(i);
  return h >>> 0;
}

/**
 * Devolve a ordem de exibição das opções: os índices não-âncora embaralhados
 * (Fisher-Yates com PRNG semeado), seguidos dos âncora na ordem original.
 *
 * O retorno é um array de índices ORIGINAIS: `ordem[i]` é qual opção original
 * aparece na posição i da tela. Quem responde converte de volta com `ordem[j]`.
 */
export function ordemDasOpcoes<T>(
  opcoes: T[],
  seed: string,
  ehAncora: (opcao: T) => boolean,
): number[] {
  const moveis: number[] = [];
  const ancoras: number[] = [];
  opcoes.forEach((op, i) => (ehAncora(op) ? ancoras : moveis).push(i));

  const rand = prng(hashSeed(seed));
  for (let i = moveis.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [moveis[i], moveis[j]] = [moveis[j], moveis[i]];
  }
  return [...moveis, ...ancoras];
}
