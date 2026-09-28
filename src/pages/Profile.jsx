import { useState } from "react";
import { useOutletContext } from "react-router-dom";
import { Menu } from "lucide-react";
import { Link } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext.jsx";
import { isExternal } from "../auth/access.js";
import ProfileEdit from "../components/ProfileEdit.jsx";
import "../components/AccessState.css";

export default function Profile() {
  const { profile } = useAuth();
  const { setMenuOpen } = useOutletContext();
  const [editing, setEditing] = useState(false);
  return <main className="account-profile">
    <button className="mobile-menu access-action access-action--secondary" style={{ display: "none", marginBottom: 16 }} aria-label="Abrir menu" onClick={() => setMenuOpen(true)}><Menu size={20} /></button>
    <h1>Meu perfil</h1>
    <h2>{profile.name}</h2><p>{profile.email}</p><p>Papel de acesso: {profile.role}</p>
    {isExternal(profile) && <p>Você pode acessar Aprender e Prática Torch. <Link to="/solicitar-entrada">Solicitar entrada como membro</Link></p>}
    <div className="access-actions"><button className="access-action" onClick={() => setEditing(true)}>Editar meu perfil</button></div>
    {editing && <ProfileEdit open onClose={() => setEditing(false)} />}
  </main>;
}
