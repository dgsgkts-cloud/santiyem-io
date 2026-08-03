\set ON_ERROR_STOP on
BEGIN;
\i /tmp/tt/fixtures.sql

-- ═════════════════════════ GROUP A — CREATE ═════════════════════════════════
DO $$
DECLARE
  O uuid := 'e353aaa2-c333-4700-9236-10252397869a';   -- company owner
  A uuid := 'e36be6a2-ad88-41ba-80b4-97772a076b3b';   -- office owner-role member (approver)
  E uuid := 'f93a2a3f-b0e8-4124-808c-9432654f9e2a';   -- editor
  V uuid := 'e0aac4e5-eb0e-4c58-aa74-9e75a0c5f131';   -- viewer
  X uuid := '58454742-15d1-4b6c-9181-373153c9ab4f';   -- outsider
  W1 uuid := '22222222-0000-0000-0000-000000000001';
  W2 uuid := '22222222-0000-0000-0000-000000000002';
  W3 uuid := '22222222-0000-0000-0000-000000000003';
  WF uuid := '22222222-0000-0000-0000-000000000009';
  M uuid := '33333333-0000-0000-0000-000000000001';
  MS uuid := '33333333-0000-0000-0000-000000000002';
  MN uuid := '33333333-0000-0000-0000-000000000003';
  MI uuid := '33333333-0000-0000-0000-000000000004';
  MF uuid := '33333333-0000-0000-0000-000000000009';
  r jsonb; t RECORD; pos RECORD; n int; tid uuid;
BEGIN
  PERFORM pg_temp.as_user(E);
  r := public.create_stock_transfer(W1, W2, M, 20, 'ton', CURRENT_DATE + 5, 'saha ihtiyacı', 'not', 'test', false);
  tid := (r->>'transfer_id')::uuid;
  SELECT * INTO t FROM public.inventory_transfers WHERE id = tid;

  PERFORM pg_temp.check('create: kayıt oluştu', t.id IS NOT NULL);
  PERFORM pg_temp.check('create: transfer_no atandı', t.transfer_no ~ '^TRF-[0-9]{6}$', t.transfer_no);
  PERFORM pg_temp.check('create: transfer_no tekil',
    (SELECT count(*) FROM public.inventory_transfers WHERE transfer_no = t.transfer_no) = 1);
  PERFORM pg_temp.check('create: company sunucuda türetildi', t.user_id = O, t.user_id::text);
  PERFORM pg_temp.check('create: requester sunucuda türetildi', t.requester_id = E);
  PERFORM pg_temp.check('create: durum pending_approval', t.status = 'pending_approval', t.status);
  PERFORM pg_temp.check('create: stok hareketi yok',
    (SELECT count(*) FROM public.stock_movements WHERE source_type='inventory_transfer') = 0);
  PERFORM pg_temp.check('create: transit değişmedi', t.in_transit_quantity = 0);
  SELECT * INTO pos FROM public.inv_stock_position(M, W1);
  PERFORM pg_temp.check('create: kaynak on-hand değişmedi', pos.on_hand = 100, pos.on_hand::text);
  PERFORM pg_temp.check('create: rezerve arttı (onay bekleyen rezerve etmez)', pos.reserved = 0, pos.reserved::text);
  SELECT * INTO pos FROM public.inv_stock_position(M, W2);
  PERFORM pg_temp.check('create: hedef on-hand değişmedi', pos.on_hand = 0);
  PERFORM pg_temp.check('create: ilk olay kaydı var',
    (SELECT count(*) FROM public.inventory_transfer_events WHERE transfer_id = tid AND action='created') = 1);
  PERFORM pg_temp.check('create: audit kaydı var',
    (SELECT count(*) FROM public.inventory_audit_log WHERE entity_id = tid AND action='create') = 1);
  PERFORM pg_temp.check('create: onay bildirimi oluştu',
    (SELECT count(*) FROM public.notification_history WHERE metadata->>'transfer_id' = tid::text) >= 1);
  -- dedupe: aynı olay iki kez tetiklenirse tek bildirim kalır
  PERFORM public.inv_transfer_notify(tid, 'approval_requested', 'x', 'y');
  SELECT count(*) INTO n FROM public.notification_history
   WHERE metadata->>'dedupe_key' = tid::text || ':approval_requested';
  PERFORM pg_temp.check('create: bildirim mükerrer değil', n = 1, n::text);

  -- owner otomatik onay
  PERFORM pg_temp.as_user(O);
  r := public.create_stock_transfer(W1, W2, M, 5, 'ton', CURRENT_DATE + 5, 'sahibi', NULL, 'test', false);
  PERFORM pg_temp.check('create: firma sahibi otomatik onay', r->>'status' = 'approved', r->>'status');
  SELECT * INTO pos FROM public.inv_stock_position(M, W1);
  PERFORM pg_temp.check('create: onaylı transfer rezerve etti', pos.reserved = 5, pos.reserved::text);
  PERFORM pg_temp.check('create: available rezerve düşülmüş', pos.available = 95, pos.available::text);

  -- ── failure cases ─────────────────────────────────────────────────────────
  PERFORM pg_temp.as_user(E);
  PERFORM pg_temp.expect_err('create: aynı depo',
    format('SELECT public.create_stock_transfer(%L,%L,%L,1,''ton'',CURRENT_DATE,''r'',NULL,''test'',false)', W1, W1, M), 'same_warehouse');
  PERFORM pg_temp.expect_err('create: sıfır miktar',
    format('SELECT public.create_stock_transfer(%L,%L,%L,0,''ton'',CURRENT_DATE,''r'',NULL,''test'',false)', W1, W2, M), 'invalid_quantity');
  PERFORM pg_temp.expect_err('create: negatif miktar',
    format('SELECT public.create_stock_transfer(%L,%L,%L,-5,''ton'',CURRENT_DATE,''r'',NULL,''test'',false)', W1, W2, M), 'invalid_quantity');
  PERFORM pg_temp.expect_err('create: pasif malzeme',
    format('SELECT public.create_stock_transfer(%L,%L,%L,1,''ton'',CURRENT_DATE,''r'',NULL,''test'',false)', W1, W2, MI), 'material_inactive');
  PERFORM pg_temp.expect_err('create: stoklanamaz malzeme (hazır beton)',
    format('SELECT public.create_stock_transfer(%L,%L,%L,1,''m³'',CURRENT_DATE,''r'',NULL,''test'',false)', W1, W2, MN), 'material_not_stockable');
  PERFORM pg_temp.expect_err('create: pasif depo',
    format('SELECT public.create_stock_transfer(%L,%L,%L,1,''ton'',CURRENT_DATE,''r'',NULL,''test'',false)', W1, W3, M), 'warehouse_inactive');
  PERFORM pg_temp.expect_err('create: geçersiz birim',
    format('SELECT public.create_stock_transfer(%L,%L,%L,1,''zzz'',CURRENT_DATE,''r'',NULL,''test'',false)', W1, W2, M), 'invalid_unit');
  PERFORM pg_temp.expect_err('create: uyumsuz birim boyutu (m² ↔ ton)',
    format('SELECT public.create_stock_transfer(%L,%L,%L,1,''m²'',CURRENT_DATE,''r'',NULL,''test'',false)', W1, W2, M), 'invalid_unit');
  PERFORM pg_temp.expect_err('create: yetersiz kullanılabilir stok',
    format('SELECT public.create_stock_transfer(%L,%L,%L,500,''ton'',CURRENT_DATE,''r'',NULL,''test'',false)', W1, W2, M), 'insufficient_available_stock');
  PERFORM pg_temp.expect_err('create: yabancı firma deposu',
    format('SELECT public.create_stock_transfer(%L,%L,%L,1,''ton'',CURRENT_DATE,''r'',NULL,''test'',false)', W1, WF, M), 'cross_company_access');
  PERFORM pg_temp.expect_err('create: yabancı firma malzemesi',
    format('SELECT public.create_stock_transfer(%L,%L,%L,1,''ton'',CURRENT_DATE,''r'',NULL,''test'',false)', W1, W2, MF), 'cross_company_access');
  PERFORM pg_temp.expect_err('create: güvenlik stoğu ihlali',
    format('SELECT public.create_stock_transfer(%L,%L,%L,20,''ton'',CURRENT_DATE,''r'',NULL,''test'',false)', W1, W2, MS), 'safety_stock_violation');
  PERFORM pg_temp.expect_err('create: güvenlik ihlali override yetkisiz kullanıcıda reddedilir',
    format('SELECT public.create_stock_transfer(%L,%L,%L,20,''ton'',CURRENT_DATE,''r'',NULL,''test'',true)', W1, W2, MS), 'permission_denied');
  PERFORM pg_temp.as_user(V);
  PERFORM pg_temp.expect_err('create: viewer yetkisiz',
    format('SELECT public.create_stock_transfer(%L,%L,%L,1,''ton'',CURRENT_DATE,''r'',NULL,''test'',false)', W1, W2, M), 'permission_denied');
  PERFORM pg_temp.as_user(X);
  PERFORM pg_temp.expect_err('create: firma dışı kullanıcı',
    format('SELECT public.create_stock_transfer(%L,%L,%L,1,''ton'',CURRENT_DATE,''r'',NULL,''test'',false)', W1, W2, M), 'cross_company_access');

  -- güvenlik override yetkili kullanıcıda çalışır
  PERFORM pg_temp.as_user(O);
  PERFORM pg_temp.expect_ok('create: güvenlik override yetkili kullanıcıda çalışır',
    format('SELECT public.create_stock_transfer(%L,%L,%L,20,''ton'',CURRENT_DATE,''r'',NULL,''test'',true)', W1, W2, MS));
END $$;

-- ═════════════════════════ GROUP B — APPROVAL ═══════════════════════════════
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
  t1 uuid; t2 uuid; t3 uuid; t4 uuid; t5 uuid; r jsonb; t RECORD; mv int;
BEGIN
  PERFORM pg_temp.as_user(E);
  t1 := (public.create_stock_transfer(W1, W2, M, 2, 'ton', CURRENT_DATE+3, 'r', NULL, 'test', false)->>'transfer_id')::uuid;
  t2 := (public.create_stock_transfer(W1, W2, M, 2, 'ton', CURRENT_DATE+3, 'r', NULL, 'test', false)->>'transfer_id')::uuid;
  t3 := (public.create_stock_transfer(W1, W2, M, 2, 'ton', CURRENT_DATE+3, 'r', NULL, 'test', false)->>'transfer_id')::uuid;
  t4 := (public.create_stock_transfer(W1, W2, M, 2, 'ton', CURRENT_DATE+3, 'r', NULL, 'test', false)->>'transfer_id')::uuid;

  SELECT count(*) INTO mv FROM public.stock_movements WHERE source_type='inventory_transfer';
  PERFORM pg_temp.as_user(A);
  r := public.approve_stock_transfer(t1, 'approve', NULL);
  SELECT * INTO t FROM public.inventory_transfers WHERE id = t1;
  PERFORM pg_temp.check('approve: durum approved', t.status = 'approved', t.status);
  PERFORM pg_temp.check('approve: approver kaydedildi', t.approver_id = A AND t.approved_at IS NOT NULL);
  PERFORM pg_temp.check('approve: stok hareketi yaratılmadı',
    (SELECT count(*) FROM public.stock_movements WHERE source_type='inventory_transfer') = mv);
  PERFORM pg_temp.check('approve: olay kaydı okunabilir',
    (SELECT count(*) FROM public.inventory_transfer_events WHERE transfer_id=t1 AND action='approve') = 1);

  r := public.approve_stock_transfer(t2, 'reject', 'ihtiyaç kalmadı');
  SELECT * INTO t FROM public.inventory_transfers WHERE id = t2;
  PERFORM pg_temp.check('approve: red durumu', t.status = 'rejected' AND t.rejection_reason = 'ihtiyaç kalmadı');

  r := public.approve_stock_transfer(t3, 'request_revision', 'miktarı düşür');
  SELECT * INTO t FROM public.inventory_transfers WHERE id = t3;
  PERFORM pg_temp.check('approve: revizyon durumu', t.status = 'requested' AND t.revision_note = 'miktarı düşür', t.status);
  PERFORM pg_temp.check('approve: revizyonda önceki değerler korunuyor', t.requested_quantity = 2);

  PERFORM pg_temp.expect_err('approve: red sebebi zorunlu',
    format('SELECT public.approve_stock_transfer(%L,''reject'',NULL)', t4), 'reason_required');
  PERFORM pg_temp.expect_err('approve: revizyon sebebi zorunlu',
    format('SELECT public.approve_stock_transfer(%L,''request_revision'','' '')', t4), 'reason_required');
  PERFORM pg_temp.expect_err('approve: mükerrer onay',
    format('SELECT public.approve_stock_transfer(%L,''approve'',NULL)', t1), 'invalid_transfer_status');
  PERFORM pg_temp.expect_err('approve: reddedilmiş transfer onaylanamaz',
    format('SELECT public.approve_stock_transfer(%L,''approve'',NULL)', t2), 'invalid_transfer_status');
  PERFORM pg_temp.expect_err('approve: geçersiz karar',
    format('SELECT public.approve_stock_transfer(%L,''maybe'',NULL)', t4), 'invalid_decision');

  -- self approval
  PERFORM pg_temp.as_user(A);
  t5 := (public.create_stock_transfer(W1, W2, M, 2, 'ton', CURRENT_DATE+3, 'r', NULL, 'test', false)->>'transfer_id')::uuid;
  PERFORM pg_temp.expect_err('approve: kendi talebini onaylayamaz',
    format('SELECT public.approve_stock_transfer(%L,''approve'',NULL)', t5), 'self_approval_not_allowed');
  PERFORM pg_temp.as_user(O);
  PERFORM pg_temp.expect_ok('approve: firma sahibi istisnası', format('SELECT public.approve_stock_transfer(%L,''approve'',NULL)', t5));

  PERFORM pg_temp.as_user(E);
  PERFORM pg_temp.expect_err('approve: yetkisiz onaylayıcı (editor)',
    format('SELECT public.approve_stock_transfer(%L,''approve'',NULL)', t4), 'permission_denied');
  PERFORM pg_temp.as_user(V);
  PERFORM pg_temp.expect_err('approve: yetkisiz onaylayıcı (viewer)',
    format('SELECT public.approve_stock_transfer(%L,''approve'',NULL)', t4), 'permission_denied');
  PERFORM pg_temp.as_user(X);
  PERFORM pg_temp.expect_err('approve: firma dışı onaylayıcı',
    format('SELECT public.approve_stock_transfer(%L,''approve'',NULL)', t4), 'cross_company_access');

  -- iptal edilmiş transfer onaylanamaz
  PERFORM pg_temp.as_user(O);
  PERFORM public.cancel_stock_transfer(t4, 'test iptal');
  PERFORM pg_temp.expect_err('approve: iptal sonrası onay',
    format('SELECT public.approve_stock_transfer(%L,''approve'',NULL)', t4), 'invalid_transfer_status');
END $$;

-- ═════════════════════════ GROUP C — STOK DEĞİŞİMİ ARASINDA ONAY ════════════
DO $$
DECLARE
  O uuid := 'e353aaa2-c333-4700-9236-10252397869a';
  A uuid := 'e36be6a2-ad88-41ba-80b4-97772a076b3b';
  E uuid := 'f93a2a3f-b0e8-4124-808c-9432654f9e2a';
  W1 uuid := '22222222-0000-0000-0000-000000000001';
  W2 uuid := '22222222-0000-0000-0000-000000000002';
  M uuid := '33333333-0000-0000-0000-000000000001';
  MS uuid := '33333333-0000-0000-0000-000000000002';
  MS2 uuid := '33333333-0000-0000-0000-000000000005';
  tid uuid; sid uuid;
BEGIN
  PERFORM pg_temp.as_user(E);
  tid := (public.create_stock_transfer(W1, W2, M, 30, 'ton', CURRENT_DATE+3, 'r', NULL, 'test', false)->>'transfer_id')::uuid;
  -- talep ile onay arasında stok tükeniyor
  INSERT INTO public.stock_movements
    (user_id, movement_type, reason, direction, material_id, warehouse_id, quantity, unit, project_id, actor_id)
  VALUES (O, 'project_issue', 'test tüketim', -1, M, W1, 80, 'ton', 'test', O);
  PERFORM pg_temp.as_user(A);
  PERFORM pg_temp.expect_err('approve: onay anında stok yetersizleşti',
    format('SELECT public.approve_stock_transfer(%L,''approve'',NULL)', tid), 'insufficient_available_stock');

  PERFORM pg_temp.as_user(E);
  sid := (public.create_stock_transfer(W1, W2, MS2, 5, 'ton', CURRENT_DATE+3, 'r', NULL, 'test', false)->>'transfer_id')::uuid;
  -- güvenlik stoğu sınırı, araya giren tüketim yüzünden onay anında ihlal ediliyor
  INSERT INTO public.stock_movements
    (user_id, movement_type, reason, direction, material_id, warehouse_id, quantity, unit, project_id, actor_id)
  VALUES (O, 'project_issue', 'test tüketim', -1, MS2, W1, 12, 'ton', 'test', O);
  PERFORM pg_temp.as_user(A);
  PERFORM pg_temp.expect_err('approve: onay anında güvenlik stoğu ihlal oldu',
    format('SELECT public.approve_stock_transfer(%L,''approve'',NULL)', sid), 'safety_stock_violation');
END $$;

SELECT id, CASE WHEN ok THEN 'PASS' ELSE 'FAIL' END AS r, name, detail FROM tresult ORDER BY id;
SELECT count(*) FILTER (WHERE ok) AS passed, count(*) FILTER (WHERE NOT ok) AS failed FROM tresult;
ROLLBACK;
