import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { KeyRound } from "lucide-react";
import { useAuth } from "../contexts/AuthContext.jsx";

export default function ResetPassword() {
  const navigate = useNavigate();
  const { recovery, updatePassword } = useAuth();
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    if (password.length < 6) {
      setError("A senha deve ter pelo menos 6 caracteres.");
      return;
    }
    if (password !== confirm) {
      setError("As senhas não coincidem.");
      return;
    }
    setSubmitting(true);
    try {
      await updatePassword(password);
      navigate("/login");
    } catch (err) {
      setError(err.message === "New password should be different from the old password."
        ? "A nova senha deve ser diferente da atual."
        : err.message);
    } finally {
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

        {!recovery ? (
          <div style={{
            padding: "12px 14px", borderRadius: "var(--radius-sm)",
            background: "var(--surface-2)", color: "var(--muted)", fontSize: 12,
            lineHeight: 1.6
          }}>
            Você precisa acessar o link enviado por email para redefinir sua senha.
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
              <label style={{
                display: "block", marginBottom: 6, color: "var(--muted)",
                fontSize: 12, fontWeight: 600
              }}>Nova senha</label>
              <input type="password" required autoFocus
                value={password} onChange={e => setPassword(e.target.value)}
                style={{
                  width: "100%", height: 42, padding: "0 14px",
                  border: "1px solid var(--line)", borderRadius: "var(--radius-sm)",
                  outline: "none", color: "var(--text)", background: "var(--bg)",
                  transition: "border var(--transition)"
                }} />
            </div>

            <div style={{ marginBottom: 24 }}>
              <label style={{
                display: "block", marginBottom: 6, color: "var(--muted)",
                fontSize: 12, fontWeight: 600
              }}>Confirmar nova senha</label>
              <input type="password" required
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