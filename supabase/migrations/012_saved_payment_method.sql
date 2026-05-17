ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS payment_method_type TEXT
    CHECK (payment_method_type IN ('card')),
  ADD COLUMN IF NOT EXISTS payment_method_data JSONB;
