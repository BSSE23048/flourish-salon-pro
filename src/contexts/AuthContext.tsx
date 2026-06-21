import { createContext, useCallback, useContext, useEffect, useState } from "react";
import { Session, User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";

type AppRole = "owner" | "staff" | "customer";
type DemoUser = { id: string; email: string | null };
type DemoSession = { user: DemoUser; access_token: string };
type AuthSession = Session | DemoSession;
type AuthUser = User | DemoUser;

const DEMO_EMAIL = "admin@flourish.local";
const DEMO_PASSWORD = "password123";
const STAFF_DEMO_EMAIL = "staff@flourish.local";
const STAFF_DEMO_PASSWORD = "staff123";
const DEMO_STORAGE_KEY = "flourish-demo-auth";
const ROLE_COOKIE = "flourish-role";

interface AuthContextType {
  session: AuthSession | null;
  user: AuthUser | null;
  profile: { full_name: string; email: string | null } | null;
  role: AppRole | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<{ error: string | null }>;
  signUp: (email: string, password: string, fullName: string) => Promise<{ error: string | null }>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<AuthSession | null>(null);
  const [user, setUser] = useState<AuthUser | null>(null);
  const [profile, setProfile] = useState<{ full_name: string; email: string | null } | null>(null);
  const [role, setRole] = useState<AppRole | null>(null);
  const [loading, setLoading] = useState(true);

  const writeRoleCookie = useCallback((nextRole: AppRole) => {
    if (typeof document !== "undefined") {
      document.cookie = `${ROLE_COOKIE}=${nextRole}; path=/; max-age=604800; SameSite=Lax`;
    }
  }, []);

  const fetchUserData = useCallback(async (userId: string) => {
    try {
      const [profileRes, roleRes] = await Promise.all([
        supabase.from("profiles").select("full_name, email").eq("user_id", userId).single(),
        supabase.from("user_roles").select("role").eq("user_id", userId).single(),
      ]);
      if (profileRes.data) setProfile(profileRes.data);
      if (roleRes.data) {
        setRole(roleRes.data.role);
        writeRoleCookie(roleRes.data.role);
      }
    } catch {
      setProfile({ full_name: "Salon Admin", email: DEMO_EMAIL });
      setRole("owner");
    }
  }, [writeRoleCookie]);

  const setDemoSession = useCallback((email = DEMO_EMAIL, fullName = "Salon Admin", nextRole: AppRole = "owner") => {
    const demoUser = { id: "demo-user", email };
    const demoSession = { user: demoUser, access_token: "demo-access-token" };
    setSession(demoSession);
    setUser(demoUser);
    setProfile({ full_name: fullName, email });
    setRole(nextRole);
    writeRoleCookie(nextRole);
    if (typeof window !== "undefined") {
      window.localStorage.setItem(DEMO_STORAGE_KEY, JSON.stringify({ email, fullName, role: nextRole }));
    }
  }, [writeRoleCookie]);

  useEffect(() => {
    const storedDemo = typeof window !== "undefined" ? window.localStorage.getItem(DEMO_STORAGE_KEY) : null;
    if (storedDemo) {
      const { email, fullName, role } = JSON.parse(storedDemo) as { email: string; fullName: string; role?: AppRole };
      setDemoSession(email, fullName, role || "owner");
      setLoading(false);
      return;
    }

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, session) => {
      setSession(session);
      setUser(session?.user ?? null);
      if (session?.user) {
        setTimeout(() => fetchUserData(session.user.id), 0);
      } else {
        setProfile(null);
        setRole(null);
      }
      setLoading(false);
    });

    supabase.auth.getSession()
      .then(({ data: { session } }) => {
        setSession(session);
        setUser(session?.user ?? null);
        if (session?.user) {
          fetchUserData(session.user.id);
        }
        setLoading(false);
      })
      .catch(() => {
        setLoading(false);
      });

    return () => subscription.unsubscribe();
  }, [fetchUserData, setDemoSession]);

  const signIn = async (email: string, password: string) => {
    if (email.trim().toLowerCase() === DEMO_EMAIL && password === DEMO_PASSWORD) {
      setDemoSession(DEMO_EMAIL, "Salon Admin", "owner");
      return { error: null };
    }

    if (email.trim().toLowerCase() === STAFF_DEMO_EMAIL && password === STAFF_DEMO_PASSWORD) {
      setDemoSession(STAFF_DEMO_EMAIL, "Sara Ahmed", "staff");
      return { error: null };
    }

    try {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      return { error: error?.message ?? null };
    } catch {
      return {
        error: `Supabase is unreachable from this network. Use demo login: ${DEMO_EMAIL} / ${DEMO_PASSWORD}`,
      };
    }
  };

  const signUp = async (email: string, password: string, fullName: string) => {
    try {
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: { full_name: fullName },
          emailRedirectTo: typeof window !== "undefined" ? window.location.origin : undefined,
        },
      });
      return { error: error?.message ?? null };
    } catch {
      setDemoSession(email, fullName || "Customer", "customer");
      return { error: null };
    }
  };

  const signOut = async () => {
    try {
      await supabase.auth.signOut();
    } catch {
      // Local demo sessions do not need a remote sign-out.
    }
    if (typeof window !== "undefined") {
      window.localStorage.removeItem(DEMO_STORAGE_KEY);
    }
    if (typeof document !== "undefined") {
      document.cookie = `${ROLE_COOKIE}=; path=/; max-age=0; SameSite=Lax`;
    }
    setSession(null);
    setUser(null);
    setProfile(null);
    setRole(null);
  };

  return (
    <AuthContext.Provider value={{ session, user, profile, role, loading, signIn, signUp, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
