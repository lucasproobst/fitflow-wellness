import { useState } from "react";
import { Droplets } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

interface WaterTrackerProps {
  glasses: number;
  onAdd: () => void;
  target?: number;
}

export function WaterTracker({ glasses, onAdd, target = 8 }: WaterTrackerProps) {
  const [justAdded, setJustAdded] = useState(false);

  const handleAdd = () => {
    onAdd();
    setJustAdded(true);
    setTimeout(() => setJustAdded(false), 600);
  };

  return (
    <div className="flex items-center justify-between">
      <div className="flex items-center gap-2">
        <motion.div
          animate={justAdded ? { scale: [1, 1.3, 1], rotate: [0, -10, 10, 0] } : {}}
          transition={{ duration: 0.4 }}
        >
          <Droplets size={18} className={justAdded ? "text-blue-400" : "text-white/30"} />
        </motion.div>
        <span className="text-sm font-medium text-white/60 tabular-nums">
          {glasses * 250}ml / {target * 250}ml
        </span>
        <AnimatePresence>
          {justAdded && (
            <motion.span
              initial={{ opacity: 0, y: 0, scale: 0.8 }}
              animate={{ opacity: 1, y: -8, scale: 1 }}
              exit={{ opacity: 0, y: -16 }}
              transition={{ duration: 0.4 }}
              className="text-[10px] font-bold text-blue-400"
            >
              +250ml
            </motion.span>
          )}
        </AnimatePresence>
      </div>
      <motion.button
        onClick={handleAdd}
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.9 }}
        className="px-3 py-1.5 rounded-full border border-white/[0.08] text-xs font-medium text-white/50 hover:bg-white/[0.06] hover:text-white/70 hover:border-white/[0.12] transition-colors"
      >
        +250ml
      </motion.button>
    </div>
  );
}
