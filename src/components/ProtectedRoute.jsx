import { Navigate, Outlet, Link, useLocation, useOutletContext } from "react-router-dom";
import { useState } from "react";
import { useAuth } from "../contexts/AuthContext.jsx";
import { homeFor, isKnownRole, requestedDestination } from "../auth/access.js";

export function AccessDenied() {
  const { profile } = useAuth();
  return <main style={{ padding: 40 }}><h1>Acesso não autorizado</h1><p>Seu papel não permite acessar esta página.</p><Link to={homeFor(profile)}>Voltar para minha área</Link></main>;
}

function IdentityError() {
  const { error, session, refreshProfile, signOut } = useAuth();
  const [logoutError, setLogoutError] = useState("");
  const messages = {
    network: "Falha de conexão. Tente novamente.",
    rls: "O banco recusou o acesso ao perfil. Solicite a revisão das permissões.",
    invalid_session: "Sua sessão não é válida. Saia e entre novamente.",
    profile_unavailable: "Perfil não encontrado ou sem acesso. Solicite a verificação do cadastro.",
    invalid_profile: "Perfil com papel ou identidade inválidos. Solicite a revisão do cadastro.",
  };
  return <main style={{ padding: 40 }}><h1>Não foi possível verificar seu acesso</h1>
    <p role="alert">{messages[error?.kind] || "Falha ao carregar sua identidade. Tente novamente ou contate a administração."}</p>
    <button onClick={() => session ? refreshProfile() : window.location.reload()}>Tentar novamente</button>{" "}
    {session && <button onClick={async () => { try { await signOut(); } catch { setLogoutError("Não foi possível sair. Tente novamente."); } }}>Sair</button>}
    {logoutError && <p role="alert">{logoutError}</p>}
  </main>;
}

function IdentityPending() {
  const { status } = useAuth();
  return <div role="status" style={{ padding: 40 }}>{status === "session_loading" ? "Carregando sessão…" : "Verificando perfil…"}</div>;
}

export function AuthenticatedRoute({ children }) {
  const { session, profile, status, recovery } = useAuth();
  const location = useLocation();
  if (["session_loading", "profile_loading"].includes(status)) return <IdentityPending />;
  if (["session_error", "profile_error"].includes(status)) return <IdentityError />;
  if (!session) return <Navigate to="/login" replace state={{ from: { pathname: location.pathname, search: location.search, hash: location.hash } }} />;
  if (recovery) return <Navigate to="/reset-password" replace />;
  if (status !== "authenticated" || !profile || profile.id !== session.user.id || !isKnownRole(profile.role)) return <IdentityError />;
  return children || <Outlet />;
}

export function RoleRoute({ allowedRoles = [], children }) {
  return <AuthenticatedRoute><RoleCheck allowedRoles={allowedRoles}>{children}</RoleCheck></AuthenticatedRoute>;
}

function RoleCheck({ allowedRoles, children }) {
  const { profile } = useAuth();
  const outletContext = useOutletContext();
  if (!allowedRoles.includes(profile?.role)) return <AccessDenied />;
  return children || <Outlet context={outletContext} />;
}

export function GuestRoute({ children }) {
  const { session, profile, status, recovery } = useAuth();
  const location = useLocation();
  if (["session_loading", "profile_loading"].includes(status)) return <IdentityPending />;
  if (recovery && session) return <Navigate to="/reset-password" replace />;
  if (["session_error", "profile_error"].includes(status)) return <IdentityError />;
  if (!session) return children;
  if (status !== "authenticated" || !profile || profile.id !== session.user.id || !isKnownRole(profile.role)) return <IdentityError />;
  return <Navigate replace to={requestedDestination(location.state?.from, profile)} />;
}

export default function ProtectedRoute({ children, allowedRoles }) {
  return allowedRoles ? <RoleRoute allowedRoles={allowedRoles}>{children}</RoleRoute> : <AuthenticatedRoute>{children}</AuthenticatedRoute>;
}
