
CREATE POLICY "meeting_audio_read_own"
  ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'meeting-audio' AND (storage.foldername(name))[1] = auth.uid()::text);
CREATE POLICY "meeting_audio_insert_own"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'meeting-audio' AND (storage.foldername(name))[1] = auth.uid()::text);
CREATE POLICY "meeting_audio_update_own"
  ON storage.objects FOR UPDATE TO authenticated
  USING (bucket_id = 'meeting-audio' AND (storage.foldername(name))[1] = auth.uid()::text);
CREATE POLICY "meeting_audio_delete_own"
  ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'meeting-audio' AND (storage.foldername(name))[1] = auth.uid()::text);
