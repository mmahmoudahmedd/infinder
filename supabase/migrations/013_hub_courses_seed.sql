-- Seed LearningHub courses as real learning_modules + lessons with fixed UUIDs
-- so that user_progress tracking and rewards work for hub content.

INSERT INTO public.learning_modules (id, slug, title, description, difficulty, duration_minutes, order_index)
VALUES
  ('a0000000-0000-0000-0000-000000000001', 'hub-startup-vc',
   'Startup Investing & Venture Capital',
   'Discover how venture capital fuels innovation. Learn how early-stage investors evaluate startups, structure deals, and manage risk across a diversified portfolio.',
   'intermediate', 405, 10),
  ('a0000000-0000-0000-0000-000000000002', 'hub-real-estate',
   'Real Estate Investment Fundamentals',
   'Build a foundation in property investment. Understand how to analyze markets, evaluate yields, and leverage financing to grow a real estate portfolio.',
   'beginner', 430, 11),
  ('a0000000-0000-0000-0000-000000000003', 'hub-intro-investing',
   'Introduction to Investing',
   'Explore financial markets mechanics including derivative instruments, risk assessment frameworks, and strategic portfolio construction.',
   'beginner', 445, 12)
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.lessons (id, module_id, title, content, order_index, duration_minutes)
VALUES
  -- ── Course 1: Startup Investing & Venture Capital ──────────────────────────
  -- Beginner
  ('b0000000-0001-0000-0000-000000000001','a0000000-0000-0000-0000-000000000001','What is Venture Capital?',     '1qy1GX6gugw', 1,  15),
  ('b0000000-0001-0000-0000-000000000002','a0000000-0000-0000-0000-000000000001','What is a Startup?',           'gA2lb0W7Qi8', 2,  20),
  ('b0000000-0001-0000-0000-000000000003','a0000000-0000-0000-0000-000000000001','Equity 101',                   'ji3H1t9ZqvQ', 3,  25),
  ('b0000000-0001-0000-0000-000000000004','a0000000-0000-0000-0000-000000000001','Cap Tables Explained',         'W_r4Uq4E8GE', 4,  20),
  -- Intermediate
  ('b0000000-0001-0000-0000-000000000005','a0000000-0000-0000-0000-000000000001','Deal Flow & Sourcing',         'I6uxOktTRE0', 5,  35),
  ('b0000000-0001-0000-0000-000000000006','a0000000-0000-0000-0000-000000000001','Due Diligence Process',        'O69c82yhSr0', 6,  45),
  ('b0000000-0001-0000-0000-000000000007','a0000000-0000-0000-0000-000000000001','Term Sheets & Valuations',     'YV-ddY5AN50', 7,  50),
  ('b0000000-0001-0000-0000-000000000008','a0000000-0000-0000-0000-000000000001','Portfolio Construction',       'JUr6xa7-a4I', 8,  40),
  -- Advanced
  ('b0000000-0001-0000-0000-000000000009','a0000000-0000-0000-0000-000000000001','Exit Strategies & M&A',        'Xt6nrONHVbQ', 9,  45),
  ('b0000000-0001-0000-0000-000000000010','a0000000-0000-0000-0000-000000000001','LP/GP Dynamics',               'kFtqLRfWXt0', 10, 40),
  ('b0000000-0001-0000-0000-000000000011','a0000000-0000-0000-0000-000000000001','Carry & Fund Economics',       'n1bwGuW7Nqk', 11, 35),
  ('b0000000-0001-0000-0000-000000000012','a0000000-0000-0000-0000-000000000001','Secondary Markets',            'rHOo2Utr4Xc', 12, 35),

  -- ── Course 2: Real Estate Investment Fundamentals ──────────────────────────
  -- Beginner
  ('b0000000-0002-0000-0000-000000000001','a0000000-0000-0000-0000-000000000002','Types of Properties',          'OKuSNm3apCs', 1,  20),
  ('b0000000-0002-0000-0000-000000000002','a0000000-0000-0000-0000-000000000002','Understanding Markets',         'shJd65HpqDg', 2,  25),
  ('b0000000-0002-0000-0000-000000000003','a0000000-0000-0000-0000-000000000002','Basic Financing Concepts',     'gagJf0XIkKw', 3,  30),
  ('b0000000-0002-0000-0000-000000000004','a0000000-0000-0000-0000-000000000002','ROI Basics',                   'nhLhEwYSvsg', 4,  20),
  -- Intermediate
  ('b0000000-0002-0000-0000-000000000005','a0000000-0000-0000-0000-000000000002','Rental Yield Analysis',        '4EyeoYQlxeA', 5,  40),
  ('b0000000-0002-0000-0000-000000000006','a0000000-0000-0000-0000-000000000002','Leveraged Purchases',          'HLQvI3SNwvk', 6,  45),
  ('b0000000-0002-0000-0000-000000000007','a0000000-0000-0000-0000-000000000002','Commercial vs Residential',    'ZbtIGBtRxxQ', 7,  35),
  ('b0000000-0002-0000-0000-000000000008','a0000000-0000-0000-0000-000000000002','Market Deep Dive',             'x8D7raX1O5w', 8,  50),
  -- Advanced
  ('b0000000-0002-0000-0000-000000000009','a0000000-0000-0000-0000-000000000002','REITs & Property Funds',       'KwhfiIzx96g', 9,  45),
  ('b0000000-0002-0000-0000-000000000010','a0000000-0000-0000-0000-000000000002','Tax Optimization Strategies',  '0yNYqWLmo5I', 10, 40),
  ('b0000000-0002-0000-0000-000000000011','a0000000-0000-0000-0000-000000000002','Portfolio Diversification',    'fcC6m-0dguE', 11, 35),
  ('b0000000-0002-0000-0000-000000000012','a0000000-0000-0000-0000-000000000002','Risk Mitigation',              '-2vJgt2lLD8', 12, 45),

  -- ── Course 3: Introduction to Investing ───────────────────────────────────
  -- Beginner
  ('b0000000-0003-0000-0000-000000000001','a0000000-0000-0000-0000-000000000003','Stock Market Basics',          'bb6_M_srMBk', 1,  20),
  ('b0000000-0003-0000-0000-000000000002','a0000000-0000-0000-0000-000000000003','Bonds & Fixed Income',         'BgEZn-HJNb4', 2,  25),
  ('b0000000-0003-0000-0000-000000000003','a0000000-0000-0000-0000-000000000003','ETFs & Index Funds',           'hE2NsJGpEq4', 3,  20),
  ('b0000000-0003-0000-0000-000000000004','a0000000-0000-0000-0000-000000000003','Risk vs Return',               'ktpeNzqEVCs', 4,  20),
  -- Intermediate
  ('b0000000-0003-0000-0000-000000000005','a0000000-0000-0000-0000-000000000003','Portfolio Theory',             'YtrMGKLRtwA', 5,  40),
  ('b0000000-0003-0000-0000-000000000006','a0000000-0000-0000-0000-000000000003','Asset Allocation',             'QTgvWPAihIc', 6,  45),
  ('b0000000-0003-0000-0000-000000000007','a0000000-0000-0000-0000-000000000003','Technical Analysis Basics',    'W8OjEjASfBo', 7,  50),
  ('b0000000-0003-0000-0000-000000000008','a0000000-0000-0000-0000-000000000003','Understanding Market Cycles',  '9YdPQizV0xQ', 8,  40),
  -- Advanced
  ('b0000000-0003-0000-0000-000000000009','a0000000-0000-0000-0000-000000000003','Options & Derivatives',        'N4m-2Ng__Eg', 9,  55),
  ('b0000000-0003-0000-0000-000000000010','a0000000-0000-0000-0000-000000000003','Factor Investing',             'balyUmSLq8g', 10, 45),
  ('b0000000-0003-0000-0000-000000000011','a0000000-0000-0000-0000-000000000003','Macro Economics & Markets',    'PlZNbY45iPk', 11, 40),
  ('b0000000-0003-0000-0000-000000000012','a0000000-0000-0000-0000-000000000003','Alternative Investments',      'nrkLMCWnnYU', 12, 45)
ON CONFLICT (id) DO NOTHING;
