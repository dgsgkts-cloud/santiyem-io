-- ═══════════════════════════════════════════════════════════════════════════
-- DEPO & ENVANTER — FAZ 2
-- Transfer + transit stok, Zimmet (iade edilebilir demirbaş), Sayım oturumları.
-- Tüm bakiye değişiklikleri yalnızca stock_movements üzerinden olur.
-- ═══════════════════════════════════════════════════════════════════════════

-- ── 0. Depo yetki katmanı ─────────────────────────────────────────────────
-- Depo yetkileri firma seviyesindedir. role_default_permission proje rolleri
-- için genişletilir, depot_permission() ise firma seviyesinde karar verir.

CREATE OR REPLACE FUNCTION public.role_default_permission(_role project_role, _key text)
RETURNS boolean
LANGUAGE sql
IMMUTABLE
SET search_path TO 'public'
AS $function$
  SELECT CASE _role
    WHEN 'owner' THEN true
    WHEN 'manager' THEN CASE _key
      WHEN 'view_financials' THEN false
      WHEN 'manage_finance' THEN false
      WHEN 'view_costs' THEN true
      WHEN 'view_payments' THEN true
      WHEN 'view_diary' THEN true
      WHEN 'view_photos' THEN true
      WHEN 'view_attendance_all' THEN true
      WHEN 'view_progress' THEN true
      WHEN 'manage_members' THEN true
      WHEN 'view_company_health' THEN true
      WHEN 'view_company_health_projects' THEN true
      WHEN 'view_company_health_procurement' THEN true
      WHEN 'view_company_health_personnel' THEN true
      -- depo yetkileri
      WHEN 'create_transfer' THEN true
      WHEN 'approve_transfer' THEN true
      WHEN 'dispatch_transfer' THEN true
      WHEN 'receive_transfer' THEN true
      WHEN 'create_assignment' THEN true
      WHEN 'receive_assignment_return' THEN true
      WHEN 'extend_assignment' THEN true
      WHEN 'report_asset_damage' THEN true
      WHEN 'start_inventory_count' THEN true
      WHEN 'enter_inventory_count' THEN true
      WHEN 'approve_inventory_count' THEN true
      WHEN 'apply_inventory_adjustment' THEN true
      WHEN 'view_inventory_forecast' THEN true
      WHEN 'access_depot_ceo_mode' THEN true
      ELSE false END
    WHEN 'site_engineer' THEN CASE _key
      WHEN 'view_diary' THEN true
      WHEN 'view_photos' THEN true
      WHEN 'view_attendance_all' THEN true
      WHEN 'view_progress' THEN true
      WHEN 'edit_diary' THEN true
      WHEN 'edit_attendance' THEN true
      -- saha ekibi operasyonel işlemleri yapar; onay ve stok düzeltmesi yapamaz
      WHEN 'create_transfer' THEN true
      WHEN 'dispatch_transfer' THEN true
      WHEN 'receive_transfer' THEN true
      WHEN 'create_assignment' THEN true
      WHEN 'receive_assignment_return' THEN true
      WHEN 'report_asset_damage' THEN true
      WHEN 'enter_inventory_count' THEN true
      WHEN 'view_inventory_forecast' THEN true
      ELSE false END
    WHEN 'accountant' THEN CASE _key
      WHEN 'view_financials' THEN true
      WHEN 'view_costs' THEN true
      WHEN 'view_payments' THEN true
      WHEN 'manage_finance' THEN true
      WHEN 'view_company_health' THEN true
      WHEN 'view_company_health_financial' THEN true
      WHEN 'view_company_health_procurement' THEN true
      WHEN 'view_inventory_forecast' THEN true
      WHEN 'access_depot_ceo_mode' THEN true
      WHEN 'approve_inventory_count' THEN true
      ELSE false END
    WHEN 'subcontractor' THEN CASE _key
      WHEN 'view_attendance_own_team' THEN true
      WHEN 'view_payments_own' THEN true
      ELSE false END
    WHEN 'worker' THEN CASE _key
      WHEN 'view_attendance_own' THEN true
      ELSE false END
    WHEN 'landowner' THEN CASE _key
      WHEN 'view_progress' THEN true
      WHEN 'view_photos' THEN true
      ELSE false END
    ELSE false END
$function$;

-- Firma seviyesi depo yetkisi. Kontroller mutasyon fonksiyonlarının içinde
-- çağrılır; arayüzde gizlemek tek başına yeterli sayılmaz.
CREATE OR REPLACE FUNCTION public.depot_permission(_key text)
RETURNS boolean
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  uid uuid := auth.uid();
  owner uuid;
  office_role text;
  app_role text;
  ok boolean := false;
BEGIN
  IF uid IS NULL THEN RETURN false; END IF;
  IF public.is_member_suspended(uid) THEN RETURN false; END IF;

  owner := public.resolve_billing_owner(uid);
  SELECT role INTO app_role FROM public.profiles WHERE user_id = uid;
  SELECT role INTO office_role FROM public.office_members WHERE user_id = uid LIMIT 1;

  -- Firma sahibi / yönetici: tüm depo yetkileri
  IF app_role = 'admin' OR owner = uid OR office_role IN ('owner', 'admin') THEN
    RETURN true;
  END IF;

  -- Ofis editörü: operasyonel işlemler; onay ve stok düzeltmesi hariç
  IF office_role = 'editor' THEN
    RETURN _key IN (
      'create_transfer', 'dispatch_transfer', 'receive_transfer',
      'create_assignment', 'receive_assignment_return', 'extend_assignment',
      'report_asset_damage', 'start_inventory_count', 'enter_inventory_count',
      'view_inventory_forecast'
    );
  END IF;

  -- Ofis görüntüleyicisi: yalnızca tahmin görüntüleme
  IF office_role = 'viewer' THEN
    RETURN _key = 'view_inventory_forecast';
  END IF;

  -- Proje üyesi: herhangi bir projesinde bu yetkiye sahipse izin verilir
  SELECT bool_or(public.has_project_permission(uid, m.project_id, _key))
    INTO ok
    FROM public.project_members m
   WHERE m.user_id = uid;

  RETURN COALESCE(ok, false);
END;
$function$;

CREATE OR REPLACE FUNCTION public.assert_depot_permission(_key text)
RETURNS void
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  IF NOT public.depot_permission(_key) THEN
    RAISE EXCEPTION 'Bu işlem için yetkiniz bulunmuyor (%).', _key
      USING ERRCODE = 'insufficient_privilege';
  END IF;
END;
$function$;

REVOKE ALL ON FUNCTION public.depot_permission(text) FROM anon;
REVOKE ALL ON FUNCTION public.assert_depot_permission(text) FROM anon;
GRANT EXECUTE ON FUNCTION public.depot_permission(text) TO authenticated;

-- ── 1. Numaralandırma dizileri ────────────────────────────────────────────
CREATE SEQUENCE IF NOT EXISTS public.inventory_transfer_no_seq;
CREATE SEQUENCE IF NOT EXISTS public.inventory_assignment_no_seq;
CREATE SEQUENCE IF NOT EXISTS public.inventory_count_no_seq;
CREATE SEQUENCE IF NOT EXISTS public.inventory_asset_no_seq;
CREATE SEQUENCE IF NOT EXISTS public.inventory_issue_no_seq;

-- ═══════════════════════════════════════════════════════════════════════════
-- 2. TRANSFERLER
-- ═══════════════════════════════════════════════════════════════════════════
CREATE TABLE public.inventory_transfers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,                                  -- firma (sahip) kaydı
  transfer_no text NOT NULL DEFAULT ('TRF-' || lpad(nextval('public.inventory_transfer_no_seq')::text, 6, '0')),
  material_id uuid NOT NULL REFERENCES public.materials(id) ON DELETE RESTRICT,
  unit text NOT NULL,
  requested_quantity numeric NOT NULL CHECK (requested_quantity > 0),
  dispatched_quantity numeric NOT NULL DEFAULT 0 CHECK (dispatched_quantity >= 0),
  received_quantity numeric NOT NULL DEFAULT 0 CHECK (received_quantity >= 0),
  damaged_quantity numeric NOT NULL DEFAULT 0 CHECK (damaged_quantity >= 0),
  missing_quantity numeric NOT NULL DEFAULT 0 CHECK (missing_quantity >= 0),
  in_transit_quantity numeric NOT NULL DEFAULT 0 CHECK (in_transit_quantity >= 0),
  unit_cost numeric,                                      -- sevk anındaki taşınan maliyet
  source_warehouse_id uuid NOT NULL REFERENCES public.warehouses(id) ON DELETE RESTRICT,
  dest_warehouse_id uuid NOT NULL REFERENCES public.warehouses(id) ON DELETE RESTRICT,
  project_id text,
  requester_id uuid NOT NULL,
  approver_id uuid,
  dispatcher_id uuid,
  receiver_id uuid,
  requested_at timestamptz NOT NULL DEFAULT now(),
  approved_at timestamptz,
  dispatched_at timestamptz,
  expected_arrival date,
  required_date date,
  received_at timestamptz,
  reason text,
  notes text,
  rejection_reason text,
  revision_note text,
  discrepancy_note text,
  status text NOT NULL DEFAULT 'pending_approval',
  dispatch_movement_id uuid REFERENCES public.stock_movements(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT inventory_transfers_status_check CHECK (status IN (
    'requested', 'pending_approval', 'approved', 'ready_to_dispatch', 'in_transit',
    'partially_received', 'received', 'discrepancy', 'rejected', 'cancelled')),
  CONSTRAINT inventory_transfers_distinct_warehouses CHECK (source_warehouse_id <> dest_warehouse_id)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.inventory_transfers TO authenticated;
GRANT ALL ON public.inventory_transfers TO service_role;
ALTER TABLE public.inventory_transfers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Team can view transfers" ON public.inventory_transfers
  FOR SELECT TO authenticated USING (public.can_access_team_resource(auth.uid(), user_id));
CREATE POLICY "Team can create transfers" ON public.inventory_transfers
  FOR INSERT TO authenticated WITH CHECK (
    public.can_access_team_resource(auth.uid(), user_id)
    AND public.depot_permission('create_transfer'));
CREATE POLICY "Team can update transfers" ON public.inventory_transfers
  FOR UPDATE TO authenticated USING (public.can_access_team_resource(auth.uid(), user_id));
CREATE POLICY "Owner can delete draft transfers" ON public.inventory_transfers
  FOR DELETE TO authenticated USING (
    public.can_access_team_resource(auth.uid(), user_id)
    AND status IN ('requested', 'pending_approval', 'rejected', 'cancelled'));

CREATE INDEX idx_inventory_transfers_status ON public.inventory_transfers (user_id, status);
CREATE INDEX idx_inventory_transfers_material ON public.inventory_transfers (material_id);
CREATE INDEX idx_inventory_transfers_transit ON public.inventory_transfers (source_warehouse_id, dest_warehouse_id)
  WHERE in_transit_quantity > 0;

CREATE TABLE public.inventory_transfer_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  transfer_id uuid NOT NULL REFERENCES public.inventory_transfers(id) ON DELETE CASCADE,
  status text NOT NULL,
  action text NOT NULL,
  actor_id uuid NOT NULL,
  actor_name text,
  note text,
  payload jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT ON public.inventory_transfer_events TO authenticated;
GRANT ALL ON public.inventory_transfer_events TO service_role;
ALTER TABLE public.inventory_transfer_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Team can view transfer events" ON public.inventory_transfer_events
  FOR SELECT TO authenticated USING (public.can_access_team_resource(auth.uid(), user_id));
CREATE POLICY "Team can add transfer events" ON public.inventory_transfer_events
  FOR INSERT TO authenticated WITH CHECK (public.can_access_team_resource(auth.uid(), user_id));

CREATE INDEX idx_transfer_events_transfer ON public.inventory_transfer_events (transfer_id, created_at DESC);

-- Transit bakiye görünümü: açık transferlerden türetilir, hiçbir yerde saklanmaz.
CREATE VIEW public.inventory_transit_balances
WITH (security_invoker = true) AS
SELECT
  t.material_id,
  t.source_warehouse_id AS warehouse_id,
  'out'::text AS direction,
  SUM(t.in_transit_quantity) AS quantity,
  COUNT(*)::int AS transfer_count
FROM public.inventory_transfers t
WHERE t.in_transit_quantity > 0
GROUP BY t.material_id, t.source_warehouse_id
UNION ALL
SELECT
  t.material_id,
  t.dest_warehouse_id AS warehouse_id,
  'in'::text AS direction,
  SUM(t.in_transit_quantity) AS quantity,
  COUNT(*)::int AS transfer_count
FROM public.inventory_transfers t
WHERE t.in_transit_quantity > 0
GROUP BY t.material_id, t.dest_warehouse_id;

GRANT SELECT ON public.inventory_transit_balances TO authenticated;
GRANT SELECT ON public.inventory_transit_balances TO service_role;

-- ═══════════════════════════════════════════════════════════════════════════
-- 3. ZİMMET — iade edilebilir demirbaş / ekipman
-- ═══════════════════════════════════════════════════════════════════════════
CREATE TABLE public.inventory_assets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  asset_code text NOT NULL DEFAULT ('DMR-' || lpad(nextval('public.inventory_asset_no_seq')::text, 5, '0')),
  name text NOT NULL,
  category text,
  serial_number text,
  brand text,
  model text,
  warehouse_id uuid REFERENCES public.warehouses(id) ON DELETE SET NULL,
  purchase_value numeric,
  purchase_date date,
  -- Zimmetlenebilir varlıklar tüketim malzemesi değildir; birim daima adet.
  unit text NOT NULL DEFAULT 'adet',
  status text NOT NULL DEFAULT 'available',
  condition text,
  accessories text[] NOT NULL DEFAULT '{}',
  photo_url text,
  equipment_ref text,               -- Makine & Ekipman modülü bağlantısı
  notes text,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT inventory_assets_status_check CHECK (status IN (
    'available', 'assigned', 'maintenance', 'damaged', 'lost', 'retired')),
  CONSTRAINT inventory_assets_unique_code UNIQUE (user_id, asset_code)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.inventory_assets TO authenticated;
GRANT ALL ON public.inventory_assets TO service_role;
ALTER TABLE public.inventory_assets ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Team can view assets" ON public.inventory_assets
  FOR SELECT TO authenticated USING (public.can_access_team_resource(auth.uid(), user_id));
CREATE POLICY "Team can create assets" ON public.inventory_assets
  FOR INSERT TO authenticated WITH CHECK (
    public.can_access_team_resource(auth.uid(), user_id)
    AND public.depot_permission('create_assignment'));
CREATE POLICY "Team can update assets" ON public.inventory_assets
  FOR UPDATE TO authenticated USING (public.can_access_team_resource(auth.uid(), user_id));
CREATE POLICY "Team can delete unused assets" ON public.inventory_assets
  FOR DELETE TO authenticated USING (
    public.can_access_team_resource(auth.uid(), user_id) AND status = 'available');

CREATE TABLE public.inventory_assignments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  assignment_no text NOT NULL DEFAULT ('ZMT-' || lpad(nextval('public.inventory_assignment_no_seq')::text, 6, '0')),
  asset_id uuid NOT NULL REFERENCES public.inventory_assets(id) ON DELETE RESTRICT,
  person_name text NOT NULL,
  personnel_id uuid REFERENCES public.personnel(id) ON DELETE SET NULL,
  department text,
  project_id text,
  source_warehouse_id uuid REFERENCES public.warehouses(id) ON DELETE SET NULL,
  issued_at timestamptz NOT NULL DEFAULT now(),
  expected_return_at date NOT NULL,
  original_expected_return_at date,
  condition_at_issue text,
  accessories text[] NOT NULL DEFAULT '{}',
  photo_url text,
  document_url text,
  notes text,
  status text NOT NULL DEFAULT 'assigned',
  returned_at timestamptz,
  return_condition text,
  return_warehouse_id uuid REFERENCES public.warehouses(id) ON DELETE SET NULL,
  received_by text,
  missing_accessories text[] NOT NULL DEFAULT '{}',
  damage_note text,
  return_photo_url text,
  return_notes text,
  extension_count integer NOT NULL DEFAULT 0,
  issued_by uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT inventory_assignments_status_check CHECK (status IN (
    'assigned', 'returned', 'damaged_return', 'lost', 'maintenance', 'cancelled'))
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.inventory_assignments TO authenticated;
GRANT ALL ON public.inventory_assignments TO service_role;
ALTER TABLE public.inventory_assignments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Team can view assignments" ON public.inventory_assignments
  FOR SELECT TO authenticated USING (public.can_access_team_resource(auth.uid(), user_id));
CREATE POLICY "Team can create assignments" ON public.inventory_assignments
  FOR INSERT TO authenticated WITH CHECK (
    public.can_access_team_resource(auth.uid(), user_id)
    AND public.depot_permission('create_assignment'));
CREATE POLICY "Team can update assignments" ON public.inventory_assignments
  FOR UPDATE TO authenticated USING (public.can_access_team_resource(auth.uid(), user_id));
CREATE POLICY "Team can delete cancelled assignments" ON public.inventory_assignments
  FOR DELETE TO authenticated USING (
    public.can_access_team_resource(auth.uid(), user_id) AND status = 'cancelled');

CREATE INDEX idx_assignments_status ON public.inventory_assignments (user_id, status);
CREATE INDEX idx_assignments_asset ON public.inventory_assignments (asset_id);
-- Bir varlık aynı anda yalnızca bir aktif zimmette olabilir.
CREATE UNIQUE INDEX idx_assignments_one_active_per_asset
  ON public.inventory_assignments (asset_id)
  WHERE status IN ('assigned', 'maintenance');

CREATE TABLE public.inventory_assignment_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  assignment_id uuid NOT NULL REFERENCES public.inventory_assignments(id) ON DELETE CASCADE,
  action text NOT NULL,
  status text,
  actor_id uuid NOT NULL,
  actor_name text,
  note text,
  payload jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT ON public.inventory_assignment_events TO authenticated;
GRANT ALL ON public.inventory_assignment_events TO service_role;
ALTER TABLE public.inventory_assignment_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Team can view assignment events" ON public.inventory_assignment_events
  FOR SELECT TO authenticated USING (public.can_access_team_resource(auth.uid(), user_id));
CREATE POLICY "Team can add assignment events" ON public.inventory_assignment_events
  FOR INSERT TO authenticated WITH CHECK (public.can_access_team_resource(auth.uid(), user_id));

CREATE INDEX idx_assignment_events_assignment ON public.inventory_assignment_events (assignment_id, created_at DESC);

CREATE TABLE public.inventory_asset_issues (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  issue_no text NOT NULL DEFAULT ('HSR-' || lpad(nextval('public.inventory_issue_no_seq')::text, 5, '0')),
  asset_id uuid NOT NULL REFERENCES public.inventory_assets(id) ON DELETE RESTRICT,
  assignment_id uuid REFERENCES public.inventory_assignments(id) ON DELETE SET NULL,
  issue_type text NOT NULL,
  occurred_on date NOT NULL DEFAULT CURRENT_DATE,
  person_name text,
  project_id text,
  description text NOT NULL,
  estimated_cost numeric,
  photo_url text,
  document_url text,
  reviewer_name text,
  reviewer_id uuid,
  status text NOT NULL DEFAULT 'investigating',
  resolution_note text,
  reported_by uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT inventory_asset_issues_type_check CHECK (issue_type IN ('damaged', 'lost')),
  CONSTRAINT inventory_asset_issues_status_check CHECK (status IN (
    'investigating', 'awaiting_repair', 'to_be_charged', 'resolved', 'closed'))
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.inventory_asset_issues TO authenticated;
GRANT ALL ON public.inventory_asset_issues TO service_role;
ALTER TABLE public.inventory_asset_issues ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Team can view asset issues" ON public.inventory_asset_issues
  FOR SELECT TO authenticated USING (public.can_access_team_resource(auth.uid(), user_id));
CREATE POLICY "Team can create asset issues" ON public.inventory_asset_issues
  FOR INSERT TO authenticated WITH CHECK (
    public.can_access_team_resource(auth.uid(), user_id)
    AND public.depot_permission('report_asset_damage'));
CREATE POLICY "Team can update asset issues" ON public.inventory_asset_issues
  FOR UPDATE TO authenticated USING (public.can_access_team_resource(auth.uid(), user_id));
CREATE POLICY "Team can delete asset issues" ON public.inventory_asset_issues
  FOR DELETE TO authenticated USING (
    public.can_access_team_resource(auth.uid(), user_id) AND status = 'investigating');

CREATE INDEX idx_asset_issues_asset ON public.inventory_asset_issues (asset_id, created_at DESC);

-- ═══════════════════════════════════════════════════════════════════════════
-- 4. SAYIM OTURUMLARI
-- ═══════════════════════════════════════════════════════════════════════════
CREATE TABLE public.inventory_count_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  count_no text NOT NULL DEFAULT ('SYM-' || lpad(nextval('public.inventory_count_no_seq')::text, 5, '0')),
  warehouse_id uuid NOT NULL REFERENCES public.warehouses(id) ON DELETE RESTRICT,
  count_type text NOT NULL DEFAULT 'full',
  scope_kind text NOT NULL DEFAULT 'all',
  scope_value text,
  planned_date date NOT NULL DEFAULT CURRENT_DATE,
  counters text[] NOT NULL DEFAULT '{}',
  approver_name text,
  approver_id uuid,
  notes text,
  status text NOT NULL DEFAULT 'planned',
  blind_count boolean NOT NULL DEFAULT false,
  variance_threshold_pct numeric NOT NULL DEFAULT 5,
  snapshot_at timestamptz,
  started_at timestamptz,
  submitted_at timestamptz,
  approved_at timestamptz,
  applied_at timestamptz,
  cancelled_at timestamptz,
  review_note text,
  started_by uuid,
  applied_by uuid,
  created_by uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT count_sessions_type_check CHECK (count_type IN ('full', 'cyclic', 'category', 'material', 'spot')),
  CONSTRAINT count_sessions_scope_check CHECK (scope_kind IN ('all', 'category', 'material', 'location')),
  CONSTRAINT count_sessions_status_check CHECK (status IN (
    'planned', 'in_progress', 'counted', 'pending_approval', 'approved', 'applied', 'cancelled'))
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.inventory_count_sessions TO authenticated;
GRANT ALL ON public.inventory_count_sessions TO service_role;
ALTER TABLE public.inventory_count_sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Team can view count sessions" ON public.inventory_count_sessions
  FOR SELECT TO authenticated USING (public.can_access_team_resource(auth.uid(), user_id));
CREATE POLICY "Team can create count sessions" ON public.inventory_count_sessions
  FOR INSERT TO authenticated WITH CHECK (
    public.can_access_team_resource(auth.uid(), user_id)
    AND public.depot_permission('start_inventory_count'));
CREATE POLICY "Team can update count sessions" ON public.inventory_count_sessions
  FOR UPDATE TO authenticated USING (public.can_access_team_resource(auth.uid(), user_id));
CREATE POLICY "Team can delete planned count sessions" ON public.inventory_count_sessions
  FOR DELETE TO authenticated USING (
    public.can_access_team_resource(auth.uid(), user_id) AND status IN ('planned', 'cancelled'));

CREATE INDEX idx_count_sessions_status ON public.inventory_count_sessions (user_id, status);

CREATE TABLE public.inventory_count_lines (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  session_id uuid NOT NULL REFERENCES public.inventory_count_sessions(id) ON DELETE CASCADE,
  material_id uuid NOT NULL REFERENCES public.materials(id) ON DELETE RESTRICT,
  material_name text NOT NULL,
  material_code text,
  unit text NOT NULL,
  location text,
  -- Oturum başlarken alınan sistem miktarı; oturum boyunca değişmez.
  expected_quantity numeric NOT NULL,
  counted_quantity numeric,
  unit_cost numeric,
  explanation text,
  photo_url text,
  counter_name text,
  counted_at timestamptz,
  recount_required boolean NOT NULL DEFAULT false,
  quantity_after numeric,
  adjustment_movement_id uuid REFERENCES public.stock_movements(id) ON DELETE SET NULL,
  applied_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT count_lines_unique_material UNIQUE (session_id, material_id)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.inventory_count_lines TO authenticated;
GRANT ALL ON public.inventory_count_lines TO service_role;
ALTER TABLE public.inventory_count_lines ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Team can view count lines" ON public.inventory_count_lines
  FOR SELECT TO authenticated USING (public.can_access_team_resource(auth.uid(), user_id));
CREATE POLICY "Team can create count lines" ON public.inventory_count_lines
  FOR INSERT TO authenticated WITH CHECK (public.can_access_team_resource(auth.uid(), user_id));
CREATE POLICY "Team can update count lines" ON public.inventory_count_lines
  FOR UPDATE TO authenticated USING (public.can_access_team_resource(auth.uid(), user_id));
CREATE POLICY "Team can delete count lines" ON public.inventory_count_lines
  FOR DELETE TO authenticated USING (public.can_access_team_resource(auth.uid(), user_id));

CREATE INDEX idx_count_lines_session ON public.inventory_count_lines (session_id);

-- ── updated_at tetikleyicileri ───────────────────────────────────────────
CREATE TRIGGER trg_inventory_transfers_updated BEFORE UPDATE ON public.inventory_transfers
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_inventory_assets_updated BEFORE UPDATE ON public.inventory_assets
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_inventory_assignments_updated BEFORE UPDATE ON public.inventory_assignments
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_inventory_asset_issues_updated BEFORE UPDATE ON public.inventory_asset_issues
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_count_sessions_updated BEFORE UPDATE ON public.inventory_count_sessions
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_count_lines_updated BEFORE UPDATE ON public.inventory_count_lines
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
