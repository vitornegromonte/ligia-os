import { useState } from "react";
import { useLocation, Link } from "react-router-dom";
import { Field, Input } from "../ui/Field.tsx";
import { Button } from "../ui/Button.tsx";
import { Alert } from "../ui/Alert.tsx";
import { useAuth } from "../contexts/AuthContext.jsx";

export default function Login() {
  const location = useLocation();
  // ProtectedRoute guarda em state.from a página que o usuário tentou abrir.
  const { signIn, resetPassword } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [forgot, setForgot] = useState(false);
  const [sent, setSent] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    setSubmitting(true);
    try {
      await signIn(email, password);
    } catch (err) {
      setError(err.message === "Invalid login credentials"
        ? "Email ou senha inválidos."
        : err.message
      );
    } finally {
      setSubmitting(false);
    }
  }

  async function handleForgot(e) {
    e.preventDefault();
    setError("");
    setSubmitting(true);
    try {
      await resetPassword(email);
      setSent(true);
    } catch (err) {
      setError(err.message === "User not found"
        ? "Nenhuma conta encontrada para este email."
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
          <img src="/media/logo.svg" alt="Ligia" width="36" height="36"
            style={{ height: 36, width: "auto", marginBottom: 16 }} />
          <h1 style={{
            margin: 0, fontFamily: "var(--font-heading)", fontSize: 22,
            fontWeight: 550, letterSpacing: "-.02em"
          }}><span className="gradient-text">Entrar</span></h1>
          <p style={{ color: "var(--muted)", fontSize: 12, margin: "6px 0 0" }}>
            Acesse a plataforma Ligia OS
          </p>
        </div>

        {forgot ? (
          <form onSubmit={handleForgot}>
            {sent ? (
              <Alert tone="success" className="lg-mb-16">
                Se um email válido foi informado, enviamos um link de redefinição. Confira sua caixa de entrada.
              </Alert>
            ) : (
              <>
                <div style={{ marginBottom: 16 }}>
                  <Field label="Email">
                    {(p) => (
                      <Input type="email" name="email" autoComplete="email" required autoFocus
                        value={email} onChange={e => setEmail(e.target.value)} {...p} />
                    )}
                  </Field>
                </div>

                <Button type="submit" loading={submitting} style={{ width: "100%" }}>
                  {submitting ? "Enviando…" : "Enviar link de redefinição"}
                </Button>
              </>
            )}
          </form>
        ) : (
          <form onSubmit={handleSubmit}>
            {error && (
              <Alert tone="error" className="lg-mb-16">{error}</Alert>
            )}

            <div style={{ marginBottom: 16 }}>
              <Field label="Email">
                {(p) => (
                  <Input type="email" name="email" autoComplete="email" required autoFocus
                    value={email} onChange={e => setEmail(e.target.value)} {...p} />
                )}
              </Field>
            </div>

            <div style={{ marginBottom: 24 }}>
              <Field label="Senha">
                {(p) => (
                  <Input type="password" name="password" autoComplete="current-password" required
                    value={password} onChange={e => setPassword(e.target.value)} {...p} />
                )}
              </Field>
            </div>

            <Button type="submit" loading={submitting} style={{ width: "100%" }}>
              {submitting ? "Entrando…" : "Entrar"}
            </Button>
          </form>
        )}

        <div style={{ textAlign: "center", marginTop: 16 }}>
          <button onClick={() => { setForgot(!forgot); setSent(false); setError(""); }}
            style={{
              border: 0, background: "none", color: "var(--muted)",
              fontSize: 12, cursor: "pointer", textDecoration: "underline",
              fontFamily: "var(--font-body)"
            }}>
            {forgot ? "Voltar para entrar" : "Esqueci minha senha"}
          </button>
        </div>

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
