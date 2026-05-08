-- Exit investment: close an active portfolio position and return funds to wallet.
-- Run after 005_deposits_table.sql.

-- ─────────────────────────────────────────────────────────────────────────────
-- 1. exit_investment(p_portfolio_id, p_user_id)
--    Atomic: FOR UPDATE lock → validate → close portfolio → credit wallet → record tx
-- ─────────────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.exit_investment(
  p_portfolio_id uuid,
  p_user_id      uuid
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_portfolio  record;
  v_amount     numeric;
  v_new_bal    numeric;
  v_tx_id      uuid;
BEGIN
  -- Lock the portfolio row to prevent concurrent exits
  SELECT * INTO v_portfolio
  FROM public.portfolios
  WHERE id = p_portfolio_id AND user_id = p_user_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Investment not found');
  END IF;

  IF v_portfolio.status <> 'active' THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Investment is already closed');
  END IF;

  -- Retrieve original invested amount from the investment transaction
  SELECT amount INTO v_amount
  FROM public.transactions
  WHERE reference = p_portfolio_id::text
    AND type = 'investment'
  ORDER BY created_at
  LIMIT 1;

  IF v_amount IS NULL OR v_amount <= 0 THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Could not determine invested amount');
  END IF;

  -- Close the portfolio
  UPDATE public.portfolios
  SET status = 'closed', updated_at = now()
  WHERE id = p_portfolio_id;

  -- Credit wallet
  UPDATE public.users
  SET wallet_balance = wallet_balance + v_amount
  WHERE id = p_user_id
  RETURNING wallet_balance INTO v_new_bal;

  IF v_new_bal IS NULL THEN
    RAISE EXCEPTION 'User not found';
  END IF;

  -- Record the return transaction
  INSERT INTO public.transactions (
    user_id, type, amount, gross_amount, fee_amount, net_amount,
    fee_rate, status, reference, meta
  )
  VALUES (
    p_user_id, 'return', v_amount, v_amount, 0, v_amount,
    0, 'completed', p_portfolio_id::text,
    jsonb_build_object(
      'action',       'exit',
      'portfolio_id', p_portfolio_id,
      'allocation',   v_portfolio.allocation
    )
  )
  RETURNING id INTO v_tx_id;

  RETURN jsonb_build_object(
    'ok',             true,
    'amount',         v_amount,
    'wallet_balance', v_new_bal,
    'transaction_id', v_tx_id
  );
END;
$$;

-- ─────────────────────────────────────────────────────────────────────────────
-- 2. Permissions
-- ─────────────────────────────────────────────────────────────────────────────
REVOKE ALL ON FUNCTION public.exit_investment(uuid, uuid) FROM PUBLIC;
GRANT  EXECUTE ON FUNCTION public.exit_investment(uuid, uuid) TO service_role;
