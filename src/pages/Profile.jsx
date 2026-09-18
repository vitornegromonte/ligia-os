import { useState } from "react";
import { useOutletContext } from "react-router-dom";
import { Menu } from "lucide-react";
import { useAuth } from "../contexts/AuthContext.jsx";
import ProfileEdit from "../components/ProfileEdit.jsx";

export default function Profile() {
  const { profile } = useAuth();
  const { setMenuOpen } = useOutletContext();
  const [editing, setEditing] = useState(false);
  return <main style={{ padding: 28 }}>
    <button className="mobile-menu" style={{ display: "none" }} aria-label="Abrir menu" onClick={() => setMenuOpen(true)}><Menu size={20} /></button>
    <h1>Meu perfil</h1>
    <h2>{profile.name}</h2><p>{profile.email}</p><p>Papel de acesso: {profile.role}</p>
    {profile.role === "visitante" && <p>Bem-vindo à Ligia. Sua conta dá acesso ao seu perfil. Conteúdos e trilhas ainda não estão disponíveis.</p>}
    <button onClick={() => setEditing(true)}>Editar meu perfil</button>
    {editing && <ProfileEdit open onClose={() => setEditing(false)} />}
  </main>;
}
