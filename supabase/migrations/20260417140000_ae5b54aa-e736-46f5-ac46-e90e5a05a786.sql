CREATE TABLE public.progress_photos (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  storage_path TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('before', 'after')),
  taken_on DATE NOT NULL DEFAULT CURRENT_DATE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.progress_photos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own progress photos"
ON public.progress_photos FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own progress photos"
ON public.progress_photos FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own progress photos"
ON public.progress_photos FOR DELETE
TO authenticated
USING (auth.uid() = user_id);

CREATE INDEX idx_progress_photos_user_date ON public.progress_photos(user_id, taken_on DESC);