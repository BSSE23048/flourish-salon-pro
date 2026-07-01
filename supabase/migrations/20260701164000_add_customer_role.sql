ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'customer';

CREATE POLICY "Customers can assign own customer role" ON public.user_roles
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id AND role = 'customer');
