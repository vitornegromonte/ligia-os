import { useOutletContext } from "react-router-dom";
import { Menu, Search } from "lucide-react";
import type { ReactNode } from "react";
import NotificationsBell from "../components/NotificationsBell.jsx";
import { openGlobalSearch } from "../utils/searchBus.js";
import { IconButton } from "./IconButton.tsx";

type ShellContext = { menuOpen: boolean; setMenuOpen: (open: boolean) => void };

export type TopbarProps = {
  /** Segmento em negrito do breadcrumb — "Ligia / <crumb>". */
  crumb: string;
  /** Substitui as ações padrão (busca + notificações). */
  actions?: ReactNode;
};

/**
 * Barra superior fixa de toda página protegida.
 *
 * Existe por dois motivos. O bloco era byte-idêntico em ~10 páginas, e cada
 * cópia tinha que lembrar de puxar `setMenuOpen` do outlet context — uma
 * página que esquecesse isso renderizava um hambúrguer morto. Aqui a
 * convenção é cumprida por construção.
 */
export function Topbar({ crumb, actions }: TopbarProps) {
  const { setMenuOpen } = useOutletContext<ShellContext>();

  return (
    <header className="lg-topbar">
      <button
        type="button"
        className="mobile-menu"
        onClick={() => setMenuOpen(true)}
        aria-label="Abrir navegação"
      >
        <Menu size={20} aria-hidden />
      </button>

      <div className="lg-topbar__crumb">
        Ligia &nbsp;/&nbsp; <strong>{crumb}</strong>
      </div>

      <div className="lg-topbar__actions">
        {actions ?? (
          <>
            <IconButton
              icon={Search}
              label="Buscar"
              title="Buscar (Ctrl+K)"
              bare
              onClick={openGlobalSearch}
            />
            <NotificationsBell />
          </>
        )}
      </div>
    </header>
  );
}

export default Topbar;
