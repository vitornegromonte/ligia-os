/**
 * Forma mínima de uma opção — estrutural de propósito, para servir tanto ao
 * auto-relato quanto às múltiplas escolhas, cujas opções carregam campos
 * extras (competencia, naoSei) irrelevantes aqui.
 */
export type OpcaoRenderizavel = { texto: string; exclusiva?: boolean };

export type QuestionCardProps = {
  id?: string;
  numero?: string;
  pergunta: string;
  opcoes: OpcaoRenderizavel[];
  tipo: "single" | "multi";
  selected: number[];
  onSelect: (next: number[]) => void;
};

export default function QuestionCard({
  id,
  numero,
  pergunta,
  opcoes,
  tipo,
  selected,
  onSelect,
}: QuestionCardProps) {
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
      <div className="nv-opcoes">
        {opcoes.map((op, i) => {
          const marcada = selected.includes(i);
          return (
            <button
              key={i}
              type="button"
              data-opt={i}
              onClick={() => alternar(i)}
              aria-pressed={marcada}
              className="nv-opcao"
            >
              <span className={`nv-marca nv-marca--${tipo}`} aria-hidden>
                {marcada && <span className="nv-marca__ponto" />}
              </span>
              {op.texto}
            </button>
          );
        })}
      </div>
    </div>
  );
}
