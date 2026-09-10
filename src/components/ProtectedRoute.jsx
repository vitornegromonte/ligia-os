import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext.jsx";

export default function ProtectedRoute({ children, allowedRoles }) {
  const { session, profile, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return <div style={{ minHeight: "100vh", background: "var(--bg)" }} />;
  }

  if (!session) {
    // `state.from` permite ao /login devolver o usuário à página pretendida
    // depois de entrar, em vez de despejá-lo sempre no mesmo lugar.
    return <Navigate to="/login" replace state={{ from: location }} />;
  }

  // Antes: `allowedRoles && profile && !allowedRoles.includes(profile.role)`.
  // Quando o perfil falhava em carregar (erro de rede, RLS), `profile` era
  // null, a condição inteira era falsa e a rota liberava — falha ABERTA.
  // Sem perfil não há papel comprovado, então nega.
  if (allowedRoles && !allowedRoles.includes(profile?.role)) {
    return (
      <div style={{
        display: "flex", flexDirection: "column", alignItems: "center",
        justifyContent: "center", height: "100vh", gap: 12,
        color: "var(--muted)", fontSize: 14
      }}>
        <div style={{ fontSize: 40 }} aria-hidden>🔒</div>
        <div>Acesso restrito</div>
        <div style={{ color: "var(--muted-2)", fontSize: 12 }}>
          {profile
            ? "Você não tem permissão para acessar esta página."
            : "Não conseguimos carregar seu perfil. Recarregue a página ou entre novamente."}
        </div>
      </div>
    );
  }

  return children;
}
