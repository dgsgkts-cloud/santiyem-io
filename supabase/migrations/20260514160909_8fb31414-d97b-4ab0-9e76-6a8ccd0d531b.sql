REVOKE ALL ON FUNCTION public.save_subcontractor_payment_with_cash(uuid, uuid, numeric, date, text, text, text, date, text, text, text, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.save_subcontractor_payment_with_cash(uuid, uuid, numeric, date, text, text, text, date, text, text, text, text) TO authenticated;

REVOKE ALL ON FUNCTION public.delete_subcontractor_payment_with_cash(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.delete_subcontractor_payment_with_cash(uuid) TO authenticated;