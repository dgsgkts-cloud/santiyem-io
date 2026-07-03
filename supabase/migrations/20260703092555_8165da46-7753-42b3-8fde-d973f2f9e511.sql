
CREATE TABLE public.voice_usage (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  usage_date DATE NOT NULL DEFAULT CURRENT_DATE,
  seconds_used INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, usage_date)
);

GRANT SELECT, INSERT, UPDATE ON public.voice_usage TO authenticated;
GRANT ALL ON public.voice_usage TO service_role;

ALTER TABLE public.voice_usage ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view own voice usage" ON public.voice_usage
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users insert own voice usage" ON public.voice_usage
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users update own voice usage" ON public.voice_usage
  FOR UPDATE USING (auth.uid() = user_id);

CREATE INDEX voice_usage_user_date_idx ON public.voice_usage (user_id, usage_date DESC);

-- RPC: atomically add seconds and return today's total
CREATE OR REPLACE FUNCTION public.add_voice_usage_seconds(_seconds INTEGER)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _uid UUID := auth.uid();
  _total INTEGER;
BEGIN
  IF _uid IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;
  IF _seconds IS NULL OR _seconds < 0 THEN
    _seconds := 0;
  END IF;

  INSERT INTO public.voice_usage (user_id, usage_date, seconds_used)
  VALUES (_uid, CURRENT_DATE, _seconds)
  ON CONFLICT (user_id, usage_date)
  DO UPDATE SET seconds_used = public.voice_usage.seconds_used + EXCLUDED.seconds_used,
                updated_at = now()
  RETURNING seconds_used INTO _total;

  RETURN _total;
END;
$$;

GRANT EXECUTE ON FUNCTION public.add_voice_usage_seconds(INTEGER) TO authenticated;
