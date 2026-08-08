ALTER TABLE public.meetings
  ADD COLUMN IF NOT EXISTS pipeline_stage text NOT NULL DEFAULT 'idle',
  ADD COLUMN IF NOT EXISTS pipeline_error text,
  ADD COLUMN IF NOT EXISTS speaker_map jsonb NOT NULL DEFAULT '{}'::jsonb;

ALTER TABLE public.meeting_transcripts
  ADD COLUMN IF NOT EXISTS speaker_confidence real;

ALTER TABLE public.meeting_analyses
  ADD COLUMN IF NOT EXISTS open_questions jsonb NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS speakers jsonb NOT NULL DEFAULT '[]'::jsonb;

ALTER TABLE public.meeting_action_items
  ADD COLUMN IF NOT EXISTS confidence real,
  ADD COLUMN IF NOT EXISTS source_quote text,
  ADD COLUMN IF NOT EXISTS speaker_label text;

CREATE INDEX IF NOT EXISTS idx_meeting_action_items_meeting_status
  ON public.meeting_action_items (meeting_id, status);