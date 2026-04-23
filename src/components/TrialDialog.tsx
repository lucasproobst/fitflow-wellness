import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Sparkles, Camera, BarChart3, Check, X, Clock } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useAuth } from "@/lib/auth-context";
import { useProfile } from "@/lib/use-profile";
import { useTrial } from "@/lib/use-trial";

const SEEN_START_KEY = (uid: string) => `fitflow:trial-start-seen:${uid}`;
const SEEN_END_KEY = (uid: string) => `fitflow:trial-end-seen:${uid}`;

/**
 * Pop-ups de trial:
 *  - "start": aparece 1x quando o usuário ganha o trial (após onboarding)
 *  - "end": aparece 1x quando o trial expira, mostrando os planos
 * Não aparece para usuários que já são pagantes (is_pro real e não expirado).
 */
export function TrialDialog() {
  const { user } = useAuth();
  const { data: profile } = useProfile();
  const { trialActive, trialExpired, daysLeft, hoursLeft } = useTrial();
  const navigate = useNavigate();
  const [open, setOpen] = useState<"start" | "end" | null>(null);

  // Considera "pago de verdade" para não incomodar quem já assinou
  const expiresAt = profile?.pro_expires_at ? new Date(profile.pro_expires_at) : null;
  const isPaid = !!profile?.is_pro && (!expiresAt || expiresAt.getTime() > Date.now());

  useEffect(() => {
    if (!user || !profile || isPaid) return;
    if (!profile.trial_ends_at) return;

    const startKey = SEEN_START_KEY(user.id);
    const endKey = SEEN_END_KEY(user.id);

    if (trialActive && !localStorage.getItem(startKey)) {
      setOpen("start");
      return;
    }
    if (trialExpired && !localStorage.getItem(endKey)) {
      setOpen("end");
      return;
    }
  }, [user, profile, isPaid, trialActive, trialExpired]);

  const handleClose = () => {
    if (!user) return setOpen(null);
    if (open === "start") localStorage.setItem(SEEN_START_KEY(user.id), "1");
    if (open === "end") localStorage.setItem(SEEN_END_KEY(user.id), "1");
    setOpen(null);
  };

  const handleUpgrade = () => {
    handleClose();
    navigate("/upgrade");
  };

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={handleClose}
            className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[100]"
          />
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.96 }}
            transition={{ type: "spring", damping: 22, stiffness: 240 }}
            className="fixed inset-0 z-[101] flex items-center justify-center px-5 pointer-events-none"
          >
            <div className="w-full max-w-[400px] bg-[#141414] border border-white/[0.08] rounded-3xl overflow-hidden pointer-events-auto relative">
              <button
                onClick={handleClose}
                aria-label="Fechar"
                className="absolute top-4 right-4 w-8 h-8 rounded-full bg-white/[0.06] flex items-center justify-center text-white/60 hover:text-white active:scale-90 transition-all z-10"
              >
                <X size={16} />
              </button>

              {open === "start" ? (
                <div className="p-6 pt-8">
                  <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-[#22c55e] to-[#16a34a] flex items-center justify-center mb-4">
                    <Sparkles size={26} className="text-white" />
                  </div>
                  <h2 className="text-[22px] font-bold text-white leading-tight">
                    Seu período de testes começou! 🎉
                  </h2>
                  <p className="text-[14px] text-[#9ca3af] mt-2 leading-relaxed">
                    Você tem <span className="text-white font-semibold">3 dias grátis</span> para
                    explorar os recursos premium do FitFlow.
                  </p>

                  <div className="mt-5 space-y-2.5">
                    <FeatureRow icon={Camera} title="Scanner de alimentos" subtitle="Aponte a câmera e veja calorias e macros" />
                    <FeatureRow icon={BarChart3} title="Acompanhamento completo" subtitle="Peso, medidas, fotos e histórico" />
                  </div>

                  <div className="mt-5 flex items-center gap-2 px-3.5 py-2.5 rounded-xl bg-[#22c55e]/10 border border-[#22c55e]/20">
                    <Clock size={14} className="text-[#22c55e] shrink-0" />
                    <p className="text-[12px] text-[#22c55e] font-medium">
                      {daysLeft > 1
                        ? `${daysLeft} dias restantes`
                        : hoursLeft > 1
                        ? `${hoursLeft} horas restantes`
                        : "Últimas horas"}
                    </p>
                  </div>

                  <button
                    onClick={handleClose}
                    className="w-full mt-5 h-12 rounded-xl bg-[#22c55e] text-white font-bold text-[15px] active:scale-95 transition-transform"
                  >
                    Começar a usar
                  </button>
                </div>
              ) : (
                <div className="p-6 pt-8">
                  <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-[#fbbf24] to-[#f59e0b] flex items-center justify-center mb-4">
                    <Sparkles size={26} className="text-white" />
                  </div>
                  <h2 className="text-[22px] font-bold text-white leading-tight">
                    Seu período de testes acabou
                  </h2>
                  <p className="text-[14px] text-[#9ca3af] mt-2 leading-relaxed">
                    Continue com tudo que você já estava usando — Scanner, acompanhamento,
                    gerações ilimitadas e muito mais.
                  </p>

                  <div className="mt-5 p-4 rounded-2xl bg-[#0a0a0a] border border-white/[0.08]">
                    <div className="flex items-baseline gap-2">
                      <span className="text-[12px] text-[#6b7280] line-through">R$ 197</span>
                      <span className="text-[11px] text-[#22c55e] font-bold">-76%</span>
                    </div>
                    <div className="flex items-baseline gap-1.5 mt-1">
                      <span className="text-[34px] font-bold text-white leading-none">R$ 47</span>
                      <span className="text-[13px] text-[#9ca3af]">único</span>
                    </div>
                    <p className="text-[12px] text-[#22c55e] font-semibold mt-1">
                      Acesso vitalício • sem mensalidade
                    </p>

                    <div className="mt-3.5 space-y-1.5">
                      {["Scanner de alimentos", "Acompanhamento completo", "Gerações ilimitadas", "Pagamento único"].map(f => (
                        <div key={f} className="flex items-center gap-2">
                          <div className="w-4 h-4 rounded-full bg-[#22c55e]/15 flex items-center justify-center shrink-0">
                            <Check size={10} className="text-[#22c55e]" strokeWidth={3} />
                          </div>
                          <span className="text-[13px] text-white/85">{f}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  <button
                    onClick={handleUpgrade}
                    className="w-full mt-5 h-12 rounded-xl bg-[#22c55e] text-white font-bold text-[15px] active:scale-95 transition-transform"
                  >
                    Garantir FitFlow+ por R$ 47
                  </button>
                  <button
                    onClick={handleClose}
                    className="w-full mt-2 h-10 text-[13px] text-[#6b7280] hover:text-white transition-colors"
                  >
                    Agora não
                  </button>
                </div>
              )}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

function FeatureRow({ icon: Icon, title, subtitle }: { icon: any; title: string; subtitle: string }) {
  return (
    <div className="flex items-center gap-3 p-3 rounded-xl bg-[#0a0a0a] border border-white/[0.05]">
      <div className="w-9 h-9 rounded-full bg-[#22c55e]/15 flex items-center justify-center shrink-0">
        <Icon size={17} className="text-[#22c55e]" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-[14px] font-semibold text-white leading-tight">{title}</p>
        <p className="text-[11.5px] text-[#6b7280] mt-0.5">{subtitle}</p>
      </div>
    </div>
  );
}
