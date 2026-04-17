import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Check, Loader2 } from "lucide-react";

interface GenerationProgressProps {
  steps: string[];
  /** Approximate seconds each step is shown before advancing (last step holds until done) */
  stepDuration?: number;
  active: boolean;
}

/**
 * Animated multi-step progress indicator shown during long-running AI generation.
 * Steps advance on a timer; the last step keeps spinning until `active` flips false.
 */
export function GenerationProgress({ steps, stepDuration = 4, active }: GenerationProgressProps) {
  const [currentStep, setCurrentStep] = useState(0);

  useEffect(() => {
    if (!active) {
      setCurrentStep(0);
      return;
    }
    if (currentStep >= steps.length - 1) return;
    const t = setTimeout(() => setCurrentStep((s) => Math.min(s + 1, steps.length - 1)), stepDuration * 1000);
    return () => clearTimeout(t);
  }, [currentStep, active, steps.length, stepDuration]);

  if (!active) return null;

  const progressPct = ((currentStep + 1) / steps.length) * 100;

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -8 }}
      className="rounded-2xl bg-[#16181f] border border-white/[0.06] p-6 mb-4"
    >
      <div className="flex items-center justify-between mb-4">
        <span className="text-[10px] uppercase font-bold tracking-[0.15em] text-[#22c55e]">
          Gerando seu plano
        </span>
        <span className="text-[10px] font-bold text-white/40 tabular-nums">
          {Math.round(progressPct)}%
        </span>
      </div>

      {/* Progress bar */}
      <div className="h-1 rounded-full bg-white/[0.04] overflow-hidden mb-5">
        <motion.div
          className="h-full bg-[#22c55e] rounded-full"
          animate={{ width: `${progressPct}%` }}
          transition={{ duration: 0.5, ease: "easeOut" }}
        />
      </div>

      {/* Steps list */}
      <ul className="space-y-2.5">
        <AnimatePresence initial={false}>
          {steps.map((step, i) => {
            const isDone = i < currentStep;
            const isCurrent = i === currentStep;
            const isPending = i > currentStep;
            return (
              <motion.li
                key={i}
                initial={{ opacity: 0, x: -6 }}
                animate={{ opacity: isPending ? 0.3 : 1, x: 0 }}
                transition={{ duration: 0.25 }}
                className="flex items-center gap-3"
              >
                <span
                  className={`w-5 h-5 rounded-full flex items-center justify-center shrink-0 transition-colors ${
                    isDone
                      ? "bg-[#22c55e]/15"
                      : isCurrent
                        ? "bg-[#22c55e]/10"
                        : "bg-white/[0.04]"
                  }`}
                >
                  {isDone ? (
                    <Check size={11} className="text-[#22c55e]" />
                  ) : isCurrent ? (
                    <Loader2 size={11} className="text-[#22c55e] animate-spin" />
                  ) : (
                    <span className="w-1 h-1 rounded-full bg-white/20" />
                  )}
                </span>
                <span
                  className={`text-[13px] font-medium transition-colors ${
                    isCurrent ? "text-white" : isDone ? "text-white/50" : "text-white/30"
                  }`}
                >
                  {step}
                </span>
              </motion.li>
            );
          })}
        </AnimatePresence>
      </ul>
    </motion.div>
  );
}
