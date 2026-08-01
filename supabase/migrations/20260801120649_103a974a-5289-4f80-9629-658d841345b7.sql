-- ============ 1. WAREHOUSE MASTER ============
CREATE TABLE public.warehouses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  code text NOT NULL,
  name text NOT NULL,
  warehouse_type text NOT NULL DEFAULT 'site',
  manager_name text,
  location text,
  project_id text,
  capacity_type text,
  capacity_value numeric,
  capacity_unit text,
  is_active boolean NOT NULL DEFAULT true,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX warehouses_user_code_key ON public.warehouses(user_id, lower(code));
CREATE INDEX idx_warehouses_user ON public.warehouses(user_id) WHERE is_active;
CREATE INDEX idx_warehouses_project ON public.warehouses(project_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.warehouses TO authenticated;
GRANT ALL ON public.warehouses TO service_role;
ALTER TABLE public.warehouses ENABLE ROW LEVEL SECURITY;

CREATE POLICY "View own or team warehouses" ON public.warehouses FOR SELECT TO authenticated
  USING (public.can_access_team_resource(auth.uid(), user_id));
CREATE POLICY "Insert own warehouses" ON public.warehouses FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Update own or team warehouses" ON public.warehouses FOR UPDATE TO authenticated
  USING (public.can_access_team_resource(auth.uid(), user_id))
  WITH CHECK (public.can_access_team_resource(auth.uid(), user_id));
CREATE POLICY "Delete own warehouses" ON public.warehouses FOR DELETE TO authenticated
  USING (user_id = auth.uid());

CREATE TRIGGER update_warehouses_updated_at BEFORE UPDATE ON public.warehouses
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ============ 2. MATERIAL MASTER EXTENSION ============
ALTER TABLE public.materials
  ADD COLUMN IF NOT EXISTS code text,
  ADD COLUMN IF NOT EXISTS category text,
  ADD COLUMN IF NOT EXISTS stock_type text NOT NULL DEFAULT 'stockable',
  ADD COLUMN IF NOT EXISTS allowed_units text[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS reorder_point numeric,
  ADD COLUMN IF NOT EXISTS safety_stock numeric,
  ADD COLUMN IF NOT EXISTS default_supplier text,
  ADD COLUMN IF NOT EXISTS is_active boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS default_warehouse_id uuid REFERENCES public.warehouses(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS data_review_required boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS data_review_reason text;

CREATE INDEX IF NOT EXISTS idx_materials_user ON public.materials(user_id);
CREATE INDEX IF NOT EXISTS idx_materials_warehouse ON public.materials(default_warehouse_id);

-- unit dimension reference (authoritative unit integrity source)
CREATE TABLE public.unit_dimensions (
  unit text PRIMARY KEY,
  dimension text NOT NULL,
  to_base numeric NOT NULL DEFAULT 1,
  base_unit text NOT NULL
);
GRANT SELECT ON public.unit_dimensions TO authenticated, anon;
GRANT ALL ON public.unit_dimensions TO service_role;
ALTER TABLE public.unit_dimensions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Unit dimensions are readable" ON public.unit_dimensions FOR SELECT USING (true);

INSERT INTO public.unit_dimensions(unit, dimension, to_base, base_unit) VALUES
  ('kg','mass',1,'kg'), ('ton','mass',1000,'kg'), ('gr','mass',0.001,'kg'),
  ('m3','volume',1,'m3'), ('m³','volume',1,'m3'), ('lt','volume',0.001,'m3'), ('litre','volume',0.001,'m3'),
  ('m','length',1,'m'), ('metre','length',1,'m'), ('cm','length',0.01,'m'), ('mtül','length',1,'m'),
  ('m2','area',1,'m2'), ('m²','area',1,'m2'),
  ('adet','count',1,'adet'), ('paket','count',1,'paket'), ('rulo','count',1,'rulo'),
  ('torba','count',1,'torba'), ('çuval','count',1,'çuval'), ('takım','count',1,'takım'),
  ('saat','time',1,'saat'), ('gün','time',1,'gün');

-- ============ 3. IMMUTABLE STOCK MOVEMENT LEDGER ============
CREATE SEQUENCE public.stock_movement_no_seq;

CREATE TABLE public.stock_movements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  movement_no text NOT NULL DEFAULT ('SH-' || lpad(nextval('public.stock_movement_no_seq')::text, 7, '0')),
  movement_type text NOT NULL,
  reason text,
  direction smallint NOT NULL,
  material_id uuid NOT NULL REFERENCES public.materials(id) ON DELETE RESTRICT,
  warehouse_id uuid NOT NULL REFERENCES public.warehouses(id) ON DELETE RESTRICT,
  counter_warehouse_id uuid REFERENCES public.warehouses(id) ON DELETE SET NULL,
  quantity numeric NOT NULL,
  unit text NOT NULL,
  unit_cost numeric,
  total_cost numeric,
  project_id text,
  supplier text,
  person text,
  cost_code text,
  source_type text,
  source_id uuid,
  source_document text,
  notes text,
  reversal_of uuid REFERENCES public.stock_movements(id) ON DELETE RESTRICT,
  reversed_by uuid,
  actor_id uuid NOT NULL,
  posted_at timestamptz NOT NULL DEFAULT now(),
  transaction_date date NOT NULL DEFAULT CURRENT_DATE,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT stock_movements_qty_positive CHECK (quantity > 0),
  CONSTRAINT stock_movements_direction CHECK (direction IN (-1, 1)),
  CONSTRAINT stock_movements_type CHECK (movement_type IN (
    'goods_receipt','manual_entry','project_issue','consumption',
    'transfer_out','transfer_in','return_in','supplier_return',
    'count_increase','count_decrease','scrap','assignment_out','assignment_return','reversal'))
);

CREATE UNIQUE INDEX stock_movements_no_key ON public.stock_movements(movement_no);
CREATE INDEX idx_stock_movements_user ON public.stock_movements(user_id);
CREATE INDEX idx_stock_movements_material ON public.stock_movements(material_id, warehouse_id);
CREATE INDEX idx_stock_movements_warehouse ON public.stock_movements(warehouse_id);
CREATE INDEX idx_stock_movements_project ON public.stock_movements(project_id);
CREATE INDEX idx_stock_movements_type_date ON public.stock_movements(movement_type, transaction_date DESC);
CREATE UNIQUE INDEX stock_movements_source_unique
  ON public.stock_movements(source_type, source_id, material_id, warehouse_id, movement_type)
  WHERE source_id IS NOT NULL;

GRANT SELECT ON public.stock_movements TO authenticated;
GRANT ALL ON public.stock_movements TO service_role;
ALTER TABLE public.stock_movements ENABLE ROW LEVEL SECURITY;

CREATE POLICY "View own or team stock movements" ON public.stock_movements FOR SELECT TO authenticated
  USING (public.can_access_team_resource(auth.uid(), user_id));

-- immutability: posted movements cannot be edited or deleted (reversal only)
CREATE OR REPLACE FUNCTION public.stock_movements_immutable()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    RAISE EXCEPTION 'Kaydedilmiş stok hareketi silinemez. Hareketi tersleyin.';
  END IF;
  IF NEW.reversed_by IS DISTINCT FROM OLD.reversed_by
     AND NEW.id = OLD.id AND NEW.quantity = OLD.quantity
     AND NEW.direction = OLD.direction AND NEW.material_id = OLD.material_id
     AND NEW.warehouse_id = OLD.warehouse_id AND NEW.movement_type = OLD.movement_type THEN
    RETURN NEW;
  END IF;
  RAISE EXCEPTION 'Kaydedilmiş stok hareketi değiştirilemez. Hareketi tersleyin.';
END;
$$;
CREATE TRIGGER stock_movements_no_update BEFORE UPDATE OR DELETE ON public.stock_movements
  FOR EACH ROW EXECUTE FUNCTION public.stock_movements_immutable();

-- unit + stock-type integrity at the database boundary
CREATE OR REPLACE FUNCTION public.stock_movements_validate()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
DECLARE m RECORD; d_mov text; d_mat text;
BEGIN
  SELECT * INTO m FROM public.materials WHERE id = NEW.material_id;
  IF m.id IS NULL THEN RAISE EXCEPTION 'Malzeme bulunamadı.'; END IF;
  IF m.stock_type <> 'stockable' THEN
    RAISE EXCEPTION 'Bu malzeme stoklanabilir değil (%). Depo stoğu oluşturulamaz.', m.stock_type;
  END IF;
  IF m.is_active = false THEN RAISE EXCEPTION 'Kullanım dışı malzeme için hareket oluşturulamaz.'; END IF;
  SELECT dimension INTO d_mov FROM public.unit_dimensions WHERE unit = lower(NEW.unit);
  SELECT dimension INTO d_mat FROM public.unit_dimensions WHERE unit = lower(m.unit);
  IF d_mov IS NOT NULL AND d_mat IS NOT NULL AND d_mov <> d_mat THEN
    RAISE EXCEPTION 'Birim uyumsuz: hareket birimi % ile malzeme birimi % aynı ölçü türünde değil.', NEW.unit, m.unit;
  END IF;
  IF NEW.counter_warehouse_id IS NOT NULL AND NEW.counter_warehouse_id = NEW.warehouse_id THEN
    RAISE EXCEPTION 'Kaynak ve hedef depo aynı olamaz.';
  END IF;
  RETURN NEW;
END;
$$;
CREATE TRIGGER stock_movements_validate_ins BEFORE INSERT ON public.stock_movements
  FOR EACH ROW EXECUTE FUNCTION public.stock_movements_validate();

-- ============ 4. INVENTORY AUDIT LOG ============
CREATE TABLE public.inventory_audit_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  actor_id uuid NOT NULL,
  entity_type text NOT NULL,
  entity_id uuid,
  action text NOT NULL,
  previous_value jsonb,
  new_value jsonb,
  reason text,
  source_type text,
  source_id uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_inventory_audit_entity ON public.inventory_audit_log(entity_type, entity_id, created_at DESC);
CREATE INDEX idx_inventory_audit_user ON public.inventory_audit_log(user_id, created_at DESC);

GRANT SELECT ON public.inventory_audit_log TO authenticated;
GRANT ALL ON public.inventory_audit_log TO service_role;
ALTER TABLE public.inventory_audit_log ENABLE ROW LEVEL SECURITY;
CREATE POLICY "View own or team inventory audit" ON public.inventory_audit_log FOR SELECT TO authenticated
  USING (public.can_access_team_resource(auth.uid(), user_id));

-- ============ 5. DATA CLEANUP / CLASSIFICATION ============
-- Ready-mix concrete must not be ordinary warehouse stock.
UPDATE public.materials
   SET stock_type = 'non_stock',
       unit = 'm3',
       category = COALESCE(category, 'Hazır Beton'),
       data_review_reason = CASE WHEN lower(unit) NOT IN ('m3','m³')
         THEN 'Hazır beton stoksuz malzemeye taşındı, birim m³ olarak düzeltildi.'
         ELSE 'Hazır beton stoksuz (doğrudan teslim) malzeme olarak sınıflandırıldı.' END
 WHERE (lower(name) LIKE '%hazır beton%' OR lower(name) LIKE '%hazir beton%'
        OR lower(name) LIKE '%transmikser%' OR lower(name) ~ '(^|[^a-z])c[0-9]{2}([^0-9]|$)')
   AND stock_type = 'stockable';

-- Flag physically impossible unit assignments for admin review (no silent conversion).
UPDATE public.materials
   SET data_review_required = true,
       data_review_reason = COALESCE(data_review_reason, 'Birim malzeme türüyle uyumsuz görünüyor. Veri doğrulaması gerekli.')
 WHERE stock_type = 'stockable'
   AND (
     (lower(name) ~ '(demir|çelik|celik|hasır|hasir|profil)' AND lower(unit) IN ('m3','m³','m2','m²','lt','litre'))
     OR (lower(name) ~ '(boru|kablo|kanal)' AND lower(unit) IN ('ton','m3','m³'))
     OR lower(unit) NOT IN (SELECT unit FROM public.unit_dimensions)
   );

-- Missing material master fields flagged rather than invented.
UPDATE public.materials SET data_review_required = true,
       data_review_reason = COALESCE(data_review_reason, 'Malzeme kodu tanımlanmadı. Veri doğrulaması gerekli.')
 WHERE code IS NULL OR btrim(code) = '';

-- ============ 6. DEFAULT WAREHOUSE + LEDGER BACKFILL ============
INSERT INTO public.warehouses (user_id, code, name, warehouse_type, notes)
SELECT DISTINCT m.user_id, 'MERKEZ', 'Merkez Depo', 'central',
       'Mevcut malzeme kayıtları için otomatik oluşturuldu.'
  FROM public.materials m
 WHERE NOT EXISTS (SELECT 1 FROM public.warehouses w WHERE w.user_id = m.user_id);

UPDATE public.materials m
   SET default_warehouse_id = w.id
  FROM public.warehouses w
 WHERE w.user_id = m.user_id AND m.default_warehouse_id IS NULL
   AND w.code = 'MERKEZ';

INSERT INTO public.stock_movements (
  user_id, movement_type, reason, direction, material_id, warehouse_id,
  quantity, unit, unit_cost, total_cost, project_id, supplier,
  source_type, source_id, source_document, notes, actor_id, posted_at, transaction_date)
SELECT e.user_id,
       CASE WHEN e.source_type = 'purchase_order' THEN 'goods_receipt' ELSE 'manual_entry' END,
       CASE WHEN e.source_type = 'purchase_order' THEN 'satın alma teslimi' ELSE 'opening balance' END,
       1, e.material_id, m.default_warehouse_id,
       e.quantity, m.unit, NULLIF(e.unit_price, 0), NULLIF(e.total_amount, 0),
       m.project_id, NULLIF(e.supplier, ''),
       COALESCE(e.source_type, 'material_entry'), COALESCE(e.source_id, e.id),
       e.waybill_no, e.note, e.user_id, e.created_at, e.entry_date
  FROM public.material_entries e
  JOIN public.materials m ON m.id = e.material_id
 WHERE m.default_warehouse_id IS NOT NULL
   AND m.stock_type = 'stockable' AND e.quantity > 0
ON CONFLICT DO NOTHING;

INSERT INTO public.stock_movements (
  user_id, movement_type, reason, direction, material_id, warehouse_id,
  quantity, unit, project_id, source_type, source_id, notes, actor_id, posted_at, transaction_date)
SELECT x.user_id, 'project_issue', COALESCE(NULLIF(x.location, ''), 'şantiye kullanımı'),
       -1, x.material_id, m.default_warehouse_id,
       x.quantity, m.unit, m.project_id,
       COALESCE(x.source_type, 'material_exit'), COALESCE(x.source_id, x.id),
       x.note, x.user_id, x.created_at, x.exit_date
  FROM public.material_exits x
  JOIN public.materials m ON m.id = x.material_id
 WHERE m.default_warehouse_id IS NOT NULL
   AND m.stock_type = 'stockable' AND x.quantity > 0
ON CONFLICT DO NOTHING;

-- ============ 7. CANONICAL BALANCE VIEW ============
CREATE OR REPLACE VIEW public.inventory_balances
WITH (security_invoker = true) AS
SELECT s.user_id, s.material_id, s.warehouse_id,
       SUM(s.direction * s.quantity) AS on_hand,
       SUM(CASE WHEN s.direction = 1 THEN s.quantity ELSE 0 END) AS total_in,
       SUM(CASE WHEN s.direction = -1 THEN s.quantity ELSE 0 END) AS total_out,
       CASE WHEN SUM(CASE WHEN s.direction = 1 AND s.unit_cost IS NOT NULL THEN s.quantity ELSE 0 END) > 0
            THEN SUM(CASE WHEN s.direction = 1 AND s.unit_cost IS NOT NULL THEN s.quantity * s.unit_cost ELSE 0 END)
               / SUM(CASE WHEN s.direction = 1 AND s.unit_cost IS NOT NULL THEN s.quantity ELSE 0 END)
            END AS avg_cost,
       MAX(s.transaction_date) AS last_movement_date,
       COUNT(*) AS movement_count
  FROM public.stock_movements s
 WHERE s.reversed_by IS NULL AND s.movement_type <> 'reversal'
 GROUP BY s.user_id, s.material_id, s.warehouse_id;

GRANT SELECT ON public.inventory_balances TO authenticated;
GRANT ALL ON public.inventory_balances TO service_role;

-- ============ 8. SERVER-SIDE MUTATIONS ============
CREATE OR REPLACE FUNCTION public.post_goods_receipt(
  _material_id uuid, _warehouse_id uuid, _quantity numeric, _unit text,
  _unit_cost numeric DEFAULT NULL, _supplier text DEFAULT NULL,
  _project_id text DEFAULT NULL, _source_type text DEFAULT 'goods_receipt',
  _source_id uuid DEFAULT NULL, _source_document text DEFAULT NULL,
  _notes text DEFAULT NULL, _transaction_date date DEFAULT CURRENT_DATE,
  _manual boolean DEFAULT false, _reason text DEFAULT NULL)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE uid uuid := auth.uid(); owner uuid; mid uuid;
BEGIN
  IF uid IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;
  IF _quantity IS NULL OR _quantity <= 0 THEN RAISE EXCEPTION 'Miktar sıfırdan büyük olmalı.'; END IF;

  SELECT user_id INTO owner FROM public.materials WHERE id = _material_id;
  IF owner IS NULL OR NOT public.can_access_team_resource(uid, owner) THEN
    RAISE EXCEPTION 'Malzeme bulunamadı veya erişim yok.';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM public.warehouses w
                  WHERE w.id = _warehouse_id AND w.is_active
                    AND public.can_access_team_resource(uid, w.user_id)) THEN
    RAISE EXCEPTION 'Depo bulunamadı veya erişim yok.';
  END IF;

  INSERT INTO public.stock_movements (
    user_id, movement_type, reason, direction, material_id, warehouse_id,
    quantity, unit, unit_cost, total_cost, project_id, supplier,
    source_type, source_id, source_document, notes, actor_id, transaction_date)
  VALUES (owner,
    CASE WHEN _manual THEN 'manual_entry' ELSE 'goods_receipt' END,
    COALESCE(_reason, CASE WHEN _manual THEN 'yetkili manuel giriş' ELSE 'satın alma teslimi' END),
    1, _material_id, _warehouse_id, _quantity,
    COALESCE(NULLIF(_unit, ''), (SELECT unit FROM public.materials WHERE id = _material_id)),
    _unit_cost, CASE WHEN _unit_cost IS NULL THEN NULL ELSE _unit_cost * _quantity END,
    _project_id, _supplier, _source_type, _source_id, _source_document, _notes, uid,
    COALESCE(_transaction_date, CURRENT_DATE))
  RETURNING id INTO mid;

  INSERT INTO public.inventory_audit_log (user_id, actor_id, entity_type, entity_id, action, new_value, reason, source_type, source_id)
  VALUES (owner, uid, 'stock_movement', mid,
          CASE WHEN _manual THEN 'manual_entry' ELSE 'goods_receipt' END,
          jsonb_build_object('quantity', _quantity, 'unit', _unit, 'warehouse_id', _warehouse_id, 'unit_cost', _unit_cost),
          _reason, _source_type, _source_id);
  RETURN mid;
EXCEPTION WHEN unique_violation THEN
  RAISE EXCEPTION 'Bu belge için mal kabulü zaten kaydedilmiş.';
END;
$$;

CREATE OR REPLACE FUNCTION public.post_stock_issue(
  _material_id uuid, _warehouse_id uuid, _quantity numeric, _unit text,
  _movement_type text DEFAULT 'project_issue', _reason text DEFAULT NULL,
  _project_id text DEFAULT NULL, _cost_code text DEFAULT NULL,
  _person text DEFAULT NULL, _source_type text DEFAULT NULL, _source_id uuid DEFAULT NULL,
  _source_document text DEFAULT NULL, _notes text DEFAULT NULL,
  _transaction_date date DEFAULT CURRENT_DATE)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE uid uuid := auth.uid(); owner uuid; mid uuid; avail numeric; cost numeric;
BEGIN
  IF uid IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;
  IF _quantity IS NULL OR _quantity <= 0 THEN RAISE EXCEPTION 'Miktar sıfırdan büyük olmalı.'; END IF;
  IF _movement_type NOT IN ('project_issue','consumption','supplier_return','scrap','assignment_out') THEN
    RAISE EXCEPTION 'Geçersiz çıkış hareket tipi: %', _movement_type;
  END IF;

  SELECT user_id INTO owner FROM public.materials WHERE id = _material_id;
  IF owner IS NULL OR NOT public.can_access_team_resource(uid, owner) THEN
    RAISE EXCEPTION 'Malzeme bulunamadı veya erişim yok.';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM public.warehouses w
                  WHERE w.id = _warehouse_id AND w.is_active
                    AND public.can_access_team_resource(uid, w.user_id)) THEN
    RAISE EXCEPTION 'Depo bulunamadı veya erişim yok.';
  END IF;

  SELECT COALESCE(SUM(direction * quantity), 0), MAX(b.avg_cost)
    INTO avail, cost
    FROM public.stock_movements s
    LEFT JOIN public.inventory_balances b
      ON b.material_id = s.material_id AND b.warehouse_id = s.warehouse_id
   WHERE s.material_id = _material_id AND s.warehouse_id = _warehouse_id
     AND s.reversed_by IS NULL AND s.movement_type <> 'reversal';

  IF _quantity > avail THEN
    RAISE EXCEPTION 'Kullanılabilir stok yetersiz. Mevcut: %, talep: %', avail, _quantity;
  END IF;

  INSERT INTO public.stock_movements (
    user_id, movement_type, reason, direction, material_id, warehouse_id,
    quantity, unit, unit_cost, total_cost, project_id, cost_code, person,
    source_type, source_id, source_document, notes, actor_id, transaction_date)
  VALUES (owner, _movement_type, COALESCE(_reason, 'şantiye kullanımı'), -1,
    _material_id, _warehouse_id, _quantity,
    COALESCE(NULLIF(_unit, ''), (SELECT unit FROM public.materials WHERE id = _material_id)),
    cost, CASE WHEN cost IS NULL THEN NULL ELSE cost * _quantity END,
    _project_id, _cost_code, _person, _source_type, _source_id, _source_document, _notes, uid,
    COALESCE(_transaction_date, CURRENT_DATE))
  RETURNING id INTO mid;

  INSERT INTO public.inventory_audit_log (user_id, actor_id, entity_type, entity_id, action, previous_value, new_value, reason, source_type, source_id)
  VALUES (owner, uid, 'stock_movement', mid, _movement_type,
          jsonb_build_object('on_hand_before', avail),
          jsonb_build_object('quantity', _quantity, 'unit', _unit, 'warehouse_id', _warehouse_id,
                             'project_id', _project_id, 'on_hand_after', avail - _quantity),
          _reason, _source_type, _source_id);
  RETURN mid;
END;
$$;

CREATE OR REPLACE FUNCTION public.reverse_stock_movement(_movement_id uuid, _reason text)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE uid uuid := auth.uid(); orig RECORD; mid uuid;
BEGIN
  IF uid IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;
  IF _reason IS NULL OR btrim(_reason) = '' THEN RAISE EXCEPTION 'Tersleme için sebep zorunludur.'; END IF;

  SELECT * INTO orig FROM public.stock_movements WHERE id = _movement_id;
  IF orig.id IS NULL OR NOT public.can_access_team_resource(uid, orig.user_id) THEN
    RAISE EXCEPTION 'Hareket bulunamadı veya erişim yok.';
  END IF;
  IF orig.reversed_by IS NOT NULL THEN RAISE EXCEPTION 'Bu hareket zaten terslenmiş.'; END IF;

  INSERT INTO public.stock_movements (
    user_id, movement_type, reason, direction, material_id, warehouse_id,
    counter_warehouse_id, quantity, unit, unit_cost, total_cost, project_id,
    supplier, person, cost_code, source_type, source_id, source_document,
    notes, reversal_of, actor_id, transaction_date)
  VALUES (orig.user_id, 'reversal', _reason, -orig.direction, orig.material_id, orig.warehouse_id,
    orig.counter_warehouse_id, orig.quantity, orig.unit, orig.unit_cost, orig.total_cost,
    orig.project_id, orig.supplier, orig.person, orig.cost_code, orig.source_type, orig.source_id,
    orig.source_document, 'Ters kayıt: ' || orig.movement_no, orig.id, uid, CURRENT_DATE)
  RETURNING id INTO mid;

  UPDATE public.stock_movements SET reversed_by = mid WHERE id = orig.id;

  INSERT INTO public.inventory_audit_log (user_id, actor_id, entity_type, entity_id, action, previous_value, new_value, reason)
  VALUES (orig.user_id, uid, 'stock_movement', orig.id, 'reversal',
          jsonb_build_object('movement_no', orig.movement_no, 'direction', orig.direction, 'quantity', orig.quantity),
          jsonb_build_object('reversal_id', mid), _reason);
  RETURN mid;
END;
$$;

CREATE OR REPLACE FUNCTION public.ensure_default_warehouse()
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE uid uuid := auth.uid(); wid uuid;
BEGIN
  IF uid IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;
  SELECT id INTO wid FROM public.warehouses
   WHERE public.can_access_team_resource(uid, user_id) AND is_active
   ORDER BY (code = 'MERKEZ') DESC, created_at ASC LIMIT 1;
  IF wid IS NULL THEN
    INSERT INTO public.warehouses (user_id, code, name, warehouse_type, notes)
    VALUES (uid, 'MERKEZ', 'Merkez Depo', 'central', 'Otomatik oluşturuldu.')
    RETURNING id INTO wid;
  END IF;
  RETURN wid;
END;
$$;

REVOKE ALL ON FUNCTION public.post_goods_receipt(uuid,uuid,numeric,text,numeric,text,text,text,uuid,text,text,date,boolean,text) FROM public;
REVOKE ALL ON FUNCTION public.post_stock_issue(uuid,uuid,numeric,text,text,text,text,text,text,text,uuid,text,text,date) FROM public;
REVOKE ALL ON FUNCTION public.reverse_stock_movement(uuid,text) FROM public;
REVOKE ALL ON FUNCTION public.ensure_default_warehouse() FROM public;
GRANT EXECUTE ON FUNCTION public.post_goods_receipt(uuid,uuid,numeric,text,numeric,text,text,text,uuid,text,text,date,boolean,text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.post_stock_issue(uuid,uuid,numeric,text,text,text,text,text,text,text,uuid,text,text,date) TO authenticated;
GRANT EXECUTE ON FUNCTION public.reverse_stock_movement(uuid,text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.ensure_default_warehouse() TO authenticated;