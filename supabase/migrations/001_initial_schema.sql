-- INFINDER initial schema: 8 core tables + RLS + seeds
-- Run in Supabase SQL editor or via supabase db push

-- Extensions
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ---------------------------------------------------------------------------
-- users (application accounts; backend auth with JWT)
-- ---------------------------------------------------------------------------
CREATE TABLE public.users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  full_name TEXT,
  phone TEXT,
  kyc_status TEXT NOT NULL DEFAULT 'pending' CHECK (kyc_status IN ('pending', 'under_review', 'approved', 'rejected')),
  kyc_rejection_reason TEXT,
  sharia_mode BOOLEAN NOT NULL DEFAULT false,
  wallet_balance NUMERIC(14, 2) NOT NULL DEFAULT 0 CHECK (wallet_balance >= 0),
  role TEXT NOT NULL DEFAULT 'user' CHECK (role IN ('user', 'admin')),
  deposit_ref_code TEXT UNIQUE,
  last_login_at DATE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_users_email ON public.users (email);
CREATE INDEX idx_users_kyc ON public.users (kyc_status);
CREATE INDEX idx_users_role ON public.users (role);

-- ---------------------------------------------------------------------------
-- investments (product catalog)
-- ---------------------------------------------------------------------------
CREATE TABLE public.investments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug TEXT UNIQUE NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  category TEXT NOT NULL CHECK (category IN ('stocks', 'baskets', 'bonds', 'gold')),
  min_investment NUMERIC(14, 2) NOT NULL DEFAULT 0,
  expected_return_low NUMERIC(5, 2),
  expected_return_high NUMERIC(5, 2),
  risk_level TEXT NOT NULL DEFAULT 'medium' CHECK (risk_level IN ('low', 'low_medium', 'medium', 'high')),
  is_halal BOOLEAN NOT NULL DEFAULT false,
  learn_more JSONB DEFAULT '[]'::jsonb,
  active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ---------------------------------------------------------------------------
-- portfolios
-- ---------------------------------------------------------------------------
CREATE TABLE public.portfolios (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.users (id) ON DELETE CASCADE,
  name TEXT NOT NULL DEFAULT 'My Portfolio',
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'closed')),
  allocation JSONB,
  assistant_reasoning TEXT,
  is_sharia BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_portfolios_user ON public.portfolios (user_id);

-- ---------------------------------------------------------------------------
-- transactions
-- ---------------------------------------------------------------------------
CREATE TABLE public.transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.users (id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN ('deposit', 'withdrawal', 'investment', 'return', 'adjustment')),
  amount NUMERIC(14, 2) NOT NULL,
  status TEXT NOT NULL DEFAULT 'completed' CHECK (status IN ('pending', 'completed', 'failed')),
  reference TEXT,
  meta JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_transactions_user ON public.transactions (user_id);
CREATE INDEX idx_transactions_created ON public.transactions (created_at DESC);

-- ---------------------------------------------------------------------------
-- learning_modules & lessons
-- ---------------------------------------------------------------------------
CREATE TABLE public.learning_modules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug TEXT UNIQUE NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  difficulty TEXT NOT NULL DEFAULT 'beginner' CHECK (difficulty IN ('beginner', 'intermediate', 'advanced')),
  duration_minutes INT NOT NULL DEFAULT 0,
  order_index INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.lessons (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  module_id UUID NOT NULL REFERENCES public.learning_modules (id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  content TEXT,
  order_index INT NOT NULL DEFAULT 0,
  duration_minutes INT NOT NULL DEFAULT 5,
  quiz JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_lessons_module ON public.lessons (module_id);

-- ---------------------------------------------------------------------------
-- user_progress
-- ---------------------------------------------------------------------------
CREATE TABLE public.user_progress (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.users (id) ON DELETE CASCADE,
  lesson_id UUID NOT NULL REFERENCES public.lessons (id) ON DELETE CASCADE,
  completed_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  quiz_score INT,
  certificate_issued BOOLEAN NOT NULL DEFAULT false,
  UNIQUE (user_id, lesson_id)
);

CREATE INDEX idx_user_progress_user ON public.user_progress (user_id);

-- ---------------------------------------------------------------------------
-- achievements (earned badges per user)
-- ---------------------------------------------------------------------------
CREATE TABLE public.achievements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.users (id) ON DELETE CASCADE,
  badge_key TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  earned_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, badge_key)
);

CREATE INDEX idx_achievements_user ON public.achievements (user_id);

-- ---------------------------------------------------------------------------
-- updated_at trigger
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER tr_users_updated
  BEFORE UPDATE ON public.users
  FOR EACH ROW EXECUTE PROCEDURE public.set_updated_at();

CREATE TRIGGER tr_portfolios_updated
  BEFORE UPDATE ON public.portfolios
  FOR EACH ROW EXECUTE PROCEDURE public.set_updated_at();

-- ---------------------------------------------------------------------------
-- RLS (frontend may use anon for public reads; app writes via service role)
-- ---------------------------------------------------------------------------
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.investments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.portfolios ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.learning_modules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lessons ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_progress ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.achievements ENABLE ROW LEVEL SECURITY;

-- Public read for catalog content
CREATE POLICY investments_select_public ON public.investments
  FOR SELECT USING (active = true);

CREATE POLICY learning_modules_select_public ON public.learning_modules
  FOR SELECT USING (true);

CREATE POLICY lessons_select_public ON public.lessons
  FOR SELECT USING (true);

-- Service role bypasses RLS in Supabase; anon/authenticated policies optional for future Auth.
-- No INSERT/UPDATE for anon on sensitive tables.

-- ---------------------------------------------------------------------------
-- Seed: investments
-- ---------------------------------------------------------------------------
INSERT INTO public.investments (slug, title, description, category, min_investment, expected_return_low, expected_return_high, risk_level, is_halal, learn_more) VALUES
('fixed-income', 'Fixed Income / Bonds', 'Stable returns from governments or large companies.', 'bonds', 1000, 4, 7, 'low', false,
 '["Predictable, fixed interest payments","Lower risk compared to stocks","Good for conservative investors","Government and corporate bonds available"]'::jsonb),
('gold', 'Gold Investment', 'Digital gold backed by real stored gold.', 'gold', 200, 3, 8, 'low_medium', true,
 '["Backed by physical gold","Historically a hedge against inflation","Suitable for diversification"]'::jsonb),
('stock-baskets', 'Stock Baskets', 'Diversified bundles (e.g., top 100 companies).', 'baskets', 500, 6, 12, 'medium', true,
 '["Instant diversification","Lower single-stock risk","Aligns with long-term growth goals"]'::jsonb),
('stocks', 'Individual Stocks', 'Pick specific companies you believe in.', 'stocks', 1000, 8, 15, 'high', false,
 '["Higher potential returns","Higher volatility","Requires research"]'::jsonb)
ON CONFLICT (slug) DO NOTHING;

-- Seed: learning modules + lessons
INSERT INTO public.learning_modules (slug, title, description, difficulty, duration_minutes, order_index) VALUES
('investing-101', 'Investing 101', 'Core concepts every beginner should know.', 'beginner', 45, 1),
('risk-return', 'Risk & Return', 'How risk levels map to potential returns.', 'beginner', 30, 2),
('sharia-investing', 'Sharia-Compliant Investing', 'Basics of halal investment choices.', 'intermediate', 40, 3)
ON CONFLICT (slug) DO NOTHING;

WITH m1 AS (SELECT id FROM public.learning_modules WHERE slug = 'investing-101'),
m2 AS (SELECT id FROM public.learning_modules WHERE slug = 'risk-return'),
m3 AS (SELECT id FROM public.learning_modules WHERE slug = 'sharia-investing')
INSERT INTO public.lessons (module_id, title, content, order_index, duration_minutes, quiz)
SELECT id, 'What is an investment?', 'An investment is allocating money to an asset expecting a return over time.', 1, 8,
  '{"questions":[{"id":"q1","prompt":"What is the main goal of investing?","options":["Spend faster","Grow wealth over time","Avoid banks","Pay more taxes"],"correctIndex":1}]}'::jsonb
FROM m1
UNION ALL
SELECT id, 'Stocks vs bonds', 'Stocks are ownership shares; bonds are loans to issuers with fixed payments.', 2, 10,
  '{"questions":[{"id":"q1","prompt":"A bond is best described as:","options":["Ownership in a company","A loan to a company or government","Physical gold","A savings account"],"correctIndex":1}]}'::jsonb
FROM m1
UNION ALL
SELECT id, 'Understanding volatility', 'Prices move up and down; longer horizons often smooth short-term noise.', 1, 12,
  '{"questions":[{"id":"q1","prompt":"Volatility refers to:","options":["Guaranteed returns","How much prices fluctuate","Tax rates","Bank fees"],"correctIndex":1}]}'::jsonb
FROM m2
UNION ALL
SELECT id, 'Diversification', 'Spreading money across assets reduces reliance on any single outcome.', 2, 10,
  '{"questions":[{"id":"q1","prompt":"Diversification helps:","options":["Eliminate all risk","Reduce concentration risk","Guarantee profit","Avoid learning"],"correctIndex":1}]}'::jsonb
FROM m2
UNION ALL
SELECT id, 'Principles of Sharia investing', 'Avoid excessive uncertainty, interest-based income, and non-permissible sectors.', 1, 15,
  '{"questions":[{"id":"q1","prompt":"Sharia-compliant investing often avoids:","options":["Diversification","Riba (interest) and impermissible sectors","Long-term goals","Gold"],"correctIndex":1}]}'::jsonb
FROM m3;
