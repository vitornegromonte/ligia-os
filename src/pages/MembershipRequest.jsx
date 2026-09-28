import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext.jsx";
import { isExternal } from "../auth/access.js";
import { fetchMyMembershipRequests, submitMembershipRequest } from "../services/membership.js";

const fields = [
  ["name", "Nome completo", true],
  ["team", "Equipe de interesse", true],
  ["discipline", "Área de atuação", true],
  ["affiliation", "Instituição", false],
  ["bio", "Sobre você", false],
  ["github", "GitHub", false],
  ["linkedin", "LinkedIn", false],
];

export default function MembershipRequest() {
  const { profile, refreshProfile } = useAuth();
  const [requests, setRequests] = useState([]);
  const [form, setForm] = useState({ name: profile?.name || "", team: "", discipline: "", affiliation: "", bio: "", github: "", linkedin: "", motivation: "" });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;
    fetchMyMembershipRequests(profile.id).then(data => { if (active) setRequests(data); })
      .catch(e => { if (active) setError(e.message); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [profile.id]);

  const pending = profile.status_membro === "pending" || requests.some(r => r.status === "pending");
  async function submit(e) {
    e.preventDefault();
    if (saving || pending) return;
    setSaving(true);
    setError("");
    try {
      const created = await submitMembershipRequest(form);
      setRequests(previous => [created, ...previous]);
      refreshProfile();
    } catch (e) {
      setError(e.message);
    } finally { setSaving(false); }
  }

  return <main className="lg-page" style={{ maxWidth: 820, padding: 32 }}>
    <h1>Solicitar entrada como membro</h1>
    <p>Preencha seus dados agora. A equipe administrativa analisará a solicitação; até a aprovação, você continua com acesso a Aprender e Prática Torch.</p>
    {!isExternal(profile) ? <p>Você já possui acesso interno. <Link to="/inicio">Ir para o início</Link></p>
      : loading ? <p>Carregando solicitação…</p>
        : pending ? <p role="status">Solicitação em análise. Você receberá acesso interno após a aprovação.</p>
          : <>
            {profile.status_membro === "rejected" && <p>Sua solicitação anterior foi rejeitada. Você pode enviar uma nova solicitação.</p>}
            <form onSubmit={submit} style={{ display: "grid", gap: 16, marginTop: 24 }}>
              {fields.map(([key, label, required]) => <label key={key} style={{ display: "grid", gap: 6 }}>
                {label}<input required={required} value={form[key]} onChange={e => setForm({ ...form, [key]: e.target.value })} />
              </label>)}
              <label style={{ display: "grid", gap: 6 }}>Por que deseja participar?
                <textarea required minLength={20} rows={5} value={form.motivation} onChange={e => setForm({ ...form, motivation: e.target.value })} />
              </label>
              <button className="access-action" disabled={saving} type="submit">{saving ? "Enviando…" : "Enviar solicitação"}</button>
            </form>
          </>}
    {error && <p role="alert">{error}</p>}
    {requests.length > 0 && <section style={{ marginTop: 32 }}><h2>Histórico</h2><ul>
      {requests.map(r => <li key={r.id}>{new Date(r.requested_at).toLocaleDateString("pt-BR")} — {r.status}</li>)}
    </ul></section>}
  </main>;
}
