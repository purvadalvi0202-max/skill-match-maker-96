/*
  # Add Projects, Certifications, and Validation Status to Resumes

  1. Changes to `resumes` table
    - `projects` (text, nullable) — comma-separated list of project keywords/names extracted from resume
    - `certifications` (text, nullable) — comma-separated list of certifications found
    - `validation_status` (text, default 'valid') — 'valid', 'invalid', 'suspicious' (fake resume detection)
    - `preference_boost` (integer, default 0) — boost applied from candidate preference (+3 or 0)
    - `gender_signal` (text, nullable) — detected gender signal from resume (for preference ranking only)

  2. Notes
    - All new columns are nullable or have safe defaults
    - No existing data is affected
    - RLS policies remain unchanged
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'resumes' AND column_name = 'projects'
  ) THEN
    ALTER TABLE resumes ADD COLUMN projects text;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'resumes' AND column_name = 'certifications'
  ) THEN
    ALTER TABLE resumes ADD COLUMN certifications text;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'resumes' AND column_name = 'validation_status'
  ) THEN
    ALTER TABLE resumes ADD COLUMN validation_status text DEFAULT 'valid';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'resumes' AND column_name = 'preference_boost'
  ) THEN
    ALTER TABLE resumes ADD COLUMN preference_boost integer DEFAULT 0;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'resumes' AND column_name = 'gender_signal'
  ) THEN
    ALTER TABLE resumes ADD COLUMN gender_signal text;
  END IF;
END $$;
