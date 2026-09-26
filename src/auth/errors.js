export function authFailure(error) {
  const code = error?.code;
  let kind = "supabase";
  if (error?.name === "AbortError" || error?.name === "TimeoutError" || error instanceof TypeError || /fetch|network|connection/i.test(error?.message || "")) kind = "network";
  if (code === "42501" || error?.status === 403) kind = "rls";
  if (["PGRST301", "PGRST302", "PGRST303", "bad_jwt", "session_not_found", "refresh_token_not_found", "user_not_found"].includes(code) || error?.status === 401) kind = "invalid_session";
  return { kind, code, message: error?.message || "Não foi possível carregar sua identidade." };
}

export function withAuthTimeout(promise, milliseconds = 15000) {
  let timer;
  return Promise.race([
    promise,
    new Promise((_, reject) => { timer = setTimeout(() => reject(new DOMException("Tempo de conexão esgotado", "TimeoutError")), milliseconds); }),
  ]).finally(() => clearTimeout(timer));
}
