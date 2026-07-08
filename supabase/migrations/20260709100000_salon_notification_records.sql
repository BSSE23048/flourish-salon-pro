-- Backend-managed notification persistence for admin and staff alerts.

CREATE TABLE IF NOT EXISTS public.salon_notification_records (
  id TEXT PRIMARY KEY,
  data JSONB NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS salon_notification_role_idx ON public.salon_notification_records ((data ->> 'role'));
CREATE INDEX IF NOT EXISTS salon_notification_staff_idx ON public.salon_notification_records ((data ->> 'staffId'));
CREATE INDEX IF NOT EXISTS salon_notification_updated_idx ON public.salon_notification_records (updated_at DESC);

ALTER TABLE public.salon_notification_records ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Owners manage salon notification records" ON public.salon_notification_records;

-- Browser clients read notifications through Express. The backend writes with
-- the server-side Supabase secret, matching the other operational JSONB tables.
