import { useEffect, useState } from "react";
import { NIVELAMENTO } from "./dados.ts";
import { supabase } from "../lib/supabase.js";
import { isConfigured } from "../services/supabase.js";

const titulo = {
  marginBottom: 12,
  color: "var(--muted)",
  fontSize: 10,
  letterSpacing: ".1em",
  textTransform: "uppercase",
};

/**
 * "Quem é você" de uma pessoa, para admin, no perfil em Membros.
 *
 * Lê `learner_profiles` (migração 0105); a RLS de staff libera a leitura. As
 * respostas são índices das opções do conteúdo atual — se o perfil foi
 * respondido noutra versão, os rótulos podem não bater, e a seção avisa.
 */
export default function PerfilAprendizAdmin({ userId }) {
  const [estado, setEstado] = useState({ carregando: true, perfil: null, erro: null });

  useEffect(() => {
    if (!userId || !isConfigured()) {
      setEstado({ carregando: false, perfil: null, erro: null });
      return;
    }
    let vivo = true;
    setEstado({ carregando: true, perfil: null, erro: null });
    supabase
      .from("learner_profiles")
      .select("auto_relato, textos_outro, content_version, updated_at")
      .eq("user_id", userId)
      .maybeSingle()
      .then(({ data, error }) => {
        if (!vivo) return;
        setEstado({ carregando: false, perfil: data ?? null, erro: error?.message ?? null });
      });
    return () => {
      vivo = false;
    };
  }, [userId]);

  return (
    <PerfilAprendizVisao
      carregando={estado.carregando}
      perfil={estado.perfil}
      erro={estado.erro}
    />
  );
}

/** Parte visual, separada da busca para dar para testar sem Supabase. */
export function PerfilAprendizVisao({ carregando, perfil, erro }) {
  return (
    <div
      data-perfil-aprendiz
      style={{ marginBottom: 25, padding: "16px 18px", borderRadius: 10, border: "1px solid var(--line-soft)", background: "var(--surface-2)" }}
    >
      <h3 style={titulo}>Nivelamento · quem é você</h3>
      {carregando ? (
        <p style={{ color: "var(--muted-2)", fontSize: 12 }}>Carregando…</p>
      ) : erro ? (
        <p style={{ color: "var(--muted-2)", fontSize: 12 }}>
          Não foi possível ler: {erro}. Se a tabela não existe, falta aplicar a migração 0105.
        </p>
      ) : !perfil ? (
        <p style={{ color: "var(--muted-2)", fontSize: 12 }}>Ainda não respondeu o nivelamento.</p>
      ) : (
        <>
          <dl style={{ display: "grid", gap: 10, margin: 0 }}>
            {NIVELAMENTO.auto_relato.map((p) => {
              const marcadas = perfil.auto_relato?.[p.id] ?? [];
              const textos = marcadas.map((i) => p.opcoes[i]?.texto).filter(Boolean);
              const outro = perfil.textos_outro?.[p.id];
              return (
                <div key={p.id}>
                  <dt style={{ color: "var(--muted-2)", fontSize: 11 }}>{p.pergunta}</dt>
                  <dd style={{ margin: "2px 0 0", fontSize: 12, lineHeight: 1.5 }}>
                    {textos.length ? textos.join(", ") : "—"}
                    {outro && <span style={{ color: "var(--muted)" }}> ({outro})</span>}
                  </dd>
                </div>
              );
            })}
          </dl>
          <p style={{ margin: "12px 0 0", color: "var(--muted-2)", fontSize: 11 }}>
            Atualizado em {new Date(perfil.updated_at).toLocaleDateString("pt-BR")}
            {perfil.content_version !== NIVELAMENTO.version &&
              ` · respondido na versão ${perfil.content_version} do conteúdo; os rótulos podem ter mudado`}
          </p>
        </>
      )}
    </div>
  );
}
