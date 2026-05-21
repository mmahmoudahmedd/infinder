-- Partners and partner certification levels

-- ---------------------------------------------------------------------------
-- partners
-- ---------------------------------------------------------------------------
CREATE TABLE public.partners (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug        TEXT UNIQUE NOT NULL,
  name        TEXT NOT NULL,
  description TEXT,
  icon        TEXT NOT NULL DEFAULT 'shield',
  tags        TEXT[] DEFAULT '{}',
  order_index INT NOT NULL DEFAULT 0,
  active      BOOLEAN NOT NULL DEFAULT true
);

-- ---------------------------------------------------------------------------
-- partner_levels
-- ---------------------------------------------------------------------------
CREATE TABLE public.partner_levels (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  partner_id UUID NOT NULL REFERENCES public.partners(id) ON DELETE CASCADE,
  level      TEXT NOT NULL CHECK (level IN ('beginner', 'intermediate', 'advanced')),
  title      TEXT NOT NULL,
  description TEXT,
  module_id  UUID REFERENCES public.learning_modules(id) ON DELETE SET NULL,
  order_index INT NOT NULL DEFAULT 0,
  UNIQUE (partner_id, level)
);

CREATE INDEX idx_partner_levels_partner ON public.partner_levels(partner_id);

-- ---------------------------------------------------------------------------
-- RLS
-- ---------------------------------------------------------------------------
ALTER TABLE public.partners ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.partner_levels ENABLE ROW LEVEL SECURITY;

CREATE POLICY partners_select_public ON public.partners
  FOR SELECT USING (active = true);

CREATE POLICY partner_levels_select_public ON public.partner_levels
  FOR SELECT USING (true);

-- ---------------------------------------------------------------------------
-- Seed: 4 partners
-- ---------------------------------------------------------------------------
INSERT INTO public.partners (slug, name, description, icon, tags, order_index) VALUES
  ('fra',
   'Financial Regulatory Authority (FRA)',
   'The primary regulatory body for non-banking financial markets in Egypt.',
   'shield', ARRAY['Finance', 'Certifications'], 1),

  ('egx',
   'Egyptian Exchange (EGX)',
   'Egypt''s principal stock exchange, offering deep market insights and trading courses.',
   'trending', ARRAY['Trading', 'Finance'], 2),

  ('eibf',
   'Egyptian Institute of Banking and Finance',
   'Premier institute providing specialized banking and finance certifications.',
   'bank', ARRAY['Banking', 'Finance'], 3),

  ('auc',
   'AUC School of Business',
   'Top-ranked business school offering executive education in investment.',
   'ribbon', ARRAY['Business', 'Certifications'], 4);

-- ---------------------------------------------------------------------------
-- Seed: 12 partner_levels (3 per partner, module_id NULL — link later)
-- ---------------------------------------------------------------------------
INSERT INTO public.partner_levels (partner_id, level, title, description, order_index)
SELECT id, 'beginner',
  'Beginner',
  'Master the core concepts of the beginner curriculum and earn your official certification.',
  1
FROM public.partners
UNION ALL
SELECT id, 'intermediate',
  'Intermediate',
  'Build on the fundamentals with intermediate-level investment topics.',
  2
FROM public.partners
UNION ALL
SELECT id, 'advanced',
  'Advanced',
  'Master advanced strategies and complete the full certification track.',
  3
FROM public.partners;
