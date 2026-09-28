import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext.jsx";
import { isExternal } from "../auth/access.js";
import { fetchMyMembershipRequests, membershipMessage, submitMembershipRequest } from "../services/membership.js";

const fields = [
  ["name", "Nome completo", true],
  ["team", "Equipe", true],
  ["discipline", "Área de atuação", true],
  ["affiliation", "Instituição/vínculo", false],
  ["bio", "Sobre você", false],
  ["github", "GitHub", false],
  ["linkedin", "LinkedIn", false],
];

export default function MembershipRequest() {
  const { profile, refreshProfile } = useAuth();
  const [requests, setRequests] = useState([]);
  const [form, setForm] = useState({
    name: profile?.name || "",
    team: profile?.team === "Geral" ? "" : profile?.team || "",
    discipline: profile?.discipline === "Geral" ? "" : profile?.discipline || "",
    affiliation: profile?.affiliation || "",
    bio: profile?.bio || "",
    github: profile?.github || "",
    linkedin: profile?.linkedin || "",
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [memberConfirmed, setMemberConfirmed] = useState(false);
  const inFlight = useRef(false);

  useEffect(() => {
    let active = true;
    fetchMyMembershipRequests(profile.id).then(data => { if (active) setRequests(data); })
      .catch(e => { if (active) setError(membershipMessage(e, "load")); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [profile.id]);

  const pending = profile.status_membro === "pending" || requests.some(r => r.status === "pending");
  async function submit(event) {
    event.preventDefault();
    if (inFlight.current || pending) return;
    if (!memberConfirmed) {
      setError("Confirme que você já é membro efetivo da Ligia para solicitar o acesso interno.");
      return;
    }
    inFlight.current = true;
    setSaving(true);
    setError("");
    try {
      const created = await submitMembershipRequest(form);
      setRequests(previous => [created, ...previous]);
      refreshProfile();
    } catch (e) {
      setError(membershipMessage(e, "submit"));
    } finally {
      inFlight.current = false;
      setSaving(false);
    }
  }

  return <main className="lg-page" style={{ maxWidth: 820, padding: 32 }}>
    <h1>Solicitar acesso interno de membro</h1>
    <p>Esta solicitação é exclusiva para quem já é membro efetivo da Ligia e precisa liberar o acesso interno à plataforma. Se você não é membro da Ligia, continue usando Aprender e Prática Torch com seu acesso de Externo.</p>
    {!isExternal(profile) ? <p>Seu perfil já possui acesso interno. <Link to="/inicio">Ir para o início</Link></p>
      : loading ? <p role="status">Carregando solicitação…</p>
        : pending ? <section role="status">
          <h2>Aguardando validação do acesso</h2>
          <p>Você continua como Externo e pode usar Aprender e Prática Torch enquanto um Diretor ou Coordenador confirma seu vínculo de membro.</p>
        </section>
          : <>
            {profile.status_membro === "rejected" && <p>O acesso interno não foi validado. Você continua como Externo. Se seu vínculo já existe, confira seus dados e solicite a liberação novamente.</p>}
            <p>Informe os dados que ajudam a Diretoria a reconhecer e validar seu vínculo. Nome, equipe e área são necessários; instituição, bio e links são opcionais.</p>
            <form onSubmit={submit} style={{ display: "grid", gap: 16, marginTop: 24 }}>
              {fields.map(([key, label, required]) => <label key={key} style={{ display: "grid", gap: 6 }}>
                {label}<input required={required} minLength={required ? 2 : undefined} value={form[key]} onChange={e => setForm(previous => ({ ...previous, [key]: e.target.value }))} />
              </label>)}
              <label style={{ display: "flex", alignItems: "flex-start", gap: 10 }}>
                <input type="checkbox" checked={memberConfirmed} onChange={e => setMemberConfirmed(e.target.checked)} />
                <span>Confirmo que já sou membro efetivo da Ligia e estou solicitando a liberação do meu acesso interno.</span>
              </label>
              <button className="access-action" disabled={saving || !memberConfirmed} type="submit">{saving ? "Enviando…" : "Solicitar acesso interno"}</button>
            </form>
          </>}
    {error && <p role="alert">{error}</p>}
    {requests.length > 0 && <section style={{ marginTop: 32 }}><h2>Histórico de solicitações de acesso</h2><ul>
      {requests.map(r => <li key={r.id}>{new Date(r.requested_at).toLocaleDateString("pt-BR")} — {r.status === "rejected" ? "acesso não validado" : r.status === "approved" ? "acesso liberado" : "aguardando validação"}</li>)}
    </ul></section>}
  </main>;
}
