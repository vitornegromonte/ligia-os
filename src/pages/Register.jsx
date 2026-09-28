import { useRef, useState } from "react";
import { useLocation, Link } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext.jsx";
import { authMessage } from "../auth/messages.js";
import { Field, Input } from "../ui/Field.tsx";
import { Button } from "../ui/Button.tsx";
import { Alert } from "../ui/Alert.tsx";

export default function Register() {
  const location = useLocation();
  const { signUp, signOut } = useAuth();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const inFlight = useRef(false);

  async function handleSubmit(event) {
    event.preventDefault();
    if (inFlight.current) return;
    setError("");
    if (!name.trim()) { setError("Informe seu nome completo."); return; }
    if (!password || !confirmPassword) { setError("Informe e confirme sua senha."); return; }
    if (password !== confirmPassword) { setError("As senhas não coincidem."); return; }
    inFlight.current = true;
    setSubmitting(true);
    try {
      const result = await signUp(email.trim(), password, { name: name.trim() });
      // Confirmation is required. Never leave a signup session active if remote
      // configuration changes unexpectedly or Auth returns one for another reason.
      if (result?.session) await signOut();
      setSuccess(true);
    } catch (failure) {
      setError(authMessage(failure, "signup"));
    } finally {
      inFlight.current = false;
      setSubmitting(false);
    }
  }

  return <main style={{ display: "flex", alignItems: "center", justifyContent: "center", minHeight: "100vh", padding: "40px 20px", background: "radial-gradient(circle at 50% 30%, rgba(255,75,31,.06), transparent 50%), var(--bg)" }}>
    <section style={{ width: "min(440px, 100%)", padding: 36, borderRadius: "var(--radius-lg)", border: "1px solid var(--line-soft)", background: "var(--surface)" }}>
      <div style={{ textAlign: "center", marginBottom: 32 }}>
        <img src="/media/logo.svg" alt="Ligia" width="36" height="36" style={{ height: 36, width: "auto", marginBottom: 16 }} />
        <h1 style={{ margin: 0, fontFamily: "var(--font-heading)", fontSize: 22, fontWeight: 550 }}><span className="gradient-text">Criar conta</span></h1>
        <p style={{ color: "var(--muted)", fontSize: 12, margin: "6px 0 0" }}>Comece a aprender na Ligia OS</p>
      </div>
      {success ? <>
        <Alert tone="success" className="lg-mb-16">Conta criada. Enviamos um email de confirmação para <strong>{email}</strong>. Confirme seu endereço para ativar a conta e depois entre na plataforma.</Alert>
        <Link to="/login" state={location.state} style={{ color: "var(--accent)", fontFamily: "var(--font-body)", fontWeight: 600 }}>Ir para login</Link>
      </> : <form onSubmit={handleSubmit}>
        {error && <Alert tone="error" className="lg-mb-16">{error}</Alert>}
        <div style={{ display: "grid", gap: 16, marginBottom: 24 }}>
          <Field label="Nome completo">{p => <Input type="text" name="name" autoComplete="name" required autoFocus value={name} onChange={e => setName(e.target.value)} {...p} />}</Field>
          <Field label="Email">{p => <Input type="email" name="email" autoComplete="email" required value={email} onChange={e => setEmail(e.target.value)} {...p} />}</Field>
          <Field label="Senha">{p => <Input type="password" name="password" autoComplete="new-password" required minLength={6} value={password} onChange={e => setPassword(e.target.value)} {...p} />}</Field>
          <Field label="Confirmar senha">{p => <Input type="password" name="confirmPassword" autoComplete="new-password" required minLength={6} value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} {...p} />}</Field>
        </div>
        <Button type="submit" loading={submitting} disabled={submitting} style={{ width: "100%" }}>{submitting ? "Criando conta…" : "Criar conta"}</Button>
      </form>}
      <div style={{ textAlign: "center", marginTop: 20, color: "var(--muted)", fontSize: 12 }}>
        Já tem conta? <Link to="/login" state={location.state} style={{ color: "var(--accent)", fontWeight: 600 }}>Entrar</Link>
      </div>
    </section>
  </main>;
}
