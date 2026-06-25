-- Staff availability and daily attendance.

CREATE TYPE public.staff_availability_status AS ENUM ('online', 'offline_today', 'on_leave');
CREATE TYPE public.attendance_status AS ENUM ('clocked_in', 'clocked_out');

ALTER TABLE public.staff_profiles
  ADD COLUMN IF NOT EXISTS availability_status public.staff_availability_status NOT NULL DEFAULT 'online';

CREATE TABLE public.attendance_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  staff_id UUID NOT NULL REFERENCES public.staff_profiles(id) ON DELETE CASCADE,
  work_date DATE NOT NULL DEFAULT CURRENT_DATE,
  clock_in_at TIMESTAMPTZ,
  clock_out_at TIMESTAMPTZ,
  status public.attendance_status NOT NULL DEFAULT 'clocked_in',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (staff_id, work_date)
);

ALTER TABLE public.attendance_logs ENABLE ROW LEVEL SECURITY;

CREATE INDEX attendance_logs_work_date_idx ON public.attendance_logs (work_date);
CREATE INDEX staff_profiles_availability_status_idx ON public.staff_profiles (availability_status);

CREATE POLICY "Owners view all attendance" ON public.attendance_logs
  FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'owner'));

CREATE POLICY "Staff view own attendance" ON public.attendance_logs
  FOR SELECT TO authenticated USING (
    EXISTS (SELECT 1 FROM public.staff_profiles s WHERE s.id = staff_id AND s.user_id = auth.uid())
  );

CREATE POLICY "Staff create own attendance" ON public.attendance_logs
  FOR INSERT TO authenticated WITH CHECK (
    EXISTS (SELECT 1 FROM public.staff_profiles s WHERE s.id = staff_id AND s.user_id = auth.uid())
  );

CREATE POLICY "Staff update own attendance" ON public.attendance_logs
  FOR UPDATE TO authenticated USING (
    EXISTS (SELECT 1 FROM public.staff_profiles s WHERE s.id = staff_id AND s.user_id = auth.uid())
  ) WITH CHECK (
    EXISTS (SELECT 1 FROM public.staff_profiles s WHERE s.id = staff_id AND s.user_id = auth.uid())
  );

CREATE POLICY "Owners manage attendance" ON public.attendance_logs
  FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'owner'));

ALTER PUBLICATION supabase_realtime ADD TABLE public.attendance_logs;
