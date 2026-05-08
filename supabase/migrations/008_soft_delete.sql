-- Soft-delete support for user accounts.
-- Run after 007_kyc_submissions.sql.

ALTER TABLE public.users ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS idx_users_deleted
  ON public.users (deleted_at)
  WHERE deleted_at IS NOT NULL;
