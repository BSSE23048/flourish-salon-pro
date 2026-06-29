import { useEffect, useState } from "react";
import { useRouter } from "next/router";
import { ArrowRight, Eye, EyeOff, KeyRound, ShieldCheck, Sparkles, User, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

type LoginType = "admin" | "staff" | "client";

const portalCopy: Record<LoginType, { title: string; subtitle: string; email: string; password: string }> = {
  admin: {
    title: "Owner / Admin",
    subtitle: "Manage operations, finance, staff, and tenant security.",
    email: "admin@flourish.local",
    password: "password123",
  },
  staff: {
    title: "Salon Staff",
    subtitle: "Open your schedule, attendance, payroll, and security settings.",
    email: "staff@flourish.local",
    password: "staff123",
  },
  client: {
    title: "Client Portal",
    subtitle: "Book services, manage appointments, and access your salon profile.",
    email: "",
    password: "",
  },
};

export default function Login() {
  const [portal, setPortal] = useState<LoginType>("admin");
  const [isSignUp, setIsSignUp] = useState(false);
  const [email, setEmail] = useState(portalCopy.admin.email);
  const [password, setPassword] = useState(portalCopy.admin.password);
  const [fullName, setFullName] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const { signIn, signUp } = useAuth();
  const router = useRouter();

  useEffect(() => {
    const requested = router.query.portal;
    if (requested === "staff" || requested === "admin" || requested === "client") {
      switchPortal(requested);
    }
  }, [router.query.portal]);

  const switchPortal = (next: LoginType) => {
    setPortal(next);
    setIsSignUp(false);
    setEmail(portalCopy[next].email);
    setPassword(portalCopy[next].password);
    setFullName("");
  };

  const redirectForRole = (role?: string) => {
    if (role === "staff") return router.push("/staff");
    if (role === "customer" || role === "client") return router.push("/");
    return router.push("/admin");
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setLoading(true);
    try {
      if (portal === "client" && isSignUp) {
        const { error } = await signUp(email, password, fullName);
        if (error) throw new Error(error);
        toast.success("Client account created. Check your email if verification is enabled.");
        setIsSignUp(false);
        return;
      }

      const { error, role } = await signIn(email, password);
      if (error) throw new Error(error);
      await redirectForRole(role);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Authentication failed");
    } finally {
      setLoading(false);
    }
  };

  const loginWithGoogle = async () => {
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo: typeof window !== "undefined" ? `${window.location.origin}/` : undefined,
        },
      });
      if (error) throw error;
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Google sign-in failed");
    }
  };

  return (
    <div className="min-h-screen bg-background lg:grid lg:grid-cols-[minmax(420px,0.95fr)_1fr]">
      <aside className="hidden min-h-screen flex-col justify-between bg-[#07140f] p-12 text-white lg:flex">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-[#526048]">
            <Sparkles className="h-5 w-5" />
          </div>
          <div>
            <p className="text-xl font-bold leading-none">Flourish</p>
            <p className="mt-1 text-[10px] uppercase tracking-[0.24em] text-white/45">Salon Pro</p>
          </div>
        </div>

        <div className="max-w-md">
          <p className="mb-4 text-xs font-medium uppercase tracking-[0.22em] text-[#92a184]">Secure Workspace</p>
          <h1 className="font-editorial text-6xl leading-[1.05]">One salon platform, three protected portals.</h1>
          <p className="mt-6 text-sm leading-7 text-white/58">
            Role-aware access keeps owners, staff, and clients inside the exact workflows they are allowed to use.
          </p>
        </div>

        <p className="text-xs text-white/28">2026 Flourish Salon Pro</p>
      </aside>

      <main className="flex min-h-screen items-center justify-center px-5 py-10">
        <div className="w-full max-w-[460px]">
          <div className="mb-8 lg:hidden">
            <div className="flex items-center gap-2">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary text-primary-foreground">
                <Sparkles className="h-4 w-4" />
              </div>
              <p className="text-xl font-bold">Flourish Salon Pro</p>
            </div>
          </div>

          <div className="mb-6">
            <p className="text-sm font-medium text-primary">Secure login</p>
            <h2 className="mt-2 font-editorial text-4xl text-foreground">{portalCopy[portal].title}</h2>
            <p className="mt-2 text-sm text-muted-foreground">{portalCopy[portal].subtitle}</p>
          </div>

          <Tabs value={portal} onValueChange={(value) => switchPortal(value as LoginType)}>
            <TabsList className="grid h-auto w-full grid-cols-3 rounded-lg">
              <TabsTrigger value="admin" className="gap-1.5 py-2">
                <ShieldCheck className="h-3.5 w-3.5" />
                Owner
              </TabsTrigger>
              <TabsTrigger value="staff" className="gap-1.5 py-2">
                <Users className="h-3.5 w-3.5" />
                Staff
              </TabsTrigger>
              <TabsTrigger value="client" className="gap-1.5 py-2">
                <User className="h-3.5 w-3.5" />
                Client
              </TabsTrigger>
            </TabsList>

            {(["admin", "staff", "client"] as LoginType[]).map((key) => (
              <TabsContent key={key} value={key} className="mt-6">
                <form onSubmit={handleSubmit} className="space-y-4">
                  {key === "client" && isSignUp && (
                    <div className="space-y-2">
                      <label className="block text-sm font-medium text-foreground">Full name</label>
                      <Input value={fullName} onChange={(event) => setFullName(event.target.value)} placeholder="Your full name" required />
                    </div>
                  )}

                  <div className="space-y-2">
                    <label className="block text-sm font-medium text-foreground">Email address</label>
                    <Input
                      type="email"
                      value={email}
                      onChange={(event) => setEmail(event.target.value)}
                      placeholder={key === "client" ? "you@example.com" : portalCopy[key].email}
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="block text-sm font-medium text-foreground">Password</label>
                    <div className="relative">
                      <Input
                        type={showPassword ? "text" : "password"}
                        value={password}
                        onChange={(event) => setPassword(event.target.value)}
                        placeholder="Enter password"
                        required
                        minLength={key === "client" && isSignUp ? 10 : 6}
                        className="pr-11"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword((current) => !current)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 rounded p-1 text-muted-foreground hover:text-foreground"
                        aria-label={showPassword ? "Hide password" : "Show password"}
                      >
                        {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                    </div>
                  </div>

                  <Button type="submit" className="w-full" size="lg" disabled={loading}>
                    {loading ? "Checking credentials..." : key === "client" && isSignUp ? "Create client account" : "Login"}
                    {!loading && <ArrowRight className="h-4 w-4" />}
                  </Button>
                </form>

                {key === "client" && (
                  <div className="mt-4 space-y-3">
                    <Button type="button" variant="outline" className="w-full" onClick={loginWithGoogle}>
                      <KeyRound className="h-4 w-4" />
                      Login with Google
                    </Button>
                    <button
                      type="button"
                      onClick={() => setIsSignUp((current) => !current)}
                      className="w-full text-center text-sm text-muted-foreground transition-colors hover:text-foreground"
                    >
                      {isSignUp ? "Already registered? Login instead" : "New client? Create an account"}
                    </button>
                  </div>
                )}
              </TabsContent>
            ))}
          </Tabs>

          <div className="mt-6 rounded-lg border border-border bg-muted/60 p-4 text-xs text-muted-foreground">
            <p className="mb-1 font-medium text-foreground">Demo credentials</p>
            <p>Owner/admin: <span className="font-mono text-foreground">admin@flourish.local</span> / <span className="font-mono text-foreground">password123</span></p>
            <p>Staff: <span className="font-mono text-foreground">staff@flourish.local</span> / <span className="font-mono text-foreground">staff123</span></p>
          </div>
        </div>
      </main>
    </div>
  );
}
