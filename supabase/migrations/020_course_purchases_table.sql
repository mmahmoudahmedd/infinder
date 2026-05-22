-- Create course_purchases table (was missing, causing purchase failures)
-- Also fixes transactions.type CHECK to include course_purchase

-- ─────────────────────────────────────────────────────────────────────────────
-- 1. course_purchases
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.course_purchases (
  id           UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      UUID          NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  course_id    UUID          NOT NULL REFERENCES public.learning_modules(id) ON DELETE CASCADE,
  amount       NUMERIC(14,2) NOT NULL DEFAULT 0,
  purchased_at TIMESTAMPTZ   NOT NULL DEFAULT now(),
  UNIQUE (user_id, course_id)
);

CREATE INDEX IF NOT EXISTS idx_course_purchases_user ON public.course_purchases(user_id);

ALTER TABLE public.course_purchases ENABLE ROW LEVEL SECURITY;

-- ─────────────────────────────────────────────────────────────────────────────
-- 2. Fix transactions.type CHECK to include course_purchase
-- ─────────────────────────────────────────────────────────────────────────────
ALTER TABLE public.transactions
  DROP CONSTRAINT IF EXISTS transactions_type_check;

ALTER TABLE public.transactions
  ADD CONSTRAINT transactions_type_check
  CHECK (type IN ('deposit', 'withdrawal', 'investment', 'return', 'adjustment', 'course_purchase'));
