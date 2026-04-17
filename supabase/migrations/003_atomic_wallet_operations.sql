-- Atomic wallet + portfolio + ledger operations (supabase.rpc from backend service role)
-- Apply after 001_initial_schema.sql

CREATE OR REPLACE FUNCTION public.apply_investment(
  p_user_id uuid,
  p_amount numeric,
  p_allocation jsonb,
  p_reasoning text,
  p_is_sharia boolean,
  p_portfolio_name text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_bal numeric;
  v_kyc text;
  v_new_bal numeric;
  v_portfolio_id uuid;
BEGIN
  IF p_amount IS NULL OR p_amount <= 0 THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Invalid amount');
  END IF;

  SELECT wallet_balance, kyc_status INTO v_bal, v_kyc
  FROM public.users
  WHERE id = p_user_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('ok', false, 'error', 'User not found');
  END IF;

  IF v_kyc = 'rejected' THEN
    RETURN jsonb_build_object('ok', false, 'error', 'KYC rejected — contact support');
  END IF;

  IF v_bal < p_amount THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Insufficient balance');
  END IF;

  v_new_bal := v_bal - p_amount;

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

  INSERT INTO public.transactions (user_id, type, amount, status, reference, meta)
  VALUES (
    p_user_id,
    'investment',
    p_amount,
    'completed',
    v_portfolio_id::text,
    jsonb_build_object('allocation', p_allocation)
  );

  RETURN jsonb_build_object(
    'ok', true,
    'portfolio_id', v_portfolio_id,
    'wallet_balance', v_new_bal
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.fund_wallet(p_user_id uuid, p_amount numeric, p_meta jsonb)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_bal numeric;
  v_new_bal numeric;
BEGIN
  IF p_amount IS NULL OR p_amount <= 0 THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Invalid amount');
  END IF;

  SELECT wallet_balance INTO v_bal
  FROM public.users
  WHERE id = p_user_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('ok', false, 'error', 'User not found');
  END IF;

  v_new_bal := v_bal + p_amount;

  UPDATE public.users SET wallet_balance = v_new_bal WHERE id = p_user_id;

  INSERT INTO public.transactions (user_id, type, amount, status, meta)
  VALUES (p_user_id, 'deposit', p_amount, 'completed', COALESCE(p_meta, '{}'::jsonb));

  RETURN jsonb_build_object('ok', true, 'wallet_balance', v_new_bal);
END;
$$;

CREATE OR REPLACE FUNCTION public.withdraw_wallet(p_user_id uuid, p_amount numeric)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_bal numeric;
  v_new_bal numeric;
BEGIN
  IF p_amount IS NULL OR p_amount <= 0 THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Invalid amount');
  END IF;

  SELECT wallet_balance INTO v_bal
  FROM public.users
  WHERE id = p_user_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('ok', false, 'error', 'User not found');
  END IF;

  IF v_bal < p_amount THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Insufficient balance');
  END IF;

  v_new_bal := v_bal - p_amount;

  UPDATE public.users SET wallet_balance = v_new_bal WHERE id = p_user_id;

  INSERT INTO public.transactions (user_id, type, amount, status)
  VALUES (p_user_id, 'withdrawal', p_amount, 'completed');

  RETURN jsonb_build_object('ok', true, 'wallet_balance', v_new_bal);
END;
$$;

REVOKE ALL ON FUNCTION public.apply_investment(uuid, numeric, jsonb, text, boolean, text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.fund_wallet(uuid, numeric, jsonb) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.withdraw_wallet(uuid, numeric) FROM PUBLIC;

GRANT EXECUTE ON FUNCTION public.apply_investment(uuid, numeric, jsonb, text, boolean, text) TO service_role;
GRANT EXECUTE ON FUNCTION public.fund_wallet(uuid, numeric, jsonb) TO service_role;
GRANT EXECUTE ON FUNCTION public.withdraw_wallet(uuid, numeric) TO service_role;
