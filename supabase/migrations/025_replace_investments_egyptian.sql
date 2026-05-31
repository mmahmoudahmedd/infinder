-- Add startup category and replace all investments with Egyptian ones

-- 1. Extend category constraint
ALTER TABLE public.investments DROP CONSTRAINT investments_category_check;
ALTER TABLE public.investments ADD CONSTRAINT investments_category_check
  CHECK (category IN ('stocks', 'baskets', 'bonds', 'gold', 'real_estate', 'startup'));

-- 2. Remove all existing investments
DELETE FROM public.investments;

-- 3. Insert 8 new Egyptian investments
INSERT INTO public.investments (slug, title, description, category, min_investment, expected_return_low, expected_return_high, risk_level, is_halal, learn_more, active) VALUES

('az-gold-fund',
 'AZ Gold Fund (AZG)',
 'Digital gold investment fully backed by physical gold stored at the Central Bank of Egypt.',
 'gold', 500, 28.0, 28.5, 'low', true,
 json_build_array('Digital gold backed by physical gold held at the Central Bank of Egypt','Excellent hedge against inflation and currency depreciation','Daily liquidity with high transparency','Sharia-compliant gold investment')::jsonb,
 true),

('b-secure-tbills',
 'B-Secure T-Bills Fund',
 'A stable fixed-income mutual fund primarily invested in Egyptian Government Treasury Bills.',
 'bonds', 1000, 26.0, 26.5, 'low', false,
 json_build_array('Primarily invested in Egyptian Government Treasury Bills','Predictable, steady income for risk-averse investors','Higher yields than traditional bank savings','One of Egypt''s most stable fixed-income instruments')::jsonb,
 true),

('az-opportunities-egx30',
 'AZ Opportunities (EGX30 Basket)',
 'Broad market exposure by tracking the top 30 companies listed on the Egyptian Exchange.',
 'baskets', 1000, 33.0, 34.0, 'medium', true,
 json_build_array('Tracks the top 30 companies on the Egyptian Exchange (EGX30)','Diversified exposure across banking, telecom, and real estate','Inherently spreads risk across multiple sectors','Ideal for investors seeking broad Egyptian market growth')::jsonb,
 true),

('ci-capital-misr-equity',
 'CI Capital Misr Equity Fund',
 'An actively managed equity fund with a strong historical track record.',
 'baskets', 2000, 30.0, 31.0, 'medium', true,
 json_build_array('Actively managed by professional portfolio managers','Strong historical track record of performance','Rotates between sectors to capture upside and manage volatility','A trusted equity fund for intermediate investors')::jsonb,
 true),

('cib-comi',
 'Commercial International Bank (COMI)',
 'A direct equity investment in Egypt''s largest private-sector bank.',
 'stocks', 1000, 21.0, 22.0, 'medium', false,
 json_build_array('Egypt''s largest private-sector bank by assets','Blue-chip stock known for strong liquidity and consistent dividends','Steady long-term growth with lower volatility than the broader market','Well-regulated under the Central Bank of Egypt')::jsonb,
 true),

('fawry-fwry',
 'Fawry for E-Payment (FWRY)',
 'A growth-oriented investment in Egypt''s dominant fintech and e-payments platform.',
 'stocks', 500, 17.5, 18.2, 'high', true,
 json_build_array('Egypt''s dominant fintech and e-payments platform','Growth-oriented with substantial long-term upside','Tied to Egypt''s ongoing digital transformation','Higher volatility reflects high-growth potential')::jsonb,
 true),

('partment-new-cairo',
 'Partment Fractional (New Cairo)',
 'Fractional ownership in a premium residential property in New Cairo.',
 'real_estate', 10000, 15.0, 15.5, 'medium', true,
 json_build_array('Fractional ownership in a premium New Cairo residential property','Quarterly rental yield distributions','Long-term capital appreciation potential','Lower entry barrier to real estate investing')::jsonb,
 true),

('sylndr-pre-ipo',
 'Sylndr Pre-IPO Syndicate',
 'A venture capital opportunity to invest in Sylndr, Egypt''s rapidly growing used-car platform.',
 'startup', 5000, 40.0, 45.0, 'high', true,
 json_build_array('Pre-IPO syndicate in Sylndr, Egypt''s leading used-car platform','Rare venture capital opportunity for retail investors','High risk with potential for massive returns upon IPO or exit','Illiquid investment requiring a long-term horizon')::jsonb,
 true);
