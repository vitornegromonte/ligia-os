import { useCallback, useEffect, useId, useRef } from "react";
import type { ReactNode } from "react";
import { X } from "lucide-react";
import { IconButton } from "./IconButton.tsx";

export type ModalProps = {
  open: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
  footer?: ReactNode;
  wide?: boolean;
  /** Renderiza o corpo dentro de um <form> e chama isto no submit. */
  onSubmit?: (event: React.FormEvent<HTMLFormElement>) => void;
};

const FOCUSABLE =
  'a[href], button:not([disabled]), textarea:not([disabled]), input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])';

/**
 * Diálogo modal acessível.
 *
 * Os modais existentes fecham no clique fora e nada mais: não têm
 * `role="dialog"`, não respondem a Escape, não prendem o foco e não travam
 * o scroll do fundo. Tudo isso vive aqui, uma vez.
 */
export function Modal({ open, onClose, title, children, footer, wide = false, onSubmit }: ModalProps) {
  const panelRef = useRef<HTMLDivElement>(null);
  const restoreFocusRef = useRef<HTMLElement | null>(null);
  const titleId = useId();

  const onOverlayClick = useCallback(
    (event: React.MouseEvent) => {
      if (event.target === event.currentTarget) onClose();
    },
    [onClose],
  );

  // Escape fecha; Tab circula dentro do painel.
  useEffect(() => {
    if (!open) return;

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        event.stopPropagation();
        onClose();
        return;
      }
      if (event.key !== "Tab" || !panelRef.current) return;

      const items = Array.from(panelRef.current.querySelectorAll<HTMLElement>(FOCUSABLE)).filter(
        (el) => el.offsetParent !== null,
      );
      if (items.length === 0) return;

      const first = items[0];
      const last = items[items.length - 1];
      const active = document.activeElement;

      if (event.shiftKey && (active === first || !panelRef.current.contains(active))) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && active === last) {
        event.preventDefault();
        first.focus();
      }
    }

    document.addEventListener("keydown", onKeyDown, true);
    return () => document.removeEventListener("keydown", onKeyDown, true);
  }, [open, onClose]);

  // Trava o scroll do fundo e devolve o foco a quem abriu.
  useEffect(() => {
    if (!open) return;

    restoreFocusRef.current = document.activeElement as HTMLElement | null;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const target = panelRef.current?.querySelector<HTMLElement>(FOCUSABLE) ?? panelRef.current;
    target?.focus();

    return () => {
      document.body.style.overflow = previousOverflow;
      restoreFocusRef.current?.focus?.();
    };
  }, [open]);

  if (!open) return null;

  const body = (
    <>
      <div className="lg-modal__body">{children}</div>
      {footer && <div className="lg-modal__footer">{footer}</div>}
    </>
  );

  return (
    <div className="lg-modal-overlay" onClick={onOverlayClick}>
      <div
        ref={panelRef}
        className={`lg-modal${wide ? " lg-modal--wide" : ""}`}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        tabIndex={-1}
      >
        <div className="lg-modal__header">
          <h2 className="lg-modal__title" id={titleId}>
            {title}
          </h2>
          <div style={{ marginLeft: "auto" }}>
            <IconButton icon={X} label="Fechar" bare onClick={onClose} />
          </div>
        </div>
        {onSubmit ? <form onSubmit={onSubmit}>{body}</form> : body}
      </div>
    </div>
  );
}

export default Modal;
