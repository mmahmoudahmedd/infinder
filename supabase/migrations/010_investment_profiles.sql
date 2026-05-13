-- 010_investment_profiles.sql
ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS risk_tolerance       TEXT NULL
    CHECK (risk_tolerance IN ('low', 'medium', 'high')),
  ADD COLUMN IF NOT EXISTS investment_horizon   TEXT NULL
    CHECK (investment_horizon IN ('short', 'medium', 'long')),
  ADD COLUMN IF NOT EXISTS investment_goal      TEXT NULL
    CHECK (investment_goal IN ('preserve', 'grow')),
  ADD COLUMN IF NOT EXISTS profile_completed_at TIMESTAMPTZ NULL;

COMMENT ON COLUMN public.users.risk_tolerance       IS 'low | medium | high — robo wizard answer';
COMMENT ON COLUMN public.users.investment_horizon   IS 'short | medium | long — robo wizard answer';
COMMENT ON COLUMN public.users.investment_goal      IS 'preserve | grow — robo wizard answer';
COMMENT ON COLUMN public.users.profile_completed_at IS 'Set when all three profile fields are saved';
