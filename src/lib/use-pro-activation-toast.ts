import { useEffect, useRef } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Sparkles } from "lucide-react";
import { useProfile } from "@/lib/use-profile";

const STORAGE_KEY = "fitflow:pro-activated-celebrated";

/**
 * Detecta a transição de is_pro: false → true (após o webhook da Kiwify)
 * e dispara um toast de celebração + invalida queries do dashboard.
 *
 * Persistente: usa localStorage para garantir que o toast só aparece UMA vez
 * por ativação, mesmo após refresh.
 */
export function useProActivationToast() {
  const { data: profile } = useProfile();
  const qc = useQueryClient();
  const prevIsProRef = useRef<boolean | null>(null);

  useEffect(() => {
    if (!profile) return;
    const isPro = !!profile.is_pro;
    const prev = prevIsProRef.current;
    prevIsProRef.current = isPro;

    // primeira leitura — apenas registra estado, não dispara
    if (prev === null) return;

    // transição de free → pro
    if (!prev && isPro) {
      const alreadyCelebrated = localStorage.getItem(STORAGE_KEY) === profile.user_id;
      if (alreadyCelebrated) return;

      try {
        localStorage.setItem(STORAGE_KEY, profile.user_id);
      } catch {
        // noop
      }

      toast.success("FitFlow+ ativado! 🎉", {
        description: "Todos os recursos premium foram desbloqueados.",
        duration: 6000,
      });

      // força refresh do dashboard e telas dependentes de is_pro
      qc.invalidateQueries({ queryKey: ["profile"] });
      qc.invalidateQueries({ queryKey: ["daily-log"] });
      qc.invalidateQueries({ queryKey: ["meal-plan"] });
      qc.invalidateQueries({ queryKey: ["workout-plan"] });
    }

    // se voltou para free (refund/expiração), libera o flag para celebrar
    // de novo numa futura reativação
    if (prev && !isPro) {
      try {
        localStorage.removeItem(STORAGE_KEY);
      } catch {
        // noop
      }
    }
  }, [profile, qc]);
}
