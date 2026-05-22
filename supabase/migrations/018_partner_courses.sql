-- Partner-specific learning modules and lessons
-- Creates one module per partner level (12 total) and links them via partner_levels.module_id

-- ─────────────────────────────────────────────────────────────────────────────
-- 1. Learning modules
-- ─────────────────────────────────────────────────────────────────────────────
INSERT INTO public.learning_modules (id, slug, title, description, difficulty, duration_minutes, order_index)
VALUES
  -- FRA (Financial Regulatory Authority)
  ('c0000000-0000-0000-0000-000000000001', 'fra-foundations',
   'Foundations of Financial Regulation',
   'Understand the role of the Financial Regulatory Authority, investor protection frameworks, and the basics of Egypt''s non-banking financial market landscape.',
   'beginner', 80, 20),
  ('c0000000-0000-0000-0000-000000000002', 'fra-compliance',
   'Capital Markets Compliance',
   'Dive into compliance standards, disclosure requirements, market surveillance, and regulatory examination procedures in Egypt''s capital markets.',
   'intermediate', 120, 21),
  ('c0000000-0000-0000-0000-000000000003', 'fra-mastery',
   'FRA Certification Mastery',
   'Master advanced regulatory frameworks, enforcement mechanisms, and international standards to complete your FRA certification track.',
   'advanced', 160, 22),

  -- EGX (Egyptian Exchange)
  ('c0000000-0000-0000-0000-000000000004', 'egx-basics',
   'Egyptian Stock Exchange Basics',
   'Get started with EGX — learn how to read stock quotes, understand market structure, and place your first trade with confidence.',
   'beginner', 80, 23),
  ('c0000000-0000-0000-0000-000000000005', 'egx-trading',
   'Trading Strategies & Technical Analysis',
   'Explore chart patterns, technical indicators, trading psychology, and risk management techniques used by active traders on EGX.',
   'intermediate', 130, 24),
  ('c0000000-0000-0000-0000-000000000006', 'egx-advanced',
   'Advanced Market Operations',
   'Study market making, derivatives, algorithmic trading fundamentals, and advanced EGX market mechanics for certification.',
   'advanced', 160, 25),

  -- EIBF (Egyptian Institute of Banking and Finance)
  ('c0000000-0000-0000-0000-000000000007', 'eibf-banking-basics',
   'Banking Fundamentals',
   'Learn how banks operate, the types of banking services offered, the basics of credit, and how to read key financial statements.',
   'beginner', 80, 26),
  ('c0000000-0000-0000-0000-000000000008', 'eibf-credit-risk',
   'Credit & Risk Management',
   'Study credit analysis, lending and underwriting processes, banking risk types, and an overview of the Basel regulatory framework.',
   'intermediate', 130, 27),
  ('c0000000-0000-0000-0000-000000000009', 'eibf-advanced-banking',
   'Advanced Banking Operations',
   'Master treasury and asset-liability management, advanced credit risk, regulatory capital requirements, and EIBF certification preparation.',
   'advanced', 160, 28),

  -- AUC School of Business
  ('c0000000-0000-0000-0000-000000000010', 'auc-finance-essentials',
   'Business Finance Essentials',
   'Build a solid foundation in corporate finance — time value of money, financial statement analysis, and capital budgeting techniques.',
   'beginner', 80, 29),
  ('c0000000-0000-0000-0000-000000000011', 'auc-portfolio',
   'Investment Portfolio Management',
   'Apply modern portfolio theory, asset allocation strategies, equity valuation methods, and fixed income portfolio management.',
   'intermediate', 130, 30),
  ('c0000000-0000-0000-0000-000000000012', 'auc-executive',
   'Executive Finance & Strategy',
   'Complete your AUC certification track with M&A, private equity, structured finance, and executive-level investment strategy.',
   'advanced', 160, 31)
ON CONFLICT (id) DO NOTHING;

-- ─────────────────────────────────────────────────────────────────────────────
-- 2. Lessons (4 per module = 48 total)
-- ─────────────────────────────────────────────────────────────────────────────
INSERT INTO public.lessons (id, module_id, title, content, order_index, duration_minutes)
VALUES
  -- FRA Beginner
  ('d0000000-0001-0000-0000-000000000001','c0000000-0000-0000-0000-000000000001','What is Financial Regulation?',      'bb6_M_srMBk', 1, 20),
  ('d0000000-0001-0000-0000-000000000002','c0000000-0000-0000-0000-000000000001','Role of FRA in Egypt',               'BgEZn-HJNb4', 2, 20),
  ('d0000000-0001-0000-0000-000000000003','c0000000-0000-0000-0000-000000000001','Investor Protection Basics',         'ktpeNzqEVCs', 3, 20),
  ('d0000000-0001-0000-0000-000000000004','c0000000-0000-0000-0000-000000000001','Navigating Regulatory Frameworks',   'hE2NsJGpEq4', 4, 20),

  -- FRA Intermediate
  ('d0000000-0002-0000-0000-000000000001','c0000000-0000-0000-0000-000000000002','Compliance Standards & Practices',   'YtrMGKLRtwA', 1, 30),
  ('d0000000-0002-0000-0000-000000000002','c0000000-0000-0000-0000-000000000002','Reporting & Disclosure Requirements','QTgvWPAihIc', 2, 30),
  ('d0000000-0002-0000-0000-000000000003','c0000000-0000-0000-0000-000000000002','Market Surveillance Techniques',     'W8OjEjASfBo', 3, 30),
  ('d0000000-0002-0000-0000-000000000004','c0000000-0000-0000-0000-000000000002','Regulatory Examination Procedures',  '9YdPQizV0xQ', 4, 30),

  -- FRA Advanced
  ('d0000000-0003-0000-0000-000000000001','c0000000-0000-0000-0000-000000000003','Advanced Regulatory Frameworks',     'N4m-2Ng__Eg', 1, 40),
  ('d0000000-0003-0000-0000-000000000002','c0000000-0000-0000-0000-000000000003','Enforcement & Penalties',            'balyUmSLq8g', 2, 40),
  ('d0000000-0003-0000-0000-000000000003','c0000000-0000-0000-0000-000000000003','International Regulatory Standards', 'PlZNbY45iPk', 3, 40),
  ('d0000000-0003-0000-0000-000000000004','c0000000-0000-0000-0000-000000000003','FRA Certification Exam Prep',        'nrkLMCWnnYU', 4, 40),

  -- EGX Beginner
  ('d0000000-0004-0000-0000-000000000001','c0000000-0000-0000-0000-000000000004','Introduction to EGX',               'bb6_M_srMBk', 1, 20),
  ('d0000000-0004-0000-0000-000000000002','c0000000-0000-0000-0000-000000000004','How Stock Trading Works',            'gA2lb0W7Qi8', 2, 20),
  ('d0000000-0004-0000-0000-000000000003','c0000000-0000-0000-0000-000000000004','Reading Stock Quotes & Charts',      'hE2NsJGpEq4', 3, 20),
  ('d0000000-0004-0000-0000-000000000004','c0000000-0000-0000-0000-000000000004','Opening Your First Position',        'ktpeNzqEVCs', 4, 20),

  -- EGX Intermediate
  ('d0000000-0005-0000-0000-000000000001','c0000000-0000-0000-0000-000000000005','Technical Analysis Tools',           'W8OjEjASfBo', 1, 33),
  ('d0000000-0005-0000-0000-000000000002','c0000000-0000-0000-0000-000000000005','Chart Patterns & Trade Signals',     'I6uxOktTRE0', 2, 33),
  ('d0000000-0005-0000-0000-000000000003','c0000000-0000-0000-0000-000000000005','Trading Psychology',                 'YtrMGKLRtwA', 3, 33),
  ('d0000000-0005-0000-0000-000000000004','c0000000-0000-0000-0000-000000000005','Risk Management in Trading',         '9YdPQizV0xQ', 4, 31),

  -- EGX Advanced
  ('d0000000-0006-0000-0000-000000000001','c0000000-0000-0000-0000-000000000006','Market Making & Liquidity',          'Xt6nrONHVbQ', 1, 40),
  ('d0000000-0006-0000-0000-000000000002','c0000000-0000-0000-0000-000000000006','Derivatives on EGX',                 'N4m-2Ng__Eg', 2, 40),
  ('d0000000-0006-0000-0000-000000000003','c0000000-0000-0000-0000-000000000006','Algorithmic Trading Fundamentals',   'kFtqLRfWXt0', 3, 40),
  ('d0000000-0006-0000-0000-000000000004','c0000000-0000-0000-0000-000000000006','EGX Advanced Certification Prep',    'rHOo2Utr4Xc', 4, 40),

  -- EIBF Beginner
  ('d0000000-0007-0000-0000-000000000001','c0000000-0000-0000-0000-000000000007','How Banks Work',                     'OKuSNm3apCs', 1, 20),
  ('d0000000-0007-0000-0000-000000000002','c0000000-0000-0000-0000-000000000007','Types of Banking Services',          'shJd65HpqDg', 2, 20),
  ('d0000000-0007-0000-0000-000000000003','c0000000-0000-0000-0000-000000000007','Understanding Credit',               'gagJf0XIkKw', 3, 20),
  ('d0000000-0007-0000-0000-000000000004','c0000000-0000-0000-0000-000000000007','Financial Statements Basics',        'nhLhEwYSvsg', 4, 20),

  -- EIBF Intermediate
  ('d0000000-0008-0000-0000-000000000001','c0000000-0000-0000-0000-000000000008','Credit Analysis Techniques',         '4EyeoYQlxeA', 1, 33),
  ('d0000000-0008-0000-0000-000000000002','c0000000-0000-0000-0000-000000000008','Lending & Underwriting',             'HLQvI3SNwvk', 2, 33),
  ('d0000000-0008-0000-0000-000000000003','c0000000-0000-0000-0000-000000000008','Banking Risk Types',                 'ZbtIGBtRxxQ', 3, 33),
  ('d0000000-0008-0000-0000-000000000004','c0000000-0000-0000-0000-000000000008','Basel Framework Overview',           'x8D7raX1O5w', 4, 31),

  -- EIBF Advanced
  ('d0000000-0009-0000-0000-000000000001','c0000000-0000-0000-0000-000000000009','Treasury & Asset-Liability Mgmt',    'KwhfiIzx96g', 1, 40),
  ('d0000000-0009-0000-0000-000000000002','c0000000-0000-0000-0000-000000000009','Advanced Credit Risk',               '0yNYqWLmo5I', 2, 40),
  ('d0000000-0009-0000-0000-000000000003','c0000000-0000-0000-0000-000000000009','Regulatory Capital Requirements',    'fcC6m-0dguE', 3, 40),
  ('d0000000-0009-0000-0000-000000000004','c0000000-0000-0000-0000-000000000009','EIBF Certification Mastery',         '-2vJgt2lLD8', 4, 40),

  -- AUC Beginner
  ('d0000000-0010-0000-0000-000000000001','c0000000-0000-0000-0000-000000000010','Corporate Finance Basics',           'bb6_M_srMBk', 1, 20),
  ('d0000000-0010-0000-0000-000000000002','c0000000-0000-0000-0000-000000000010','Time Value of Money',                'BgEZn-HJNb4', 2, 20),
  ('d0000000-0010-0000-0000-000000000003','c0000000-0000-0000-0000-000000000010','Financial Statement Analysis',       'ktpeNzqEVCs', 3, 20),
  ('d0000000-0010-0000-0000-000000000004','c0000000-0000-0000-0000-000000000010','Capital Budgeting',                  'ji3H1t9ZqvQ', 4, 20),

  -- AUC Intermediate
  ('d0000000-0011-0000-0000-000000000001','c0000000-0000-0000-0000-000000000011','Modern Portfolio Theory',            'YtrMGKLRtwA', 1, 33),
  ('d0000000-0011-0000-0000-000000000002','c0000000-0000-0000-0000-000000000011','Asset Allocation Strategies',        'QTgvWPAihIc', 2, 33),
  ('d0000000-0011-0000-0000-000000000003','c0000000-0000-0000-0000-000000000011','Equity Valuation Methods',           'JUr6xa7-a4I', 3, 33),
  ('d0000000-0011-0000-0000-000000000004','c0000000-0000-0000-0000-000000000011','Fixed Income Portfolio Management',  'O69c82yhSr0', 4, 31),

  -- AUC Advanced
  ('d0000000-0012-0000-0000-000000000001','c0000000-0000-0000-0000-000000000012','Mergers & Acquisitions',             'Xt6nrONHVbQ', 1, 40),
  ('d0000000-0012-0000-0000-000000000002','c0000000-0000-0000-0000-000000000012','Private Equity & Alternative Assets','n1bwGuW7Nqk', 2, 40),
  ('d0000000-0012-0000-0000-000000000003','c0000000-0000-0000-0000-000000000012','Structured Finance',                 'balyUmSLq8g', 3, 40),
  ('d0000000-0012-0000-0000-000000000004','c0000000-0000-0000-0000-000000000012','AUC Executive Certification',        'nrkLMCWnnYU', 4, 40)
ON CONFLICT (id) DO NOTHING;

-- ─────────────────────────────────────────────────────────────────────────────
-- 3. Link partner_levels → modules
-- ─────────────────────────────────────────────────────────────────────────────
UPDATE public.partner_levels SET module_id = 'c0000000-0000-0000-0000-000000000001'
WHERE level = 'beginner'     AND partner_id = (SELECT id FROM public.partners WHERE slug = 'fra');
UPDATE public.partner_levels SET module_id = 'c0000000-0000-0000-0000-000000000002'
WHERE level = 'intermediate' AND partner_id = (SELECT id FROM public.partners WHERE slug = 'fra');
UPDATE public.partner_levels SET module_id = 'c0000000-0000-0000-0000-000000000003'
WHERE level = 'advanced'     AND partner_id = (SELECT id FROM public.partners WHERE slug = 'fra');

UPDATE public.partner_levels SET module_id = 'c0000000-0000-0000-0000-000000000004'
WHERE level = 'beginner'     AND partner_id = (SELECT id FROM public.partners WHERE slug = 'egx');
UPDATE public.partner_levels SET module_id = 'c0000000-0000-0000-0000-000000000005'
WHERE level = 'intermediate' AND partner_id = (SELECT id FROM public.partners WHERE slug = 'egx');
UPDATE public.partner_levels SET module_id = 'c0000000-0000-0000-0000-000000000006'
WHERE level = 'advanced'     AND partner_id = (SELECT id FROM public.partners WHERE slug = 'egx');

UPDATE public.partner_levels SET module_id = 'c0000000-0000-0000-0000-000000000007'
WHERE level = 'beginner'     AND partner_id = (SELECT id FROM public.partners WHERE slug = 'eibf');
UPDATE public.partner_levels SET module_id = 'c0000000-0000-0000-0000-000000000008'
WHERE level = 'intermediate' AND partner_id = (SELECT id FROM public.partners WHERE slug = 'eibf');
UPDATE public.partner_levels SET module_id = 'c0000000-0000-0000-0000-000000000009'
WHERE level = 'advanced'     AND partner_id = (SELECT id FROM public.partners WHERE slug = 'eibf');

UPDATE public.partner_levels SET module_id = 'c0000000-0000-0000-0000-000000000010'
WHERE level = 'beginner'     AND partner_id = (SELECT id FROM public.partners WHERE slug = 'auc');
UPDATE public.partner_levels SET module_id = 'c0000000-0000-0000-0000-000000000011'
WHERE level = 'intermediate' AND partner_id = (SELECT id FROM public.partners WHERE slug = 'auc');
UPDATE public.partner_levels SET module_id = 'c0000000-0000-0000-0000-000000000012'
WHERE level = 'advanced'     AND partner_id = (SELECT id FROM public.partners WHERE slug = 'auc');
