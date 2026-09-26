import { useEffect } from "react";
import { Link } from "react-router-dom";
import { Topbar } from "../ui/Topbar.tsx";
import { PageHeader } from "../ui/PageHeader.tsx";
import { Button } from "../ui/Button.tsx";

export default function NotFound() {
  useEffect(() => {
    document.title = "Ligia — Página não encontrada";
    window.scrollTo({ top: 0 });
  }, []);

  return (
    <div>
      <Topbar crumb="Não encontrado" />
      <div className="lg-page">
        <PageHeader
          eyebrow="Erro 404"
          title="Nada aqui."
          lede="O endereço que você abriu não corresponde a nenhuma página. Ele pode ter mudado de lugar, ou o link estar incompleto."
        />
        <div style={{ display: "flex", gap: 8 }}>
          <Button as={Link} to="/inicio">Ir para o início</Button>
          <Button as={Link} to="/aprender" variant="secondary">Ver a trilha</Button>
        </div>
      </div>
    </div>
  );
}
