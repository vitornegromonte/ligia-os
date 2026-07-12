import { Navigate } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext.jsx";

export default function ProtectedRoute({ children, allowedRoles }) {
  const { session, profile, loading } = useAuth();

  if (loading) {
    return (
      <div style={{
        display: "flex", alignItems: "center", justifyContent: "center",
        height: "100vh", color: "var(--muted)", fontSize: 14
      }}>
        Carregando...
      </div>
    );
  }

  if (!session) {
    return <Navigate to="/login" replace />;
  }

  if (allowedRoles && profile && !allowedRoles.includes(profile.role)) {
    return (
      <div style={{
        display: "flex", flexDirection: "column", alignItems: "center",
        justifyContent: "center", height: "100vh", gap: 12,
        color: "var(--muted)", fontSize: 14
      }}>
        <div style={{ fontSize: 40 }}>🔒</div>
        <div>Acesso restrito</div>
        <div style={{ color: "var(--muted-2)", fontSize: 12 }}>
          Você não tem permissão para acessar esta página.
        </div>
      </div>
    );
  }

  return children;
}
