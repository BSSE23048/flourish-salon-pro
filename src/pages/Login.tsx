import { useEffect, useState } from "react";
import { useRouter } from "next/router";
import { Sparkles, Eye, EyeOff, ShieldCheck, User, Users, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";

type LoginType = "admin" | "staff" | "client";
const selectedPortalRole: Record<LoginType, "owner" | "staff" | "customer"> = {
  admin: "owner",
  staff: "staff",
  client: "customer",
};

const loginRoles: { key: LoginType; label: string; icon: React.ElementType; description: string }[] = [
  { key: "admin", label: "Admin", icon: ShieldCheck, description: "Full management access" },
  { key: "staff", label: "Staff", icon: Users, description: "Team member portal" },
  { key: "client", label: "Client", icon: User, description: "Book appointments" },
];

export default function Login() {
  const [isSignUp, setIsSignUp] = useState(false);
  const [loginType, setLoginType] = useState<LoginType>("admin");
  const [email, setEmail] = useState("admin@flourish.local");
  const [password, setPassword] = useState("password123");
  const [fullName, setFullName] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const { signIn, signUp } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (router.query.portal === "staff") setLoginType("staff");
    if (router.query.portal === "admin") setLoginType("admin");
  }, [router.query.portal]);

  const handleRoleSwitch = (key: LoginType) => {
    setLoginType(key);
    setIsSignUp(key === "client" ? isSignUp : false);
    if (key === "admin") { setEmail("admin@flourish.local"); setPassword("password123"); }
    else if (key === "staff") { setEmail("staff@flourish.local"); setPassword("staff123"); }
    else { setEmail(""); setPassword(""); }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    if (isSignUp) {
      const { error } = await signUp(email, password, fullName);
      setLoading(false);
      if (error) toast.error(error);
      else toast.success("Account created! Please check your email to verify.");
    } else {
      const { error, role } = await signIn(email, password, selectedPortalRole[loginType]);
      setLoading(false);
      if (error) toast.error(error);
      else router.push(role === "staff" ? "/staff" : role === "customer" ? "/" : "/admin");
    }
  };

  const signInWithGoogle = async () => {
    if (loginType !== "client") {
      toast.error("Google sign-in is available for the Client portal only.");
      return;
    }
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: typeof window !== "undefined" ? window.location.origin : undefined },
    });
    if (error) toast.error(error.message);
  };

  return (
    <div className="min-h-screen flex">
      {/* ── Left panel: Brand ── */}
      <div className="hidden lg:flex lg:w-[52%] relative overflow-hidden bg-[#05150e] flex-col justify-between p-14">
        {/* Subtle texture overlay */}
        <div className="absolute inset-0 opacity-[0.03]"
          style={{ backgroundImage: "radial-gradient(circle at 1px 1px, white 1px, transparent 0)", backgroundSize: "32px 32px" }}
        />

        {/* Logo */}
        <div className="relative flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-[#485341] border border-[#485341] flex items-center justify-center">
            <Sparkles className="w-5 h-5 text-white/90" />
          </div>
          <div>
            <span className="font-sans font-bold text-[22px] text-white tracking-tight leading-none">Flourish</span>
            <span className="block text-[10px] uppercase tracking-[0.2em] text-white/40 leading-none mt-0.5">Salon Pro</span>
          </div>
        </div>

        {/* Hero text */}
        <div className="relative space-y-6 max-w-md">
          <p className="text-[11px] uppercase tracking-[0.25em] text-[#485341] font-medium">
            Premium Salon Management
          </p>
          <h1 className="font-editorial text-6xl text-white leading-[1.08] tracking-tight">
            Elevate every<br />client experience.
          </h1>
          <p className="text-base text-white/55 leading-relaxed">
            The complete platform for modern salons — bookings, team, payroll, finance, and analytics in one elegant workspace.
          </p>

          {/* Stats */}
          <div className="flex gap-8 pt-4">
            {[
              { value: "2,500+", label: "Happy clients" },
              { value: "15+", label: "Expert stylists" },
              { value: "4.9", label: "Average rating" },
            ].map((stat) => (
              <div key={stat.label}>
                <p className="font-editorial text-3xl text-white leading-none">{stat.value}</p>
                <p className="text-xs text-white/40 mt-1 leading-none">{stat.label}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Bottom tagline */}
        <p className="relative text-xs text-white/25 tracking-wide">
          © 2026 Flourish Salon Pro. Crafted with care.
        </p>
      </div>

      {/* ── Right panel: Form ── */}
      <div className="flex-1 flex items-center justify-center p-6 lg:p-16 bg-background">
        <div className="w-full max-w-[380px] animate-fade-up">

          {/* Mobile logo */}
          <div className="lg:hidden flex items-center gap-2.5 mb-10">
            <div className="w-8 h-8 rounded-lg bg-[#485341] flex items-center justify-center">
              <Sparkles className="w-4 h-4 text-white" />
            </div>
            <span className="font-sans font-bold tracking-tight text-xl text-foreground">Flourish</span>
          </div>

          {/* Heading */}
          <div className="mb-8">
            <h2 className="font-editorial text-3xl text-foreground tracking-tight mb-2">
              {isSignUp ? "Create account" : "Welcome back"}
            </h2>
            <p className="text-sm text-muted-foreground">
              {isSignUp
                ? "Create your client account to start booking."
                : "Sign in to your workspace."}
            </p>
          </div>

          {/* Role switcher */}
          <div className="flex gap-1.5 bg-muted rounded-full p-1 mb-6">
            {loginRoles.map((role) => (
              <button
                key={role.key}
                type="button"
                onClick={() => handleRoleSwitch(role.key)}
                className={cn(
                  "flex-1 flex items-center justify-center gap-1.5 rounded-full py-2 text-xs font-medium transition-all duration-200",
                  loginType === role.key
                    ? "bg-card text-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                <role.icon className="w-3.5 h-3.5" />
                {role.label}
              </button>
            ))}
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            {isSignUp && loginType === "client" && (
              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground block">Full Name</label>
                <Input
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="Your full name"
                  required
                  autoFocus
                />
              </div>
            )}
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground block">Email address</label>
              <Input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder={
                  loginType === "admin"
                    ? "admin@flourish.local"
                    : loginType === "staff"
                    ? "staff@flourish.local"
                    : "you@example.com"
                }
                required
                autoFocus={!isSignUp}
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground block">Password</label>
              <div className="relative">
                <Input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                  minLength={6}
                  className="pr-12"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-fast"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <Button type="submit" className="w-full mt-2" size="lg" disabled={loading}>
              {loading
                ? isSignUp ? "Creating account…" : "Signing in…"
                : isSignUp
                ? "Create account"
                : `Continue as ${loginType === "client" ? "Client" : loginType === "admin" ? "Admin" : "Staff"}`}
              {!loading && <ArrowRight className="w-4 h-4" />}
            </Button>
          </form>

          <div className="my-6 flex items-center gap-3">
            <div className="h-px flex-1 bg-border" />
            <span className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">or</span>
            <div className="h-px flex-1 bg-border" />
          </div>

          <Button type="button" variant="outline" className="h-12 w-full rounded-xl" onClick={signInWithGoogle} disabled={loginType !== "client"}>
            <span className="flex h-7 w-7 items-center justify-center rounded-full bg-muted text-xs font-bold text-primary">G</span>
            Sign in with Google
          </Button>

          {/* Demo credentials */}
          <div className="mt-6 rounded-xl border border-border bg-muted/60 p-4">
            <p className="text-xs font-medium text-foreground mb-1.5">Demo credentials</p>
            <div className="space-y-1 text-xs text-muted-foreground">
              <p>Admin: <span className="text-foreground font-mono">admin@flourish.local</span> / <span className="text-foreground font-mono">password123</span></p>
              <p>Staff: <span className="text-foreground font-mono">staff@flourish.local</span> / <span className="text-foreground font-mono">staff123</span></p>
            </div>
          </div>

          {/* Sign up toggle */}
          <div className="mt-5 text-center">
            <button
              disabled={loginType !== "client"}
              onClick={() => setIsSignUp(!isSignUp)}
              className="text-sm text-muted-foreground hover:text-primary transition-fast disabled:cursor-not-allowed disabled:opacity-50"
            >
              {loginType !== "client"
                ? "Client sign-up available only"
                : isSignUp
                ? "Already have an account? Sign in"
                : "Need a client account? Sign up"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
