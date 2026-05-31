-- Add long_description column and update all 4 partners

ALTER TABLE public.partners ADD COLUMN IF NOT EXISTS long_description JSONB;

-- FRA — CFAT Program
UPDATE public.partners SET
  name             = 'FRA — CFAT Program',
  description      = 'The Financial Regulatory Authority of Egypt — regulating non-banking financial markets and offering the prestigious CFAT certification.',
  tags             = ARRAY['Finance', 'Certifications', 'Government'],
  long_description = json_build_object('what_you_learn', 'Learning through the FRA CFAT program gives users a deep understanding of how Egypt''s financial system is structured, how markets are regulated, and how to make informed, compliant investment decisions.', 'why_it_matters', 'A certificate from the FRA is recognized by financial institutions, brokerage firms, and investment companies across Egypt. It signals credibility and regulatory knowledge that employers actively look for.')
WHERE slug = 'fra';

-- EGX → ANNOVA
UPDATE public.partners SET
  slug             = 'annova',
  name             = 'ANNOVA',
  description      = 'A financial education platform built for Egyptian youth, delivering interactive and gamified learning experiences.',
  icon             = 'trending',
  tags             = ARRAY['Youth', 'Financial Literacy', 'Gamified'],
  long_description = json_build_object('what_you_learn', 'ANNOVA courses cover everyday financial literacy — budgeting, saving, understanding investment types, reading market trends, and making smart money decisions in real life.', 'why_it_matters', 'Most young Egyptians have never had formal financial education. ANNOVA fills that gap in a way that feels modern and relevant. Completing an ANNOVA certification demonstrates financial awareness and readiness to manage and grow personal wealth.')
WHERE slug = 'egx';

-- EIBF → ALX Egypt
UPDATE public.partners SET
  slug             = 'alx-egypt',
  name             = 'ALX Egypt',
  description      = 'A pan-African career development program weaving financial awareness into digital skills and professional development.',
  icon             = 'bank',
  tags             = ARRAY['Career', 'Digital Skills', 'Professional'],
  long_description = json_build_object('what_you_learn', 'ALX programs combine technology, business thinking, and financial awareness into one integrated learning experience. Students graduate with skills directly applicable to jobs in tech, finance, startups, and beyond.', 'why_it_matters', 'ALX graduates are highly sought after by Egyptian and international employers. The program''s reputation for producing ready-to-work professionals makes an ALX certification a strong career signal for any young person entering the workforce.')
WHERE slug = 'eibf';

-- AUC School of Business
UPDATE public.partners SET
  description      = 'Consistently ranked among the top business schools in the Middle East and Africa, offering executive education in investment and finance.',
  tags             = ARRAY['Business', 'Certifications', 'Executive Education'],
  long_description = json_build_object('what_you_learn', 'AUC programs cover advanced investment strategies, portfolio management, financial analysis, and leadership in business — taught using internationally recognized academic frameworks.', 'why_it_matters', 'An AUC certificate carries significant prestige in Egypt and across the MENA region. It is recognized by multinational companies, investment banks, and top-tier employers as a mark of academic excellence and professional seriousness.')
WHERE slug = 'auc';
