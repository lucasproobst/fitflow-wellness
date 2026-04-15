import { Droplets } from "lucide-react";

interface WaterTrackerProps {
  glasses: number;
  onAdd: () => void;
  target?: number;
}

export function WaterTracker({ glasses, onAdd, target = 8 }: WaterTrackerProps) {
  return (
    <div className="flex items-center justify-between">
      <div className="flex items-center gap-2">
        <Droplets size={20} className="text-blue-400" />
        <span className="text-sm font-medium text-foreground/80">
          {glasses * 250}ml / {target * 250}ml
        </span>
      </div>
      <button
        onClick={onAdd}
        className="px-3 py-1.5 rounded-full border border-white/10 text-xs font-medium text-foreground/80 hover:bg-white/5 active:scale-95 transition-all"
      >
        +250ml
      </button>
    </div>
  );
}
