import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { Button } from "../src/ui/Button.tsx";
import { Chip } from "../src/ui/Chip.tsx";
import { Field, Input } from "../src/ui/Field.tsx";
import { Modal } from "../src/ui/Modal.tsx";
import { EmptyState } from "../src/ui/EmptyState.tsx";

describe("Button", () => {
  it("aplica variante e tamanho como classes", () => {
    render(<Button variant="secondary" size="sm">Ok</Button>);
    const btn = screen.getByRole("button", { name: "Ok" });
    expect(btn).toHaveClass("lg-btn", "lg-btn--sm", "lg-btn--secondary");
  });

  it("loading desabilita e anuncia aria-busy", () => {
    render(<Button loading>Salvando</Button>);
    const btn = screen.getByRole("button", { name: "Salvando" });
    expect(btn).toBeDisabled();
    expect(btn).toHaveAttribute("aria-busy", "true");
  });

  it("como link não recebe atributo disabled, que é inválido em <a>", () => {
    render(<Button as="a" href="/x" loading>Ir</Button>);
    const link = screen.getByRole("link", { name: "Ir" });
    expect(link).not.toHaveAttribute("disabled");
  });
});

describe("Chip", () => {
  it("expõe estado de seleção a leitores de tela", () => {
    render(<Chip selected>Filtro</Chip>);
    expect(screen.getByRole("button", { name: "Filtro" })).toHaveAttribute("aria-pressed", "true");
  });

  it("chip estático não é botão", () => {
    render(<Chip static>Rótulo</Chip>);
    expect(screen.queryByRole("button")).toBeNull();
  });
});

describe("Field", () => {
  it("liga label ao controle e descreve o erro", () => {
    render(
      <Field label="Email" error="Obrigatório">
        {(p) => <Input {...p} />}
      </Field>,
    );
    const input = screen.getByLabelText("Email");
    expect(input).toHaveAttribute("aria-invalid", "true");
    // O erro precisa estar em aria-describedby, senão o leitor de tela não o anuncia.
    const describedBy = input.getAttribute("aria-describedby") ?? "";
    expect(document.getElementById(describedBy.split(" ")[0])).toHaveTextContent("Obrigatório");
  });

  it("hint só aparece quando não há erro", () => {
    const { rerender } = render(
      <Field label="Nome" hint="Como te chamam">{(p) => <Input {...p} />}</Field>,
    );
    expect(screen.getByText("Como te chamam")).toBeInTheDocument();

    rerender(
      <Field label="Nome" hint="Como te chamam" error="Falhou">{(p) => <Input {...p} />}</Field>,
    );
    expect(screen.queryByText("Como te chamam")).toBeNull();
  });
});

describe("Modal", () => {
  it("não renderiza nada quando fechado", () => {
    render(<Modal open={false} onClose={() => {}} title="X">corpo</Modal>);
    expect(screen.queryByRole("dialog")).toBeNull();
  });

  it("é um dialog modal rotulado pelo título", () => {
    render(<Modal open onClose={() => {}} title="Confirmar">corpo</Modal>);
    const dialog = screen.getByRole("dialog");
    expect(dialog).toHaveAttribute("aria-modal", "true");
    expect(dialog).toHaveAccessibleName("Confirmar");
  });

  it("fecha no Escape — comportamento que os modais antigos não tinham", () => {
    const onClose = vi.fn();
    render(<Modal open onClose={onClose} title="X">corpo</Modal>);
    fireEvent.keyDown(document, { key: "Escape" });
    expect(onClose).toHaveBeenCalledOnce();
  });

  it("trava o scroll do fundo enquanto aberto e devolve ao fechar", () => {
    const { unmount } = render(<Modal open onClose={() => {}} title="X">corpo</Modal>);
    expect(document.body.style.overflow).toBe("hidden");
    unmount();
    expect(document.body.style.overflow).not.toBe("hidden");
  });

  it("move o foco para dentro do painel ao abrir", () => {
    render(
      <Modal open onClose={() => {}} title="X">
        <button>primeiro</button>
      </Modal>,
    );
    expect(screen.getByRole("dialog").contains(document.activeElement)).toBe(true);
  });
});

describe("EmptyState", () => {
  it("mostra título, texto e ação", () => {
    render(<EmptyState title="Nada aqui" text="Crie o primeiro" action={<Button>Criar</Button>} />);
    expect(screen.getByText("Nada aqui")).toBeInTheDocument();
    expect(screen.getByText("Crie o primeiro")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Criar" })).toBeInTheDocument();
  });
});
