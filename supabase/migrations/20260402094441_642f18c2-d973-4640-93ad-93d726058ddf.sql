
-- Function to sync site diary materials to project_expenses
CREATE OR REPLACE FUNCTION public.sync_diary_materials_to_expenses()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  mat jsonb;
  mat_name text;
  mat_qty numeric;
  mat_unit text;
BEGIN
  -- Delete old auto-generated expenses for this diary entry
  DELETE FROM public.project_expenses
  WHERE source = 'site_diary'
    AND note = 'diary_entry_id:' || NEW.id::text;

  -- Insert new expenses from materials array
  IF NEW.materials IS NOT NULL AND jsonb_array_length(NEW.materials) > 0 THEN
    FOR mat IN SELECT * FROM jsonb_array_elements(NEW.materials)
    LOOP
      mat_name := mat ->> 'name';
      mat_qty := COALESCE((mat ->> 'quantity')::numeric, 0);
      mat_unit := COALESCE(mat ->> 'unit', '');

      IF mat_name IS NOT NULL AND mat_name != '' THEN
        INSERT INTO public.project_expenses (
          user_id, project_id, category, description, amount, expense_date, source, note
        ) VALUES (
          NEW.user_id,
          NEW.project_id::text,
          'Malzeme',
          mat_name || ' — ' || mat_qty || ' ' || mat_unit,
          0,
          NEW.entry_date,
          'site_diary',
          'diary_entry_id:' || NEW.id::text
        );
      END IF;
    END LOOP;
  END IF;

  RETURN NEW;
END;
$$;

-- Create trigger
CREATE TRIGGER trg_sync_diary_materials
AFTER INSERT OR UPDATE ON public.site_diary_entries
FOR EACH ROW
EXECUTE FUNCTION public.sync_diary_materials_to_expenses();
