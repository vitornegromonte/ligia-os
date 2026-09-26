import type { ReactNode } from "react";

export type EmptyStateProps = {
  title: string;
  text?: string;
  action?: ReactNode;
  className?: string;
};

export function EmptyState({ title, text, action, className = "" }: EmptyStateProps) {
  return (
    <div className={`lg-empty ${className}`.trim()}>
      <p className="lg-empty__title">{title}</p>
      {text && <p className="lg-empty__text">{text}</p>}
      {action}
    </div>
  );
}

export default EmptyState;
