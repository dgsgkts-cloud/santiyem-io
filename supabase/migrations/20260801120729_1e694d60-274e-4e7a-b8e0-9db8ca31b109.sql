REVOKE EXECUTE ON FUNCTION public.post_goods_receipt(uuid,uuid,numeric,text,numeric,text,text,text,uuid,text,text,date,boolean,text) FROM anon;
REVOKE EXECUTE ON FUNCTION public.post_stock_issue(uuid,uuid,numeric,text,text,text,text,text,text,text,uuid,text,text,date) FROM anon;
REVOKE EXECUTE ON FUNCTION public.reverse_stock_movement(uuid,text) FROM anon;
REVOKE EXECUTE ON FUNCTION public.ensure_default_warehouse() FROM anon;
REVOKE EXECUTE ON FUNCTION public.stock_movements_immutable() FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.stock_movements_validate() FROM anon, authenticated;