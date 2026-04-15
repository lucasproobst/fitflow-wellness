interface MacroBarProps {
  label: string;
  current: number;
  target: number;
  unit?: string;
}

export function MacroBar({ label, current, target, unit = "g" }: MacroBarProps) {
  const pct = Math.min((current / target) * 100, 100);
  return (
    <div className="space-y-1.5">
      <div className="flex justify-between items-center">
        <span className="text-[10px] font-bold uppercase tracking-[0.15em] text-white/30">{label}</span>
        <span className="text-xs font-medium text-white/60">
          {Number(current.toFixed(1))}{unit} / {target}{unit}
        </span>
      </div>
      <div className="h-1.5 bg-white/[0.04] rounded-full overflow-hidden">
        <div
          className="h-full rounded-full bg-[#22c55e] transition-all duration-500"
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}
