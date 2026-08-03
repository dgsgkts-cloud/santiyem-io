-- Shared fixtures for stock-transfer backend tests.
-- Ids are fixed so tests can reference them. Everything is created inside the
-- caller's transaction, so a ROLLBACK removes all traces.

CREATE OR REPLACE FUNCTION pg_temp.as_user(u uuid) RETURNS void LANGUAGE plpgsql AS $fn$
BEGIN
  PERFORM set_config('request.jwt.claims',
    json_build_object('sub', u::text, 'role', 'authenticated')::text, true);
END $fn$;

CREATE TEMP TABLE tresult(id serial, name text, ok boolean, detail text) ON COMMIT DROP;

CREATE OR REPLACE FUNCTION pg_temp.pass(n text, d text DEFAULT NULL) RETURNS void
LANGUAGE sql AS $fn$ INSERT INTO tresult(name, ok, detail) VALUES (n, true, d) $fn$;

CREATE OR REPLACE FUNCTION pg_temp.fail(n text, d text) RETURNS void
LANGUAGE sql AS $fn$ INSERT INTO tresult(name, ok, detail) VALUES (n, false, d) $fn$;

CREATE OR REPLACE FUNCTION pg_temp.check(n text, cond boolean, d text DEFAULT NULL) RETURNS void
LANGUAGE sql AS $fn$ INSERT INTO tresult(name, ok, detail) VALUES (n, cond, d) $fn$;

-- Runs sql, expects it to raise with message = code.
CREATE OR REPLACE FUNCTION pg_temp.expect_err(n text, q text, code text) RETURNS void
LANGUAGE plpgsql AS $fn$
BEGIN
  EXECUTE q;
  PERFORM pg_temp.fail(n, 'hata beklenirken işlem başarılı oldu');
EXCEPTION WHEN OTHERS THEN
  IF SQLERRM = code THEN
    PERFORM pg_temp.pass(n, code);
  ELSE
    PERFORM pg_temp.fail(n, format('beklenen %s, gelen: %s', code, SQLERRM));
  END IF;
END $fn$;

CREATE OR REPLACE FUNCTION pg_temp.expect_ok(n text, q text) RETURNS void
LANGUAGE plpgsql AS $fn$
BEGIN
  EXECUTE q;
  PERFORM pg_temp.pass(n);
EXCEPTION WHEN OTHERS THEN
  PERFORM pg_temp.fail(n, SQLERRM);
END $fn$;

-- ── Test company fixtures ────────────────────────────────────────────────────
INSERT INTO public.office_teams (id, owner_id, name)
VALUES ('11111111-0000-0000-0000-000000000001', 'e353aaa2-c333-4700-9236-10252397869a', 'TEST Ofis');

INSERT INTO public.office_members (team_id, user_id, role) VALUES
  ('11111111-0000-0000-0000-000000000001', 'e353aaa2-c333-4700-9236-10252397869a', 'owner'),
  ('11111111-0000-0000-0000-000000000001', 'e36be6a2-ad88-41ba-80b4-97772a076b3b', 'owner'),
  ('11111111-0000-0000-0000-000000000001', 'f93a2a3f-b0e8-4124-808c-9432654f9e2a', 'editor'),
  ('11111111-0000-0000-0000-000000000001', 'e0aac4e5-eb0e-4c58-aa74-9e75a0c5f131', 'viewer');

-- Warehouses (owner = company owner)
INSERT INTO public.warehouses (id, user_id, code, name, is_active) VALUES
  ('22222222-0000-0000-0000-000000000001', 'e353aaa2-c333-4700-9236-10252397869a', 'TSRC', 'TEST Kaynak Depo', true),
  ('22222222-0000-0000-0000-000000000002', 'e353aaa2-c333-4700-9236-10252397869a', 'TDST', 'TEST Hedef Depo', true),
  ('22222222-0000-0000-0000-000000000003', 'e353aaa2-c333-4700-9236-10252397869a', 'TPAS', 'TEST Pasif Depo', false),
  ('22222222-0000-0000-0000-000000000009', '58454742-15d1-4b6c-9181-373153c9ab4f', 'TFRG', 'TEST Yabancı Depo', true);

-- Materials
INSERT INTO public.materials (id, user_id, project_id, name, unit, stock_type, is_active, safety_stock) VALUES
  ('33333333-0000-0000-0000-000000000001', 'e353aaa2-c333-4700-9236-10252397869a', 'test', 'TEST Demir', 'ton', 'stockable', true, NULL),
  ('33333333-0000-0000-0000-000000000002', 'e353aaa2-c333-4700-9236-10252397869a', 'test', 'TEST Güvenlik Stoklu', 'ton', 'stockable', true, 90),
  ('33333333-0000-0000-0000-000000000006', 'e353aaa2-c333-4700-9236-10252397869a', 'test', 'TEST Malzeme 6', 'ton', 'stockable', true, NULL),
  ('33333333-0000-0000-0000-000000000007', 'e353aaa2-c333-4700-9236-10252397869a', 'test', 'TEST Malzeme 7', 'ton', 'stockable', true, NULL),
  ('33333333-0000-0000-0000-000000000008', 'e353aaa2-c333-4700-9236-10252397869a', 'test', 'TEST Malzeme 8', 'ton', 'stockable', true, NULL),
  ('33333333-0000-0000-0000-000000000005', 'e353aaa2-c333-4700-9236-10252397869a', 'test', 'TEST Güvenlik Stoklu 2', 'ton', 'stockable', true, 90),
  ('33333333-0000-0000-0000-000000000003', 'e353aaa2-c333-4700-9236-10252397869a', 'test', 'TEST Hazır Beton', 'm³', 'non_stock', true, NULL),
  ('33333333-0000-0000-0000-000000000004', 'e353aaa2-c333-4700-9236-10252397869a', 'test', 'TEST Pasif Malzeme', 'ton', 'stockable', false, NULL),
  ('33333333-0000-0000-0000-000000000009', '58454742-15d1-4b6c-9181-373153c9ab4f', 'test', 'TEST Yabancı Malzeme', 'ton', 'stockable', true, NULL);

-- Opening stock at the source warehouse (100 ton @ 10.000 ₺ WAC)
INSERT INTO public.stock_movements
  (user_id, movement_type, reason, direction, material_id, warehouse_id, quantity, unit,
   unit_cost, total_cost, project_id, actor_id)
VALUES
  ('e353aaa2-c333-4700-9236-10252397869a', 'goods_receipt', 'test açılış', 1,
   '33333333-0000-0000-0000-000000000001', '22222222-0000-0000-0000-000000000001', 100, 'ton',
   10000, 1000000, 'test', 'e353aaa2-c333-4700-9236-10252397869a'),
  ('e353aaa2-c333-4700-9236-10252397869a', 'goods_receipt', 'test açılış', 1,
   '33333333-0000-0000-0000-000000000002', '22222222-0000-0000-0000-000000000001', 100, 'ton',
   5000, 500000, 'test', 'e353aaa2-c333-4700-9236-10252397869a'),
  ('e353aaa2-c333-4700-9236-10252397869a', 'goods_receipt', 'test açılış', 1,
   '33333333-0000-0000-0000-000000000005', '22222222-0000-0000-0000-000000000001', 100, 'ton',
   5000, 500000, 'test', 'e353aaa2-c333-4700-9236-10252397869a'),
  ('e353aaa2-c333-4700-9236-10252397869a', 'goods_receipt', 'test açılış', 1,
   '33333333-0000-0000-0000-000000000006', '22222222-0000-0000-0000-000000000001', 100, 'ton',
   10000, 1000000, 'test', 'e353aaa2-c333-4700-9236-10252397869a'),
  ('e353aaa2-c333-4700-9236-10252397869a', 'goods_receipt', 'test açılış', 1,
   '33333333-0000-0000-0000-000000000007', '22222222-0000-0000-0000-000000000001', 100, 'ton',
   10000, 1000000, 'test', 'e353aaa2-c333-4700-9236-10252397869a'),
  ('e353aaa2-c333-4700-9236-10252397869a', 'goods_receipt', 'test açılış', 1,
   '33333333-0000-0000-0000-000000000008', '22222222-0000-0000-0000-000000000001', 100, 'ton',
   10000, 1000000, 'test', 'e353aaa2-c333-4700-9236-10252397869a');
