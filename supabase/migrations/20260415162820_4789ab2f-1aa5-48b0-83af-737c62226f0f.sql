
-- Add display_name to user_profile
ALTER TABLE public.user_profile ADD COLUMN IF NOT EXISTS display_name TEXT;

-- Allow authenticated users to read all user_profiles (for leaderboard display names)
CREATE POLICY "Authenticated users can view all profiles"
ON public.user_profile
FOR SELECT
TO authenticated
USING (true);

-- Allow authenticated users to read all user_achievements (for leaderboard)
CREATE POLICY "Authenticated users can view all achievements"
ON public.user_achievements
FOR SELECT
TO authenticated
USING (true);
