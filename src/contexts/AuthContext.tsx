import { createContext, useCallback, useContext, useEffect, useState } from "react";
import { Session, User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import { API_URL } from "@/lib/api";
import { syncSupabaseCustomerProfile } from "@/lib/customerProfile";

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
const STAFF_ID_STORAGE_KEY = "flourish-staff-id";
const ROLE_COOKIE = "flourish-role";
const appRoles: AppRole[] = ["owner", "staff", "customer"];

function toAppRole(value: string | null | undefined): AppRole {
  return appRoles.includes(value as AppRole) ? (value as AppRole) : "customer";
}

function resolveRole(rows: Array<{ role?: string }> | null | undefined): AppRole {
  const roles = (rows || []).map((row) => row.role);
  if (roles.includes("owner")) return "owner";
  if (roles.includes("staff")) return "staff";
  return roles.includes("customer") ? "customer" : "customer";
}

interface AuthContextType {
  session: AuthSession | null;
  user: AuthUser | null;
  profile: { full_name: string; email: string | null } | null;
  role: AppRole | null;
  loading: boolean;
  signIn: (email: string, password: string, expectedRole?: AppRole) => Promise<{ error: string | null; role?: AppRole }>;
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
        supabase.from("user_roles").select("role").eq("user_id", userId),
      ]);
      if (profileRes.data) setProfile(profileRes.data);
      if (roleRes.data) {
        const nextRole = resolveRole(roleRes.data);
        setRole(nextRole);
        writeRoleCookie(nextRole);
      }
    } catch {
      setProfile({ full_name: "Salon Admin", email: DEMO_EMAIL });
      setRole("owner");
    }
  }, [writeRoleCookie]);

  const setDemoSession = useCallback((email = DEMO_EMAIL, fullName = "Salon Admin", nextRole: AppRole = "owner", staffId?: string) => {
    const demoUser = { id: staffId || "demo-user", email };
    const demoSession = { user: demoUser, access_token: "demo-access-token" };
    setSession(demoSession);
    setUser(demoUser);
    setProfile({ full_name: fullName, email });
    setRole(nextRole);
    writeRoleCookie(nextRole);
    if (typeof window !== "undefined") {
      window.localStorage.setItem(DEMO_STORAGE_KEY, JSON.stringify({ email, fullName, role: nextRole, staffId }));
      if (staffId) window.localStorage.setItem(STAFF_ID_STORAGE_KEY, staffId);
      else window.localStorage.removeItem(STAFF_ID_STORAGE_KEY);
    }
  }, [writeRoleCookie]);

  const syncCustomerIfNeeded = useCallback(async (session: Session | null) => {
    if (!session?.user) return;
    try {
      const roleRes = await supabase.from("user_roles").select("role").eq("user_id", session.user.id);
      const roles = roleRes.data?.map((item) => item.role) || [];
      if (!roles.includes("owner") && !roles.includes("staff")) {
        await syncSupabaseCustomerProfile(session.user);
      }
    } catch {
      // Profile sync is best-effort so auth never blocks on RLS/network issues.
    }
  }, []);

  useEffect(() => {
    const storedDemo = typeof window !== "undefined" ? window.localStorage.getItem(DEMO_STORAGE_KEY) : null;
    if (storedDemo) {
      try {
        const { email, fullName, role, staffId } = JSON.parse(storedDemo) as { email: string; fullName: string; role?: AppRole; staffId?: string };
        setDemoSession(email, fullName, role || "owner", staffId);
        setLoading(false);
        return;
      } catch {
        window.localStorage.removeItem(DEMO_STORAGE_KEY);
      }
    }

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, session) => {
      setSession(session);
      setUser(session?.user ?? null);
      if (session?.user) {
        setTimeout(() => syncCustomerIfNeeded(session), 0);
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
          syncCustomerIfNeeded(session);
          fetchUserData(session.user.id);
        }
        setLoading(false);
      })
      .catch(() => {
        setLoading(false);
      });

    return () => subscription.unsubscribe();
  }, [fetchUserData, setDemoSession, syncCustomerIfNeeded]);

  const roleMismatch = (actual: AppRole, expected?: AppRole) =>
    expected && actual !== expected ? "Invalid credentials for this role portal." : null;

  const signIn: AuthContextType["signIn"] = async (email, password, expectedRole) => {
    if (email.trim().toLowerCase() === DEMO_EMAIL && password === DEMO_PASSWORD) {
      const mismatch = roleMismatch("owner", expectedRole);
      if (mismatch) return { error: mismatch };
      setDemoSession(DEMO_EMAIL, "Salon Admin", "owner");
      return { error: null, role: "owner" };
    }

    if (email.trim().toLowerCase() === STAFF_DEMO_EMAIL && password === STAFF_DEMO_PASSWORD) {
      const mismatch = roleMismatch("staff", expectedRole);
      if (mismatch) return { error: mismatch };
      setDemoSession(STAFF_DEMO_EMAIL, "Sara Ahmed", "staff", "stf-sara");
      return { error: null, role: "staff" };
    }

    if (email.trim().toLowerCase().endsWith("@flourish.local")) {
      try {
        const res = await fetch(`${API_URL}/api/auth/staff-login`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email, password }),
        });
        const data = await res.json();
        if (res.ok) {
          const mismatch = roleMismatch("staff", expectedRole);
          if (mismatch) return { error: mismatch };
          setDemoSession(data.staff.email, data.staff.name, "staff", data.staff.id);
          return { error: null, role: "staff" };
        }
        return { error: data.error || "Invalid staff email or password" };
      } catch {
        return { error: "Staff login API is unavailable. Start the Express API and try again." };
      }
    }

    try {
      const { data, error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) return { error: error.message };

      const userRole = data.user
        ? await supabase.from("user_roles").select("role").eq("user_id", data.user.id)
        : null;
      const resolvedRole = userRole?.data ? resolveRole(userRole.data) : toAppRole(null);
      const mismatch = roleMismatch(resolvedRole, expectedRole);
      if (mismatch) {
        await supabase.auth.signOut().catch(() => undefined);
        return { error: mismatch };
      }
      setRole(resolvedRole);
      writeRoleCookie(resolvedRole);
      return { error: null, role: resolvedRole };
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
      const { data } = await supabase.auth.getSession();
      if (data.session?.user) await syncSupabaseCustomerProfile(data.session.user, fullName).catch(() => undefined);
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
      window.localStorage.removeItem(STAFF_ID_STORAGE_KEY);
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
