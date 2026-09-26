/**
 * Leitura de respostas em streaming (text/plain) das rotas de LLM.
 * Fica fora dos componentes porque os dois consumidores — a avaliação da
 * checagem e o chat do tutor — leem o mesmo formato.
 */

/** Lê um Response de texto em streaming, chamando onAcc com o texto acumulado a cada chunk. */
export async function streamText(
  res: Response,
  onAcc: (acc: string) => void,
): Promise<string> {
  const reader = res.body!.getReader();
  const decoder = new TextDecoder();
  let acc = "";
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    acc += decoder.decode(value, { stream: true });
    onAcc(acc);
  }
  return acc;
}
