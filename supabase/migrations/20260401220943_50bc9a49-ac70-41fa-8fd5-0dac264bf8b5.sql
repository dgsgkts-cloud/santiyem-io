
-- Add role column to profiles
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS role text NOT NULL DEFAULT 'free';

-- Update existing admin user if exists
UPDATE public.profiles SET role = 'admin'
WHERE user_id IN (
  SELECT id FROM auth.users WHERE email = 'info@goktasglobal.com'
);

-- Create or replace the handle_new_user function to also set admin role
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
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
    CASE WHEN NEW.email = 'info@goktasglobal.com' THEN 'admin' ELSE 'free' END
  );
  RETURN NEW;
END;
$$;
