import { motion, useMotionValue, useTransform, AnimatePresence } from "framer-motion";
import { Trash2 } from "lucide-react";
import { useState } from "react";
import { DailyLogMeal } from "@/lib/use-tracking";

interface SwipeableMealItemProps {
  meal: DailyLogMeal;
  onDelete: () => void;
}

const SWIPE_THRESHOLD = -80;
const FULL_SWIPE = -120;

export function SwipeableMealItem({ meal, onDelete }: SwipeableMealItemProps) {
  const [confirming, setConfirming] = useState(false);
  const [removed, setRemoved] = useState(false);
  const x = useMotionValue(0);

  const bgOpacity = useTransform(x, [SWIPE_THRESHOLD, 0], [1, 0]);
  const iconScale = useTransform(x, [FULL_SWIPE, SWIPE_THRESHOLD, 0], [1.15, 1, 0.6]);

  const handleDragEnd = (_: unknown, info: { offset: { x: number }; velocity: { x: number } }) => {
    if (info.offset.x < SWIPE_THRESHOLD || info.velocity.x < -500) {
      setConfirming(true);
      // snap card open at threshold
      x.set(SWIPE_THRESHOLD);
    } else {
      setConfirming(false);
      x.set(0);
    }
  };

  const cancel = () => {
    setConfirming(false);
    x.set(0);
  };

  const confirm = () => {
    setRemoved(true);
    setTimeout(onDelete, 200);
  };

  return (
    <AnimatePresence>
      {!removed && (
        <motion.div
          initial={{ opacity: 1, height: "auto" }}
          exit={{ opacity: 0, height: 0, marginTop: 0, marginBottom: 0 }}
          transition={{ duration: 0.2 }}
          className="relative overflow-hidden rounded-lg"
        >
          {/* Delete background */}
          <motion.div
            style={{ opacity: bgOpacity }}
            className="absolute inset-0 flex items-center justify-end pr-4 bg-red-500/15 rounded-lg"
          >
            <motion.div style={{ scale: iconScale }}>
              <Trash2 size={16} className="text-red-400" />
            </motion.div>
          </motion.div>

          {/* Foreground card */}
          <motion.div
            drag="x"
            dragConstraints={{ left: FULL_SWIPE, right: 0 }}
            dragElastic={{ left: 0.15, right: 0 }}
            onDragEnd={handleDragEnd}
            style={{ x }}
            className="relative rounded-lg bg-[#1a1a1a] border border-white/[0.04] px-3 py-2 flex items-center justify-between cursor-grab active:cursor-grabbing touch-pan-y"
          >
            <div className="min-w-0">
              <p className="text-[11px] font-bold text-white truncate">{meal.name}</p>
              <p className="text-[9px] text-white/30 mt-0.5">P:{meal.protein}g · C:{meal.carbs}g · G:{meal.fat}g</p>
            </div>
            <span className="text-xs font-extrabold text-white tabular-nums shrink-0 ml-2">{meal.calories}</span>
          </motion.div>

          {/* Confirm overlay */}
          <AnimatePresence>
            {confirming && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="absolute inset-0 flex items-center justify-end gap-1.5 pr-2 bg-[#1a1a1a]/95 rounded-lg backdrop-blur-sm"
              >
                <button
                  onClick={cancel}
                  className="h-7 px-3 rounded-md text-[10px] font-bold text-white/60 hover:text-white hover:bg-white/[0.05] transition-colors"
                >
                  Cancelar
                </button>
                <button
                  onClick={confirm}
                  className="h-7 px-3 rounded-md text-[10px] font-bold text-white bg-red-500 hover:bg-red-600 transition-colors flex items-center gap-1"
                >
                  <Trash2 size={11} />
                  Excluir
                </button>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
