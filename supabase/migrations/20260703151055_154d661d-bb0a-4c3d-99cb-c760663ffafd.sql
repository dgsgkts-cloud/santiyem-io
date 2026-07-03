
CREATE TABLE public.meetings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  team_id UUID REFERENCES public.office_teams(id) ON DELETE SET NULL,
  project_id TEXT,
  title TEXT NOT NULL DEFAULT 'Yeni Toplantı',
  meeting_type TEXT NOT NULL DEFAULT 'project' CHECK (meeting_type IN ('project','office','department')),
  status TEXT NOT NULL DEFAULT 'scheduled' CHECK (status IN ('scheduled','live','processing','completed','failed')),
  started_at TIMESTAMPTZ,
  ended_at TIMESTAMPTZ,
  duration_seconds INTEGER NOT NULL DEFAULT 0,
  audio_path TEXT,
  language TEXT NOT NULL DEFAULT 'tr',
  tags TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  location TEXT,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.meetings TO authenticated;
GRANT ALL ON public.meetings TO service_role;
ALTER TABLE public.meetings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "meetings_select" ON public.meetings FOR SELECT TO authenticated
  USING (public.can_access_team_resource(auth.uid(), user_id));
CREATE POLICY "meetings_insert" ON public.meetings FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);
CREATE POLICY "meetings_update" ON public.meetings FOR UPDATE TO authenticated
  USING (public.can_access_team_resource(auth.uid(), user_id))
  WITH CHECK (public.can_access_team_resource(auth.uid(), user_id));
CREATE POLICY "meetings_delete" ON public.meetings FOR DELETE TO authenticated
  USING (public.can_access_team_resource(auth.uid(), user_id));
CREATE INDEX idx_meetings_user ON public.meetings(user_id);
CREATE INDEX idx_meetings_project ON public.meetings(project_id);
CREATE INDEX idx_meetings_started_at ON public.meetings(started_at DESC);
CREATE TRIGGER meetings_set_updated BEFORE UPDATE ON public.meetings
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE public.meeting_participants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  meeting_id UUID NOT NULL REFERENCES public.meetings(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name TEXT NOT NULL,
  company TEXT,
  role TEXT,
  attended BOOLEAN NOT NULL DEFAULT true,
  joined_at TIMESTAMPTZ,
  left_at TIMESTAMPTZ,
  speaking_seconds INTEGER NOT NULL DEFAULT 0,
  contact_ref JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.meeting_participants TO authenticated;
GRANT ALL ON public.meeting_participants TO service_role;
ALTER TABLE public.meeting_participants ENABLE ROW LEVEL SECURITY;
CREATE POLICY "mparticipants_all" ON public.meeting_participants FOR ALL TO authenticated
  USING (public.can_access_team_resource(auth.uid(), user_id))
  WITH CHECK (public.can_access_team_resource(auth.uid(), user_id));
CREATE INDEX idx_mparticipants_meeting ON public.meeting_participants(meeting_id);

CREATE TABLE public.meeting_transcripts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  meeting_id UUID NOT NULL REFERENCES public.meetings(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  seq INTEGER NOT NULL DEFAULT 0,
  speaker_label TEXT,
  text TEXT NOT NULL,
  started_at_ms INTEGER NOT NULL DEFAULT 0,
  ended_at_ms INTEGER NOT NULL DEFAULT 0,
  is_final BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.meeting_transcripts TO authenticated;
GRANT ALL ON public.meeting_transcripts TO service_role;
ALTER TABLE public.meeting_transcripts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "mtranscripts_all" ON public.meeting_transcripts FOR ALL TO authenticated
  USING (public.can_access_team_resource(auth.uid(), user_id))
  WITH CHECK (public.can_access_team_resource(auth.uid(), user_id));
CREATE INDEX idx_mtranscripts_meeting ON public.meeting_transcripts(meeting_id, seq);
CREATE INDEX idx_mtranscripts_fts ON public.meeting_transcripts USING GIN (to_tsvector('simple', text));

CREATE TABLE public.meeting_analyses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  meeting_id UUID NOT NULL UNIQUE REFERENCES public.meetings(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  summary TEXT,
  decisions JSONB NOT NULL DEFAULT '[]'::jsonb,
  risks JSONB NOT NULL DEFAULT '[]'::jsonb,
  action_items JSONB NOT NULL DEFAULT '[]'::jsonb,
  questions JSONB NOT NULL DEFAULT '[]'::jsonb,
  numbers JSONB NOT NULL DEFAULT '[]'::jsonb,
  next_meeting JSONB,
  model TEXT,
  prompt_version TEXT,
  generated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.meeting_analyses TO authenticated;
GRANT ALL ON public.meeting_analyses TO service_role;
ALTER TABLE public.meeting_analyses ENABLE ROW LEVEL SECURITY;
CREATE POLICY "manalyses_all" ON public.meeting_analyses FOR ALL TO authenticated
  USING (public.can_access_team_resource(auth.uid(), user_id))
  WITH CHECK (public.can_access_team_resource(auth.uid(), user_id));

CREATE TABLE public.meeting_action_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  meeting_id UUID NOT NULL REFERENCES public.meetings(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  assignee_name TEXT,
  assignee_user_id UUID,
  due_date DATE,
  priority TEXT NOT NULL DEFAULT 'medium' CHECK (priority IN ('low','medium','high','urgent')),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','approved','rejected','converted','done')),
  created_task_id UUID,
  notified_at TIMESTAMPTZ,
  notified_channels TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.meeting_action_items TO authenticated;
GRANT ALL ON public.meeting_action_items TO service_role;
ALTER TABLE public.meeting_action_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "mactions_all" ON public.meeting_action_items FOR ALL TO authenticated
  USING (public.can_access_team_resource(auth.uid(), user_id))
  WITH CHECK (public.can_access_team_resource(auth.uid(), user_id));
CREATE INDEX idx_mactions_meeting ON public.meeting_action_items(meeting_id);
CREATE INDEX idx_mactions_status ON public.meeting_action_items(user_id, status);
CREATE TRIGGER mactions_set_updated BEFORE UPDATE ON public.meeting_action_items
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
