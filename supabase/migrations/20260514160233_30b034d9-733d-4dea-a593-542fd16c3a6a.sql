-- Atomic upsert: subcontractor payment + mirrored cash payment in one transaction
CREATE OR REPLACE FUNCTION public.save_subcontractor_payment_with_cash(
  _payment_id uuid,
  _subcontractor_id uuid,
  _amount numeric,
  _payment_date date,
  _payment_method text,
  _project_id text,
  _check_no text,
  _check_due_date date,
  _bank_name text,
  _account_no text,
  _note text,
  _recipient text
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  uid uuid := auth.uid();
  pay_id uuid;
  cash_pay_type text;
BEGIN
  IF uid IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  cash_pay_type := CASE WHEN _payment_method = 'kredi_karti' THEN 'kredi_karti' ELSE _payment_method END;

  IF _payment_id IS NULL THEN
    INSERT INTO public.subcontractor_payments(
      user_id, subcontractor_id, amount, payment_date, payment_method,
      project_id, check_no, check_due_date, bank_name, account_no, note, status
    )
    VALUES (
      uid, _subcontractor_id, _amount, _payment_date, _payment_method,
      _project_id, _check_no, _check_due_date, _bank_name, _account_no, _note, 'odendi'
    )
    RETURNING id INTO pay_id;
  ELSE
    UPDATE public.subcontractor_payments
    SET amount = _amount,
        payment_date = _payment_date,
        payment_method = _payment_method,
        project_id = _project_id,
        check_no = _check_no,
        check_due_date = _check_due_date,
        bank_name = _bank_name,
        account_no = _account_no,
        note = _note
    WHERE id = _payment_id
      AND public.can_access_team_resource(uid, user_id);

    IF NOT FOUND THEN
      RAISE EXCEPTION 'Subcontractor payment not found or access denied';
    END IF;
    pay_id := _payment_id;
  END IF;

  -- Upsert mirrored cash row by (source_type, source_id)
  INSERT INTO public.cash_payments(
    user_id, recipient, category, amount, payment_date, payment_type,
    project_id, check_no, check_due_date, check_bank, bank_name, iban,
    description, status, source_type, source_id
  )
  VALUES (
    uid, _recipient, 'Taşeron Ödemesi', _amount, _payment_date, cash_pay_type,
    _project_id,
    CASE WHEN _payment_method = 'cek' THEN _check_no ELSE NULL END,
    CASE WHEN _payment_method = 'cek' THEN _check_due_date ELSE NULL END,
    CASE WHEN _payment_method = 'cek' THEN _bank_name ELSE NULL END,
    CASE WHEN _payment_method = 'havale' THEN _bank_name ELSE NULL END,
    CASE WHEN _payment_method = 'havale' THEN _account_no ELSE NULL END,
    NULLIF(trim(coalesce(_note, '')), ''),
    'odendi', 'subcontractor_payment', pay_id
  )
  ON CONFLICT (source_type, source_id) DO UPDATE
  SET recipient = EXCLUDED.recipient,
      amount = EXCLUDED.amount,
      payment_date = EXCLUDED.payment_date,
      payment_type = EXCLUDED.payment_type,
      project_id = EXCLUDED.project_id,
      check_no = EXCLUDED.check_no,
      check_due_date = EXCLUDED.check_due_date,
      check_bank = EXCLUDED.check_bank,
      bank_name = EXCLUDED.bank_name,
      iban = EXCLUDED.iban,
      description = EXCLUDED.description,
      status = EXCLUDED.status,
      updated_at = now();

  RETURN pay_id;
END;
$$;

-- Atomic delete: subcontractor payment + linked cash payment
CREATE OR REPLACE FUNCTION public.delete_subcontractor_payment_with_cash(_payment_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  uid uuid := auth.uid();
BEGIN
  IF uid IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  DELETE FROM public.cash_payments
  WHERE source_type = 'subcontractor_payment'
    AND source_id = _payment_id
    AND public.can_access_team_resource(uid, user_id);

  DELETE FROM public.subcontractor_payments
  WHERE id = _payment_id
    AND public.can_access_team_resource(uid, user_id);

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Subcontractor payment not found or access denied';
  END IF;
END;
$$;

REVOKE ALL ON FUNCTION public.save_subcontractor_payment_with_cash(uuid, uuid, numeric, date, text, text, text, date, text, text, text, text) FROM anon;
REVOKE ALL ON FUNCTION public.delete_subcontractor_payment_with_cash(uuid) FROM anon;
GRANT EXECUTE ON FUNCTION public.save_subcontractor_payment_with_cash(uuid, uuid, numeric, date, text, text, text, date, text, text, text, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.delete_subcontractor_payment_with_cash(uuid) TO authenticated;