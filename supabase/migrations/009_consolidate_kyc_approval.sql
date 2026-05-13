-- supabase/migrations/009_consolidate_kyc_approval.sql
-- Atomic KYC review RPC that replaces the dual-path approval in admin.js and kyc.js.
-- Run after 008_soft_delete.sql.

CREATE OR REPLACE FUNCTION public.review_kyc_submission(
  p_submission_id  uuid,
  p_admin_id       uuid,
  p_action         text,
  p_reason         text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_sub     record;
  v_new_kyc text;
BEGIN
  IF p_action NOT IN ('approve', 'reject') THEN
    RETURN jsonb_build_object('ok', false, 'error', 'action must be ''approve'' or ''reject''');
  END IF;

  IF p_action = 'reject' AND (p_reason IS NULL OR TRIM(p_reason) = '') THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Rejection reason required');
  END IF;

  SELECT * INTO v_sub
  FROM public.kyc_submissions
  WHERE id = p_submission_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Submission not found');
  END IF;

  IF v_sub.status <> 'pending' THEN
    RETURN jsonb_build_object(
      'ok',    false,
      'error', 'Submission is not pending — current status: ' || v_sub.status
    );
  END IF;

  v_new_kyc := CASE WHEN p_action = 'approve' THEN 'approved' ELSE 'rejected' END;

  UPDATE public.kyc_submissions
  SET
    status           = v_new_kyc,
    reviewed_at      = now(),
    reviewed_by      = p_admin_id,
    rejection_reason = CASE WHEN p_action = 'reject' THEN p_reason ELSE NULL END
  WHERE id = p_submission_id;

  UPDATE public.users
  SET
    kyc_status           = v_new_kyc,
    kyc_rejection_reason = CASE WHEN p_action = 'reject' THEN p_reason ELSE NULL END
  WHERE id = v_sub.user_id;

  RETURN jsonb_build_object(
    'ok',            true,
    'submission_id', p_submission_id,
    'user_id',       v_sub.user_id,
    'action',        p_action,
    'kyc_status',    v_new_kyc
  );
END;
$$;

REVOKE ALL ON FUNCTION public.review_kyc_submission(uuid, uuid, text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.review_kyc_submission(uuid, uuid, text, text) TO service_role;
