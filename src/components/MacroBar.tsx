interface MacroBarProps {
  label: string;
  current: number;
  target: number;
  unit?: string;
}

export function MacroBar({ label, current, target, unit = "g" }: MacroBarProps) {
  const pct = Math.min((current / target) * 100, 100);
  return (
    <div className="space-y-1">
      <div className="flex justify-between items-center">
        <span className="label-style text-[10px]">{label}</span>
        <span className="text-xs font-medium text-foreground/80">
          {current}{unit} / {target}{unit}
        </span>
      </div>
      <div className="h-1.5 bg-white/5 rounded-full overflow-hidden">
        <div
          className="h-full rounded-full bg-fitflow-primary transition-all duration-500"
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}
