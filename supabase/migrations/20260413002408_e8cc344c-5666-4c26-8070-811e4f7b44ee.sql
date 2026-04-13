
-- Materials (stock items per project)
CREATE TABLE public.materials (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL,
  project_id text NOT NULL,
  name text NOT NULL DEFAULT '',
  unit text NOT NULL DEFAULT 'adet',
  min_stock numeric NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.materials ENABLE ROW LEVEL SECURITY;
CREATE POLICY "View own or team materials" ON public.materials FOR SELECT USING (public.can_access_team_resource(auth.uid(), user_id));
CREATE POLICY "Insert own materials" ON public.materials FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Update own or team materials" ON public.materials FOR UPDATE USING (public.can_access_team_resource(auth.uid(), user_id));
CREATE POLICY "Delete own materials" ON public.materials FOR DELETE USING (user_id = auth.uid());
CREATE TRIGGER update_materials_updated_at BEFORE UPDATE ON public.materials FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Material entries (incoming stock)
CREATE TABLE public.material_entries (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL,
  material_id uuid NOT NULL REFERENCES public.materials(id) ON DELETE CASCADE,
  entry_date date NOT NULL DEFAULT CURRENT_DATE,
  quantity numeric NOT NULL DEFAULT 0,
  unit_price numeric NOT NULL DEFAULT 0,
  total_amount numeric NOT NULL DEFAULT 0,
  supplier text NOT NULL DEFAULT '',
  waybill_no text,
  waybill_photo_url text,
  note text,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.material_entries ENABLE ROW LEVEL SECURITY;
CREATE POLICY "View own or team entries" ON public.material_entries FOR SELECT USING (public.can_access_team_resource(auth.uid(), user_id));
CREATE POLICY "Insert own entries" ON public.material_entries FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Update own or team entries" ON public.material_entries FOR UPDATE USING (public.can_access_team_resource(auth.uid(), user_id));
CREATE POLICY "Delete own entries" ON public.material_entries FOR DELETE USING (user_id = auth.uid());

-- Material exits (outgoing stock)
CREATE TABLE public.material_exits (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL,
  material_id uuid NOT NULL REFERENCES public.materials(id) ON DELETE CASCADE,
  exit_date date NOT NULL DEFAULT CURRENT_DATE,
  quantity numeric NOT NULL DEFAULT 0,
  contract_item_id uuid REFERENCES public.contract_items(id) ON DELETE SET NULL,
  location text,
  note text,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.material_exits ENABLE ROW LEVEL SECURITY;
CREATE POLICY "View own or team exits" ON public.material_exits FOR SELECT USING (public.can_access_team_resource(auth.uid(), user_id));
CREATE POLICY "Insert own exits" ON public.material_exits FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Update own or team exits" ON public.material_exits FOR UPDATE USING (public.can_access_team_resource(auth.uid(), user_id));
CREATE POLICY "Delete own exits" ON public.material_exits FOR DELETE USING (user_id = auth.uid());

-- Material norms (theoretical consumption per contract item)
CREATE TABLE public.material_norms (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL,
  contract_item_id uuid NOT NULL REFERENCES public.contract_items(id) ON DELETE CASCADE,
  material_id uuid NOT NULL REFERENCES public.materials(id) ON DELETE CASCADE,
  norm_quantity numeric NOT NULL DEFAULT 0,
  unit text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(contract_item_id, material_id)
);
ALTER TABLE public.material_norms ENABLE ROW LEVEL SECURITY;
CREATE POLICY "View own or team norms" ON public.material_norms FOR SELECT USING (public.can_access_team_resource(auth.uid(), user_id));
CREATE POLICY "Insert own norms" ON public.material_norms FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Update own or team norms" ON public.material_norms FOR UPDATE USING (public.can_access_team_resource(auth.uid(), user_id));
CREATE POLICY "Delete own norms" ON public.material_norms FOR DELETE USING (user_id = auth.uid());
CREATE TRIGGER update_material_norms_updated_at BEFORE UPDATE ON public.material_norms FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
