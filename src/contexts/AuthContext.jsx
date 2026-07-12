import { createContext, useContext, useState, useEffect } from "react";
import { supabase } from "../lib/supabase.js";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [session, setSession] = useState(null);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase.auth.getSession()
      .then(({ data: { session } }) => {
        setSession(session);
        if (session?.user) fetchProfile(session.user.id);
        else setLoading(false);
      })
      .catch(() => setLoading(false));

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      if (session?.user) fetchProfile(session.user.id);
      else { setProfile(null); setLoading(false); }
    });

    return () => subscription?.unsubscribe();
  }, []);

  async function fetchProfile(userId) {
    try {
      let { data, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", userId)
        .single();

      if (error || !data) {
        const user = (await supabase.auth.getSession().catch(() => null))?.data?.session?.user;
        if (user) {
          const { data: newProfile } = await supabase
            .from("profiles")
            .insert({
              id: userId,
              name: user.user_metadata?.name || user.email?.split("@")[0] || "Usuário",
              email: user.email,
              role: "visitante",
            })
            .select()
            .single();
          data = newProfile;
        }
      }

      if (data) setProfile(data);
    } catch (e) {
      console.warn("Failed to load profile:", e.message);
    } finally {
      setLoading(false);
    }
  }

  async function signIn(email, password) {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw error;
    return data;
  }

  async function signUp(email, password, metadata = {}) {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: metadata },
    });
    if (error) throw error;
    return data;
  }

  async function signOut() {
    try {
      await supabase.auth.signOut();
    } catch (e) {
      console.warn("Sign out error:", e.message);
    }
    setSession(null);
    setProfile(null);
  }

  const value = { session, profile, setProfile, loading, signIn, signUp, signOut };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used within AuthProvider");
  return context;
}
