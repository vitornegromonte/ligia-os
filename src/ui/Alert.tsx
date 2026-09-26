import type { ReactNode } from "react";

export type AlertProps = {
  tone?: "error" | "success" | "info" | "warning";
  children: ReactNode;
  className?: string;
};

export function Alert({ tone = "info", children, className = "" }: AlertProps) {
  return (
    <div
      className={`lg-alert lg-alert--${tone} ${className}`.trim()}
      role={tone === "error" ? "alert" : "status"}
      aria-live="polite"
    >
      {children}
    </div>
  );
}

export default Alert;
