import { useState, useRef, useEffect } from "react";
import { MessageCircle, ChevronDown, Loader2, Send } from "lucide-react";
import { Button } from "../ui/Button.tsx";
import MarkdownViewer from "../components/MarkdownViewer.jsx";
import { streamText } from "../lib/stream.ts";
import { chamarEdgeStream } from "./edge.ts";

/**
 * Acordeão de dúvidas sobre o conceito. Tem teto de perguntas por sessão — o
 * custo por token é real e o tutor não deve virar chat aberto. A Edge Function
 * aplica o seu próprio limite por hora, por usuário.
 */
const MAX_PERGUNTAS = 6;
const TIMEOUT_MS = 30000;

export default function PerguntarPanel({ conceptId }) {
  const [aberto, setAberto] = useState(false);
  const [chat, setChat] = useState([]);
  const [input, setInput] = useState("");
  const [enviando, setEnviando] = useState(false);
  const [erro, setErro] = useState(null);
  const inputRef = useRef(null);

  useEffect(() => {
    if (aberto) inputRef.current?.focus();
  }, [aberto]);

  const feitas = chat.filter((m) => m.role === "user").length;
  const noLimite = feitas >= MAX_PERGUNTAS;

  async function enviar() {
    const q = input.trim();
    if (!q || enviando || noLimite) return;

    const novo = [...chat, { role: "user", content: q }];
    setChat([...novo, { role: "assistant", content: "" }]);
    setInput("");
    setEnviando(true);
    setErro(null);

    const ctrl = new AbortController();
    const timeout = setTimeout(() => ctrl.abort(), TIMEOUT_MS);
    try {
      const res = await chamarEdgeStream(
        "loop-perguntar",
        { conceptId, messages: novo },
        { signal: ctrl.signal },
      );
      const completo = await streamText(res, (acc) =>
        setChat((c) => {
          const cp = [...c];
          cp[cp.length - 1] = { role: "assistant", content: acc };
          return cp;
        }),
      );
      if (!completo.trim()) throw new Error("resposta vazia");
    } catch (e) {
      setErro(
        e?.status === 429
          ? "Muitas perguntas seguidas — tente de novo em instantes."
          : "Não consegui responder agora. Tente de novo em instantes.",
      );
      setChat((c) => c.slice(0, -1)); // remove o balão vazio do tutor
    } finally {
      clearTimeout(timeout);
      setEnviando(false);
    }
  }

  return (
    <section className="lg-card lg-card--sm" style={{ marginTop: 18 }}>
      <button
        type="button"
        onClick={() => setAberto((o) => !o)}
        aria-expanded={aberto}
        aria-controls="painel-perguntar"
        style={{
          display: "flex", alignItems: "center", gap: 8, width: "100%",
          border: 0, background: "none", color: "var(--text)",
          fontSize: 14, fontWeight: 500, textAlign: "left", cursor: "pointer",
        }}
      >
        <MessageCircle size={16} aria-hidden style={{ color: "var(--accent-hover)" }} />
        Perguntar — tire uma dúvida sobre o conceito
        <ChevronDown
          size={16}
          aria-hidden
          style={{
            marginLeft: "auto",
            transition: "transform var(--transition)",
            transform: aberto ? "rotate(180deg)" : "none",
          }}
        />
      </button>

      {aberto && (
        <div id="painel-perguntar" style={{ marginTop: 14 }}>
          {chat.length > 0 && (
            <div style={{ display: "grid", gap: 8, marginBottom: 12 }}>
              {chat.map((m, i) => (
                <div key={i} className={`pr-chat-balao pr-chat-balao--${m.role}`}>
                  {m.role === "assistant" ? (
                    m.content ? <MarkdownViewer content={m.content} /> : <Loader2 size={14} className="pr-girar" aria-hidden />
                  ) : (
                    m.content
                  )}
                </div>
              ))}
            </div>
          )}

          {erro && (
            <p role="alert" style={{ margin: "0 0 10px", color: "var(--danger)", fontSize: 13 }}>
              {erro}
            </p>
          )}

          <textarea
            ref={inputRef}
            className="pr-resposta"
            style={{ minHeight: 72, marginTop: 0 }}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder={noLimite ? "Limite de perguntas desta sessão atingido." : "Qual é a sua dúvida?"}
            disabled={noLimite}
            aria-label="Sua pergunta"
          />

          <div style={{ display: "flex", alignItems: "center", gap: 10, marginTop: 10 }}>
            <Button size="sm" onClick={enviar} disabled={!input.trim() || enviando || noLimite}>
              {enviando ? <Loader2 size={15} className="pr-girar" aria-hidden /> : <Send size={15} aria-hidden />}
              {enviando ? "Pensando…" : "Perguntar"}
            </Button>
            <span style={{ color: "var(--muted-2)", fontSize: 11 }}>
              {feitas}/{MAX_PERGUNTAS} perguntas nesta sessão
            </span>
          </div>
        </div>
      )}
    </section>
  );
}
