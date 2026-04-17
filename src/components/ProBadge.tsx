import { Zap } from "lucide-react";
import { motion } from "framer-motion";

interface ProBadgeProps {
  size?: number;
  className?: string;
  showLabel?: boolean;
}

/**
 * Badge "Pro" exibido ao lado do nome de assinantes do FitFlow Pro.
 * Renderize condicionalmente: {profile?.is_pro && <ProBadge />}
 */
export function ProBadge({ size = 12, className = "", showLabel = false }: ProBadgeProps) {
  return (
    <motion.span
      initial={{ scale: 0, rotate: -90 }}
      animate={{ scale: 1, rotate: 0 }}
      transition={{ type: "spring", stiffness: 500, damping: 18 }}
      title="Assinante FitFlow Pro"
      className={`inline-flex items-center gap-0.5 align-middle shrink-0 ${className}`}
    >
      <span
        className="inline-flex items-center justify-center rounded-full bg-[#22c55e]/15 border border-[#22c55e]/30"
        style={{ width: size + 6, height: size + 6 }}
      >
        <Zap size={size} className="text-[#22c55e]" fill="currentColor" strokeWidth={2} />
      </span>
      {showLabel && (
        <span className="text-[9px] font-extrabold tracking-wider text-[#22c55e] uppercase">Pro</span>
      )}
    </motion.span>
  );
}
