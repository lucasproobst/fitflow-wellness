
CREATE TABLE public.food_scans (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  name TEXT NOT NULL,
  serving TEXT,
  calories NUMERIC NOT NULL DEFAULT 0,
  protein NUMERIC NOT NULL DEFAULT 0,
  carbs NUMERIC NOT NULL DEFAULT 0,
  fat NUMERIC NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.food_scans ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own scans" ON public.food_scans FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own scans" ON public.food_scans FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can delete own scans" ON public.food_scans FOR DELETE USING (auth.uid() = user_id);
