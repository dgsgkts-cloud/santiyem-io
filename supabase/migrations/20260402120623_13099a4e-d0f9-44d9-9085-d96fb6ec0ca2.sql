CREATE TABLE public.notification_preferences (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL UNIQUE,
  payment_due_reminder BOOLEAN NOT NULL DEFAULT true,
  payment_overdue_reminder BOOLEAN NOT NULL DEFAULT true,
  weekly_summary BOOLEAN NOT NULL DEFAULT true,
  whatsapp_enabled BOOLEAN NOT NULL DEFAULT false,
  whatsapp_number TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.notification_preferences ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own preferences"
ON public.notification_preferences FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own preferences"
ON public.notification_preferences FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own preferences"
ON public.notification_preferences FOR UPDATE
USING (auth.uid() = user_id);

-- Auto-create notification preferences on signup
CREATE OR REPLACE FUNCTION public.handle_new_user_notifications()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.notification_preferences (user_id)
  VALUES (NEW.id)
  ON CONFLICT (user_id) DO NOTHING;
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created_notifications
AFTER INSERT ON auth.users
FOR EACH ROW
EXECUTE FUNCTION public.handle_new_user_notifications();