import { useEffect, useState } from "react";
import { Palette, Trash2, Plus } from "lucide-react";
import { Topbar } from "../../ui/Topbar.tsx";
import { PageHeader } from "../../ui/PageHeader.tsx";
import { Button } from "../../ui/Button.tsx";
import { IconButton } from "../../ui/IconButton.tsx";
import { Card } from "../../ui/Card.tsx";
import { Field, Input, Textarea } from "../../ui/Field.tsx";
import { Chip } from "../../ui/Chip.tsx";
import { Alert } from "../../ui/Alert.tsx";
import { Skeleton, SkeletonList } from "../../ui/Skeleton.tsx";
import { EmptyState } from "../../ui/EmptyState.tsx";
import { Modal } from "../../ui/Modal.tsx";

const NEUTROS = ["--bg", "--sidebar", "--surface", "--surface-2", "--surface-3", "--line", "--line-soft", "--hairline", "--text", "--muted", "--muted-2", "--muted-3"];
const MARCA = ["--ligia-orange-1", "--ligia-orange-2", "--accent", "--accent-hover", "--accent-soft", "--accent-border"];
const SEMANTICAS = ["--success", "--info", "--warning", "--danger", "--review", "--review-bg"];
const MODULOS = ["--m0", "--m1", "--m2", "--m3", "--m4", "--m5"];
const MODULO_NOMES = ["M0 Math", "M1 ML", "M2 DL base", "M3 DL aplic.", "M4 Transf.", "M5 Capstone"];

function Swatch({ token, nome }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 10, minWidth: 0 }}>
      <div
        style={{
          width: 34, height: 34, flex: "0 0 auto",
          borderRadius: 8, border: "1px solid var(--line)",
          background: `var(${token})`,
        }}
        aria-hidden
      />
      <div style={{ minWidth: 0 }}>
        <div style={{ fontSize: 12, color: "var(--text)", fontFamily: "var(--font-mono)" }}>{token}</div>
        {nome && <div style={{ fontSize: 11, color: "var(--muted-2)" }}>{nome}</div>}
      </div>
    </div>
  );
}

function Secao({ titulo, nota, children }) {
  return (
    <section style={{ marginBottom: 40 }}>
      <h2 style={{ margin: "0 0 4px", fontSize: 17 }}>{titulo}</h2>
      {nota && (
        <p style={{ margin: "0 0 14px", maxWidth: 620, color: "var(--muted)", fontSize: 12, lineHeight: 1.7 }}>
          {nota}
        </p>
      )}
      {children}
    </section>
  );
}

const grid = { display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(190px, 1fr))", gap: 14 };
const row = { display: "flex", flexWrap: "wrap", alignItems: "center", gap: 10 };

/**
 * Referência viva do design system. Existe para que um desvio de marca ou um
 * estado quebrado apareça numa tela só, em vez de ser descoberto página a
 * página.
 */
export default function Styleguide() {
  const [modalAberto, setModalAberto] = useState(false);
  const [chip, setChip] = useState("b");

  useEffect(() => {
    document.title = "Ligia — Styleguide";
    window.scrollTo({ top: 0 });
  }, []);

  return (
    <div>
      <Topbar crumb="Styleguide" />
      <div className="lg-page">
        <PageHeader
          eyebrow="Aprender"
          title="Styleguide."
          lede="Tokens e primitivas da Ligia. Só o laranja Orange/1, o Orange/2 e o gradiente são oficiais; neutros, semânticas e cores de módulo são extensão nossa, mantidas quentes e dessaturadas para que o laranja continue sendo a cor mais saturada da tela."
        />

        <Secao titulo="Marca" nota="Hex fixos. Um laranja “parecido” não é a marca.">
          <div style={grid}>{MARCA.map((t) => <Swatch key={t} token={t} />)}</div>
        </Secao>

        <Secao titulo="Neutros" nota="Cinzas quentes, com um traço de marrom. Um cinza frio brigaria com o laranja.">
          <div style={grid}>{NEUTROS.map((t) => <Swatch key={t} token={t} />)}</div>
        </Secao>

        <Secao titulo="Semânticas" nota="Dessaturadas de propósito. --green, --blue e --yellow continuam existindo como aliases do código antigo.">
          <div style={grid}>{SEMANTICAS.map((t) => <Swatch key={t} token={t} />)}</div>
        </Secao>

        <Secao
          titulo="Módulos da trilha"
          nota="Codificação categórica dos seis módulos. Retonados do palette original (que era vivo e azulado) para este registro, porque seis acentos saturados competiriam com a marca."
        >
          <div style={grid}>
            {MODULOS.map((t, i) => <Swatch key={t} token={t} nome={MODULO_NOMES[i]} />)}
          </div>
        </Secao>

        <Secao titulo="Tipografia" nota="Space Grotesk em títulos e números; Sora em texto e interface.">
          <Card>
            <h1 style={{ margin: "0 0 6px", fontSize: 32 }}>Space Grotesk — título</h1>
            <h3 style={{ margin: "0 0 10px", fontSize: 18, fontWeight: 500 }}>Subtítulo em Space Grotesk</h3>
            <p style={{ margin: "0 0 10px", color: "var(--muted)", maxWidth: 560, lineHeight: 1.7 }}>
              Corpo de texto em Sora. É a fonte de parágrafos, labels, formulários e navegação.
            </p>
            <code style={{ fontFamily: "var(--font-mono)", fontSize: 12, color: "var(--muted)" }}>
              --font-mono: uma stack só, para código e números tabulares
            </code>
          </Card>
        </Secao>

        <Secao titulo="Botões" nota="Passe o mouse: o hover existe em CSS, não em style inline.">
          <div style={{ ...row, marginBottom: 12 }}>
            <Button>Primário</Button>
            <Button variant="secondary">Secundário</Button>
            <Button variant="ghost">Ghost</Button>
            <Button variant="danger">Perigo</Button>
            <Button disabled>Desabilitado</Button>
          </div>
          <div style={{ ...row, marginBottom: 12 }}>
            <Button size="sm">Pequeno</Button>
            <Button size="sm" variant="secondary">Pequeno secundário</Button>
            <Button size="sm">
              <Plus size={14} aria-hidden /> Com ícone
            </Button>
          </div>
          <div style={row}>
            <IconButton icon={Palette} label="Exemplo de ícone" />
            <IconButton icon={Trash2} label="Excluir" />
            <IconButton icon={Palette} label="Sem borda" bare />
          </div>
        </Secao>

        <Secao titulo="Cards">
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(240px, 1fr))", gap: 14 }}>
            <Card>
              <div className="eyebrow" style={{ marginBottom: 8 }}>Estático</div>
              <p style={{ margin: 0, color: "var(--muted)", fontSize: 13 }}>Card padrão.</p>
            </Card>
            <Card interactive>
              <div className="eyebrow" style={{ marginBottom: 8 }}>Interativo</div>
              <p style={{ margin: 0, color: "var(--muted)", fontSize: 13 }}>Hover e foco visíveis.</p>
            </Card>
            <Card padding="sm">
              <div style={{ fontFamily: "var(--font-heading)", fontSize: 28, fontWeight: 600, letterSpacing: "-.03em" }}>41</div>
              <div style={{ marginTop: 2, color: "var(--muted-2)", fontSize: 11 }}>métrica</div>
            </Card>
          </div>
        </Secao>

        <Secao titulo="Formulário">
          <Card>
            <div style={{ display: "grid", gap: 16, maxWidth: 420 }}>
              <Field label="Campo comum" hint="Uma dica curta abaixo do campo.">
                {(p) => <Input placeholder="Digite algo" {...p} />}
              </Field>
              <Field label="Campo com erro" error="Este campo é obrigatório.">
                {(p) => <Input placeholder="Inválido" invalid {...p} />}
              </Field>
              <Field label="Área de texto">
                {(p) => <Textarea placeholder="Texto mais longo" {...p} />}
              </Field>
            </div>
          </Card>
        </Secao>

        <Secao titulo="Chips">
          <div style={row}>
            {["a", "b", "c"].map((k) => (
              <Chip key={k} selected={chip === k} onClick={() => setChip(k)}>
                Opção {k.toUpperCase()}
              </Chip>
            ))}
            <Chip static>Decorativo</Chip>
          </div>
        </Secao>

        <Secao titulo="Avisos">
          <div style={{ display: "grid", gap: 10, maxWidth: 560 }}>
            <Alert tone="error">Erro: não foi possível salvar.</Alert>
            <Alert tone="success">Salvo com sucesso.</Alert>
            <Alert tone="warning">Sua prática vence em 2 dias.</Alert>
            <Alert tone="info">Seu progresso é sincronizado automaticamente.</Alert>
          </div>
        </Secao>

        <Secao titulo="Carregando e vazio">
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: 20 }}>
            <div>
              <SkeletonList count={2} height={70} />
              <div style={{ marginTop: 12 }}><Skeleton height={20} width="60%" radius="6px" /></div>
            </div>
            <EmptyState
              title="Nenhum resultado"
              text="Ajuste os filtros ou comece criando o primeiro item."
              action={<Button size="sm" variant="secondary">Criar</Button>}
            />
          </div>
        </Secao>

        <Secao titulo="Modal" nota="Fecha no Escape e no clique fora, prende o foco enquanto aberto e trava o scroll do fundo.">
          <Button onClick={() => setModalAberto(true)}>Abrir modal</Button>
          <Modal
            open={modalAberto}
            onClose={() => setModalAberto(false)}
            title="Exemplo de modal"
            footer={
              <>
                <Button size="sm" variant="secondary" onClick={() => setModalAberto(false)}>Cancelar</Button>
                <Button size="sm" onClick={() => setModalAberto(false)}>Confirmar</Button>
              </>
            }
          >
            <p style={{ margin: "0 0 12px", color: "var(--muted)", fontSize: 13, lineHeight: 1.7 }}>
              Tente navegar com Tab: o foco circula dentro do painel.
            </p>
            <Field label="Um campo">{(p) => <Input placeholder="Foco começa aqui" {...p} />}</Field>
          </Modal>
        </Secao>
      </div>
    </div>
  );
}
