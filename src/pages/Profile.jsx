import { useState } from "react";
import { useOutletContext } from "react-router-dom";
import { Menu } from "lucide-react";
import { useAuth } from "../contexts/AuthContext.jsx";
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
    {profile.role === "visitante" && <p>Bem-vindo à Ligia. Sua conta dá acesso ao seu perfil. Conteúdos e trilhas ainda não estão disponíveis.</p>}
    <div className="access-actions"><button className="access-action" onClick={() => setEditing(true)}>Editar meu perfil</button></div>
    {editing && <ProfileEdit open onClose={() => setEditing(false)} />}
  </main>;
}
