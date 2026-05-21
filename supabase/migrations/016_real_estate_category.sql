-- Extend investments.category to include 'real_estate' and seed 7 new products

ALTER TABLE public.investments
  DROP CONSTRAINT investments_category_check;
ALTER TABLE public.investments
  ADD CONSTRAINT investments_category_check
  CHECK (category IN ('stocks', 'baskets', 'bonds', 'gold', 'real_estate'));

INSERT INTO public.investments
  (slug, title, description, category, min_investment,
   expected_return_low, expected_return_high, risk_level, is_halal, learn_more, active)
VALUES
  ('aurora-eco-village',
   'Aurora Eco-Village',
   'Verified real-world asset with strong fundamentals.',
   'real_estate', 1000, 13.5, 14.5, 'low', true,
   '["Sustainable residential development with verified land ownership","Income generated from rental yields and property appreciation","Backed by real-world assets with strong fundamentals","Suitable for beginners seeking stable, long-term growth"]'::jsonb,
   true),

  ('physical-gold-24k',
   'Physical Gold (24K)',
   'Digital gold backed by real stored gold.',
   'gold', 250, 6.5, 7.4, 'low_medium', true,
   '["Digital gold fully backed by physical 24K gold in secured vaults","Acts as a hedge against inflation and currency fluctuation","Can be bought and sold in small amounts","A classic safe-haven asset for cautious investors"]'::jsonb,
   true),

  ('government-sukuk-bonds',
   'Government Sukuk Bonds',
   'Stable returns from governments or large companies.',
   'bonds', 500, 5.0, 5.5, 'low', true,
   '["Sharia-compliant fixed-income instrument issued by the government","Returns generated from real asset ownership, not interest","Considered one of the lowest-risk investment options","Ideal for capital preservation with predictable returns"]'::jsonb,
   true),

  ('downtown-commercial-reit',
   'Downtown Commercial REIT',
   'Professionally managed commercial property portfolio.',
   'real_estate', 2000, 10.0, 11.0, 'medium', true,
   '["Real Estate Investment Trust focused on commercial properties","Income from office and retail space leasing in prime locations","Professionally managed diversified property portfolio","Offers exposure to real estate without owning property directly"]'::jsonb,
   true),

  ('egx-blue-chip-basket',
   'EGX Blue-Chip Basket',
   'Diversified bundles (e.g., top 100 companies).',
   'baskets', 1500, 16.0, 18.2, 'medium', true,
   '["Diversified bundle of top-performing companies on the Egyptian Exchange","Spreads risk across multiple established large-cap firms","Managed allocation reduces the impact of single-stock volatility","Strong historical returns from market-leading companies"]'::jsonb,
   true),

  ('saudi-aramco-common-stock',
   'Saudi Aramco - Common Stock',
   'Pick specific companies you believe in.',
   'stocks', 300, 8.5, 9.8, 'medium', true,
   '["Direct ownership in one of the world''s largest energy companies","Exposure to global oil and gas markets","Established dividend-paying blue-chip equity","Suited for investors comfortable with market fluctuations"]'::jsonb,
   true),

  ('telecom-egypt-stock',
   'Telecom Egypt - Stock',
   'Pick specific companies you believe in.',
   'stocks', 200, 11.0, 12.1, 'medium', true,
   '["Equity stake in Egypt''s leading telecommunications provider","Stable demand driven by essential communication services","Combines growth potential with dividend income","A solid pick within the Egyptian equities market"]'::jsonb,
   true)

ON CONFLICT (slug) DO NOTHING;
