import { Zap, Sparkles } from "lucide-react";
import { motion } from "framer-motion";

interface ProBannerProps {
  variant?: "compact" | "hero";
  className?: string;
}

/**
 * Banner visual "FitFlow+ PRO" para usuários com is_pro = true.
 * - `compact`: faixa pequena para listas/headers
 * - `hero`: card grande para destaque (Profile/Dashboard)
 */
export function ProBanner({ variant = "compact", className = "" }: ProBannerProps) {
  if (variant === "compact") {
    return (
      <motion.div
        initial={{ opacity: 0, y: -4 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ type: "spring", stiffness: 400, damping: 22 }}
        className={`inline-flex items-center gap-1.5 px-2.5 h-6 rounded-full bg-gradient-to-r from-[#22c55e] to-[#16a34a] text-black ${className}`}
        style={{ boxShadow: "0 2px 10px rgba(34,197,94,0.35)" }}
        title="Assinante FitFlow+ PRO"
      >
        <Zap size={11} fill="currentColor" strokeWidth={0} />
        <span className="text-[10px] font-extrabold tracking-[0.12em] uppercase leading-none">
          FitFlow+ PRO
        </span>
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35 }}
      className={`relative overflow-hidden rounded-2xl border border-[#22c55e]/30 ${className}`}
      style={{
        background:
          "linear-gradient(135deg, rgba(34,197,94,0.18) 0%, rgba(22,163,74,0.08) 60%, rgba(10,10,10,0) 100%)",
        boxShadow: "0 6px 28px rgba(34,197,94,0.12)",
      }}
    >
      {/* Glow */}
      <motion.div
        aria-hidden
        animate={{ opacity: [0.35, 0.6, 0.35] }}
        transition={{ duration: 3.6, repeat: Infinity, ease: "easeInOut" }}
        className="absolute -top-10 -right-10 w-40 h-40 rounded-full"
        style={{ background: "radial-gradient(circle, rgba(34,197,94,0.45) 0%, transparent 70%)" }}
      />
      <div className="relative flex items-center gap-3 p-4">
        <motion.div
          animate={{ rotate: [0, -8, 8, 0] }}
          transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
          className="w-11 h-11 rounded-xl bg-[#22c55e] flex items-center justify-center shrink-0"
          style={{ boxShadow: "0 4px 16px rgba(34,197,94,0.45)" }}
        >
          <Zap size={22} className="text-black" fill="currentColor" strokeWidth={0} />
        </motion.div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5">
            <p className="text-[13px] font-extrabold text-white tracking-[0.08em] uppercase">
              FitFlow+ PRO
            </p>
            <Sparkles size={12} className="text-[#22c55e]" />
          </div>
          <p className="text-[12px] text-white/60 mt-0.5">
            Sua assinatura está ativa. Aproveite tudo sem limites.
          </p>
        </div>
      </div>
    </motion.div>
  );
}
