import type { ComponentPropsWithoutRef, ComponentType } from "react";

export type IconButtonProps = {
  /** Componente de ícone do lucide-react. */
  icon: ComponentType<{ size?: number; strokeWidth?: number; "aria-hidden"?: boolean }>;
  /** Texto acessível — obrigatório: o botão não tem rótulo visível. */
  label: string;
  iconSize?: number;
  bare?: boolean;
  className?: string;
} & Omit<ComponentPropsWithoutRef<"button">, "aria-label" | "className">;

/**
 * Botão só de ícone. Existia como a constante `iconBtn` copiada
 * literalmente em Notas.jsx e Agenda.jsx, e como variantes soltas no topbar.
 */
export function IconButton({
  icon: Icon,
  label,
  iconSize = 18,
  bare = false,
  className = "",
  ...rest
}: IconButtonProps) {
  return (
    <button
      type="button"
      aria-label={label}
      title={rest.title ?? label}
      className={`lg-icon-btn${bare ? " lg-icon-btn--bare" : ""} ${className}`.trim()}
      {...rest}
    >
      <Icon size={iconSize} aria-hidden />
    </button>
  );
}

export default IconButton;
