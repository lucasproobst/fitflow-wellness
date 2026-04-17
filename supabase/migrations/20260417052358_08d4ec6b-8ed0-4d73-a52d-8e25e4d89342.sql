DROP TRIGGER IF EXISTS validate_user_profile_display_name ON public.user_profile;
CREATE TRIGGER validate_user_profile_display_name
BEFORE INSERT OR UPDATE ON public.user_profile
FOR EACH ROW EXECUTE FUNCTION public.validate_display_name();

DROP TRIGGER IF EXISTS update_user_profile_updated_at ON public.user_profile;
CREATE TRIGGER update_user_profile_updated_at
BEFORE UPDATE ON public.user_profile
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();