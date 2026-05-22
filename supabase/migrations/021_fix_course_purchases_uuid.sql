-- course_purchases.course_id was INTEGER; must be UUID to match learning_modules.id
-- The prior CREATE TABLE IF NOT EXISTS silently skipped creation because the table
-- already existed with the wrong column type.

DROP TABLE IF EXISTS public.course_purchases;

CREATE TABLE public.course_purchases (
  id           UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      UUID          NOT NULL REFERENCES public.users(id)             ON DELETE CASCADE,
  course_id    UUID          NOT NULL REFERENCES public.learning_modules(id)  ON DELETE CASCADE,
  amount       NUMERIC(14,2) NOT NULL DEFAULT 0,
  purchased_at TIMESTAMPTZ   NOT NULL DEFAULT now(),
  UNIQUE (user_id, course_id)
);

CREATE INDEX idx_course_purchases_user ON public.course_purchases(user_id);

ALTER TABLE public.course_purchases ENABLE ROW LEVEL SECURITY;
