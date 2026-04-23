import { useProfile } from "@/lib/use-profile";

/**
 * Trial gratuito de 3 dias para Scanner e Progress.
 * Liberado automaticamente ao concluir o onboarding.
 */
export function useTrial() {
  const { data: profile, isLoading } = useProfile();

  const trialEndsAt = profile?.trial_ends_at ? new Date(profile.trial_ends_at) : null;
  const now = Date.now();
  const trialActive = !!trialEndsAt && trialEndsAt.getTime() > now;
  const trialExpired = !!trialEndsAt && trialEndsAt.getTime() <= now;
  const msLeft = trialEndsAt ? trialEndsAt.getTime() - now : 0;
  const daysLeft = Math.max(0, Math.ceil(msLeft / (1000 * 60 * 60 * 24)));
  const hoursLeft = Math.max(0, Math.ceil(msLeft / (1000 * 60 * 60)));

  return {
    isLoading,
    trialEndsAt,
    trialActive,
    trialExpired,
    daysLeft,
    hoursLeft,
  };
}
