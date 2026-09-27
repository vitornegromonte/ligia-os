import { useEffect, useState } from "react";
import { fetchMembershipRequests, reviewMembershipRequest } from "../services/membership.js";

export default function MembershipAdmin() {
  const [requests, setRequests] = useState([]);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(null);
  useEffect(() => {
    fetchMembershipRequests().then(setRequests).catch(e => setError(e.message));
  }, []);

  async function review(id, approve) {
    if (busy) return;
    setBusy(id);
    setError("");
    try {
      const updated = await reviewMembershipRequest(id, approve);
      setRequests(previous => previous.map(r => r.id === id ? updated : r));
    } catch (e) { setError(e.message); }
    finally { setBusy(null); }
  }

  return <main className="lg-page" style={{ maxWidth: 1100, padding: 32 }}>
    <h1>Solicitações de entrada</h1>
    <p>A aprovação concede acesso interno e registra a análise na mesma transação.</p>
    {error && <p role="alert">{error}</p>}
    {requests.length === 0 && !error && <p>Nenhuma solicitação encontrada.</p>}
    <div style={{ display: "grid", gap: 16 }}>
      {requests.map(r => <article key={r.id} style={{ border: "1px solid var(--line)", borderRadius: 12, padding: 20 }}>
        <h2>{r.details.name}</h2>
        <p>Equipe: {r.details.team} · Área: {r.details.discipline} · Instituição: {r.details.affiliation || "Não informada"}</p>
        <p>Solicitada em {new Date(r.requested_at).toLocaleString("pt-BR")} · {r.status}</p>
        <p><strong>Motivação:</strong> {r.details.motivation}</p>
        {r.details.bio && <p><strong>Sobre:</strong> {r.details.bio}</p>}
        {r.details.github && <p>GitHub: {r.details.github}</p>}
        {r.details.linkedin && <p>LinkedIn: {r.details.linkedin}</p>}
        {r.status === "pending" && <div style={{ display: "flex", gap: 12 }}>
          <button disabled={busy === r.id} onClick={() => review(r.id, true)}>Aprovar</button>
          <button disabled={busy === r.id} onClick={() => review(r.id, false)}>Rejeitar</button>
        </div>}
        {r.reviewed_at && <p>Analisada em {new Date(r.reviewed_at).toLocaleString("pt-BR")}</p>}
      </article>)}
    </div>
  </main>;
}
