CREATE TABLE public.ai_project_insights (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  project_id text,
  scope text NOT NULL DEFAULT 'project',
  insight_type text NOT NULL,
  priority integer NOT NULL DEFAULT 1,
  title text NOT NULL,
  summary text,
  recommended_action text,
  financial_impact numeric,
  cost_code_id uuid,
  related_risk_ids uuid[] NOT NULL DEFAULT '{}',
  confidence text NOT NULL DEFAULT 'medium',
  status text NOT NULL DEFAULT 'active',
  fingerprint text NOT NULL,
  data_as_of timestamptz NOT NULL DEFAULT now(),
  generated_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz,
  model_version text,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX ai_project_insights_fingerprint_key
  ON public.ai_project_insights (user_id, COALESCE(project_id, '~portfolio'), fingerprint);
CREATE INDEX ai_project_insights_lookup
  ON public.ai_project_insights (user_id, project_id, status, priority);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.ai_project_insights TO authenticated;
GRANT ALL ON public.ai_project_insights TO service_role;

ALTER TABLE public.ai_project_insights ENABLE ROW LEVEL SECURITY;

CREATE POLICY "ai_insights_select" ON public.ai_project_insights
  FOR SELECT TO authenticated
  USING (auth.uid() = user_id OR public.can_access_team_resource(auth.uid(), user_id));
CREATE POLICY "ai_insights_insert" ON public.ai_project_insights
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id OR public.can_access_team_resource(auth.uid(), user_id));
CREATE POLICY "ai_insights_update" ON public.ai_project_insights
  FOR UPDATE TO authenticated
  USING (auth.uid() = user_id OR public.can_access_team_resource(auth.uid(), user_id));
CREATE POLICY "ai_insights_delete" ON public.ai_project_insights
  FOR DELETE TO authenticated
  USING (auth.uid() = user_id OR public.can_access_team_resource(auth.uid(), user_id));

CREATE TRIGGER ai_project_insights_updated_at
  BEFORE UPDATE ON public.ai_project_insights
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();