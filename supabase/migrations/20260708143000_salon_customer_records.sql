-- Backend-managed customer CRM persistence for manually added customers.
-- Google/Supabase Auth customers still come from public.profiles and auth.users.

CREATE TABLE IF NOT EXISTS public.salon_customer_records (
  id TEXT PRIMARY KEY,
  data JSONB NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS salon_customer_email_idx ON public.salon_customer_records ((lower(data ->> 'email')));
CREATE INDEX IF NOT EXISTS salon_customer_updated_idx ON public.salon_customer_records (updated_at DESC);

ALTER TABLE public.salon_customer_records ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Owners manage salon customer records" ON public.salon_customer_records;

-- No browser-facing policy is created here. The Express API owns these records
-- through the server-side Supabase secret key, matching the other operational
-- JSONB persistence tables.
