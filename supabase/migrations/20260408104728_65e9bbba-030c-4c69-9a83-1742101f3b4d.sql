CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (user_id, full_name, title, city, role)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data ->> 'full_name', ''),
    COALESCE(NEW.raw_user_meta_data ->> 'title', ''),
    COALESCE(NEW.raw_user_meta_data ->> 'city', ''),
    CASE 
      WHEN NEW.email = 'info@goktasglobal.com' THEN 'admin'
      WHEN NEW.email = 'ahmetkale@yandex.com' THEN 'admin'
      WHEN NEW.email = 'santiyedenbilgi@gmail.com' THEN 'admin'
      ELSE 'free' 
    END
  );
  RETURN NEW;
END;
$$;