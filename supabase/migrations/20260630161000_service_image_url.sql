ALTER TABLE public.services
  ADD COLUMN IF NOT EXISTS image_url TEXT DEFAULT '/Hero_sec.png';
