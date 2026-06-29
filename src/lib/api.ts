export const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";

export const API_UNAVAILABLE_MESSAGE = `Could not reach the API server at ${API_URL}. Run npm run dev:api or npm run dev:full.`;

export const SOCKET_OPTIONS = {
  reconnectionAttempts: 1,
  timeout: 1500,
};

export async function getAuthHeaders(extra: HeadersInit = {}) {
  const headers = { ...extra };
  if (typeof window !== "undefined") {
    const storage = window.localStorage as Storage | undefined;
    if (!storage || typeof storage.getItem !== "function" || typeof storage.setItem !== "function") {
      return headers;
    }

    const storedDemo = storage.getItem("flourish-demo-auth");
    if (storedDemo) {
      try {
        const demo = JSON.parse(storedDemo) as { role?: string };
        const demoRole = demo.role === "staff" ? "staff" : "owner";
        return { ...headers, Authorization: `Bearer flourish-demo-${demoRole}` };
      } catch {
        return headers;
      }
    }

    const roleCookie = document.cookie
      .split(";")
      .map((cookie) => cookie.trim())
      .find((cookie) => cookie.startsWith("flourish-role="))
      ?.split("=")[1];
    if (roleCookie === "owner" || roleCookie === "staff") {
      return { ...headers, Authorization: `Bearer flourish-demo-${roleCookie}` };
    }
  }
  const { supabase } = await import("@/integrations/supabase/client");
  try {
    const { data } = await supabase.auth.getSession();
    const token = data.session?.access_token;
    return {
      ...headers,
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    };
  } catch {
    return headers;
  }
}
