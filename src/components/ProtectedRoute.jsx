import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext.jsx";

/**
 * Modo de preview sem login, para navegar a interface sem um Supabase.
 *
 * Duas travas, e as duas precisam valer: `import.meta.env.DEV` e o modo
 * `sem-login` (`npm run dev:sem-login`). O Vite substitui `DEV` por `false`
 * no `vite build`, então este ramo inteiro é código morto em produção e o
 * minificador o remove — nenhuma variável de ambiente no deploy o religa.
 * `scripts/check-bundle-secrets.mjs` confere isso no dist.
 */
const SEM_LOGIN = import.meta.env.DEV && import.meta.env.MODE === "sem-login";

function AvisoSemLogin() {
  return (
    <div role="status" style={{
      position: "fixed", right: 12, bottom: 12, zIndex: 300,
      padding: "6px 12px", borderRadius: 999,
      border: "1px solid var(--warning)", background: "var(--review-bg)",
      color: "var(--warning)", fontSize: 11, fontWeight: 600, pointerEvents: "none"
    }}>
      Preview sem login · dados só neste navegador
    </div>
  );
}

export default function ProtectedRoute({ children, allowedRoles }) {
  const { session, profile, loading } = useAuth();
  const location = useLocation();

  if (SEM_LOGIN) {
    return (
      <>
        {children}
        <AvisoSemLogin />
      </>
    );
  }

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
