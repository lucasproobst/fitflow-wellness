import { useNavigate } from "react-router-dom";
import { useProfile } from "@/lib/use-profile";
import { toast } from "sonner";

/**
 * Helper para checagens premium no client.
 * Retorna `isPro`, `isLoading` e um helper `requirePro(label?)`
 * que bloqueia ações premium para usuários free e os redireciona
 * para `/upgrade` com um toast informativo.
 */
export function usePro() {
  const { data: profile, isLoading } = useProfile();
  const navigate = useNavigate();
  const isPro = !!profile?.is_pro;

  const requirePro = (label = "Este recurso") => {
    if (isPro) return true;
    toast.info(`${label} é exclusivo do FitFlow+`, {
      description: "Faça upgrade para desbloquear.",
      action: { label: "Ver planos", onClick: () => navigate("/upgrade") },
    });
    navigate("/upgrade");
    return false;
  };

  return { isPro, isLoading, requirePro };
}
