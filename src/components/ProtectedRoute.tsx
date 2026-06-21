import { useEffect } from "react";
import { useRouter } from "next/router";
import { useAuth } from "@/contexts/AuthContext";

type AppRole = "owner" | "staff" | "customer";

export default function ProtectedRoute({
  children,
  allowedRoles,
}: {
  children: React.ReactNode;
  allowedRoles?: AppRole[];
}) {
  const { session, loading, role } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && !session) {
      router.replace("/login");
      return;
    }
    if (!loading && session && allowedRoles?.length && role && !allowedRoles.includes(role)) {
      router.replace(role === "staff" ? "/staff" : "/");
    }
  }, [allowedRoles, loading, role, router, session]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!session) {
    return null;
  }

  if (allowedRoles?.length && role && !allowedRoles.includes(role)) {
    return null;
  }

  return <>{children}</>;
}
