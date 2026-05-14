CREATE OR REPLACE FUNCTION public.save_subcontractor_payment_with_cash(
  _payment_id uuid, _subcontractor_id uuid, _amount numeric, _payment_date date,
  _payment_method text, _project_id text, _check_no text, _check_due_date date,
  _bank_name text, _account_no text, _note text, _recipient text
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  uid uuid := auth.uid();
  pay_id uuid;
  cash_pay_type text;
  existing_cash_id uuid;
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

  -- Explicit guard: check if a mirrored cash row already exists for this payment.
  -- This prevents duplicate "Taşeron Ödemesi" cash entries even when the partial
  -- unique index on (source_type, source_id) cannot be inferred by ON CONFLICT.
  SELECT id INTO existing_cash_id
  FROM public.cash_payments
  WHERE source_type = 'subcontractor_payment'
    AND source_id = pay_id
  LIMIT 1;

  IF existing_cash_id IS NOT NULL THEN
    UPDATE public.cash_payments
    SET recipient = _recipient,
        category = 'Taşeron Ödemesi',
        amount = _amount,
        payment_date = _payment_date,
        payment_type = cash_pay_type,
        project_id = _project_id,
        check_no = CASE WHEN _payment_method = 'cek' THEN _check_no ELSE NULL END,
        check_due_date = CASE WHEN _payment_method = 'cek' THEN _check_due_date ELSE NULL END,
        check_bank = CASE WHEN _payment_method = 'cek' THEN _bank_name ELSE NULL END,
        bank_name = CASE WHEN _payment_method = 'havale' THEN _bank_name ELSE NULL END,
        iban = CASE WHEN _payment_method = 'havale' THEN _account_no ELSE NULL END,
        description = NULLIF(trim(coalesce(_note, '')), ''),
        status = 'odendi',
        updated_at = now()
    WHERE id = existing_cash_id;
  ELSE
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
    );
  END IF;

  RETURN pay_id;
END;
$function$;