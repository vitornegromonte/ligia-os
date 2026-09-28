import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext.jsx";
import { isExternal } from "../auth/access.js";
import { fetchMyMembershipRequests, membershipMessage, submitMembershipRequest } from "../services/membership.js";
import AreaMultiSelect, { PROFILE_AREAS } from "../components/AreaMultiSelect.jsx";
import { Field, Input } from "../ui/Field.tsx";
import { Button } from "../ui/Button.tsx";
import { Alert } from "../ui/Alert.tsx";
import "./MembershipRequest.css";

export default function MembershipRequest() {
  const { profile, refreshProfile } = useAuth();
  const [requests, setRequests] = useState([]);
  const [form, setForm] = useState({
    name: profile?.name || "",
    team: profile?.team === "Geral" ? "" : profile?.team || "",
    discipline: profile?.discipline === "Geral" ? [] : (profile?.discipline || "").split(",").map(area => area.trim()).filter(area => PROFILE_AREAS.includes(area)),
    affiliation: profile?.affiliation || "",
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
      const created = await submitMembershipRequest({ ...form, discipline: form.discipline.join(", ") });
      setRequests(previous => [created, ...previous]);
      refreshProfile();
    } catch (e) {
      setError(membershipMessage(e, "submit"));
    } finally {
      inFlight.current = false;
      setSaving(false);
    }
  }

  const selectedAreas = Array.isArray(form.discipline) ? form.discipline : String(form.discipline || "").split(",").map(area => area.trim()).filter(area => PROFILE_AREAS.includes(area));

  return <main className="lg-page membership-request-page">
    <header className="lg-page-header">
      <p className="lg-page-header__eyebrow">Acesso à comunidade</p>
      <h1 className="lg-page-header__title">Solicitar acesso interno</h1>
      <p className="lg-page-header__lede">Esta solicitação é exclusiva para quem já é membro efetivo da Ligia e precisa liberar o acesso interno à plataforma. Se você não é membro da Ligia, continue usando Aprender e Prática Torch com seu acesso de Externo.</p>
    </header>
    {!isExternal(profile) ? <p>Seu perfil já possui acesso interno. <Link to="/inicio">Ir para o início</Link></p>
      : loading ? <p role="status">Carregando solicitação…</p>
        : pending ? <section role="status">
          <h2>Aguardando validação do acesso</h2>
          <p>Você continua como Externo e pode usar Aprender e Prática Torch enquanto um Diretor ou Coordenador confirma seu vínculo de membro.</p>
        </section>
          : <>
            {profile.status_membro === "rejected" && <p>O acesso interno não foi validado. Você continua como Externo. Se seu vínculo já existe, confira seus dados e solicite a liberação novamente.</p>}
            <section className="lg-card lg-card--md membership-request-card">
            <p className="membership-request-card__intro">Informe os dados que ajudam a Diretoria a reconhecer e validar seu vínculo. Nome, equipe e área são necessários; instituição e links são opcionais.</p>
            <form onSubmit={submit} className="membership-request-form">
              <Field label="Nome completo">{p => <Input required minLength={2} autoComplete="name" value={form.name} onChange={e => setForm(previous => ({ ...previous, name: e.target.value }))} {...p} />}</Field>
              <Field label="Equipe">{p => <Input required minLength={2} value={form.team} onChange={e => setForm(previous => ({ ...previous, team: e.target.value }))} {...p} />}</Field>
              <AreaMultiSelect required value={selectedAreas} onChange={areas => setForm(previous => ({ ...previous, discipline: areas }))} />
              <Field label="Instituição/vínculo" hint="Opcional">{p => <Input autoComplete="organization" value={form.affiliation} onChange={e => setForm(previous => ({ ...previous, affiliation: e.target.value }))} {...p} />}</Field>
              <div className="membership-request-form__links">
                <Field label="GitHub" hint="Opcional">{p => <Input type="url" value={form.github} onChange={e => setForm(previous => ({ ...previous, github: e.target.value }))} {...p} />}</Field>
                <Field label="LinkedIn" hint="Opcional">{p => <Input type="url" value={form.linkedin} onChange={e => setForm(previous => ({ ...previous, linkedin: e.target.value }))} {...p} />}</Field>
              </div>
              <label style={{ display: "flex", alignItems: "flex-start", gap: 10 }}>
                <input type="checkbox" checked={memberConfirmed} onChange={e => setMemberConfirmed(e.target.checked)} />
                <span>Confirmo que já sou membro efetivo da Ligia e estou solicitando a liberação do meu acesso interno.</span>
              </label>
              <Button loading={saving} disabled={saving || !memberConfirmed || selectedAreas.length === 0} type="submit">{saving ? "Enviando…" : "Solicitar acesso interno"}</Button>
            </form>
            </section>
          </>}
    {error && <Alert tone="error">{error}</Alert>}
    {requests.length > 0 && <section style={{ marginTop: 32 }}><h2>Histórico de solicitações de acesso</h2><ul>
      {requests.map(r => <li key={r.id}>{new Date(r.requested_at).toLocaleDateString("pt-BR")} — {r.status === "rejected" ? "acesso não validado" : r.status === "approved" ? "acesso liberado" : "aguardando validação"}</li>)}
    </ul></section>}
  </main>;
}
