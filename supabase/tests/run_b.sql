\set ON_ERROR_STOP on
BEGIN;
\i /tmp/tt/fixtures.sql

-- ═════════════════════════ GROUP D — DISPATCH ═══════════════════════════════
DO $$
DECLARE
  O uuid := 'e353aaa2-c333-4700-9236-10252397869a';
  A uuid := 'e36be6a2-ad88-41ba-80b4-97772a076b3b';
  E uuid := 'f93a2a3f-b0e8-4124-808c-9432654f9e2a';
  V uuid := 'e0aac4e5-eb0e-4c58-aa74-9e75a0c5f131';
  X uuid := '58454742-15d1-4b6c-9181-373153c9ab4f';
  W1 uuid := '22222222-0000-0000-0000-000000000001';
  W2 uuid := '22222222-0000-0000-0000-000000000002';
  M uuid := '33333333-0000-0000-0000-000000000001';
  M6 uuid := '33333333-0000-0000-0000-000000000006';
  t RECORD; pos RECORD; tid uuid; t2 uuid; t3 uuid; r jsonb; mv RECORD; c int; q numeric;
BEGIN
  PERFORM pg_temp.as_user(E);
  tid := (public.create_stock_transfer(W1, W2, M, 60, 'ton', CURRENT_DATE+3, 'saha', NULL, 'test', false)->>'transfer_id')::uuid;
  t2 := (public.create_stock_transfer(W1, W2, M, 5, 'ton', CURRENT_DATE+3, 'saha', NULL, 'test', false)->>'transfer_id')::uuid;
  PERFORM pg_temp.as_user(A);
  PERFORM public.approve_stock_transfer(tid, 'approve', NULL);

  -- ilk kısmi sevk
  PERFORM pg_temp.as_user(E);
  r := public.dispatch_stock_transfer(tid, 25, 'ton', now(), now() + interval '2 day', 'SEVK-1', 'ilk parti');
  SELECT * INTO t FROM public.inventory_transfers WHERE id = tid;
  SELECT * INTO pos FROM public.inv_stock_position(M, W1);
  PERFORM pg_temp.check('dispatch: kaynak on-hand düştü', pos.on_hand = 75, pos.on_hand::text);
  PERFORM pg_temp.check('dispatch: kaynak available düştü', pos.available = 75 - 35, pos.available::text);
  SELECT * INTO pos FROM public.inv_stock_position(M, W2);
  PERFORM pg_temp.check('dispatch: hedef on-hand artmadı', pos.on_hand = 0, pos.on_hand::text);
  PERFORM pg_temp.check('dispatch: hedef available artmadı', pos.available = 0);
  PERFORM pg_temp.check('dispatch: transit arttı', t.in_transit_quantity = 25, t.in_transit_quantity::text);
  PERFORM pg_temp.check('dispatch: durum partially_dispatched', t.status = 'partially_dispatched', t.status);
  PERFORM pg_temp.check('dispatch: talep miktarı ezilmedi', t.requested_quantity = 60);
  PERFORM pg_temp.check('dispatch: dispatcher ve zaman kaydedildi', t.dispatcher_id = E AND t.dispatched_at IS NOT NULL);
  PERFORM pg_temp.check('dispatch: WAC yakalandı', t.unit_cost = 10000, t.unit_cost::text);
  SELECT count(*) INTO c FROM public.stock_movements
   WHERE source_type='inventory_transfer' AND movement_type='transfer_out' AND source_document = t.transfer_no;
  PERFORM pg_temp.check('dispatch: tek transfer_out hareketi', c = 1, c::text);
  SELECT * INTO mv FROM public.stock_movements
   WHERE source_type='inventory_transfer' AND movement_type='transfer_out' AND source_document = t.transfer_no;
  PERFORM pg_temp.check('dispatch: hareket kaynak transfere bağlı',
    mv.source_type='inventory_transfer' AND mv.warehouse_id = W1 AND mv.counter_warehouse_id = W2 AND mv.direction = -1);
  PERFORM pg_temp.check('dispatch: hareket birim maliyeti', mv.unit_cost = 10000);
  PERFORM pg_temp.check('dispatch: olay kaydı var',
    (SELECT count(*) FROM public.inventory_transfer_events WHERE transfer_id=tid AND action='dispatch') = 1);
  PERFORM pg_temp.check('dispatch: audit kaydı var',
    (SELECT count(*) FROM public.inventory_audit_log WHERE entity_id=tid AND action='dispatch') = 1);
  PERFORM pg_temp.check('dispatch: transfer_out tüketim sayılmıyor',
    (SELECT count(*) FROM public.inventory_consumption WHERE material_id = M AND consumption_type LIKE 'transfer%') = 0);

  -- ikinci kısmi sevk (farklı referans → ayrı olay/hareket)
  r := public.dispatch_stock_transfer(tid, 20, 'ton', now(), now() + interval '2 day', 'SEVK-2', 'ikinci parti');
  SELECT * INTO t FROM public.inventory_transfers WHERE id = tid;
  PERFORM pg_temp.check('dispatch: kümülatif sevk 45', t.dispatched_quantity = 45, t.dispatched_quantity::text);
  PERFORM pg_temp.check('dispatch: transit 45', t.in_transit_quantity = 45, t.in_transit_quantity::text);
  SELECT count(*) INTO c FROM public.stock_movements
   WHERE source_type='inventory_transfer' AND movement_type='transfer_out' AND source_document = t.transfer_no;
  PERFORM pg_temp.check('dispatch: iki ayrı sevk hareketi (unique index çakışmadı)', c = 2, c::text);
  PERFORM pg_temp.check('dispatch: kısmi sevkte durum truthful', t.status = 'partially_dispatched', t.status);
  SELECT * INTO pos FROM public.inv_stock_position(M, W1);
  PERFORM pg_temp.check('dispatch: on-hand 55', pos.on_hand = 55, pos.on_hand::text);

  -- hata senaryoları
  PERFORM pg_temp.expect_err('dispatch: kalan miktarı aşan sevk',
    format('SELECT public.dispatch_stock_transfer(%L,50,''ton'',now(),NULL,''SEVK-3'',NULL)', tid), 'quantity_exceeds_remaining');
  PERFORM pg_temp.expect_err('dispatch: mükerrer sevk belgesi',
    format('SELECT public.dispatch_stock_transfer(%L,5,''ton'',now(),NULL,''SEVK-1'',NULL)', tid), 'transfer_already_dispatched');
  PERFORM pg_temp.expect_err('dispatch: sıfır miktar',
    format('SELECT public.dispatch_stock_transfer(%L,0,''ton'',now(),NULL,''S0'',NULL)', tid), 'invalid_quantity');
  PERFORM pg_temp.expect_err('dispatch: negatif miktar',
    format('SELECT public.dispatch_stock_transfer(%L,-3,''ton'',now(),NULL,''S0'',NULL)', tid), 'invalid_quantity');
  PERFORM pg_temp.expect_err('dispatch: geçersiz birim',
    format('SELECT public.dispatch_stock_transfer(%L,1,''m²'',now(),NULL,''S0'',NULL)', tid), 'invalid_unit');
  PERFORM pg_temp.expect_err('dispatch: onaysız transfer',
    format('SELECT public.dispatch_stock_transfer(%L,1,''ton'',now(),NULL,''S0'',NULL)', t2), 'invalid_transfer_status');
  PERFORM pg_temp.as_user(V);
  PERFORM pg_temp.expect_err('dispatch: yetkisiz kullanıcı',
    format('SELECT public.dispatch_stock_transfer(%L,1,''ton'',now(),NULL,''S0'',NULL)', tid), 'permission_denied');
  PERFORM pg_temp.as_user(X);
  PERFORM pg_temp.expect_err('dispatch: firma dışı kullanıcı',
    format('SELECT public.dispatch_stock_transfer(%L,1,''ton'',now(),NULL,''S0'',NULL)', tid), 'cross_company_access');

  -- reddedilmiş / iptal edilmiş transfer sevk edilemez
  PERFORM pg_temp.as_user(A);
  PERFORM public.approve_stock_transfer(t2, 'reject', 'gerek yok');
  PERFORM pg_temp.expect_err('dispatch: reddedilmiş transfer',
    format('SELECT public.dispatch_stock_transfer(%L,1,''ton'',now(),NULL,''S0'',NULL)', t2), 'invalid_transfer_status');
  PERFORM pg_temp.as_user(E);
  t3 := (public.create_stock_transfer(W1, W2, M, 3, 'ton', CURRENT_DATE+3, 'saha', NULL, 'test', false)->>'transfer_id')::uuid;
  PERFORM pg_temp.as_user(A);
  PERFORM public.approve_stock_transfer(t3, 'approve', NULL);
  PERFORM public.cancel_stock_transfer(t3, 'gerek yok');
  PERFORM pg_temp.expect_err('dispatch: iptal edilmiş transfer',
    format('SELECT public.dispatch_stock_transfer(%L,1,''ton'',now(),NULL,''S0'',NULL)', t3), 'invalid_transfer_status');

  -- araya giren tüketim sonrası fiziksel stok yetersiz
  PERFORM pg_temp.as_user(E);
  t3 := (public.create_stock_transfer(W1, W2, M6, 10, 'ton', CURRENT_DATE+3, 'saha', NULL, 'test', false)->>'transfer_id')::uuid;
  PERFORM pg_temp.as_user(A);
  PERFORM public.approve_stock_transfer(t3, 'approve', NULL);
  INSERT INTO public.stock_movements
    (user_id, movement_type, reason, direction, material_id, warehouse_id, quantity, unit, project_id, actor_id)
  VALUES (O, 'project_issue', 'test tüketim', -1, M6, W1, 95, 'ton', 'test', O);
  PERFORM pg_temp.expect_err('dispatch: fiziksel stok yetersiz',
    format('SELECT public.dispatch_stock_transfer(%L,10,''ton'',now(),NULL,''S9'',NULL)', t3), 'insufficient_available_stock');
END $$;

-- ═════════════════════════ GROUP E — RECEIVE ════════════════════════════════
DO $$
DECLARE
  O uuid := 'e353aaa2-c333-4700-9236-10252397869a';
  A uuid := 'e36be6a2-ad88-41ba-80b4-97772a076b3b';
  E uuid := 'f93a2a3f-b0e8-4124-808c-9432654f9e2a';
  V uuid := 'e0aac4e5-eb0e-4c58-aa74-9e75a0c5f131';
  X uuid := '58454742-15d1-4b6c-9181-373153c9ab4f';
  W1 uuid := '22222222-0000-0000-0000-000000000001';
  W2 uuid := '22222222-0000-0000-0000-000000000002';
  M uuid := '33333333-0000-0000-0000-000000000007';
  t RECORD; pos RECORD; tid uuid; pend uuid; r jsonb; mv RECORD; c int; tro numeric; tri numeric;
BEGIN
  PERFORM pg_temp.as_user(E);
  tid := (public.create_stock_transfer(W1, W2, M, 45, 'ton', CURRENT_DATE+3, 'saha', NULL, 'test', false)->>'transfer_id')::uuid;
  pend := (public.create_stock_transfer(W1, W2, M, 2, 'ton', CURRENT_DATE+3, 'saha', NULL, 'test', false)->>'transfer_id')::uuid;
  PERFORM pg_temp.as_user(A);
  PERFORM public.approve_stock_transfer(tid, 'approve', NULL);
  PERFORM pg_temp.as_user(E);
  PERFORM pg_temp.expect_err('receive: sevk öncesi teslim alma',
    format('SELECT public.receive_stock_transfer(%L,1,0,0,0,''ton'',now(),NULL,''R0'')', pend), 'invalid_transfer_status');

  PERFORM public.dispatch_stock_transfer(tid, 45, 'ton', now(), now() + interval '1 day', 'SV-1', NULL);
  SELECT * INTO t FROM public.inventory_transfers WHERE id = tid;
  PERFORM pg_temp.check('receive: sevk sonrası durum in_transit', t.status = 'in_transit', t.status);

  -- transit görünümü
  SELECT quantity INTO tro FROM public.inventory_transit_balances WHERE material_id=M AND warehouse_id=W1 AND direction='out';
  SELECT quantity INTO tri FROM public.inventory_transit_balances WHERE material_id=M AND warehouse_id=W2 AND direction='in';
  PERFORM pg_temp.check('transit: kaynak transit-out 45', tro = 45, tro::text);
  PERFORM pg_temp.check('transit: hedef transit-in 45', tri = 45, tri::text);
  SELECT * INTO pos FROM public.inv_stock_position(M, W2);
  PERFORM pg_temp.check('transit: hedef available transiti içermiyor', pos.available = 0, pos.available::text);

  -- kısmi teslim: 20 kabul, 5 hasarlı
  r := public.receive_stock_transfer(tid, 20, 5, 0, 0, 'ton', now(), 'kısmi teslim', 'TSL-1');
  SELECT * INTO t FROM public.inventory_transfers WHERE id = tid;
  PERFORM pg_temp.check('receive: transit 20 azaldı → 20 kaldı', t.in_transit_quantity = 20, t.in_transit_quantity::text);
  PERFORM pg_temp.check('receive: kabul edilen 20', t.received_quantity = 20);
  PERFORM pg_temp.check('receive: hasarlı 5 kaydedildi', t.damaged_quantity = 5);
  PERFORM pg_temp.check('receive: durum partially_received', t.status = 'partially_received', t.status);
  SELECT * INTO pos FROM public.inv_stock_position(M, W2);
  PERFORM pg_temp.check('receive: hedef on-hand yalnız kabul kadar arttı', pos.on_hand = 20, pos.on_hand::text);
  PERFORM pg_temp.check('receive: hedef available 20', pos.available = 20);
  SELECT count(*) INTO c FROM public.stock_movements
   WHERE movement_type='transfer_in' AND source_document = t.transfer_no;
  PERFORM pg_temp.check('receive: tek transfer_in hareketi', c = 1, c::text);
  SELECT * INTO mv FROM public.stock_movements
   WHERE movement_type='transfer_in' AND source_document = t.transfer_no;
  PERFORM pg_temp.check('receive: sevk maliyeti korundu', mv.unit_cost = 10000, mv.unit_cost::text);
  PERFORM pg_temp.check('receive: hareket miktarı yalnız kabul', mv.quantity = 20);
  PERFORM pg_temp.check('receive: kaynak stoğu tekrar değişmedi',
    (SELECT on_hand FROM public.inv_stock_position(M, W1)) = 55, NULL);
  PERFORM pg_temp.check('receive: uyuşmazlık notu yazıldı', t.discrepancy_note IS NOT NULL);
  PERFORM pg_temp.check('receive: olay kaydı var',
    (SELECT count(*) FROM public.inventory_transfer_events WHERE transfer_id=tid AND action='receive') = 1);

  -- transit hasarlı/eksik sonrası doğru
  SELECT quantity INTO tro FROM public.inventory_transit_balances WHERE material_id=M AND warehouse_id=W1 AND direction='out';
  PERFORM pg_temp.check('transit: kısmi teslim sonrası transit-out 20', tro = 20, tro::text);

  -- hatalar
  PERFORM pg_temp.expect_err('receive: transiti aşan teslim',
    format('SELECT public.receive_stock_transfer(%L,30,0,0,0,''ton'',now(),NULL,''TSL-9'')', tid), 'quantity_exceeds_transit');
  PERFORM pg_temp.expect_err('receive: negatif değer',
    format('SELECT public.receive_stock_transfer(%L,-1,0,0,0,''ton'',now(),NULL,''TSL-8'')', tid), 'invalid_quantity');
  PERFORM pg_temp.expect_err('receive: tamamı sıfır',
    format('SELECT public.receive_stock_transfer(%L,0,0,0,0,''ton'',now(),NULL,''TSL-7'')', tid), 'invalid_quantity');
  PERFORM pg_temp.expect_err('receive: mükerrer teslim belgesi',
    format('SELECT public.receive_stock_transfer(%L,1,0,0,0,''ton'',now(),NULL,''TSL-1'')', tid), 'receipt_already_processed');
  PERFORM pg_temp.expect_err('receive: geçersiz birim',
    format('SELECT public.receive_stock_transfer(%L,1,0,0,0,''m²'',now(),NULL,''TSL-6'')', tid), 'invalid_unit');
  PERFORM pg_temp.as_user(V);
  PERFORM pg_temp.expect_err('receive: yetkisiz kullanıcı',
    format('SELECT public.receive_stock_transfer(%L,1,0,0,0,''ton'',now(),NULL,''TSL-5'')', tid), 'permission_denied');
  PERFORM pg_temp.as_user(X);
  PERFORM pg_temp.expect_err('receive: firma dışı kullanıcı',
    format('SELECT public.receive_stock_transfer(%L,1,0,0,0,''ton'',now(),NULL,''TSL-4'')', tid), 'cross_company_access');

  -- kalan teslim: 15 kabul, 3 eksik, 2 reddedilen
  PERFORM pg_temp.as_user(E);
  r := public.receive_stock_transfer(tid, 15, 0, 3, 2, 'ton', now(), 'kalan teslim', 'TSL-2');
  SELECT * INTO t FROM public.inventory_transfers WHERE id = tid;
  PERFORM pg_temp.check('receive: transit sıfırlandı', t.in_transit_quantity = 0, t.in_transit_quantity::text);
  PERFORM pg_temp.check('receive: kabul toplam 35', t.received_quantity = 35, t.received_quantity::text);
  PERFORM pg_temp.check('receive: eksik 3', t.missing_quantity = 3);
  PERFORM pg_temp.check('receive: reddedilen 2', t.rejected_quantity = 2);
  PERFORM pg_temp.check('receive: uyuşmazlık durumu', t.status = 'discrepancy', t.status);
  SELECT * INTO pos FROM public.inv_stock_position(M, W2);
  PERFORM pg_temp.check('receive: hedef on-hand 35 (hasar/eksik/red dahil değil)', pos.on_hand = 35, pos.on_hand::text);
  PERFORM pg_temp.check('transit: kapanan transferde artık transit yok',
    NOT EXISTS (SELECT 1 FROM public.inventory_transit_balances WHERE material_id=M AND warehouse_id=W1 AND direction='out'), NULL);
  PERFORM pg_temp.check('transit: negatif değer yok',
    NOT EXISTS (SELECT 1 FROM public.inventory_transit_balances WHERE quantity < 0));
  PERFORM pg_temp.expect_err('receive: kapanmış transferde tekrar teslim',
    format('SELECT public.receive_stock_transfer(%L,1,0,0,0,''ton'',now(),NULL,''TSL-3'')', tid), 'quantity_exceeds_transit');
  PERFORM pg_temp.check('receive: transfer_in tüketim sayılmıyor',
    (SELECT count(*) FROM public.inventory_consumption WHERE consumption_type LIKE 'transfer%') = 0);
END $$;

-- ═════════════════════════ GROUP F — İADE / İPTAL ═══════════════════════════
DO $$
DECLARE
  O uuid := 'e353aaa2-c333-4700-9236-10252397869a';
  A uuid := 'e36be6a2-ad88-41ba-80b4-97772a076b3b';
  E uuid := 'f93a2a3f-b0e8-4124-808c-9432654f9e2a';
  X uuid := '58454742-15d1-4b6c-9181-373153c9ab4f';
  W1 uuid := '22222222-0000-0000-0000-000000000001';
  W2 uuid := '22222222-0000-0000-0000-000000000002';
  M uuid := '33333333-0000-0000-0000-000000000008';
  t RECORD; pos RECORD; tid uuid; c uuid; r jsonb; n int;
BEGIN
  -- sevk öncesi iptal
  PERFORM pg_temp.as_user(E);
  c := (public.create_stock_transfer(W1, W2, M, 4, 'ton', CURRENT_DATE+3, 'saha', NULL, 'test', false)->>'transfer_id')::uuid;
  PERFORM pg_temp.expect_err('cancel: sebep zorunlu',
    format('SELECT public.cancel_stock_transfer(%L,NULL)', c), 'reason_required');
  PERFORM pg_temp.as_user(X);
  PERFORM pg_temp.expect_err('cancel: firma dışı kullanıcı',
    format('SELECT public.cancel_stock_transfer(%L,''x'')', c), 'cross_company_access');
  PERFORM pg_temp.as_user(E);
  PERFORM public.cancel_stock_transfer(c, 'ihtiyaç kalmadı');
  SELECT * INTO t FROM public.inventory_transfers WHERE id = c;
  PERFORM pg_temp.check('cancel: durum cancelled', t.status='cancelled' AND t.cancelled_by = E AND t.cancel_reason IS NOT NULL);
  PERFORM pg_temp.check('cancel: stok hareketi oluşmadı',
    (SELECT count(*) FROM public.stock_movements WHERE source_document = t.transfer_no) = 0);
  PERFORM pg_temp.check('cancel: olay kaydı var',
    (SELECT count(*) FROM public.inventory_transfer_events WHERE transfer_id=c AND action='cancel') = 1);
  PERFORM pg_temp.expect_err('cancel: mükerrer iptal',
    format('SELECT public.cancel_stock_transfer(%L,''tekrar'')', c), 'invalid_transfer_status');

  -- sevk sonrası: iptal yasak, kontrollü iade zorunlu
  tid := (public.create_stock_transfer(W1, W2, M, 20, 'ton', CURRENT_DATE+3, 'saha', NULL, 'test', false)->>'transfer_id')::uuid;
  PERFORM pg_temp.as_user(A);
  PERFORM public.approve_stock_transfer(tid, 'approve', NULL);
  PERFORM pg_temp.as_user(E);
  PERFORM public.dispatch_stock_transfer(tid, 20, 'ton', now(), NULL, 'SV-R', NULL);
  PERFORM pg_temp.expect_err('cancel: sevk sonrası iptal engellendi',
    format('SELECT public.cancel_stock_transfer(%L,''vazgeçildi'')', tid), 'transfer_already_dispatched');

  PERFORM pg_temp.expect_err('return: yetkisiz kullanıcı (editor)',
    format('SELECT public.return_stock_transfer(%L,5,''hasar'',''ton'')', tid), 'permission_denied');
  PERFORM pg_temp.as_user(A);
  PERFORM pg_temp.expect_err('return: sebep zorunlu',
    format('SELECT public.return_stock_transfer(%L,5,NULL,''ton'')', tid), 'reason_required');
  PERFORM pg_temp.expect_err('return: transiti aşan iade',
    format('SELECT public.return_stock_transfer(%L,50,''hasar'',''ton'')', tid), 'quantity_exceeds_transit');
  PERFORM pg_temp.expect_err('return: sıfır miktar',
    format('SELECT public.return_stock_transfer(%L,0,''hasar'',''ton'')', tid), 'invalid_quantity');

  -- kısmi iade
  r := public.return_stock_transfer(tid, 8, 'araç arızası, yükün bir kısmı geri döndü', 'ton');
  SELECT * INTO t FROM public.inventory_transfers WHERE id = tid;
  PERFORM pg_temp.check('return: transit 12 kaldı', t.in_transit_quantity = 12, t.in_transit_quantity::text);
  SELECT * INTO pos FROM public.inv_stock_position(M, W1);
  PERFORM pg_temp.check('return: kaynak depoya geri döndü', pos.on_hand = 88, pos.on_hand::text);
  PERFORM pg_temp.check('return: özgün sevk hareketi korundu',
    (SELECT count(*) FROM public.stock_movements WHERE source_document=t.transfer_no AND movement_type='transfer_out') = 1);
  PERFORM pg_temp.check('return: iade hareketi kaynak depoya yazıldı',
    (SELECT count(*) FROM public.stock_movements WHERE source_document=t.transfer_no AND movement_type='transfer_in' AND warehouse_id = W1) = 1);
  PERFORM pg_temp.check('return: olay geçmişi okunabilir',
    (SELECT count(*) FROM public.inventory_transfer_events WHERE transfer_id=tid AND action='return') = 1);

  -- kalan transitin tamamı iade → transfer kapanır
  r := public.return_stock_transfer(tid, 12, 'kalan yük de geri döndü', 'ton');
  SELECT * INTO t FROM public.inventory_transfers WHERE id = tid;
  PERFORM pg_temp.check('return: tam iade sonrası transit sıfır', t.in_transit_quantity = 0);
  PERFORM pg_temp.check('return: tam iade sonrası durum', t.status IN ('cancelled','discrepancy'), t.status);
  PERFORM pg_temp.expect_err('return: transit yokken iade',
    format('SELECT public.return_stock_transfer(%L,1,''tekrar'',''ton'')', tid), 'invalid_transfer_status');
  SELECT * INTO pos FROM public.inv_stock_position(M, W1);
  PERFORM pg_temp.check('return: firma sahipliği kaybolmadı', pos.on_hand = 100, pos.on_hand::text);
END $$;

-- ═════════════════════════ GROUP G — VERİ BÜTÜNLÜĞÜ ═════════════════════════
DO $$
DECLARE
  E uuid := 'f93a2a3f-b0e8-4124-808c-9432654f9e2a';
  A uuid := 'e36be6a2-ad88-41ba-80b4-97772a076b3b';
  W1 uuid := '22222222-0000-0000-0000-000000000001';
  W2 uuid := '22222222-0000-0000-0000-000000000002';
  M uuid := '33333333-0000-0000-0000-000000000001';
  tid uuid; mid uuid;
BEGIN
  PERFORM pg_temp.as_user(E);
  tid := (public.create_stock_transfer(W1, W2, M, 6, 'ton', CURRENT_DATE+3, 'saha', NULL, 'test', false)->>'transfer_id')::uuid;
  PERFORM pg_temp.as_user(A);
  PERFORM public.approve_stock_transfer(tid, 'approve', NULL);
  PERFORM pg_temp.as_user(E);
  PERFORM public.dispatch_stock_transfer(tid, 6, 'ton', now(), NULL, 'SV-I', NULL);
  SELECT id INTO mid FROM public.stock_movements WHERE source_document = (SELECT transfer_no FROM public.inventory_transfers WHERE id=tid) LIMIT 1;

  PERFORM pg_temp.expect_err('integrity: uygulama rolü hareketi silemez',
    format('DELETE FROM public.stock_movements WHERE id = %L', mid),
    'permission denied for table stock_movements');
  PERFORM pg_temp.expect_err('integrity: uygulama rolü hareketi değiştiremez',
    format('UPDATE public.stock_movements SET quantity = 1 WHERE id = %L', mid),
    'permission denied for table stock_movements');
  PERFORM pg_temp.check('integrity: değişmezlik tetikleyicisi kurulu',
    EXISTS (SELECT 1 FROM pg_trigger tg JOIN pg_class c ON c.oid = tg.tgrelid
             WHERE c.relname = 'stock_movements' AND NOT tg.tgisinternal
               AND tg.tgtype & 8 > 0));
  PERFORM pg_temp.check('integrity: authenticated rolünde yazma yetkisi yok',
    NOT has_table_privilege('authenticated', 'public.stock_movements', 'UPDATE')
    AND NOT has_table_privilege('authenticated', 'public.stock_movements', 'DELETE')
    AND NOT has_table_privilege('authenticated', 'public.inventory_transfers', 'UPDATE')
    AND NOT has_table_privilege('authenticated', 'public.inventory_transfers', 'DELETE')
    AND NOT has_table_privilege('authenticated', 'public.inventory_transfers', 'INSERT'));
  PERFORM pg_temp.check('integrity: kümülatif miktarlar negatif değil',
    NOT EXISTS (SELECT 1 FROM public.inventory_transfers
                 WHERE dispatched_quantity < 0 OR received_quantity < 0 OR in_transit_quantity < 0));
  PERFORM pg_temp.check('integrity: sevk talebi aşmadı',
    NOT EXISTS (SELECT 1 FROM public.inventory_transfers WHERE dispatched_quantity > requested_quantity));
  PERFORM pg_temp.check('integrity: işlenen miktar sevki aşmadı',
    NOT EXISTS (SELECT 1 FROM public.inventory_transfers
                 WHERE received_quantity + damaged_quantity + missing_quantity + rejected_quantity + in_transit_quantity
                       > dispatched_quantity + 0.0001));
  PERFORM pg_temp.check('integrity: transfer hareketleri tüketim görünümünde yok',
    (SELECT count(*) FROM public.inventory_consumption WHERE consumption_type IN ('transfer_out','transfer_in')) = 0);
END $$;

SELECT id, CASE WHEN ok THEN 'PASS' ELSE 'FAIL' END AS r, name, detail FROM tresult ORDER BY id;
SELECT count(*) FILTER (WHERE ok) AS passed, count(*) FILTER (WHERE NOT ok) AS failed FROM tresult;
ROLLBACK;
