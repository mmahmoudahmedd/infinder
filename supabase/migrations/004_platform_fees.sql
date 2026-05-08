-- Platform fee schema: fee columns on transactions, platform_fees revenue
-- table, updated RPCs. Run after 003_atomic_wallet_operations.sql.

-- ─────────────────────────────────────────────────────────────────────────────
-- 1. Add fee columns to transactions (idempotent)
-- ─────────────────────────────────────────────────────────────────────────────
ALTER TABLE public.transactions
  ADD COLUMN IF NOT EXISTS gross_amount NUMERIC(14,2),
  ADD COLUMN IF NOT EXISTS fee_amount   NUMERIC(14,2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS net_amount   NUMERIC(14,2),
  ADD COLUMN IF NOT EXISTS fee_rate     NUMERIC(8,6)  NOT NULL DEFAULT 0;

-- Backfill legacy rows — fee-free so gross = net = amount
UPDATE public.transactions
SET
  gross_amount = amount,
  net_amount   = amount,
  fee_amount   = 0,
  fee_rate     = 0
WHERE gross_amount IS NULL;

-- ─────────────────────────────────────────────────────────────────────────────
-- 2. Platform fees revenue table
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.platform_fees (
  id             UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
  transaction_id UUID          REFERENCES public.transactions(id) ON DELETE SET NULL,
  user_id        UUID          REFERENCES public.users(id)        ON DELETE SET NULL,
  amount         NUMERIC(14,2) NOT NULL,
  type           TEXT          NOT NULL CHECK (type IN ('investment', 'withdrawal')),
  created_at     TIMESTAMPTZ   DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_platform_fees_created_at ON public.platform_fees (created_at);
CREATE INDEX IF NOT EXISTS idx_platform_fees_user_id    ON public.platform_fees (user_id);

ALTER TABLE public.platform_fees ENABLE ROW LEVEL SECURITY;
-- No public/anon policies — service_role only

-- ─────────────────────────────────────────────────────────────────────────────
-- 3. Revenue summary view
-- ─────────────────────────────────────────────────────────────────────────────
CREATE OR REPLACE VIEW public.platform_fee_summary AS
SELECT
  DATE_TRUNC('day',   created_at AT TIME ZONE 'UTC') AS day,
  DATE_TRUNC('month', created_at AT TIME ZONE 'UTC') AS month,
  type,
  SUM(amount)    AS total_fees,
  COUNT(*)::int  AS transaction_count
FROM public.platform_fees
GROUP BY 1, 2, 3;

-- ─────────────────────────────────────────────────────────────────────────────
-- 4. apply_investment — fee params added with defaults (backward-compatible)
-- ─────────────────────────────────────────────────────────────────────────────
DROP FUNCTION IF EXISTS public.apply_investment(uuid, numeric, jsonb, text, boolean, text);

CREATE FUNCTION public.apply_investment(
  p_user_id        uuid,
  p_amount         numeric,
  p_allocation     jsonb,
  p_reasoning      text,
  p_is_sharia      boolean,
  p_portfolio_name text,
  p_fee_amount     numeric DEFAULT 0,
  p_fee_rate       numeric DEFAULT 0
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_bal          numeric;
  v_kyc          text;
  v_total_cost   numeric;
  v_new_bal      numeric;
  v_portfolio_id uuid;
  v_tx_id        uuid;
BEGIN
  IF p_amount IS NULL OR p_amount <= 0 THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Invalid amount');
  END IF;

  v_total_cost := p_amount + COALESCE(p_fee_amount, 0);

  SELECT wallet_balance, kyc_status INTO v_bal, v_kyc
  FROM public.users WHERE id = p_user_id FOR UPDATE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('ok', false, 'error', 'User not found');
  END IF;

  IF v_kyc = 'rejected' THEN
    RETURN jsonb_build_object('ok', false, 'error', 'KYC rejected — contact support');
  END IF;

  IF v_bal < v_total_cost THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Insufficient balance');
  END IF;

  v_new_bal := v_bal - v_total_cost;

  UPDATE public.users SET wallet_balance = v_new_bal WHERE id = p_user_id;

  INSERT INTO public.portfolios (user_id, name, allocation, assistant_reasoning, is_sharia)
  VALUES (
    p_user_id,
    COALESCE(NULLIF(TRIM(p_portfolio_name), ''), 'My Portfolio'),
    p_allocation,
    NULLIF(p_reasoning, ''),
    COALESCE(p_is_sharia, false)
  )
  RETURNING id INTO v_portfolio_id;

  INSERT INTO public.transactions (
    user_id, type, amount, gross_amount, fee_amount, net_amount, fee_rate,
    status, reference, meta
  )
  VALUES (
    p_user_id, 'investment',
    p_amount, p_amount,
    COALESCE(p_fee_amount, 0), p_amount,
    COALESCE(p_fee_rate, 0),
    'completed', v_portfolio_id::text,
    jsonb_build_object('allocation', p_allocation)
  )
  RETURNING id INTO v_tx_id;

  IF COALESCE(p_fee_amount, 0) > 0 THEN
    INSERT INTO public.platform_fees (transaction_id, user_id, amount, type)
    VALUES (v_tx_id, p_user_id, p_fee_amount, 'investment');
  END IF;

  RETURN jsonb_build_object(
    'ok',             true,
    'portfolio_id',   v_portfolio_id,
    'wallet_balance', v_new_bal,
    'fee_amount',     COALESCE(p_fee_amount, 0)
  );
END;
$$;

-- ─────────────────────────────────────────────────────────────────────────────
-- 5. withdraw_wallet — fee params added with defaults (backward-compatible)
-- ─────────────────────────────────────────────────────────────────────────────
DROP FUNCTION IF EXISTS public.withdraw_wallet(uuid, numeric);

CREATE FUNCTION public.withdraw_wallet(
  p_user_id    uuid,
  p_amount     numeric,
  p_fee_amount numeric DEFAULT 0,
  p_fee_rate   numeric DEFAULT 0
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_bal        numeric;
  v_new_bal    numeric;
  v_net_amount numeric;
  v_tx_id      uuid;
BEGIN
  IF p_amount IS NULL OR p_amount <= 0 THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Invalid amount');
  END IF;

  SELECT wallet_balance INTO v_bal
  FROM public.users WHERE id = p_user_id FOR UPDATE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('ok', false, 'error', 'User not found');
  END IF;

  IF v_bal < p_amount THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Insufficient balance');
  END IF;

  v_net_amount := p_amount - COALESCE(p_fee_amount, 0);
  v_new_bal    := v_bal - p_amount;

  UPDATE public.users SET wallet_balance = v_new_bal WHERE id = p_user_id;

  INSERT INTO public.transactions (
    user_id, type, amount, gross_amount, fee_amount, net_amount, fee_rate, status
  )
  VALUES (
    p_user_id, 'withdrawal',
    p_amount, p_amount,
    COALESCE(p_fee_amount, 0), v_net_amount,
    COALESCE(p_fee_rate, 0),
    'completed'
  )
  RETURNING id INTO v_tx_id;

  IF COALESCE(p_fee_amount, 0) > 0 THEN
    INSERT INTO public.platform_fees (transaction_id, user_id, amount, type)
    VALUES (v_tx_id, p_user_id, p_fee_amount, 'withdrawal');
  END IF;

  RETURN jsonb_build_object(
    'ok',             true,
    'wallet_balance', v_new_bal,
    'fee_amount',     COALESCE(p_fee_amount, 0),
    'net_amount',     v_net_amount
  );
END;
$$;

-- ─────────────────────────────────────────────────────────────────────────────
-- 6. Permissions
-- ─────────────────────────────────────────────────────────────────────────────
REVOKE ALL ON FUNCTION public.apply_investment(uuid, numeric, jsonb, text, boolean, text, numeric, numeric) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.withdraw_wallet(uuid, numeric, numeric, numeric) FROM PUBLIC;

GRANT EXECUTE ON FUNCTION public.apply_investment(uuid, numeric, jsonb, text, boolean, text, numeric, numeric) TO service_role;
GRANT EXECUTE ON FUNCTION public.withdraw_wallet(uuid, numeric, numeric, numeric) TO service_role;

GRANT SELECT, INSERT ON public.platform_fees TO service_role;
GRANT SELECT ON public.platform_fee_summary TO service_role;
