import { useNavigate } from "react-router-dom";
import { useProfile } from "@/lib/use-profile";
import { toast } from "sonner";

/**
 * Helper para checagens premium no client.
 * Considera `is_pro` E `pro_expires_at` (se a assinatura já expirou,
 * trata o usuário como free mesmo que `is_pro` ainda esteja true,
 * defesa em profundidade enquanto o webhook não atualiza).
 */
export function usePro() {
  const { data: profile, isLoading } = useProfile();
  const navigate = useNavigate();

  const expiresAt = profile?.pro_expires_at ? new Date(profile.pro_expires_at) : null;
  const expired = !!expiresAt && expiresAt.getTime() < Date.now();
  const isPro = !!profile?.is_pro && !expired;

  const requirePro = (label = "Este recurso") => {
    if (isPro) return true;
    toast.info(`${label} é exclusivo do FitFlow+`, {
      description: expired
        ? "Sua assinatura expirou. Renove para continuar."
        : "Faça upgrade para desbloquear.",
      action: { label: "Ver planos", onClick: () => navigate("/upgrade") },
    });
    navigate("/upgrade");
    return false;
  };

  return { isPro, isLoading, expiresAt, expired, requirePro };
}
