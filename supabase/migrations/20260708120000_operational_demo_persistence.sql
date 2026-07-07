-- Operational persistence for the Express API contract.
-- These tables intentionally store the current API payloads as JSONB so the
-- existing Next.js dashboards can migrate off in-memory state without a
-- breaking shape change.

CREATE TABLE IF NOT EXISTS public.salon_staff_records (
  id TEXT PRIMARY KEY,
  data JSONB NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.salon_service_records (
  id TEXT PRIMARY KEY,
  data JSONB NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.salon_appointment_records (
  id TEXT PRIMARY KEY,
  data JSONB NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.salon_attendance_records (
  id TEXT PRIMARY KEY,
  data JSONB NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.salon_invoice_records (
  id TEXT PRIMARY KEY,
  data JSONB NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.salon_payroll_records (
  id TEXT PRIMARY KEY,
  data JSONB NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.salon_payroll_adjustment_records (
  id TEXT PRIMARY KEY,
  data JSONB NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.salon_expense_records (
  id TEXT PRIMARY KEY,
  data JSONB NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS salon_appointment_staff_start_idx ON public.salon_appointment_records ((data ->> 'staffId'), (data ->> 'startAt'));
CREATE INDEX IF NOT EXISTS salon_appointment_status_idx ON public.salon_appointment_records ((data ->> 'status'));
CREATE INDEX IF NOT EXISTS salon_attendance_staff_date_idx ON public.salon_attendance_records ((data ->> 'staffId'), (data ->> 'date'));
CREATE INDEX IF NOT EXISTS salon_invoice_date_status_idx ON public.salon_invoice_records ((data ->> 'date'), (data ->> 'status'));
CREATE INDEX IF NOT EXISTS salon_payroll_staff_month_idx ON public.salon_payroll_records ((data ->> 'staffId'), (data ->> 'month'));
CREATE INDEX IF NOT EXISTS salon_payroll_adjustment_staff_month_idx ON public.salon_payroll_adjustment_records ((data ->> 'staffId'), (data ->> 'month'));
CREATE INDEX IF NOT EXISTS salon_expense_date_idx ON public.salon_expense_records ((data ->> 'date'));

ALTER TABLE public.salon_staff_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.salon_service_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.salon_appointment_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.salon_attendance_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.salon_invoice_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.salon_payroll_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.salon_payroll_adjustment_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.salon_expense_records ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Owners manage salon staff records" ON public.salon_staff_records;
DROP POLICY IF EXISTS "Owners manage salon service records" ON public.salon_service_records;
DROP POLICY IF EXISTS "Owners manage salon appointment records" ON public.salon_appointment_records;
DROP POLICY IF EXISTS "Owners manage salon attendance records" ON public.salon_attendance_records;
DROP POLICY IF EXISTS "Owners manage salon invoice records" ON public.salon_invoice_records;
DROP POLICY IF EXISTS "Owners manage salon payroll records" ON public.salon_payroll_records;
DROP POLICY IF EXISTS "Owners manage salon payroll adjustment records" ON public.salon_payroll_adjustment_records;
DROP POLICY IF EXISTS "Owners manage salon expense records" ON public.salon_expense_records;

-- No client-facing RLS policies are added for these operational JSONB tables.
-- The Express API reads/writes them with the server-side Supabase secret key,
-- which bypasses RLS. Browser clients should continue using the Express API.
