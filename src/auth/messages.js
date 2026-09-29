// Supabase error details stay on the error object; only product messages reach the UI.
export function authMessage(error, action = "login") {
  const code = String(error?.code || "").toLowerCase();
  const message = String(error?.message || "").toLowerCase();
  if (error?.name === "TimeoutError" || error instanceof TypeError || /fetch|network|connection/.test(message) || error?.status >= 500) return "Falha temporária de conexão. Tente novamente.";
  if (action === "recovery-request") return "Não foi possível enviar as instruções agora. Tente novamente mais tarde.";
  if (action === "login") {
    if (code === "email_not_confirmed" || /email not confirmed/.test(message)) return "Confirme seu email antes de entrar.";
    if (code === "invalid_credentials" || /invalid login credentials/.test(message)) return "Email ou senha inválidos.";
    return "Não foi possível entrar. Tente novamente.";
  }
  if (action === "signup") {
    if (/database error saving new user|error creating user/.test(message)) return "Não foi possível criar seu perfil agora. Tente novamente ou contate o suporte.";
    if (code === "weak_password" || /password.*(short|weak|least|characters)/.test(message)) return "Escolha uma senha mais forte, com pelo menos 6 caracteres.";
    if (code === "email_address_invalid" || /invalid email/.test(message)) return "Informe um email válido.";
    return "Não foi possível concluir o cadastro. Confira os dados ou tente entrar.";
  }
  if (action === "password-update") {
    if (code === "weak_password" || /password.*(short|weak|least|characters)/.test(message)) return "Escolha uma senha mais forte, com pelo menos 6 caracteres.";
    if (/different from the old password/.test(message)) return "Escolha uma senha diferente da anterior.";
    if (["otp_expired", "otp_disabled", "session_not_found"].includes(code) || /expired|invalid.*(token|link|session)/.test(message) || error?.status === 401) return "O link de recuperação é inválido ou expirou. Solicite outro link.";
    return "Não foi possível atualizar a senha. Solicite outro link ou tente novamente.";
  }
  return "Não foi possível concluir a operação. Tente novamente.";
}
