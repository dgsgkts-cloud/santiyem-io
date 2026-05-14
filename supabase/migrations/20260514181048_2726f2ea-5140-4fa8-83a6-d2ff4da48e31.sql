
-- 1) Add source tracking columns
ALTER TABLE public.material_entries
  ADD COLUMN IF NOT EXISTS source_type text,
  ADD COLUMN IF NOT EXISTS source_id uuid;

ALTER TABLE public.material_exits
  ADD COLUMN IF NOT EXISTS source_type text,
  ADD COLUMN IF NOT EXISTS source_id uuid;

-- Partial indexes to support source-based lookups (for upsert/delete semantics)
CREATE INDEX IF NOT EXISTS idx_material_entries_source
  ON public.material_entries(source_type, source_id)
  WHERE source_type IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_material_exits_source
  ON public.material_exits(source_type, source_id)
  WHERE source_type IS NOT NULL;

-- 2) Sync function: site_diary_entries.materials -> material_entries / material_exits
CREATE OR REPLACE FUNCTION public.sync_diary_materials_to_stock()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
DECLARE
  mat jsonb;
  mat_name text;
  mat_qty numeric;
  mat_unit text;
  mat_dir text;
  mat_id uuid;
  diary_id uuid;
  diary_user uuid;
  diary_project text;
  diary_date date;
BEGIN
  -- On DELETE, just clear synced rows for the old diary entry
  IF TG_OP = 'DELETE' THEN
    DELETE FROM public.material_entries
      WHERE source_type = 'site_diary' AND source_id = OLD.id;
    DELETE FROM public.material_exits
      WHERE source_type = 'site_diary' AND source_id = OLD.id;
    RETURN OLD;
  END IF;

  diary_id := NEW.id;
  diary_user := NEW.user_id;
  diary_project := NEW.project_id::text;
  diary_date := NEW.entry_date;

  -- Wipe previous synced rows for this diary entry; we will recreate them.
  DELETE FROM public.material_entries
    WHERE source_type = 'site_diary' AND source_id = diary_id;
  DELETE FROM public.material_exits
    WHERE source_type = 'site_diary' AND source_id = diary_id;

  IF NEW.materials IS NULL OR jsonb_array_length(NEW.materials) = 0 THEN
    RETURN NEW;
  END IF;

  FOR mat IN SELECT * FROM jsonb_array_elements(NEW.materials)
  LOOP
    mat_name := NULLIF(trim(coalesce(mat ->> 'name','')), '');
    mat_qty  := COALESCE((mat ->> 'quantity')::numeric, 0);
    mat_unit := COALESCE(NULLIF(trim(coalesce(mat ->> 'unit','')), ''), 'adet');
    mat_dir  := lower(COALESCE(NULLIF(trim(coalesce(mat ->> 'direction','')), ''), 'in'));

    IF mat_name IS NULL OR mat_qty <= 0 THEN
      CONTINUE;
    END IF;

    -- Find existing material by project + case-insensitive name; create if missing
    SELECT id INTO mat_id
    FROM public.materials
    WHERE project_id = diary_project
      AND lower(name) = lower(mat_name)
      AND user_id = diary_user
    LIMIT 1;

    IF mat_id IS NULL THEN
      INSERT INTO public.materials (user_id, project_id, name, unit, min_stock)
      VALUES (diary_user, diary_project, mat_name, mat_unit, 0)
      RETURNING id INTO mat_id;
    END IF;

    IF mat_dir IN ('out','cikis','çıkış','exit')  THEN
      INSERT INTO public.material_exits
        (user_id, material_id, exit_date, quantity, note, source_type, source_id)
      VALUES
        (diary_user, mat_id, diary_date, mat_qty, 'Şantiye Günlüğü', 'site_diary', diary_id);
    ELSE
      INSERT INTO public.material_entries
        (user_id, material_id, entry_date, quantity, unit_price, total_amount,
         supplier, note, source_type, source_id)
      VALUES
        (diary_user, mat_id, diary_date, mat_qty, 0, 0,
         'Şantiye Günlüğü', 'Şantiye Günlüğü', 'site_diary', diary_id);
    END IF;
  END LOOP;

  RETURN NEW;
END;
$function$;

-- 3) Triggers
DROP TRIGGER IF EXISTS trg_sync_diary_materials_to_stock_iu ON public.site_diary_entries;
CREATE TRIGGER trg_sync_diary_materials_to_stock_iu
AFTER INSERT OR UPDATE OF materials, project_id, entry_date ON public.site_diary_entries
FOR EACH ROW
EXECUTE FUNCTION public.sync_diary_materials_to_stock();

DROP TRIGGER IF EXISTS trg_sync_diary_materials_to_stock_d ON public.site_diary_entries;
CREATE TRIGGER trg_sync_diary_materials_to_stock_d
AFTER DELETE ON public.site_diary_entries
FOR EACH ROW
EXECUTE FUNCTION public.sync_diary_materials_to_stock();

-- 4) Backfill existing diary entries (re-run sync for all rows)
DO $backfill$
DECLARE r RECORD;
BEGIN
  FOR r IN SELECT id FROM public.site_diary_entries LOOP
    UPDATE public.site_diary_entries SET updated_at = now() WHERE id = r.id;
  END LOOP;
END
$backfill$;
