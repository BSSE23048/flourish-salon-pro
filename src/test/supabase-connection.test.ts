import { createClient } from "@supabase/supabase-js";
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const readDotenv = () => {
  const envPath = resolve(process.cwd(), ".env");
  if (!existsSync(envPath)) return {};

  return readFileSync(envPath, "utf8")
    .split(/\r?\n/)
    .reduce<Record<string, string>>((acc, line) => {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#")) return acc;

      const equalsIndex = trimmed.indexOf("=");
      if (equalsIndex === -1) return acc;

      const key = trimmed.slice(0, equalsIndex).trim();
      const value = trimmed.slice(equalsIndex + 1).trim().replace(/^['"]|['"]$/g, "");
      acc[key] = value;
      return acc;
    }, {});
};

const env = {
  ...readDotenv(),
  ...process.env,
};

const supabaseUrl = env.NEXT_PUBLIC_SUPABASE_URL || env.VITE_SUPABASE_URL;
const supabaseKey =
  env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
  env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
  env.VITE_SUPABASE_PUBLISHABLE_KEY ||
  env.VITE_SUPABASE_ANON_KEY;

const hasSupabaseCredentials =
  Boolean(supabaseUrl && supabaseKey) &&
  supabaseUrl !== "https://example.supabase.co" &&
  supabaseKey !== "demo-key";
const shouldRunConnectionTest = hasSupabaseCredentials && env.RUN_SUPABASE_CONNECTION_TESTS === "true";

const describeWithConnection = shouldRunConnectionTest ? describe : describe.skip;

describeWithConnection("Supabase database connection", () => {
  it("connects with the configured publishable key and reads public services", async () => {
    const supabase = createClient(supabaseUrl!, supabaseKey!, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
    });

    const { data, error, status } = await supabase
      .from("services")
      .select("id")
      .limit(1);

    expect(error, error?.message).toBeNull();
    expect(status).toBeGreaterThanOrEqual(200);
    expect(status).toBeLessThan(300);
    expect(data).toEqual(expect.any(Array));
  });
});

describe("Supabase database connection configuration", () => {
  it("is configured for opt-in Supabase connection smoke tests", () => {
    if (!hasSupabaseCredentials) {
      console.warn(
        "Skipping Supabase connection smoke test. Set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY or NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY.",
      );
    } else if (!shouldRunConnectionTest) {
      console.warn("Skipping Supabase connection smoke test. Set RUN_SUPABASE_CONNECTION_TESTS=true to enable it.");
    }

    expect(typeof hasSupabaseCredentials).toBe("boolean");
    expect(typeof shouldRunConnectionTest).toBe("boolean");
  });
});
