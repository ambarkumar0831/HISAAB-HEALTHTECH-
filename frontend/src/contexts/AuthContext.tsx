import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import type { Session } from "@supabase/supabase-js";
import { supabase } from "../services/supabase";

type AuthContextValue = {
  session: Session | null;
  loading: boolean;
  recoveryPending: boolean;
  authError: string;
  signInWithPassword: (email: string, password: string) => Promise<void>;
  clearRecovery: () => void;
  clearAuthError: () => void;
  signOut: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [recoveryPending, setRecoveryPending] = useState(false);
  const [authError, setAuthError] = useState("");

  useEffect(() => {
    if (!supabase) {
      setLoading(false);
      return;
    }

    let active = true;
    let authEventReceived = false;
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, nextSession) => {
      if (!active) return;
      authEventReceived = true;

      if (event === "PASSWORD_RECOVERY") {
        setRecoveryPending(true);
      }

      if (event === "SIGNED_OUT") setRecoveryPending(false);
      setSession(nextSession);
      setAuthError("");
      setLoading(false);
    });

    void supabase.auth
      .getSession()
      .then(({ data, error }) => {
        if (!active || authEventReceived) return;
        setSession(data.session);
        if (error) setAuthError(error.message);
        setLoading(false);
      })
      .catch((sessionError: unknown) => {
        if (active && !authEventReceived) {
          setAuthError(
            sessionError instanceof Error ? sessionError.message : "Could not restore your sign-in session.",
          );
          setLoading(false);
        }
      });

    return () => {
      active = false;
      subscription.unsubscribe();
    };
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      session,
      loading,
      recoveryPending,
      authError,
      signInWithPassword: async (email, password) => {
        if (!supabase) throw new Error("Supabase authentication is not configured.");
        const { data, error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        setSession(data.session);
      },
      clearRecovery: () => setRecoveryPending(false),
      clearAuthError: () => setAuthError(""),
      signOut: async () => {
        if (!supabase) throw new Error("Supabase authentication is not configured.");
        const { error } = await supabase.auth.signOut();
        if (error) throw error;
      },
    }),
    [session, loading, recoveryPending, authError],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used within AuthProvider");
  return context;
}
