CREATE TABLE public.food_favorites (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL,
  name text NOT NULL,
  serving text,
  calories numeric NOT NULL DEFAULT 0,
  protein numeric NOT NULL DEFAULT 0,
  carbs numeric NOT NULL DEFAULT 0,
  fat numeric NOT NULL DEFAULT 0,
  base_grams numeric NOT NULL DEFAULT 100,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.food_favorites ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own food favorites"
  ON public.food_favorites FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own food favorites"
  ON public.food_favorites FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own food favorites"
  ON public.food_favorites FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

CREATE INDEX idx_food_favorites_user ON public.food_favorites(user_id, created_at DESC);