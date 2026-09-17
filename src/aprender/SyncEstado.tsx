import { useEffect, useRef } from "react";
import { supabase } from "../lib/supabase.js";
import { isConfigured } from "../services/supabase.js";
import { sincronizar, lerLocal } from "@/lib/sync";
import { SYNC_AGORA_EVENT } from "@/lib/pretest-storage";

/**
 * Evento disparado quando o sync alterou o estado local. Quem lê o
 * localStorage na montagem (a trilha, o painel do aluno) escuta para reler
 * sem precisar de F5.
 */
export const SYNC_EVENT = "ligia:sync";

/**
 * Sincroniza o estado do aluno com o Postgres. Montado no Layout, não
 * renderiza nada.
 *
 * O modelo é local-first: o localStorage segue sendo a leitura síncrona da
 * UI e o banco é a cópia durável. O merge é comutativo e idempotente
 * (lib/sync-merge.ts), então sincronizar duas vezes ou em ordens diferentes
 * dá o mesmo estado.
 *
 * Falha de sync nunca quebra a tela: degrada para o dado local intacto.
 */
export default function SyncEstado() {
  const rodando = useRef(false);
  /** Retrato do estado local no fim do último sync — base do "mudou algo?". */
  const ultimoSnapshot = useRef<string | null>(null);

  useEffect(() => {
    if (!isConfigured()) return;
    let vivo = true;

    async function sincronizarSeLogado() {
      // Uma rodada por vez: montagem e SIGNED_IN podem coincidir, e duas
      // sincronizações concorrentes leriam o servidor no meio do push da outra.
      if (rodando.current) return;
      rodando.current = true;
      try {
        const {
          data: { user },
        } = await supabase.auth.getUser();
        if (!user || !vivo) return;
        const r = await sincronizar(supabase, user.id);
        if (!vivo) return;
        if (r.ok) {
          ultimoSnapshot.current = JSON.stringify(r.estado);
          window.dispatchEvent(new Event(SYNC_EVENT));
        }
      } finally {
        rodando.current = false;
      }
    }

    /**
     * Sair da aba é o momento em que o progresso da sessão se perderia. O
     * `visibilitychange` é o gancho confiável (`beforeunload` não dispara em
     * mobile). Só sincroniza se o estado local de fato mudou — alternar de
     * aba não deve gerar tráfego à toa.
     */
    function aoEsconder() {
      if (document.visibilityState !== "hidden") return;
      if (ultimoSnapshot.current === JSON.stringify(lerLocal())) return;
      void sincronizarSeLogado();
    }

    void sincronizarSeLogado();
    const { data: sub } = supabase.auth.onAuthStateChange((evento) => {
      if (evento === "SIGNED_IN") void sincronizarSeLogado();
    });
    document.addEventListener("visibilitychange", aoEsconder);
    // "Terminar depois" e o fim do nivelamento pedem sync imediato: quem troca
    // de dispositivo logo em seguida precisa encontrar o rascunho lá.
    const agora = () => void sincronizarSeLogado();
    window.addEventListener(SYNC_AGORA_EVENT, agora);

    return () => {
      vivo = false;
      sub.subscription.unsubscribe();
      document.removeEventListener("visibilitychange", aoEsconder);
      window.removeEventListener(SYNC_AGORA_EVENT, agora);
    };
  }, []);

  return null;
}
