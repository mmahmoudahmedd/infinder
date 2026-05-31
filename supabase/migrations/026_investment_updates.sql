-- Remove bonds category, update minimums and basket returns

ALTER TABLE public.investments DROP CONSTRAINT investments_category_check;
ALTER TABLE public.investments ADD CONSTRAINT investments_category_check
  CHECK (category IN ('stocks', 'baskets', 'gold', 'real_estate', 'startup'));

DELETE FROM public.investments WHERE slug = 'b-secure-tbills';

UPDATE public.investments SET min_investment = 0
  WHERE slug IN ('az-opportunities-egx30','ci-capital-misr-equity','cib-comi','fawry-fwry','partment-new-cairo','sylndr-pre-ipo');

UPDATE public.investments SET expected_return_low = 15, expected_return_high = 18
  WHERE slug IN ('az-opportunities-egx30', 'ci-capital-misr-equity');
