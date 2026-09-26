import { useEffect, useState } from "react";
import { supabase } from "../lib/supabase.js";
import { isConfigured } from "../services/supabase.js";

export type PraticaCodigo = {
  slug: string;
  resolvido: boolean;
  tentativas: number;
  resolvido_em: string | null;
  ultima_tentativa: string | null;
};

/**
 * Estado resolvido das práticas de código do aluno, vindo da view
 * `minhas_praticas_codigo` (migração 0103).
 *
 * Antes disso não existia camada de progresso nenhuma: os 41 cards do
 * catálogo ficavam idênticos independente do que já tinha sido resolvido.
 *
 * Degrada em silêncio de propósito. Se a view ainda não foi criada, ou o
 * Supabase não está configurado, o retorno é um conjunto vazio — a trilha
 * perde o selo "3/5 resolvidas" e continua inteira. Um erro aqui não pode
 * derrubar a página de aprendizado.
 */
export function usePraticasCodigo() {
  const [praticas, setPraticas] = useState<PraticaCodigo[]>([]);
  const [carregando, setCarregando] = useState(true);

  useEffect(() => {
    if (!isConfigured()) {
      setCarregando(false);
      return;
    }
    let vivo = true;

    (async () => {
      try {
        const { data, error } = await supabase
          .from("minhas_praticas_codigo")
          .select("slug, resolvido, tentativas, resolvido_em, ultima_tentativa");
        if (!vivo) return;
        if (error) {
          console.warn("praticas de código indisponíveis:", error.message);
          return;
        }
        setPraticas((data as PraticaCodigo[]) ?? []);
      } finally {
        if (vivo) setCarregando(false);
      }
    })();

    return () => {
      vivo = false;
    };
  }, []);

  return {
    praticas,
    carregando,
    /** Slugs já resolvidos — consulta O(1) para os selos dos cards. */
    resolvidas: new Set(praticas.filter((p) => p.resolvido).map((p) => p.slug)),
    porSlug: new Map(praticas.map((p) => [p.slug, p])),
  };
}
