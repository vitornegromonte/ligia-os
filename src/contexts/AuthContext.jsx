import { setLearningAccount } from "../lib/learning-storage.ts";
import { createContext, useContext, useState, useEffect, useRef, useCallback } from "react";
import { supabase } from "../lib/supabase.js";
import { mapProfile } from "../services/profiles.js";
import { isKnownRole } from "../auth/access.js";
import { authFailure, withAuthTimeout } from "../auth/errors.js";

const AuthContext = createContext(null);
const initial = { session: null, profile: null, status: "session_loading", error: null, recovery: false, revision: 0 };

export function AuthProvider({ children }) {
  const [state, setState] = useState(initial);
  const generation = useRef(0);
  const mounted = useRef(false);

  const acceptSession = useCallback((session, event) => {
    setLearningAccount(session?.user?.id ?? null);
    generation.current += 1;
    const revision = generation.current;
    setState(previous => ({
      session, profile: null, error: null, revision,
      status: session?.user ? "profile_loading" : "unauthenticated",
      recovery: !!session && (event === "PASSWORD_RECOVERY" || (previous.session?.user.id === session.user.id && previous.recovery)),
    }));
  }, []);

  useEffect(() => {
    mounted.current = true;
    let active = true;
    const started = generation.current;
    // Keep the callback synchronous and free of Supabase calls (Auth holds a lock).
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (active) acceptSession(session, event);
    });
    withAuthTimeout(supabase.auth.getSession()).then(({ data, error }) => {
      if (!active || generation.current !== started) return;
      if (error) throw error;
      acceptSession(data.session);
    }).catch(error => {
      if (active && generation.current === started) {
        setState({ ...initial, status: "session_error", error: authFailure(error) });
      }
    });
    return () => { active = false; mounted.current = false; subscription.unsubscribe(); };
  }, [acceptSession]);

  useEffect(() => {
    if (!state.session?.user || state.status !== "profile_loading") return;
    const revision = state.revision;
    const userId = state.session.user.id;
    const controller = new AbortController();
    let active = true;
    async function load() {
      try {
        const { data: identity, error: identityError } = await withAuthTimeout(supabase.auth.getUser());
        if (identityError) throw identityError;
        if (identity.user?.id !== userId) throw { code: "session_not_found", message: "Sessão inválida. Entre novamente." };
        const { data, error } = await withAuthTimeout(supabase.from("profiles").select("*").eq("id", userId).abortSignal(controller.signal).maybeSingle());
        if (error) throw error;
        // RLS can hide a row: zero rows is not proof of absence. Never insert here.
        if (!data) throw { kind: "profile_unavailable", message: "Perfil não encontrado ou sem acesso. Solicite a verificação do seu cadastro." };
        if (data.id !== userId || !isKnownRole(data.role)) throw { kind: "invalid_profile", message: "Perfil com identidade ou papel inválido. Solicite a revisão do cadastro." };
        if (active && revision === generation.current) setState(previous => ({ ...previous, status: "authenticated", profile: mapProfile(data), error: null }));
      } catch (error) {
        if (active && revision === generation.current) setState(previous => ({ ...previous, status: "profile_error", profile: null, error: error.kind ? error : authFailure(error) }));
      }
    }
    load();
    return () => { active = false; controller.abort(); };
  }, [state.session, state.revision, state.status]);

  const refreshProfile = useCallback(() => {
    generation.current += 1;
    const revision = generation.current;
    setState(previous => previous.session ? { ...previous, profile: null, error: null, status: "profile_loading", revision } : previous);
  }, []);

  async function signIn(email, password) {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw error;
    return data; // Auth events are the source of session transitions.
  }

  async function signUp(email, password, metadata = {}) {
    const fields = ["name", "team", "affiliation", "avatar_url", "lattes", "github", "linkedin", "kaggle"];
    const safeMetadata = Object.fromEntries(fields.filter(key => typeof metadata[key] === "string").map(key => [key, metadata[key]]));
    const { data, error } = await supabase.auth.signUp({ email, password, options: { data: safeMetadata } });
    if (error) throw error;
    return data;
  }

  async function signOut() {
    const revision = generation.current;
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
    if (mounted.current && revision === generation.current) acceptSession(null, "SIGNED_OUT");
  }

  async function resetPassword(email) {
    const { data, error } = await supabase.auth.resetPasswordForEmail(email, { redirectTo: `${window.location.origin}/reset-password` });
    if (error) throw error;
    return data;
  }

  async function updatePassword(password) {
    const { data, error } = await supabase.auth.updateUser({ password });
    if (error) throw error;
    setState(previous => ({ ...previous, recovery: false }));
    return data;
  }

  const value = { ...state, loading: ["session_loading", "profile_loading"].includes(state.status), refreshProfile, signIn, signUp, signOut, resetPassword, updatePassword };
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used within AuthProvider");
  return context;
}
