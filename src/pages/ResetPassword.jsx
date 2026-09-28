import { useRef, useState } from "react";
import { useNavigate, useLocation, Link } from "react-router-dom";
import { KeyRound } from "lucide-react";
import { useAuth } from "../contexts/AuthContext.jsx";
import { authMessage } from "../auth/messages.js";

export default function ResetPassword() {
  const navigate = useNavigate();
  const location = useLocation();
  const { recovery, status, updatePassword, signOut } = useAuth();
  const linkParams = new URLSearchParams(location.search || location.hash.replace(/^#/, ""));
  const invalidLink = linkParams.has("error") || linkParams.has("error_code");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const inFlight = useRef(false);

  async function handleSubmit(e) {
    e.preventDefault();
    if (inFlight.current) return;
    setError("");
    if (password.length < 6) {
      setError("A senha deve ter pelo menos 6 caracteres.");
      return;
    }
    if (password !== confirm) {
      setError("As senhas não coincidem.");
      return;
    }
    inFlight.current = true;
    setSubmitting(true);
    try {
      await updatePassword(password);
      try {
        await signOut();
      } catch {
        setError("Senha atualizada, mas não foi possível encerrar a sessão. Tente sair e entrar novamente.");
        return;
      }
      navigate("/login", { replace: true, state: { passwordUpdated: true } });
    } catch (err) {
      setError(authMessage(err, "password-update"));
    } finally {
      inFlight.current = false;
      setSubmitting(false);
    }
  }

  return (
    <div style={{
      display: "flex", alignItems: "center", justifyContent: "center",
      minHeight: "100vh",
      background: "radial-gradient(circle at 50% 30%, rgba(255,75,31,.06), transparent 50%), var(--bg)"
    }}>
      <div style={{
        width: "min(400px, 92vw)", padding: 36,
        borderRadius: "var(--radius-lg)",
        border: "1px solid var(--line-soft)",
        background: "var(--surface)"
      }}>
        <div style={{ textAlign: "center", marginBottom: 32 }}>
          <div style={{
            display: "grid", placeItems: "center", width: 52, height: 52,
            margin: "0 auto 16px", borderRadius: 14,
            background: "var(--accent-soft)", color: "var(--accent)"
          }}>
            <KeyRound size={22} />
          </div>
          <h1 style={{
            margin: 0, fontFamily: "var(--font-heading)", fontSize: 22,
            fontWeight: 550, letterSpacing: "-.02em"
          }}><span className="gradient-text">Nova senha</span></h1>
          <p style={{ color: "var(--muted)", fontSize: 12, margin: "6px 0 0" }}>
            Defina sua nova senha para continuar
          </p>
        </div>

        {status === "session_loading" ? <p role="status" style={{ color: "var(--muted)", fontSize: 12 }}>Verificando link de recuperação…</p> : !recovery || invalidLink ? (
          <div style={{
            padding: "12px 14px", borderRadius: "var(--radius-sm)",
            background: "var(--surface-2)", color: "var(--muted)", fontSize: 12,
            lineHeight: 1.6
          }}>
            {invalidLink ? "O link de recuperação é inválido ou expirou. Solicite outro link em Entrar." : "Acesse o link enviado por email para redefinir sua senha. Se ele expirou, solicite outro em Entrar."}
          </div>
        ) : (
          <form onSubmit={handleSubmit}>
            {error && (
              <div style={{
                padding: "10px 14px", marginBottom: 16, borderRadius: "var(--radius-sm)",
                background: "rgba(199,107,96,.12)", border: "1px solid rgba(199,107,96,.25)",
                color: "#c76b60", fontSize: 12
              }}>{error}</div>
            )}

            <div style={{ marginBottom: 16 }}>
              <label htmlFor="reset-password" style={{
                display: "block", marginBottom: 6, color: "var(--muted)",
                fontSize: 12, fontWeight: 600
              }}>Nova senha</label>
              <input id="reset-password" type="password" autoComplete="new-password" required minLength={6} autoFocus
                value={password} onChange={e => setPassword(e.target.value)}
                style={{
                  width: "100%", height: 42, padding: "0 14px",
                  border: "1px solid var(--line)", borderRadius: "var(--radius-sm)",
                  outline: "none", color: "var(--text)", background: "var(--bg)",
                  transition: "border var(--transition)"
                }} />
            </div>

            <div style={{ marginBottom: 24 }}>
              <label htmlFor="reset-password-confirm" style={{
                display: "block", marginBottom: 6, color: "var(--muted)",
                fontSize: 12, fontWeight: 600
              }}>Confirmar nova senha</label>
              <input id="reset-password-confirm" type="password" autoComplete="new-password" required minLength={6}
                value={confirm} onChange={e => setConfirm(e.target.value)}
                style={{
                  width: "100%", height: 42, padding: "0 14px",
                  border: "1px solid var(--line)", borderRadius: "var(--radius-sm)",
                  outline: "none", color: "var(--text)", background: "var(--bg)",
                  transition: "border var(--transition)"
                }} />
            </div>

            <button type="submit" disabled={submitting}
              style={{
                width: "100%", height: 42, border: 0, borderRadius: "var(--radius-sm)",
                color: "#fff", background: submitting ? "var(--muted-2)" : "var(--accent)",
                cursor: submitting ? "not-allowed" : "pointer",
                fontSize: 14, fontWeight: 600, fontFamily: "var(--font-body)",
                transition: "background var(--transition)"
              }}>
              {submitting ? "Salvando..." : "Salvar nova senha"}
            </button>
          </form>
        )}

        <div style={{ textAlign: "center", marginTop: 20 }}>
          <Link to="/login" style={{
            color: "var(--accent)", fontSize: 12, fontWeight: 600,
            textDecoration: "none"
          }}>
            Voltar para entrar
          </Link>
        </div>
      </div>
    </div>
  );
}
