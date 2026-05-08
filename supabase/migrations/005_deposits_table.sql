-- Deposit tracking: atomic card crediting, pending flow for Instapay/bank,
-- admin credit RPC, user-visible RLS, and scheduled expiry.
-- Run after 004_platform_fees.sql.

-- ─────────────────────────────────────────────────────────────────────────────
-- 1. deposits table
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.deposits (
  id                   UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id              UUID          NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  amount               NUMERIC(14,2) NOT NULL CHECK (amount > 0),
  method               TEXT          NOT NULL CHECK (method IN ('instapay', 'bank', 'card')),
  reference_code       TEXT          UNIQUE NOT NULL,
  status               TEXT          NOT NULL DEFAULT 'pending'
                         CHECK (status IN ('pending', 'credited', 'failed', 'expired')),
  user_confirmed_sent  BOOLEAN       NOT NULL DEFAULT false,
  fee_amount           NUMERIC(14,2) NOT NULL DEFAULT 0,
  net_amount           NUMERIC(14,2) NOT NULL,
  created_at           TIMESTAMPTZ   NOT NULL DEFAULT now(),
  credited_at          TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_deposits_user_id   ON public.deposits (user_id);
CREATE INDEX IF NOT EXISTS idx_deposits_status    ON public.deposits (status);
CREATE INDEX IF NOT EXISTS idx_deposits_ref_code  ON public.deposits (reference_code);

-- ─────────────────────────────────────────────────────────────────────────────
-- 2. Row-Level Security
-- ─────────────────────────────────────────────────────────────────────────────
ALTER TABLE public.deposits ENABLE ROW LEVEL SECURITY;

-- Users can read their own deposits (for history / real-time)
CREATE POLICY "Users can view own deposits"
  ON public.deposits
  FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

-- service_role bypasses RLS automatically — no INSERT/UPDATE policies needed
-- for backend (all writes go through SECURITY DEFINER RPCs or service_role).

-- ─────────────────────────────────────────────────────────────────────────────
-- 3. credit_deposit_card() — atomic instant card deposit
--    Inserts deposits row (status=credited) + credits wallet + records tx.
--    Called by the backend; retried by caller on 23505 reference_code collision.
-- ─────────────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.credit_deposit_card(
  p_user_id        uuid,
  p_amount         numeric,
  p_fee_amount     numeric,
  p_net_amount     numeric,
  p_reference_code text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_deposit_id uuid;
  v_new_bal    numeric;
  v_tx_id      uuid;
BEGIN
  IF p_amount IS NULL OR p_amount <= 0 THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Invalid amount');
  END IF;

  -- Insert deposit row — raises 23505 on reference_code collision (caller retries)
  INSERT INTO public.deposits (
    user_id, amount, method, reference_code,
    status, user_confirmed_sent, fee_amount, net_amount, credited_at
  )
  VALUES (
    p_user_id, p_amount, 'card', p_reference_code,
    'credited', true, COALESCE(p_fee_amount, 0), p_net_amount, now()
  )
  RETURNING id INTO v_deposit_id;

  -- Credit wallet
  UPDATE public.users
  SET wallet_balance = wallet_balance + p_net_amount
  WHERE id = p_user_id
  RETURNING wallet_balance INTO v_new_bal;

  IF v_new_bal IS NULL THEN
    RAISE EXCEPTION 'User not found';
  END IF;

  -- Transaction record
  INSERT INTO public.transactions (
    user_id, type, amount, gross_amount, fee_amount, net_amount, fee_rate, status, meta
  )
  VALUES (
    p_user_id, 'deposit', p_amount, p_amount,
    COALESCE(p_fee_amount, 0), p_net_amount,
    CASE WHEN p_amount > 0 THEN COALESCE(p_fee_amount, 0) / p_amount ELSE 0 END,
    'completed',
    jsonb_build_object('method', 'card', 'reference_code', p_reference_code)
  )
  RETURNING id INTO v_tx_id;

  RETURN jsonb_build_object(
    'ok',             true,
    'deposit_id',     v_deposit_id,
    'wallet_balance', v_new_bal,
    'transaction_id', v_tx_id
  );
END;
$$;

-- ─────────────────────────────────────────────────────────────────────────────
-- 4. credit_deposit(p_deposit_id, p_admin_id) — admin credits a pending deposit
--    Atomically: FOR UPDATE lock → credit wallet → flip status → record tx.
--    p_admin_id is optional (DEFAULT NULL) — stored in meta for audit trail.
-- ─────────────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.credit_deposit(
  p_deposit_id uuid,
  p_admin_id   uuid DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_dep      record;
  v_new_bal  numeric;
  v_tx_id    uuid;
BEGIN
  SELECT * INTO v_dep
  FROM public.deposits
  WHERE id = p_deposit_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Deposit not found');
  END IF;

  IF v_dep.status <> 'pending' THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Deposit is not pending');
  END IF;

  -- Credit wallet
  UPDATE public.users
  SET wallet_balance = wallet_balance + v_dep.net_amount
  WHERE id = v_dep.user_id
  RETURNING wallet_balance INTO v_new_bal;

  -- Update deposit status
  UPDATE public.deposits
  SET status = 'credited', credited_at = now()
  WHERE id = p_deposit_id;

  -- Transaction record (include admin_id in meta for audit)
  INSERT INTO public.transactions (
    user_id, type, amount, gross_amount, fee_amount, net_amount, fee_rate, status, meta
  )
  VALUES (
    v_dep.user_id, 'deposit', v_dep.amount, v_dep.amount,
    v_dep.fee_amount, v_dep.net_amount,
    CASE WHEN v_dep.amount > 0 THEN v_dep.fee_amount / v_dep.amount ELSE 0 END,
    'completed',
    jsonb_build_object(
      'method',         v_dep.method,
      'reference_code', v_dep.reference_code,
      'credited_by',    p_admin_id
    )
  )
  RETURNING id INTO v_tx_id;

  RETURN jsonb_build_object(
    'ok',             true,
    'wallet_balance', v_new_bal,
    'transaction_id', v_tx_id,
    'user_id',        v_dep.user_id
  );
END;
$$;

-- ─────────────────────────────────────────────────────────────────────────────
-- 5. expire_stale_deposits() — pg_cron target
--    Expires pending + unconfirmed deposits older than 48 h.
--    Confirmed-but-uncredited rows stay pending for admin attention.
-- ─────────────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.expire_stale_deposits()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_count integer;
BEGIN
  WITH expired AS (
    UPDATE public.deposits
    SET status = 'expired'
    WHERE status = 'pending'
      AND user_confirmed_sent = false
      AND created_at < now() - INTERVAL '48 hours'
    RETURNING id
  )
  SELECT count(*) INTO v_count FROM expired;

  RETURN v_count;
END;
$$;

-- ─────────────────────────────────────────────────────────────────────────────
-- 6. Permissions
-- ─────────────────────────────────────────────────────────────────────────────
REVOKE ALL ON FUNCTION public.credit_deposit_card(uuid, numeric, numeric, numeric, text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.credit_deposit(uuid, uuid)                                 FROM PUBLIC;
REVOKE ALL ON FUNCTION public.expire_stale_deposits()                                    FROM PUBLIC;

GRANT EXECUTE ON FUNCTION public.credit_deposit_card(uuid, numeric, numeric, numeric, text) TO service_role;
GRANT EXECUTE ON FUNCTION public.credit_deposit(uuid, uuid)                                 TO service_role;
GRANT EXECUTE ON FUNCTION public.expire_stale_deposits()                                    TO service_role;

GRANT SELECT, INSERT, UPDATE ON public.deposits TO service_role;

-- ─────────────────────────────────────────────────────────────────────────────
-- 7. pg_cron setup (run manually in Supabase SQL editor)
--
--    CREATE EXTENSION IF NOT EXISTS pg_cron;
--
--    SELECT cron.schedule(
--      'expire-stale-deposits',
--      '0 * * * *',
--      'SELECT public.expire_stale_deposits()'
--    );
--
--    Verify: SELECT * FROM cron.job;
--    Remove: SELECT cron.unschedule('expire-stale-deposits');
-- ─────────────────────────────────────────────────────────────────────────────
