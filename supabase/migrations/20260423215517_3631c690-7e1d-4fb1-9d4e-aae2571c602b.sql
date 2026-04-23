-- 1. Adiciona coluna trial_ends_at
ALTER TABLE public.user_profile
ADD COLUMN IF NOT EXISTS trial_ends_at TIMESTAMP WITH TIME ZONE;

-- 2. Backfill: usuários existentes ganham 3 dias a partir de agora
UPDATE public.user_profile
SET trial_ends_at = now() + interval '3 days'
WHERE trial_ends_at IS NULL;

-- 3. Trigger: quando onboarding_complete passar de false/null para true,
--    definir trial_ends_at = now() + 3 dias (apenas se ainda não estiver definido)
CREATE OR REPLACE FUNCTION public.set_trial_on_onboarding_complete()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF NEW.onboarding_complete = true
     AND (OLD.onboarding_complete IS DISTINCT FROM true)
     AND NEW.trial_ends_at IS NULL THEN
    NEW.trial_ends_at := now() + interval '3 days';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_set_trial_on_onboarding_complete ON public.user_profile;
CREATE TRIGGER trg_set_trial_on_onboarding_complete
BEFORE UPDATE ON public.user_profile
FOR EACH ROW
EXECUTE FUNCTION public.set_trial_on_onboarding_complete();