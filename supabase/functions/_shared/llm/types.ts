/** Interface agnóstica de provedor de LLM. Adapters implementam `complete`. */
export type LLMRole = "system" | "user" | "assistant";
export type LLMMessage = { role: LLMRole; content: string };
export type LLMOptions = { temperature?: number; maxOutputTokens?: number };

export interface LLMProvider {
  readonly name: string;
  complete(messages: LLMMessage[], opts?: LLMOptions): Promise<string>;
  stream(messages: LLMMessage[], opts?: LLMOptions): AsyncIterable<string>;
}
