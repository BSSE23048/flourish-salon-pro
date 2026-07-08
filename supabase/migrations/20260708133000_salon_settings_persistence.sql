-- Persistent admin settings for the Express settings API.

CREATE TABLE IF NOT EXISTS public.salon_settings_records (
  id TEXT PRIMARY KEY,
  data JSONB NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS salon_settings_updated_idx ON public.salon_settings_records (updated_at DESC);

ALTER TABLE public.salon_settings_records ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Owners manage salon settings records" ON public.salon_settings_records;

-- No browser-facing RLS policy is required. The Express API manages this
-- table with the server-side Supabase secret key and exposes controlled routes.
