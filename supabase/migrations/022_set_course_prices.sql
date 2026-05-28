-- Startup VC and Real Estate: free
UPDATE learning_modules SET price = 0 WHERE slug = 'hub-startup-vc';
UPDATE learning_modules SET price = 0 WHERE slug = 'hub-real-estate';

-- Introduction to Investing: 1000 EGP
UPDATE learning_modules SET price = 1000 WHERE slug = 'hub-intro-investing';
