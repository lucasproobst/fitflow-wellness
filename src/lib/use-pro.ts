import { useNavigate } from "react-router-dom";
import { useProfile } from "@/lib/use-profile";
import { useTrial } from "@/lib/use-trial";
import { toast } from "sonner";

/**
 * Helper para checagens premium no client.
 * Considera `is_pro` + `pro_expires_at` + `trial_ends_at`.
 * Durante o trial de 3 dias o usuário é tratado como pro para Scanner/Stats.
 */
export function usePro() {
  const { data: profile, isLoading } = useProfile();
  const { trialActive } = useTrial();
  const navigate = useNavigate();

  const expiresAt = profile?.pro_expires_at ? new Date(profile.pro_expires_at) : null;
  const expired = !!expiresAt && expiresAt.getTime() < Date.now();
  const isPaid = !!profile?.is_pro && !expired;
  const isPro = isPaid || trialActive;

  const requirePro = (label = "Este recurso") => {
    if (isPro) return true;
    toast.info(`${label} é exclusivo do FitFlow+`, {
      description: expired
        ? "Sua assinatura expirou. Renove para continuar."
        : "Seu período de testes acabou. Faça upgrade para continuar.",
      action: { label: "Ver planos", onClick: () => navigate("/upgrade") },
    });
    navigate("/upgrade");
    return false;
  };

  return { isPro, isPaid, trialActive, isLoading, expiresAt, expired, requirePro };
}
