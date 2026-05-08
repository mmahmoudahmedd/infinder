-- KYC: migrate status names, create kyc_submissions table.
-- Run after 006_exit_investment.sql.

-- ─────────────────────────────────────────────────────────────────────────────
-- 1. Migrate users.kyc_status to new naming convention
-- ─────────────────────────────────────────────────────────────────────────────
-- Drop old constraint first so we can freely change values
ALTER TABLE public.users DROP CONSTRAINT IF EXISTS users_kyc_status_check;

-- Old 'pending' (schema default, no documents submitted) → 'not_started'
UPDATE public.users SET kyc_status = 'not_started' WHERE kyc_status = 'pending';

-- Old 'under_review' (set by registration code) → 'pending' (awaiting review)
UPDATE public.users SET kyc_status = 'pending' WHERE kyc_status = 'under_review';

-- Apply new constraint and default
ALTER TABLE public.users ALTER COLUMN kyc_status SET DEFAULT 'not_started';
ALTER TABLE public.users
  ADD CONSTRAINT users_kyc_status_check
  CHECK (kyc_status IN ('not_started', 'pending', 'approved', 'rejected'));

-- ─────────────────────────────────────────────────────────────────────────────
-- 2. kyc_submissions table
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.kyc_submissions (
  id                    UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id               UUID        NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  status                TEXT        NOT NULL DEFAULT 'pending'
                                    CHECK (status IN ('pending', 'approved', 'rejected')),
  national_id_front_url TEXT        NOT NULL,
  national_id_back_url  TEXT        NOT NULL,
  selfie_url            TEXT        NOT NULL,
  address_proof_url     TEXT,
  submitted_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
  reviewed_at           TIMESTAMPTZ,
  reviewed_by           UUID        REFERENCES public.users(id),
  rejection_reason      TEXT
);

CREATE INDEX IF NOT EXISTS idx_kyc_submissions_user   ON public.kyc_submissions(user_id);
CREATE INDEX IF NOT EXISTS idx_kyc_submissions_status ON public.kyc_submissions(status);

-- RLS: all access goes through backend using service_role which bypasses RLS
ALTER TABLE public.kyc_submissions ENABLE ROW LEVEL SECURITY;

-- ─────────────────────────────────────────────────────────────────────────────
-- 3. Supabase Storage bucket — run manually in the Supabase dashboard
-- ─────────────────────────────────────────────────────────────────────────────
-- Dashboard > Storage > New bucket:
--   Name:   kyc-documents
--   Public: OFF (private)
--   File size limit: 5 MB
-- No storage policies needed — backend uploads/reads via service_role key.
