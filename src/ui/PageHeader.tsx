import type { ReactNode } from "react";

export type PageHeaderProps = {
  /** Rótulo pequeno em maiúsculas acima do título. */
  eyebrow?: string;
  /**
   * Título da página. O idioma da casa é uma palavra com ponto final,
   * em gradiente — "Notas.", "Agenda.", "Trilha."
   */
  title: string;
  /** Texto claro após a parte em gradiente, quando o título tem duas partes. */
  titleTail?: string;
  lede?: ReactNode;
  actions?: ReactNode;
};

export function PageHeader({ eyebrow, title, titleTail, lede, actions }: PageHeaderProps) {
  return (
    <div className="lg-page-header">
      {eyebrow && <div className="eyebrow lg-page-header__eyebrow">{eyebrow}</div>}
      <h1 className="lg-page-header__title">
        <span className="gradient-text">{title}</span>
        {titleTail && <span> {titleTail}</span>}
      </h1>
      <div className="gradient-bar lg-page-header__bar" />
      {lede && <p className="lg-page-header__lede">{lede}</p>}
      {actions && <div style={{ display: "flex", gap: 8, marginTop: 16 }}>{actions}</div>}
    </div>
  );
}

export default PageHeader;
