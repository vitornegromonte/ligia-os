import { Field, Input } from "../ui/Field.tsx";
import { TextoMat } from "../ui/TextoMat.tsx";

/**
 * Forma mínima de uma opção — estrutural de propósito, para servir tanto ao
 * auto-relato quanto às múltiplas escolhas, cujas opções carregam campos
 * extras (competencia, naoSei) irrelevantes aqui.
 */
export type OpcaoRenderizavel = { texto: string; exclusiva?: boolean; outro?: boolean };

export type QuestionCardProps = {
  id?: string;
  numero?: string;
  pergunta: string;
  opcoes: OpcaoRenderizavel[];
  tipo: "single" | "multi";
  selected: number[];
  onSelect: (next: number[]) => void;
  /** Só em `multi`: ao atingir o limite, as opções não marcadas ficam desabilitadas. */
  maxEscolhas?: number;
  /** Texto livre da opção "Outro", mostrado quando ela está marcada. */
  textoOutro?: string;
  onTextoOutro?: (texto: string) => void;
};

/** Tamanho máximo do texto de "Outro": é um "qual?", não uma redação. */
export const MAX_TEXTO_OUTRO = 80;

export default function QuestionCard({
  id,
  numero,
  pergunta,
  opcoes,
  tipo,
  selected,
  onSelect,
  maxEscolhas,
  textoOutro,
  onTextoOutro,
}: QuestionCardProps) {
  // A exclusiva ("Nenhum destes") não conta para o limite: marcá-la limpa as outras.
  const marcadasNormais = selected.filter((i) => !opcoes[i]?.exclusiva).length;
  const noLimite = tipo === "multi" && maxEscolhas !== undefined && marcadasNormais >= maxEscolhas;
  const outroMarcado = selected.some((i) => opcoes[i]?.outro);

  function alternar(i: number) {
    if (tipo === "single") {
      onSelect([i]);
      return;
    }
    // Desmarcar (exclusiva ou não) só remove do array.
    if (selected.includes(i)) {
      onSelect(selected.filter((x) => x !== i));
      return;
    }
    // Marcar exclusiva ("Nenhum destes") desmarca todas as outras.
    if (opcoes[i]?.exclusiva) {
      onSelect([i]);
      return;
    }
    // Marcar normal remove qualquer exclusiva que estivesse selecionada.
    onSelect([...selected.filter((x) => !opcoes[x]?.exclusiva), i]);
  }

  return (
    <div data-q={id} className="nv-questao">
      {(numero || pergunta) && (
        <div className="nv-questao__cabecalho">
          {numero && <span className="nv-questao__numero">{numero}</span>}
          {pergunta && <p className="nv-questao__pergunta">{pergunta}</p>}
        </div>
      )}
      {tipo === "multi" && maxEscolhas !== undefined && (
        <p className="nv-questao__dica">Escolha até {maxEscolhas}.</p>
      )}
      <div className="nv-opcoes">
        {opcoes.map((op, i) => {
          const marcada = selected.includes(i);
          const desabilitada = noLimite && !marcada && !op.exclusiva;
          return (
            <button
              key={i}
              type="button"
              data-opt={i}
              onClick={() => alternar(i)}
              aria-pressed={marcada}
              disabled={desabilitada}
              className="nv-opcao"
            >
              <span className={`nv-marca nv-marca--${tipo}`} aria-hidden>
                {marcada && <span className="nv-marca__ponto" />}
              </span>
              <span>
                <TextoMat texto={op.texto} />
              </span>
            </button>
          );
        })}
      </div>
      {outroMarcado && onTextoOutro && (
        <Field label="Qual? (opcional)" className="nv-questao__outro">
          {(props) => (
            <Input
              {...props}
              size="sm"
              value={textoOutro ?? ""}
              maxLength={MAX_TEXTO_OUTRO}
              onChange={(e) => onTextoOutro(e.target.value)}
            />
          )}
        </Field>
      )}
    </div>
  );
}
