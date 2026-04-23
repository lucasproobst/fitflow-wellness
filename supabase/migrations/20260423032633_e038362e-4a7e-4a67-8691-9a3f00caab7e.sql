-- Habilita Realtime no user_profile para detecção instantânea de ativação do plano
ALTER TABLE public.user_profile REPLICA IDENTITY FULL;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND tablename = 'user_profile'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.user_profile;
  END IF;
END $$;