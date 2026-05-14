-- 011_kyc_not_started_status.sql
-- Allow 'not_started' as the initial KYC status for newly registered users.
-- The backend register route inserts kyc_status = 'not_started', but the
-- original CHECK constraint in 001 did not include this value, causing every
-- registration attempt to fail with a constraint violation.

ALTER TABLE public.users
  DROP CONSTRAINT IF EXISTS users_kyc_status_check;

ALTER TABLE public.users
  ADD CONSTRAINT users_kyc_status_chk
  CHECK (kyc_status IN ('not_started', 'pending', 'under_review', 'approved', 'rejected'));

ALTER TABLE public.users
  ALTER COLUMN kyc_status SET DEFAULT 'not_started';
