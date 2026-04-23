-- Recriar função para tratar INSERT e UPDATE de forma consistente
CREATE OR REPLACE FUNCTION public.set_trial_on_onboarding_complete()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO 'public'
AS $function$
BEGIN
  -- Em INSERT: se já vier com onboarding_complete=true e sem trial, seta
  IF TG_OP = 'INSERT' THEN
    IF NEW.onboarding_complete = true AND NEW.trial_ends_at IS NULL THEN
      NEW.trial_ends_at := now() + interval '3 days';
    END IF;
    RETURN NEW;
  END IF;

  -- Em UPDATE: dispara quando muda de não-true para true
  IF TG_OP = 'UPDATE' THEN
    IF NEW.onboarding_complete = true
       AND (OLD.onboarding_complete IS DISTINCT FROM true)
       AND NEW.trial_ends_at IS NULL THEN
      NEW.trial_ends_at := now() + interval '3 days';
    END IF;
    RETURN NEW;
  END IF;

  RETURN NEW;
END;
$function$;

-- Recriar trigger cobrindo INSERT e UPDATE
DROP TRIGGER IF EXISTS trg_set_trial_on_onboarding_complete ON public.user_profile;
CREATE TRIGGER trg_set_trial_on_onboarding_complete
BEFORE INSERT OR UPDATE ON public.user_profile
FOR EACH ROW
EXECUTE FUNCTION public.set_trial_on_onboarding_complete();