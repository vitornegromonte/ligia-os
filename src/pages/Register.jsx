import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext.jsx";

const teams = ["NLP", "ML", "CV", "Comunicação"];

export default function Register() {
  const navigate = useNavigate();
  const { signUp } = useAuth();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [team, setTeam] = useState("");
  const [affiliation, setAffiliation] = useState("");
  const [lattes, setLattes] = useState("");
  const [github, setGithub] = useState("");
  const [linkedin, setLinkedin] = useState("");
  const [kaggle, setKaggle] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    setSubmitting(true);
    try {
      await signUp(email, password, { name, team, affiliation, lattes, github, linkedin, kaggle });
      setSuccess(true);
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  }

  if (success) {
    return (
      <div style={{
        display: "flex", alignItems: "center", justifyContent: "center",
        minHeight: "100vh",
        background: "radial-gradient(circle at 50% 30%, rgba(255,75,31,.06), transparent 50%), var(--bg)"
      }}>
        <div style={{
          width: "min(400px, 92vw)", padding: 48, textAlign: "center",
          borderRadius: "var(--radius-lg)",
          border: "1px solid var(--line-soft)", background: "var(--surface)"
        }}>
          <div style={{
            width: 56, height: 56, display: "grid", placeItems: "center",
            margin: "0 auto 20", borderRadius: "50%",
            background: "var(--accent-soft)", color: "var(--accent)",
            fontSize: 28
          }}>✓</div>
          <h1 style={{
            margin: "0 0 10px", fontFamily: "var(--font-heading)", fontSize: 20,
            fontWeight: 550, letterSpacing: "-.02em"
          }}>Conta criada</h1>
          <p style={{ color: "var(--muted)", fontSize: 13, lineHeight: 1.6, margin: "0 0 24px" }}>
            Verifique seu email <strong>{email}</strong> para confirmar o cadastro.
            Depois é só fazer login.
          </p>
          <Link to="/login"
            style={{
              display: "inline-flex", alignItems: "center", justifyContent: "center",
              height: 42, padding: "0 28px", borderRadius: "var(--radius-sm)",
              color: "#fff", background: "var(--accent)",
              textDecoration: "none", fontSize: 14, fontWeight: 600,
              fontFamily: "var(--font-body)"
            }}>
            Ir para login
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div style={{
      display: "flex", alignItems: "center", justifyContent: "center",
      minHeight: "100vh", padding: "40px 20px",
      background: "radial-gradient(circle at 50% 30%, rgba(255,75,31,.06), transparent 50%), var(--bg)"
    }}>
      <div style={{
        width: "min(500px, 100%)", padding: 36,
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
          }}><span className="gradient-text">Criar conta</span></h1>
          <p style={{ color: "var(--muted)", fontSize: 12, margin: "6px 0 0" }}>
            Cadastre-se na plataforma Ligia OS
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
            }}>Nome completo</label>
            <input type="text" required autoFocus
              value={name} onChange={e => setName(e.target.value)}
              style={{
                width: "100%", height: 42, padding: "0 14px",
                border: "1px solid var(--line)", borderRadius: "var(--radius-sm)",
                outline: "none", color: "var(--text)", background: "var(--bg)",
                transition: "border var(--transition)"
              }} />
          </div>

          <div style={{ marginBottom: 16 }}>
            <label style={{
              display: "block", marginBottom: 6, color: "var(--muted)",
              fontSize: 12, fontWeight: 600
            }}>Email</label>
            <input type="email" required
              value={email} onChange={e => setEmail(e.target.value)}
              style={{
                width: "100%", height: 42, padding: "0 14px",
                border: "1px solid var(--line)", borderRadius: "var(--radius-sm)",
                outline: "none", color: "var(--text)", background: "var(--bg)",
                transition: "border var(--transition)"
              }} />
          </div>

          <div style={{ marginBottom: 16 }}>
            <label style={{
              display: "block", marginBottom: 6, color: "var(--muted)",
              fontSize: 12, fontWeight: 600
            }}>Senha</label>
            <input type="password" required minLength={6}
              value={password} onChange={e => setPassword(e.target.value)}
              style={{
                width: "100%", height: 42, padding: "0 14px",
                border: "1px solid var(--line)", borderRadius: "var(--radius-sm)",
                outline: "none", color: "var(--text)", background: "var(--bg)",
                transition: "border var(--transition)"
              }} />
          </div>

          <div style={{ marginBottom: 16 }}>
            <label style={{
              display: "block", marginBottom: 6, color: "var(--muted)",
              fontSize: 12, fontWeight: 600
            }}>Equipe</label>
            <select value={team} onChange={e => setTeam(e.target.value)}
              style={{
                width: "100%", height: 42, padding: "0 14px",
                border: "1px solid var(--line)", borderRadius: "var(--radius-sm)",
                outline: "none", color: "var(--text)", background: "var(--bg)",
                transition: "border var(--transition)"
              }}>
              <option value="">Selecione uma equipe</option>
              {teams.map(t => <option key={t} value={t}>{t}</option>)}
            </select>
          </div>

          <div style={{ marginBottom: 16 }}>
            <label style={{
              display: "block", marginBottom: 6, color: "var(--muted)",
              fontSize: 12, fontWeight: 600
            }}>Vínculo institucional</label>
            <input type="text" placeholder="CIn-UFPE"
              value={affiliation} onChange={e => setAffiliation(e.target.value)}
              style={{
                width: "100%", height: 42, padding: "0 14px",
                border: "1px solid var(--line)", borderRadius: "var(--radius-sm)",
                outline: "none", color: "var(--text)", background: "var(--bg)",
                transition: "border var(--transition)"
              }} />
          </div>

          <div style={{ marginBottom: 20 }}>
            <label style={{
              display: "block", marginBottom: 8, color: "var(--muted)",
              fontSize: 12, fontWeight: 600
            }}>Redes acadêmicas (opcional)</label>
            <div style={{ display: "grid", gap: 10 }}>
              <input type="url" placeholder="Lattes — http://lattes.cnpq.br/..."
                value={lattes} onChange={e => setLattes(e.target.value)}
                style={{
                  width: "100%", height: 42, padding: "0 14px",
                  border: "1px solid var(--line)", borderRadius: "var(--radius-sm)",
                  outline: "none", color: "var(--text)", background: "var(--bg)",
                  transition: "border var(--transition)"
                }} />
              <input type="url" placeholder="GitHub — https://github.com/usuario"
                value={github} onChange={e => setGithub(e.target.value)}
                style={{
                  width: "100%", height: 42, padding: "0 14px",
                  border: "1px solid var(--line)", borderRadius: "var(--radius-sm)",
                  outline: "none", color: "var(--text)", background: "var(--bg)",
                  transition: "border var(--transition)"
                }} />
              <input type="url" placeholder="LinkedIn — https://linkedin.com/in/usuario"
                value={linkedin} onChange={e => setLinkedin(e.target.value)}
                style={{
                  width: "100%", height: 42, padding: "0 14px",
                  border: "1px solid var(--line)", borderRadius: "var(--radius-sm)",
                  outline: "none", color: "var(--text)", background: "var(--bg)",
                  transition: "border var(--transition)"
                }} />
              <input type="url" placeholder="Kaggle — https://kaggle.com/usuario"
                value={kaggle} onChange={e => setKaggle(e.target.value)}
                style={{
                  width: "100%", height: 42, padding: "0 14px",
                  border: "1px solid var(--line)", borderRadius: "var(--radius-sm)",
                  outline: "none", color: "var(--text)", background: "var(--bg)",
                  transition: "border var(--transition)"
                }} />
            </div>
          </div>

          <button type="submit" disabled={submitting}
            style={{
              width: "100%", height: 42, border: 0, borderRadius: "var(--radius-sm)",
              color: "#fff", background: submitting ? "var(--muted-2)" : "var(--accent)",
              cursor: submitting ? "not-allowed" : "pointer",
              fontSize: 14, fontWeight: 600, fontFamily: "var(--font-body)",
              transition: "background var(--transition)"
            }}>
            {submitting ? "Criando conta..." : "Criar conta"}
          </button>
        </form>

        <div style={{ textAlign: "center", marginTop: 20 }}>
          <span style={{ color: "var(--muted)", fontSize: 12 }}>
            Já tem conta?{" "}
          </span>
          <Link to="/login" style={{
            color: "var(--accent)", fontSize: 12, fontWeight: 600,
            textDecoration: "none"
          }}>
            Entrar
          </Link>
        </div>
      </div>
    </div>
  );
}
