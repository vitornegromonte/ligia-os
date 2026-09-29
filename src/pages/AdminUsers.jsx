import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Search, ShieldCheck, Users } from "lucide-react";
import { useAuth } from "../contexts/AuthContext.jsx";
import { fetchProfiles, updateRole } from "../services/profiles.js";
import { MEMBERSHIP_LABELS, ROLE_LABELS, roleActionsFor } from "../auth/roleActions.js";
import "./AdminUsers.css";

export default function AdminUsers() {
  const { profile } = useAuth();
  const [people, setPeople] = useState([]);
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [pending, setPending] = useState(null);
  const [saving, setSaving] = useState(false);
  useEffect(() => {
    let active = true;
    fetchProfiles().then(data => { if (active) setPeople(data); })
      .catch(() => { if (active) setError("Não foi possível carregar os usuários. Tente novamente."); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, []);
  const filtered = useMemo(() => {
    const term = query.trim().toLocaleLowerCase("pt-BR");
    return people.filter(person => !term || [person.name, person.email].some(value => value?.toLocaleLowerCase("pt-BR").includes(term)))
      .sort((a, b) => a.name.localeCompare(b.name, "pt-BR"));
  }, [people, query]);

  async function changeRole() {
    if (!pending || saving) return;
    const person = people.find(item => item.id === pending.id);
    if (!roleActionsFor(person, profile?.id).includes(pending.role)) { setPending(null); return; }
    setSaving(true);
    setError("");
    try {
      const updated = await updateRole(pending.id, pending.role);
      setPeople(previous => previous.map(item => item.id === updated.id ? updated : item));
      setPending(null);
    } catch {
      setError("Não foi possível alterar o cargo. Verifique se o perfil ainda está elegível e tente novamente.");
    } finally { setSaving(false); }
  }

  return <main className="lg-page admin-users">
    <header className="admin-users__header">
      <div className="admin-users__mark"><ShieldCheck size={20} aria-hidden="true" /></div>
      <div><p className="admin-users__eyebrow">Administração</p><h1>Gestão de usuários e cargos</h1>
        <p>Consulte o acesso de cada pessoa e gerencie cargos após a aprovação como Membro.</p></div>
    </header>
    <div className="admin-users__toolbar lg-card lg-card--md">
      <div><strong>{people.length}</strong><span> usuários cadastrados</span></div>
      <label className="admin-users__search"><Search size={18} aria-hidden="true" />
        <span className="sr-only">Pesquisar por nome ou email</span>
        <input className="lg-input" type="search" placeholder="Pesquisar por nome ou email" value={query} onChange={event => setQuery(event.target.value)} />
      </label>
    </div>
    {error && <p className="admin-users__error" role="alert">{error}</p>}
    {loading && <p role="status">Carregando usuários…</p>}
    {!loading && filtered.length === 0 && <div className="admin-users__empty lg-card lg-card--md"><Users size={22} aria-hidden="true" /><p>Nenhum usuário encontrado.</p></div>}
    {!loading && filtered.length > 0 && <div className="admin-users__list">
      {filtered.map(person => {
        const actions = roleActionsFor(person, profile?.id);
        return <article className="admin-users__person lg-card" key={person.id}>
          <div className="admin-users__identity"><h2>{person.name}</h2><p>{person.email}</p></div>
          <div className="admin-users__badges">
            <span className={`admin-users__badge admin-users__badge--${person.role}`}>{ROLE_LABELS[person.role] || person.role}</span>
            <span className="admin-users__status">{MEMBERSHIP_LABELS[person.status_membro] || person.status_membro}</span>
          </div>
          <div className="admin-users__actions">
            {actions.map(role => <button className="lg-btn lg-btn--secondary lg-btn--sm" key={role} disabled={saving}
              onClick={() => setPending({ id: person.id, role })}>
              {role === "membro" ? "Rebaixar a Membro" : `Alterar para ${ROLE_LABELS[role]}`}
            </button>)}
            {person.role === "externo" && <span className="admin-users__hint">Acesso de Membro necessário. <Link to="/admin/solicitacoes">Ver solicitações</Link></span>}
            {person.id === profile?.id && <span className="admin-users__hint">Sua conta</span>}
            {person.status_membro === "pending" && <span className="admin-users__hint">Solicitação em análise</span>}
          </div>
          {pending?.id === person.id && <div className="admin-users__confirm" role="group" aria-label="Confirmar alteração de cargo">
            <p>Alterar o cargo de <strong>{person.name}</strong> para <strong>{ROLE_LABELS[pending.role]}</strong>?</p>
            <button className="lg-btn lg-btn--primary lg-btn--sm" disabled={saving} onClick={changeRole}>{saving ? "Salvando…" : "Confirmar alteração"}</button>
            <button className="lg-btn lg-btn--ghost lg-btn--sm" disabled={saving} onClick={() => setPending(null)}>Cancelar</button>
          </div>}
        </article>;
      })}
    </div>}
  </main>;
}
