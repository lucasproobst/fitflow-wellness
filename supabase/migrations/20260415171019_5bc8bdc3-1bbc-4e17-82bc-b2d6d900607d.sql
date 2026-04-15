
-- Function to validate display names server-side
CREATE OR REPLACE FUNCTION public.validate_display_name()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  blocked_words text[] := ARRAY[
    'idiota', 'burro', 'merda', 'porra', 'caralho', 'puta', 'fdp',
    'otario', 'otária', 'cuzao', 'cuzão', 'viado', 'arrombado',
    'desgraça', 'desgraca', 'babaca', 'imbecil', 'retardado',
    'fuck', 'shit', 'ass', 'bitch', 'dick', 'damn', 'bastard'
  ];
  lower_name text;
  word text;
BEGIN
  -- Allow NULL display names (not yet set)
  IF NEW.display_name IS NULL THEN
    RETURN NEW;
  END IF;

  -- Trim whitespace
  NEW.display_name := trim(NEW.display_name);

  -- Minimum length
  IF length(NEW.display_name) < 3 THEN
    RAISE EXCEPTION 'O nome deve ter pelo menos 3 caracteres';
  END IF;

  -- Maximum length
  IF length(NEW.display_name) > 30 THEN
    RAISE EXCEPTION 'O nome deve ter no máximo 30 caracteres';
  END IF;

  -- Only allow letters, numbers, spaces, dots, hyphens, underscores
  IF NEW.display_name !~ '^[a-zA-ZÀ-ÿ0-9 _.\-]+$' THEN
    RAISE EXCEPTION 'O nome contém caracteres inválidos';
  END IF;

  -- Check blocked words
  lower_name := lower(NEW.display_name);
  FOREACH word IN ARRAY blocked_words LOOP
    IF position(word in lower_name) > 0 THEN
      RAISE EXCEPTION 'O nome contém palavras inadequadas';
    END IF;
  END LOOP;

  RETURN NEW;
END;
$$;

-- Attach trigger to user_profile table
CREATE TRIGGER validate_display_name_trigger
BEFORE INSERT OR UPDATE ON public.user_profile
FOR EACH ROW
EXECUTE FUNCTION public.validate_display_name();
