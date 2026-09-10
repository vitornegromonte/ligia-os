import { useId } from "react";
import type { ComponentPropsWithoutRef, ReactNode } from "react";

export type FieldProps = {
  label: string;
  hint?: string;
  error?: string;
  children: (props: { id: string; "aria-describedby"?: string; "aria-invalid"?: boolean }) => ReactNode;
  className?: string;
};

/**
 * Label + controle + hint/erro, com os `aria-describedby` e `aria-invalid`
 * ligados corretamente. Antes cada página redeclarava um `function Field()`
 * local que só renderizava o label.
 */
export function Field({ label, hint, error, children, className = "" }: FieldProps) {
  const id = useId();
  const hintId = hint ? `${id}-hint` : undefined;
  const errorId = error ? `${id}-error` : undefined;
  const describedBy = [errorId, hintId].filter(Boolean).join(" ") || undefined;

  return (
    <div className={`lg-field ${className}`.trim()}>
      <label className="lg-field__label" htmlFor={id}>
        {label}
      </label>
      {children({ id, "aria-describedby": describedBy, "aria-invalid": error ? true : undefined })}
      {error && (
        <p className="lg-field__error" id={errorId} role="alert">
          {error}
        </p>
      )}
      {hint && !error && (
        <p className="lg-field__hint" id={hintId}>
          {hint}
        </p>
      )}
    </div>
  );
}

export type InputProps = {
  size?: "sm" | "md";
  invalid?: boolean;
  className?: string;
} & Omit<ComponentPropsWithoutRef<"input">, "size" | "className">;

export function Input({ size = "md", invalid = false, className = "", ...rest }: InputProps) {
  const classes = [
    "lg-input",
    size === "sm" ? "lg-input--sm" : "",
    invalid ? "lg-input--invalid" : "",
    className,
  ]
    .filter(Boolean)
    .join(" ");
  return <input className={classes} {...rest} />;
}

export type TextareaProps = {
  invalid?: boolean;
  className?: string;
} & Omit<ComponentPropsWithoutRef<"textarea">, "className">;

export function Textarea({ invalid = false, className = "", ...rest }: TextareaProps) {
  return (
    <textarea
      className={`lg-input${invalid ? " lg-input--invalid" : ""} ${className}`.trim()}
      {...rest}
    />
  );
}

export default Field;
