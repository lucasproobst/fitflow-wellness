
CREATE TABLE public.recipe_cache (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  meal_plan_id UUID NOT NULL,
  day_index INTEGER NOT NULL,
  recipes JSONB NOT NULL DEFAULT '[]'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE (meal_plan_id, day_index)
);

ALTER TABLE public.recipe_cache ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own recipe cache" ON public.recipe_cache
  FOR SELECT TO authenticated USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own recipe cache" ON public.recipe_cache
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own recipe cache" ON public.recipe_cache
  FOR UPDATE TO authenticated USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own recipe cache" ON public.recipe_cache
  FOR DELETE TO authenticated USING (auth.uid() = user_id);
