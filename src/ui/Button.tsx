import type { ComponentPropsWithoutRef, ElementType, ReactNode } from "react";

type Variant = "primary" | "secondary" | "ghost" | "danger";
type Size = "sm" | "md";

export type ButtonProps<T extends ElementType> = {
  as?: T;
  variant?: Variant;
  size?: Size;
  loading?: boolean;
  children?: ReactNode;
  className?: string;
} & Omit<ComponentPropsWithoutRef<T>, "as" | "className" | "children">;

/**
 * Botão da casa. Substitui os três formatos que estavam duplicados inline
 * em ~10 páginas (primário 42/36px, secundário com borda, ghost).
 *
 * `as` permite render como Link ou <a> sem perder o estilo — o padrão que
 * antes exigia copiar o objeto de estilo para dentro do link.
 */
export function Button<T extends ElementType = "button">({
  as,
  variant = "primary",
  size = "md",
  loading = false,
  children,
  className = "",
  ...rest
}: ButtonProps<T>) {
  const Tag = (as ?? "button") as ElementType;
  const classes = `lg-btn lg-btn--${size} lg-btn--${variant} ${className}`.trim();
  const isNativeButton = Tag === "button";

  return (
    <Tag
      className={classes}
      {...(isNativeButton ? { disabled: loading || (rest as { disabled?: boolean }).disabled } : {})}
      {...(loading ? { "aria-busy": true } : {})}
      {...rest}
    >
      {children}
    </Tag>
  );
}

export default Button;
