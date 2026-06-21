-- Flourish Salon Pro: RBAC, advanced scheduling, holds, waitlist, and booking policies.

ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'customer';

CREATE TYPE public.appointment_status AS ENUM (
  'held',
  'booked',
  'arrived',
  'in_progress',
  'completed',
  'cancelled',
  'no_show'
);

CREATE TYPE public.hold_status AS ENUM ('active', 'converted', 'expired', 'released');
CREATE TYPE public.waitlist_status AS ENUM ('waiting', 'notified', 'converted', 'cancelled');

CREATE TABLE public.staff_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID UNIQUE REFERENCES auth.users(id) ON DELETE SET NULL,
  full_name TEXT NOT NULL,
  title TEXT NOT NULL DEFAULT 'Stylist',
  bio TEXT NOT NULL DEFAULT '',
  avatar_url TEXT,
  active BOOLEAN NOT NULL DEFAULT true,
  commission_rate NUMERIC(5,2) NOT NULL DEFAULT 10,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.services (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  category TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  duration_minutes INTEGER NOT NULL CHECK (duration_minutes >= 30),
  price_cents INTEGER NOT NULL CHECK (price_cents >= 0),
  deposit_cents INTEGER NOT NULL DEFAULT 0 CHECK (deposit_cents >= 0),
  active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.appointments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  customer_name TEXT NOT NULL,
  customer_email TEXT NOT NULL,
  staff_id UUID NOT NULL REFERENCES public.staff_profiles(id) ON DELETE RESTRICT,
  service_id UUID NOT NULL REFERENCES public.services(id) ON DELETE RESTRICT,
  start_at TIMESTAMPTZ NOT NULL,
  end_at TIMESTAMPTZ NOT NULL,
  status public.appointment_status NOT NULL DEFAULT 'booked',
  deposit_required_cents INTEGER NOT NULL DEFAULT 0,
  deposit_paid BOOLEAN NOT NULL DEFAULT false,
  notes TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CHECK (end_at > start_at)
);

CREATE TABLE public.appointment_holds (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  staff_id UUID NOT NULL REFERENCES public.staff_profiles(id) ON DELETE CASCADE,
  service_id UUID NOT NULL REFERENCES public.services(id) ON DELETE CASCADE,
  start_at TIMESTAMPTZ NOT NULL,
  end_at TIMESTAMPTZ NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  status public.hold_status NOT NULL DEFAULT 'active',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CHECK (end_at > start_at),
  CHECK (expires_at > created_at)
);

CREATE TABLE public.waitlist_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  customer_name TEXT NOT NULL,
  customer_email TEXT NOT NULL,
  staff_id UUID NOT NULL REFERENCES public.staff_profiles(id) ON DELETE CASCADE,
  service_id UUID NOT NULL REFERENCES public.services(id) ON DELETE CASCADE,
  desired_start_at TIMESTAMPTZ NOT NULL,
  status public.waitlist_status NOT NULL DEFAULT 'waiting',
  notified_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.staff_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.services ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.appointments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.appointment_holds ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.waitlist_entries ENABLE ROW LEVEL SECURITY;

CREATE INDEX appointments_staff_window_idx ON public.appointments (staff_id, start_at, end_at)
  WHERE status NOT IN ('cancelled', 'no_show');
CREATE INDEX appointment_holds_staff_window_idx ON public.appointment_holds (staff_id, start_at, end_at)
  WHERE status = 'active';
CREATE INDEX waitlist_lookup_idx ON public.waitlist_entries (staff_id, service_id, desired_start_at)
  WHERE status = 'waiting';

CREATE OR REPLACE FUNCTION public.prevent_appointment_overlap()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.status NOT IN ('cancelled', 'no_show') AND EXISTS (
    SELECT 1 FROM public.appointments existing
    WHERE existing.staff_id = NEW.staff_id
      AND existing.id <> NEW.id
      AND existing.status NOT IN ('cancelled', 'no_show')
      AND tstzrange(existing.start_at, existing.end_at, '[)') && tstzrange(NEW.start_at, NEW.end_at, '[)')
  ) THEN
    RAISE EXCEPTION 'Appointment overlaps an existing booking for this staff member';
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER prevent_appointment_overlap_trigger
  BEFORE INSERT OR UPDATE ON public.appointments
  FOR EACH ROW EXECUTE FUNCTION public.prevent_appointment_overlap();

CREATE POLICY "Public can read active staff" ON public.staff_profiles FOR SELECT USING (active = true);
CREATE POLICY "Public can read active services" ON public.services FOR SELECT USING (active = true);

CREATE POLICY "Owners manage staff" ON public.staff_profiles
  FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'owner'));
CREATE POLICY "Owners manage services" ON public.services
  FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'owner'));
CREATE POLICY "Owners view all appointments" ON public.appointments
  FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'owner'));
CREATE POLICY "Staff view assigned appointments" ON public.appointments
  FOR SELECT TO authenticated USING (
    EXISTS (SELECT 1 FROM public.staff_profiles s WHERE s.id = staff_id AND s.user_id = auth.uid())
  );
CREATE POLICY "Staff update assigned appointment status" ON public.appointments
  FOR UPDATE TO authenticated USING (
    EXISTS (SELECT 1 FROM public.staff_profiles s WHERE s.id = staff_id AND s.user_id = auth.uid())
  ) WITH CHECK (
    EXISTS (SELECT 1 FROM public.staff_profiles s WHERE s.id = staff_id AND s.user_id = auth.uid())
  );
CREATE POLICY "Customers view own appointments" ON public.appointments
  FOR SELECT TO authenticated USING (customer_user_id = auth.uid());
CREATE POLICY "Customers create own appointments" ON public.appointments
  FOR INSERT TO authenticated WITH CHECK (customer_user_id = auth.uid());

CREATE POLICY "Customers manage own holds" ON public.appointment_holds
  FOR ALL TO authenticated USING (customer_user_id = auth.uid()) WITH CHECK (customer_user_id = auth.uid());
CREATE POLICY "Customers manage own waitlist" ON public.waitlist_entries
  FOR ALL TO authenticated USING (customer_user_id = auth.uid()) WITH CHECK (customer_user_id = auth.uid());

ALTER PUBLICATION supabase_realtime ADD TABLE public.appointments;
ALTER PUBLICATION supabase_realtime ADD TABLE public.appointment_holds;
ALTER PUBLICATION supabase_realtime ADD TABLE public.waitlist_entries;
