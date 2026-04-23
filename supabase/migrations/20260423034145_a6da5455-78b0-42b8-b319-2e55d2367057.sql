ALTER TABLE public.user_profile ADD COLUMN IF NOT EXISTS pro_expires_at timestamptz;

CREATE INDEX IF NOT EXISTS idx_user_profile_pro_expires_at ON public.user_profile (pro_expires_at) WHERE pro_expires_at IS NOT NULL;