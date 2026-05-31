-- Replace non-Egyptian investments with Egyptian equivalents

-- 1. Fixed Income / Bonds → Egyptian Treasury Bills (T-Bills)
UPDATE public.investments SET
  slug                = 'egypt-tbills',
  title               = 'Egyptian Treasury Bills (T-Bills)',
  description         = 'Short-term government debt instruments issued by the Egyptian Ministry of Finance.',
  min_investment      = 1000,
  expected_return_low = 22,
  expected_return_high= 25,
  risk_level          = 'low',
  is_halal            = false,
  learn_more          = '["Issued by the Egyptian Ministry of Finance","Available in 91, 182, and 364-day maturities","One of the safest EGP-denominated instruments","Returns are subject to withholding tax"]'::jsonb
WHERE slug = 'fixed-income';

-- 2. Aurora Eco-Village → Palm Hills - New Cairo
UPDATE public.investments SET
  slug                = 'palm-hills-new-cairo',
  title               = 'Palm Hills - New Cairo',
  description         = 'Invest in one of Egypt''s leading residential real estate developers.',
  min_investment      = 1000,
  expected_return_low = 14,
  expected_return_high= 16,
  risk_level          = 'low',
  is_halal            = true,
  learn_more          = '["One of Egypt''s largest listed real estate developers","Projects in New Cairo, 6th of October, and the North Coast","Strong track record of capital appreciation","Suitable for long-term investors seeking stable growth"]'::jsonb
WHERE slug = 'aurora-eco-village';

-- 3. Stock Baskets → EGX 30 Index Basket
UPDATE public.investments SET
  slug                = 'egx-30-index-basket',
  title               = 'EGX 30 Index Basket',
  description         = 'Track the performance of Egypt''s top 30 listed companies.',
  min_investment      = 500,
  expected_return_low = 12,
  expected_return_high= 16,
  risk_level          = 'medium',
  is_halal            = true,
  learn_more          = '["Tracks the EGX 30, Egypt''s benchmark index","Instant exposure to 30 of the largest companies on the Egyptian Exchange","Diversification reduces single-stock risk","Ideal for investors seeking broad Egyptian market exposure"]'::jsonb
WHERE slug = 'stock-baskets';

-- 4. Downtown Commercial REIT → SODIC - West Cairo Properties
UPDATE public.investments SET
  slug                = 'sodic-west-cairo',
  title               = 'SODIC - West Cairo Properties',
  description         = 'Professionally managed residential and commercial portfolio in West Cairo.',
  min_investment      = 2000,
  expected_return_low = 10,
  expected_return_high= 12,
  risk_level          = 'medium',
  is_halal            = true,
  learn_more          = '["SODIC is one of Egypt''s premier listed real estate companies","Developments in West Cairo, New Cairo, and the North Coast","Revenue from residential sales and commercial leasing","Offers real estate exposure without direct property ownership"]'::jsonb
WHERE slug = 'downtown-commercial-reit';

-- 5. Saudi Aramco → CIB - Commercial International Bank
UPDATE public.investments SET
  slug                = 'cib-egypt-stock',
  title               = 'CIB - Commercial International Bank',
  description         = 'Egypt''s largest private sector bank with a strong track record.',
  min_investment      = 300,
  expected_return_low = 10,
  expected_return_high= 14,
  risk_level          = 'medium',
  is_halal            = false,
  learn_more          = '["Egypt''s largest private sector bank by assets","Consistently strong earnings and dividend history","Well-regulated under the Central Bank of Egypt","A blue-chip equity for investors comfortable with financial sector exposure"]'::jsonb
WHERE slug = 'saudi-aramco-common-stock';

-- 6. Individual Stocks → EGX Individual Stocks
UPDATE public.investments SET
  slug                = 'egx-individual-stocks',
  title               = 'EGX Individual Stocks',
  description         = 'Pick specific companies listed on the Egyptian Exchange (EGX).',
  min_investment      = 1000,
  expected_return_low = 10,
  expected_return_high= 18,
  risk_level          = 'high',
  is_halal            = false,
  learn_more          = '["Direct ownership in companies listed on the EGX","Higher potential returns with higher volatility","Requires research and market knowledge","Access to sectors including banking, telecom, real estate, and industry"]'::jsonb
WHERE slug = 'stocks';
