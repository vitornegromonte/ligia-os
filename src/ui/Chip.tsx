import type { ComponentPropsWithoutRef, ReactNode } from "react";

export type ChipProps = {
  selected?: boolean;
  /** Chip decorativo (não clicável): vira <span>, sem cursor de ponteiro. */
  static?: boolean;
  children: ReactNode;
  className?: string;
} & Omit<ComponentPropsWithoutRef<"button">, "className" | "children">;

export function Chip({
  selected = false,
  static: isStatic = false,
  children,
  className = "",
  ...rest
}: ChipProps) {
  const classes = [
    "lg-chip",
    selected ? "lg-chip--selected" : "",
    isStatic ? "lg-chip--static" : "",
    className,
  ]
    .filter(Boolean)
    .join(" ");

  if (isStatic) return <span className={classes}>{children}</span>;

  return (
    <button type="button" className={classes} aria-pressed={selected} {...rest}>
      {children}
    </button>
  );
}

export default Chip;
