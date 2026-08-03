REVOKE ALL ON FUNCTION public.inv_unit_factor(uuid, text) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.inv_stock_position(uuid, uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.inv_transfer_event(uuid, uuid, text, text, text, jsonb) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.inv_transfer_notify(uuid, text, text, text) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.create_stock_transfer(uuid, uuid, uuid, numeric, text, date, text, text, text, boolean) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.approve_stock_transfer(uuid, text, text) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.dispatch_stock_transfer(uuid, numeric, text, timestamptz, timestamptz, text, text) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.receive_stock_transfer(uuid, numeric, numeric, numeric, numeric, text, timestamptz, text, text) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.cancel_stock_transfer(uuid, text) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.return_stock_transfer(uuid, numeric, text, text) FROM PUBLIC, anon;

GRANT EXECUTE ON FUNCTION public.inv_unit_factor(uuid, text) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.inv_stock_position(uuid, uuid) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.create_stock_transfer(uuid, uuid, uuid, numeric, text, date, text, text, text, boolean) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.approve_stock_transfer(uuid, text, text) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.dispatch_stock_transfer(uuid, numeric, text, timestamptz, timestamptz, text, text) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.receive_stock_transfer(uuid, numeric, numeric, numeric, numeric, text, timestamptz, text, text) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.cancel_stock_transfer(uuid, text) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.return_stock_transfer(uuid, numeric, text, text) TO authenticated, service_role;