-- Flourish Salon Pro enterprise hardening.
-- This migration upgrades the prototype schema toward a production multi-tenant model:
-- soft deletes, audit trails, slot locks, tenant isolation, RLS, and realtime publication.

CREATE EXTENSION IF NOT EXISTS pgcrypto;

ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'admin';
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'client';

DO $$
BEGIN
  IF to_regclass('public.staff') IS NULL AND to_regclass('public.staff_profiles') IS NOT NULL THEN
    ALTER TABLE public.staff_profiles RENAME TO staff;
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS public.tenants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at TIMESTAMPTZ DEFAULT NULL
);

INSERT INTO public.tenants (id, name, slug)
VALUES ('00000000-0000-0000-0000-000000000001', 'Flourish Salon Pro', 'flourish')
ON CONFLICT (slug) DO NOTHING;

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES public.tenants(id) ON DELETE RESTRICT DEFAULT '00000000-0000-0000-0000-000000000001';

ALTER TABLE public.user_roles
  ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES public.tenants(id) ON DELETE RESTRICT DEFAULT '00000000-0000-0000-0000-000000000001';

CREATE TABLE IF NOT EXISTS public.staff (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE RESTRICT DEFAULT '00000000-0000-0000-0000-000000000001',
  user_id UUID UNIQUE REFERENCES auth.users(id) ON DELETE SET NULL,
  first_name TEXT NOT NULL DEFAULT '',
  last_name TEXT NOT NULL DEFAULT '',
  full_name TEXT NOT NULL DEFAULT '',
  email TEXT UNIQUE,
  title TEXT NOT NULL DEFAULT 'Stylist',
  bio TEXT NOT NULL DEFAULT '',
  avatar_url TEXT,
  specialties TEXT[] NOT NULL DEFAULT ARRAY['Hair']::TEXT[],
  active BOOLEAN NOT NULL DEFAULT true,
  availability_status public.staff_availability_status NOT NULL DEFAULT 'online',
  commission_rate NUMERIC(5,2) NOT NULL DEFAULT 10,
  base_salary_cents INTEGER NOT NULL DEFAULT 0 CHECK (base_salary_cents >= 0),
  must_reset_password BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at TIMESTAMPTZ DEFAULT NULL
);

ALTER TABLE public.staff
  ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES public.tenants(id) ON DELETE RESTRICT DEFAULT '00000000-0000-0000-0000-000000000001',
  ADD COLUMN IF NOT EXISTS first_name TEXT NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS last_name TEXT NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS email TEXT UNIQUE,
  ADD COLUMN IF NOT EXISTS specialties TEXT[] NOT NULL DEFAULT ARRAY['Hair']::TEXT[],
  ADD COLUMN IF NOT EXISTS base_salary_cents INTEGER NOT NULL DEFAULT 0 CHECK (base_salary_cents >= 0),
  ADD COLUMN IF NOT EXISTS must_reset_password BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ DEFAULT NULL;

UPDATE public.staff
SET full_name = trim(concat_ws(' ', first_name, last_name))
WHERE full_name = '' AND (first_name <> '' OR last_name <> '');

UPDATE public.staff
SET tenant_id = '00000000-0000-0000-0000-000000000001'
WHERE tenant_id IS NULL;

ALTER TABLE public.services
  ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES public.tenants(id) ON DELETE RESTRICT DEFAULT '00000000-0000-0000-0000-000000000001',
  ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ DEFAULT NULL;

UPDATE public.services
SET tenant_id = '00000000-0000-0000-0000-000000000001'
WHERE tenant_id IS NULL;

ALTER TABLE public.appointments
  ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES public.tenants(id) ON DELETE RESTRICT DEFAULT '00000000-0000-0000-0000-000000000001',
  ADD COLUMN IF NOT EXISTS client_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS email TEXT;

UPDATE public.appointments
SET tenant_id = '00000000-0000-0000-0000-000000000001'
WHERE tenant_id IS NULL;

UPDATE public.appointments
SET email = customer_email
WHERE email IS NULL AND customer_email IS NOT NULL;

CREATE TABLE IF NOT EXISTS public.invoices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE RESTRICT DEFAULT '00000000-0000-0000-0000-000000000001',
  client_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  customer_email TEXT NOT NULL,
  customer_name TEXT NOT NULL,
  invoice_number TEXT NOT NULL UNIQUE,
  status TEXT NOT NULL DEFAULT 'paid' CHECK (status IN ('draft', 'open', 'paid', 'void', 'refunded')),
  subtotal_cents INTEGER NOT NULL DEFAULT 0 CHECK (subtotal_cents >= 0),
  discount_cents INTEGER NOT NULL DEFAULT 0 CHECK (discount_cents >= 0),
  total_cents INTEGER NOT NULL DEFAULT 0 CHECK (total_cents >= 0),
  payment_method TEXT NOT NULL DEFAULT 'cash',
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at TIMESTAMPTZ DEFAULT NULL
);

CREATE TABLE IF NOT EXISTS public.invoice_line_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE RESTRICT DEFAULT '00000000-0000-0000-0000-000000000001',
  invoice_id UUID NOT NULL REFERENCES public.invoices(id) ON DELETE RESTRICT,
  staff_id UUID REFERENCES public.staff(id) ON DELETE SET NULL,
  service_id UUID REFERENCES public.services(id) ON DELETE SET NULL,
  description TEXT NOT NULL,
  quantity INTEGER NOT NULL DEFAULT 1 CHECK (quantity > 0),
  unit_amount_cents INTEGER NOT NULL DEFAULT 0 CHECK (unit_amount_cents >= 0),
  amount_cents INTEGER NOT NULL DEFAULT 0 CHECK (amount_cents >= 0),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.ledger_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE RESTRICT DEFAULT '00000000-0000-0000-0000-000000000001',
  invoice_id UUID REFERENCES public.invoices(id) ON DELETE SET NULL,
  entry_type TEXT NOT NULL CHECK (entry_type IN ('revenue', 'inventory_expense', 'salary_expense', 'refund', 'adjustment')),
  amount_cents INTEGER NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.system_audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID REFERENCES public.tenants(id) ON DELETE SET NULL DEFAULT '00000000-0000-0000-0000-000000000001',
  user_id UUID NULL,
  user_email VARCHAR,
  role VARCHAR,
  action_type VARCHAR NOT NULL,
  ip_address VARCHAR,
  payload JSONB NOT NULL DEFAULT '{}'::JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp()
);

CREATE TABLE IF NOT EXISTS public.slot_locks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE RESTRICT DEFAULT '00000000-0000-0000-0000-000000000001',
  staff_id UUID NOT NULL REFERENCES public.staff(id) ON DELETE RESTRICT,
  booking_date DATE NOT NULL,
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  locked_until TIMESTAMPTZ NOT NULL,
  locked_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CHECK (end_time > start_time)
);

DROP INDEX IF EXISTS public.idx_prevent_overlapping_locks;
CREATE UNIQUE INDEX idx_prevent_overlapping_locks
  ON public.slot_locks (staff_id, booking_date, start_time);

CREATE INDEX IF NOT EXISTS staff_active_tenant_idx ON public.staff (tenant_id, id) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS services_active_tenant_idx ON public.services (tenant_id, id) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS appointments_tenant_staff_window_idx ON public.appointments (tenant_id, staff_id, start_at, end_at);
CREATE INDEX IF NOT EXISTS invoices_tenant_created_idx ON public.invoices (tenant_id, created_at DESC) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS ledger_tenant_type_created_idx ON public.ledger_entries (tenant_id, entry_type, created_at DESC);
CREATE INDEX IF NOT EXISTS system_audit_logs_created_idx ON public.system_audit_logs (created_at DESC);

CREATE OR REPLACE FUNCTION public.jwt_role()
RETURNS TEXT
LANGUAGE sql
STABLE
AS $$
  SELECT COALESCE(
    auth.jwt() -> 'app_metadata' ->> 'role',
    auth.jwt() -> 'user_metadata' ->> 'role',
    (
      SELECT ur.role::TEXT
      FROM public.user_roles ur
      WHERE ur.user_id = auth.uid()
      ORDER BY CASE ur.role::TEXT WHEN 'owner' THEN 1 WHEN 'admin' THEN 2 WHEN 'staff' THEN 3 ELSE 4 END
      LIMIT 1
    ),
    'client'
  )
$$;

CREATE OR REPLACE FUNCTION public.jwt_tenant_id()
RETURNS UUID
LANGUAGE sql
STABLE
AS $$
  SELECT COALESCE(
    NULLIF(auth.jwt() -> 'app_metadata' ->> 'tenant_id', '')::UUID,
    (SELECT tenant_id FROM public.profiles WHERE user_id = auth.uid() LIMIT 1),
    '00000000-0000-0000-0000-000000000001'::UUID
  )
$$;

CREATE OR REPLACE FUNCTION public.is_owner_or_admin()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
AS $$
  SELECT public.jwt_role() IN ('owner', 'admin')
$$;

CREATE OR REPLACE FUNCTION public.is_staff_for(_staff_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.staff s
    WHERE s.id = _staff_id
      AND s.user_id = auth.uid()
      AND s.deleted_at IS NULL
  )
$$;

CREATE OR REPLACE VIEW public.active_staff AS
SELECT *
FROM public.staff
WHERE deleted_at IS NULL;

CREATE OR REPLACE VIEW public.active_services AS
SELECT *
FROM public.services
WHERE deleted_at IS NULL;

DO $$
BEGIN
  IF to_regclass('public.staff_profiles') IS NULL THEN
    CREATE VIEW public.staff_profiles AS SELECT * FROM public.staff;
  END IF;
END $$;

ALTER TABLE public.tenants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.staff ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.services ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.appointments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.invoice_line_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ledger_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.system_audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.slot_locks ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Owners and admins manage staff" ON public.staff;
DROP POLICY IF EXISTS "Staff see own profile" ON public.staff;
DROP POLICY IF EXISTS "Public read active services" ON public.services;
DROP POLICY IF EXISTS "Owners and admins manage services" ON public.services;
DROP POLICY IF EXISTS "Staff read active services" ON public.services;
DROP POLICY IF EXISTS "Owners and admins manage appointments" ON public.appointments;
DROP POLICY IF EXISTS "Staff see assigned appointments" ON public.appointments;
DROP POLICY IF EXISTS "Staff update assigned appointments" ON public.appointments;
DROP POLICY IF EXISTS "Clients see own appointments" ON public.appointments;
DROP POLICY IF EXISTS "Clients create own appointments" ON public.appointments;
DROP POLICY IF EXISTS "Owners and admins manage invoices" ON public.invoices;
DROP POLICY IF EXISTS "Clients see own invoices" ON public.invoices;
DROP POLICY IF EXISTS "Owners and admins manage invoice lines" ON public.invoice_line_items;
DROP POLICY IF EXISTS "Staff see own invoice lines" ON public.invoice_line_items;
DROP POLICY IF EXISTS "Owners and admins manage ledger" ON public.ledger_entries;
DROP POLICY IF EXISTS "Owners and admins view audit logs" ON public.system_audit_logs;
DROP POLICY IF EXISTS "Service role inserts audit logs" ON public.system_audit_logs;
DROP POLICY IF EXISTS "Owners and admins manage slot locks" ON public.slot_locks;
DROP POLICY IF EXISTS "Clients manage own slot locks" ON public.slot_locks;

CREATE POLICY "Owners and admins manage staff" ON public.staff
  FOR ALL TO authenticated
  USING (public.is_owner_or_admin() AND tenant_id = public.jwt_tenant_id())
  WITH CHECK (public.is_owner_or_admin() AND tenant_id = public.jwt_tenant_id());

CREATE POLICY "Staff see own profile" ON public.staff
  FOR SELECT TO authenticated
  USING (user_id = auth.uid() AND tenant_id = public.jwt_tenant_id() AND deleted_at IS NULL);

CREATE POLICY "Public read active services" ON public.services
  FOR SELECT TO anon, authenticated
  USING (active = true AND deleted_at IS NULL);

CREATE POLICY "Owners and admins manage services" ON public.services
  FOR ALL TO authenticated
  USING (public.is_owner_or_admin() AND tenant_id = public.jwt_tenant_id())
  WITH CHECK (public.is_owner_or_admin() AND tenant_id = public.jwt_tenant_id());

CREATE POLICY "Staff read active services" ON public.services
  FOR SELECT TO authenticated
  USING (public.jwt_role() = 'staff' AND active = true AND deleted_at IS NULL AND tenant_id = public.jwt_tenant_id());

CREATE POLICY "Owners and admins manage appointments" ON public.appointments
  FOR ALL TO authenticated
  USING (public.is_owner_or_admin() AND tenant_id = public.jwt_tenant_id())
  WITH CHECK (public.is_owner_or_admin() AND tenant_id = public.jwt_tenant_id());

CREATE POLICY "Staff see assigned appointments" ON public.appointments
  FOR SELECT TO authenticated
  USING (public.jwt_role() = 'staff' AND public.is_staff_for(staff_id) AND tenant_id = public.jwt_tenant_id());

CREATE POLICY "Staff update assigned appointments" ON public.appointments
  FOR UPDATE TO authenticated
  USING (public.jwt_role() = 'staff' AND public.is_staff_for(staff_id) AND tenant_id = public.jwt_tenant_id())
  WITH CHECK (public.jwt_role() = 'staff' AND public.is_staff_for(staff_id) AND tenant_id = public.jwt_tenant_id());

CREATE POLICY "Clients see own appointments" ON public.appointments
  FOR SELECT TO authenticated
  USING (
    public.jwt_role() = 'client'
    AND tenant_id = public.jwt_tenant_id()
    AND (client_id = auth.uid() OR lower(email) = lower(auth.jwt() ->> 'email') OR lower(customer_email) = lower(auth.jwt() ->> 'email'))
  );

CREATE POLICY "Clients create own appointments" ON public.appointments
  FOR INSERT TO authenticated
  WITH CHECK (
    public.jwt_role() = 'client'
    AND tenant_id = public.jwt_tenant_id()
    AND (client_id = auth.uid() OR lower(email) = lower(auth.jwt() ->> 'email') OR lower(customer_email) = lower(auth.jwt() ->> 'email'))
  );

CREATE POLICY "Owners and admins manage invoices" ON public.invoices
  FOR ALL TO authenticated
  USING (public.is_owner_or_admin() AND tenant_id = public.jwt_tenant_id())
  WITH CHECK (public.is_owner_or_admin() AND tenant_id = public.jwt_tenant_id());

CREATE POLICY "Clients see own invoices" ON public.invoices
  FOR SELECT TO authenticated
  USING (public.jwt_role() = 'client' AND tenant_id = public.jwt_tenant_id() AND (client_id = auth.uid() OR lower(customer_email) = lower(auth.jwt() ->> 'email')));

CREATE POLICY "Owners and admins manage invoice lines" ON public.invoice_line_items
  FOR ALL TO authenticated
  USING (public.is_owner_or_admin() AND tenant_id = public.jwt_tenant_id())
  WITH CHECK (public.is_owner_or_admin() AND tenant_id = public.jwt_tenant_id());

CREATE POLICY "Staff see own invoice lines" ON public.invoice_line_items
  FOR SELECT TO authenticated
  USING (public.jwt_role() = 'staff' AND tenant_id = public.jwt_tenant_id() AND public.is_staff_for(staff_id));

CREATE POLICY "Owners and admins manage ledger" ON public.ledger_entries
  FOR ALL TO authenticated
  USING (public.is_owner_or_admin() AND tenant_id = public.jwt_tenant_id())
  WITH CHECK (public.is_owner_or_admin() AND tenant_id = public.jwt_tenant_id());

CREATE POLICY "Owners and admins view audit logs" ON public.system_audit_logs
  FOR SELECT TO authenticated
  USING (public.is_owner_or_admin() AND (tenant_id = public.jwt_tenant_id() OR tenant_id IS NULL));

CREATE POLICY "Service role inserts audit logs" ON public.system_audit_logs
  FOR INSERT TO authenticated
  WITH CHECK (public.is_owner_or_admin() OR user_id = auth.uid() OR user_id IS NULL);

CREATE POLICY "Owners and admins manage slot locks" ON public.slot_locks
  FOR ALL TO authenticated
  USING (public.is_owner_or_admin() AND tenant_id = public.jwt_tenant_id())
  WITH CHECK (public.is_owner_or_admin() AND tenant_id = public.jwt_tenant_id());

CREATE POLICY "Clients manage own slot locks" ON public.slot_locks
  FOR ALL TO authenticated
  USING (public.jwt_role() = 'client' AND tenant_id = public.jwt_tenant_id() AND locked_by = auth.uid())
  WITH CHECK (public.jwt_role() = 'client' AND tenant_id = public.jwt_tenant_id() AND locked_by = auth.uid());

CREATE OR REPLACE FUNCTION public.create_client_booking(
  p_tenant_id UUID,
  p_client_id UUID,
  p_customer_name TEXT,
  p_customer_email TEXT,
  p_staff_id UUID,
  p_service_id UUID,
  p_start_at TIMESTAMPTZ,
  p_notes TEXT DEFAULT ''
)
RETURNS public.appointments
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_service public.services%ROWTYPE;
  v_staff public.staff%ROWTYPE;
  v_end_at TIMESTAMPTZ;
  v_booking_date DATE;
  v_start_time TIME;
  v_end_time TIME;
  v_appointment public.appointments%ROWTYPE;
BEGIN
  SELECT *
  INTO v_service
  FROM public.services
  WHERE id = p_service_id
    AND tenant_id = p_tenant_id
    AND active = true
    AND deleted_at IS NULL
  FOR SHARE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Service is unavailable';
  END IF;

  SELECT *
  INTO v_staff
  FROM public.staff
  WHERE id = p_staff_id
    AND tenant_id = p_tenant_id
    AND active = true
    AND deleted_at IS NULL
    AND availability_status = 'online'
  FOR SHARE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Staff member is unavailable';
  END IF;

  v_end_at := p_start_at + make_interval(mins => v_service.duration_minutes);
  v_booking_date := (p_start_at AT TIME ZONE 'UTC')::DATE;
  v_start_time := (p_start_at AT TIME ZONE 'UTC')::TIME;
  v_end_time := (v_end_at AT TIME ZONE 'UTC')::TIME;

  DELETE FROM public.slot_locks
  WHERE locked_until <= clock_timestamp();

  INSERT INTO public.slot_locks (
    tenant_id,
    staff_id,
    booking_date,
    start_time,
    end_time,
    locked_until,
    locked_by
  )
  VALUES (
    p_tenant_id,
    p_staff_id,
    v_booking_date,
    v_start_time,
    v_end_time,
    clock_timestamp() + interval '7 minutes',
    p_client_id
  );

  INSERT INTO public.appointments (
    tenant_id,
    customer_user_id,
    client_id,
    customer_name,
    customer_email,
    email,
    staff_id,
    service_id,
    start_at,
    end_at,
    status,
    deposit_required_cents,
    deposit_paid,
    notes
  )
  VALUES (
    p_tenant_id,
    p_client_id,
    p_client_id,
    p_customer_name,
    p_customer_email,
    p_customer_email,
    p_staff_id,
    p_service_id,
    p_start_at,
    v_end_at,
    'booked',
    v_service.deposit_cents,
    false,
    COALESCE(p_notes, '')
  )
  RETURNING * INTO v_appointment;

  RETURN v_appointment;
EXCEPTION
  WHEN unique_violation THEN
    RAISE EXCEPTION 'That slot is already locked. Choose another time or join the waitlist.';
END;
$$;

DO $$
BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.appointments;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.invoices;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.attendance_logs;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.system_audit_logs;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
