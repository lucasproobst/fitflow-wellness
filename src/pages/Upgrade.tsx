import { useNavigate, useLocation } from "react-router-dom";
import { ArrowLeft, Check, Sparkles, Zap } from "lucide-react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/lib/auth-context";
import {
  setPostAuthRedirect,
  buildKiwifyCheckoutUrl,
} from "@/lib/post-auth-redirect";

const FEATURES = [
  "Scanner de alimentos por câmera",
  "Acompanhamento completo de progresso",
  "Gerações ilimitadas de treino e dieta",
  "Histórico completo + fotos de evolução",
  "Suporte prioritário",
  "Pagamento único — acesso vitalício",
];

export default function Upgrade() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();

  // Mensagem contextual baseada na origem do bloqueio
  const blockedFrom = (location.state as { from?: string } | null)?.from;
  const featureBlocked =
    blockedFrom?.includes("scanner")
      ? "o Scanner de alimentos"
      : blockedFrom?.includes("progress")
      ? "o acompanhamento de Progresso"
      : "este recurso premium";

  const goCheckout = () => {
    if (!user) {
      setPostAuthRedirect("checkout-plus");
      navigate("/auth?redirect=checkout-plus");
      return;
    }
    window.location.href = buildKiwifyCheckoutUrl({
      id: user.id,
      email: user.email,
    });
  };

  return (
    <div className="min-h-screen bg-background text-foreground px-5 py-6">
      <div className="mobile-shell max-w-md mx-auto">
        <button
          onClick={() => navigate(-1)}
          className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground mb-6"
        >
          <ArrowLeft className="h-4 w-4" />
          Voltar
        </button>

        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
        >
          <div className="flex items-center gap-2 mb-4">
            <div className="h-10 w-10 rounded-2xl bg-fitflow-primary/15 flex items-center justify-center">
              <Sparkles className="h-5 w-5 text-fitflow-primary" />
            </div>
            <span className="text-xs font-extrabold tracking-widest text-fitflow-primary uppercase">
              FitFlow+
            </span>
          </div>

          <h1 className="text-3xl font-bold tracking-tight leading-tight">
            Desbloqueie {featureBlocked}
          </h1>
          <p className="mt-3 text-sm text-muted-foreground leading-relaxed">
            Este recurso faz parte do FitFlow+. Pague uma única vez e tenha
            acesso vitalício a tudo, incluindo atualizações futuras.
          </p>

          <div className="mt-8 rounded-3xl border border-fitflow-primary/30 bg-card p-6 shadow-2xl">
            <div className="flex items-baseline gap-2">
              <span className="text-sm text-muted-foreground line-through">
                R$ 197,00
              </span>
              <span className="text-xs font-bold text-fitflow-primary">
                -76%
              </span>
            </div>
            <div className="mt-1 flex items-baseline gap-2">
              <span className="text-5xl font-extrabold tracking-tight">
                R$ 47
              </span>
              <span className="text-sm text-muted-foreground">único</span>
            </div>
            <p className="mt-1 text-xs font-semibold text-fitflow-primary">
              Acesso vitalício • sem mensalidade
            </p>

            <ul className="mt-6 space-y-3">
              {FEATURES.map((f) => (
                <li key={f} className="flex items-start gap-3 text-sm">
                  <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-fitflow-primary/15">
                    <Check className="h-3 w-3 text-fitflow-primary" strokeWidth={3} />
                  </span>
                  <span className="text-foreground/90">{f}</span>
                </li>
              ))}
            </ul>

            <Button
              onClick={goCheckout}
              className="mt-7 w-full h-12 rounded-2xl bg-fitflow-primary hover:bg-fitflow-primary/90 text-black font-bold text-base"
            >
              <Zap className="h-4 w-4 mr-2" fill="currentColor" />
              Garantir FitFlow+ por R$ 47
            </Button>

            <p className="mt-3 text-center text-[11px] text-muted-foreground">
              🔒 Pagamento seguro via Kiwify • Liberação instantânea
            </p>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
