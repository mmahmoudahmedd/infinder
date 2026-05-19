-- Add per-module price to learning_modules
ALTER TABLE public.learning_modules
  ADD COLUMN IF NOT EXISTS price NUMERIC(10,2) NOT NULL DEFAULT 0;
