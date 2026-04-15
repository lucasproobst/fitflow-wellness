-- RLS policies for progress-photos storage bucket
CREATE POLICY "Users can upload own progress photos"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'progress-photos' AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "Users can view own progress photos"
ON storage.objects FOR SELECT
TO authenticated
USING (bucket_id = 'progress-photos' AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "Users can delete own progress photos"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'progress-photos' AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "Users can update own progress photos"
ON storage.objects FOR UPDATE
TO authenticated
USING (bucket_id = 'progress-photos' AND (storage.foldername(name))[1] = auth.uid()::text);