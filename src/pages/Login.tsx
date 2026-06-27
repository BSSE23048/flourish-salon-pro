import { useEffect, useState } from "react";
import { useRouter } from "next/router";
import { Scissors, Eye, EyeOff, ShieldCheck, User, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

export default function Login() {
  const [isSignUp, setIsSignUp] = useState(false);
  const [loginType, setLoginType] = useState<"admin" | "staff" | "client">("admin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const { signIn, signUp } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (router.query.portal === "staff") setLoginType("staff");
    if (router.query.portal === "admin") setLoginType("admin");
  }, [router.query.portal]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    if (isSignUp) {
      const { error } = await signUp(email, password, fullName);
      setLoading(false);
      if (error) {
        toast.error(error);
      } else {
        toast.success("Account created! Please check your email to verify your account.");
      }
    } else {
      const { error, role } = await signIn(email, password);
      setLoading(false);
      if (error) {
        toast.error(error);
      } else {
        router.push(role === "staff" ? "/staff" : role === "customer" ? "/" : "/admin");
      }
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-muted p-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <div className="w-14 h-14 rounded-2xl bg-primary flex items-center justify-center mx-auto mb-4">
            <Scissors className="w-7 h-7 text-primary-foreground" />
          </div>
          <h1 className="text-2xl font-bold text-foreground">Flourish Salon Pro</h1>
          <p className="text-sm text-muted-foreground mt-1">
            {isSignUp ? "Create your client account" : `${loginType === "client" ? "Client" : loginType === "admin" ? "Admin" : "Staff"} sign in`}
          </p>
        </div>

        <div className="bg-card rounded-xl border border-border p-6 shadow-card">
          <div className="mb-4 grid grid-cols-3 gap-2">
            {[
              { key: "admin", label: "Admin", icon: ShieldCheck },
              { key: "staff", label: "Staff", icon: Users },
              { key: "client", label: "Client", icon: User },
            ].map((option) => (
              <button
                key={option.key}
                type="button"
                onClick={() => {
                  setLoginType(option.key as "admin" | "staff" | "client");
                  setIsSignUp(option.key === "client" ? isSignUp : false);
                  if (option.key === "admin") {
                    setEmail("admin@flourish.local");
                    setPassword("password123");
                  } else if (option.key === "staff") {
                    setEmail("staff@flourish.local");
                    setPassword("staff123");
                  } else {
                    setEmail("");
                    setPassword("");
                  }
                }}
                className={`rounded-lg border p-3 text-xs font-semibold transition ${loginType === option.key ? "border-primary bg-primary text-primary-foreground" : "border-border bg-muted text-muted-foreground hover:text-foreground"}`}
              >
                <option.icon className="mx-auto mb-1 h-4 w-4" />
                {option.label}
              </button>
            ))}
          </div>
          <form onSubmit={handleSubmit} className="space-y-4">
            {isSignUp && loginType === "client" && (
              <div>
                <label className="text-sm font-medium text-foreground mb-1.5 block">Full Name</label>
                <Input
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="Your name"
                  required
                />
              </div>
            )}
            <div>
              <label className="text-sm font-medium text-foreground mb-1.5 block">Email</label>
              <Input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder={loginType === "admin" ? "admin@flourish.local" : loginType === "staff" ? "staff@flourish.local" : "client@email.com"}
                required
              />
            </div>
            <div>
              <label className="text-sm font-medium text-foreground mb-1.5 block">Password</label>
              <div className="relative">
                <Input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                  minLength={6}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? (isSignUp ? "Creating account..." : "Signing in...") : (isSignUp ? "Create Client Account" : `Sign In as ${loginType === "client" ? "Client" : loginType === "admin" ? "Admin" : "Staff"}`)}
            </Button>
          </form>

          <div className="mt-4 text-center">
            <div className="mb-4 rounded-lg border border-border bg-muted/50 p-3 text-left text-xs text-muted-foreground">
              <p className="font-medium text-foreground">Demo access</p>
              <p>Admin: admin@flourish.local / password123</p>
              <p>Staff: staff@flourish.local / staff123</p>
            </div>
            <button
              disabled={loginType !== "client"}
              onClick={() => setIsSignUp(!isSignUp)}
              className="text-sm text-primary hover:underline disabled:cursor-not-allowed disabled:text-muted-foreground"
            >
              {loginType !== "client" ? "Client sign-up only" : isSignUp ? "Already have an account? Sign in" : "Need a client account? Sign up"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
