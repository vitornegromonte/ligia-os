import type { ComponentPropsWithoutRef, ElementType, ReactNode } from "react";

export type CardProps<T extends ElementType> = {
  as?: T;
  padding?: "sm" | "md" | "none";
  /** Card clicável: ganha hover, cursor e focus ring. */
  interactive?: boolean;
  children?: ReactNode;
  className?: string;
} & Omit<ComponentPropsWithoutRef<T>, "as" | "className" | "children">;

export function Card<T extends ElementType = "div">({
  as,
  padding = "md",
  interactive = false,
  children,
  className = "",
  ...rest
}: CardProps<T>) {
  const Tag = (as ?? "div") as ElementType;
  const classes = [
    "lg-card",
    padding !== "none" ? `lg-card--${padding}` : "",
    interactive ? "lg-card--interactive" : "",
    className,
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <Tag className={classes} {...(interactive && Tag === "div" ? { tabIndex: 0 } : {})} {...rest}>
      {children}
    </Tag>
  );
}

export default Card;
