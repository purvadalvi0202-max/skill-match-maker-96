ALTER TABLE public.resumes
  ADD COLUMN IF NOT EXISTS projects text,
  ADD COLUMN IF NOT EXISTS certifications text,
  ADD COLUMN IF NOT EXISTS validation_status text DEFAULT 'valid',
  ADD COLUMN IF NOT EXISTS gender_signal text,
  ADD COLUMN IF NOT EXISTS preference_boost integer DEFAULT 0;