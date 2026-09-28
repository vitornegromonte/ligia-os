import { UsersRound } from "lucide-react";
import { Link } from "react-router-dom";
import { Button } from "../ui/Button.tsx";
import { Card } from "../ui/Card.tsx";
import "./MemberAccessCard.css";

export default function MemberAccessCard({ status }) {
  const pending = status === "pending";
  const rejected = status === "rejected";
  const state = pending ? "pending" : rejected ? "rejected" : "default";

  return <section className={`member-access member-access--${state}`} aria-labelledby="member-access-title">
    <Card padding="md" className="member-access__card">
      <div className="member-access__icon" aria-hidden="true"><UsersRound size={20} strokeWidth={1.8} /></div>
      <div className="member-access__body">
        <div className="member-access__heading">
          <h2 id="member-access-title" className="member-access__title">Acesso de membro</h2>
          {pending && <span className="member-access__badge member-access__badge--pending">Em análise</span>}
          {rejected && <span className="member-access__badge member-access__badge--rejected">Acesso não validado</span>}
        </div>
        <p className="member-access__description">Você pode acessar Aprender e Prática Torch com seu perfil de Externo.</p>
        {pending
          ? <p className="member-access__state">Aguardando validação do acesso interno.</p>
          : rejected
            ? <p className="member-access__state">Se você já é membro efetivo da Ligia, confira seus dados e solicite a liberação novamente.</p>
            : <p className="member-access__state">O acesso interno é para quem já é membro efetivo da Ligia.</p>}
        <Button
          as={Link}
          to="/solicitar-entrada"
          variant={pending ? "secondary" : "primary"}
          className="member-access__cta"
        >
          {pending ? "Ver solicitação" : "Solicite acesso interno"}
        </Button>
      </div>
    </Card>
  </section>;
}
