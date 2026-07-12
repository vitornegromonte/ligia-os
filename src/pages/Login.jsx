import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext.jsx";

export default function Login() {
  const navigate = useNavigate();
  const { signIn } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    setSubmitting(true);
    try {
      await signIn(email, password);
      navigate("/");
    } catch (err) {
      setError(err.message === "Invalid login credentials"
        ? "Email ou senha inválidos."
        : err.message
      );
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
          <img src="/media/logo.svg" alt="Ligia"
            style={{ height: 36, width: "auto", marginBottom: 16 }} />
          <h1 style={{
            margin: 0, fontFamily: "var(--font-heading)", fontSize: 22,
            fontWeight: 550, letterSpacing: "-.02em"
          }}><span className="gradient-text">Entrar</span></h1>
          <p style={{ color: "var(--muted)", fontSize: 12, margin: "6px 0 0" }}>
            Acesse a plataforma Ligia OS
          </p>
        </div>

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
            }}>Email</label>
            <input type="email" required autoFocus
              value={email} onChange={e => setEmail(e.target.value)}
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
            }}>Senha</label>
            <input type="password" required
              value={password} onChange={e => setPassword(e.target.value)}
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
            {submitting ? "Entrando..." : "Entrar"}
          </button>
        </form>

        <div style={{ textAlign: "center", marginTop: 20 }}>
          <span style={{ color: "var(--muted)", fontSize: 12 }}>
            Não tem conta?{" "}
          </span>
          <Link to="/register" style={{
            color: "var(--accent)", fontSize: 12, fontWeight: 600,
            textDecoration: "none"
          }}>
            Cadastre-se
          </Link>
        </div>
      </div>
    </div>
  );
}
