import type { User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";

function displayNameFor(user: User, fallbackName = "") {
  const metadata = user.user_metadata || {};
  return String(
    metadata.full_name ||
    metadata.name ||
    metadata.user_name ||
    fallbackName ||
    user.email?.split("@")[0] ||
    "Customer",
  ).trim();
}

export async function syncSupabaseCustomerProfile(user: User, fallbackName = "") {
  const fullName = displayNameFor(user, fallbackName);
  const email = user.email || null;

  await supabase.from("profiles").upsert({
    user_id: user.id,
    full_name: fullName,
    email,
  }, { onConflict: "user_id" });

  await supabase.from("user_roles").upsert({
    user_id: user.id,
    role: "customer",
  }, { onConflict: "user_id,role" });

  return { full_name: fullName, email };
}
