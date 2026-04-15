interface CalorieRingProps {
  consumed: number;
  target: number;
  size?: number;
}

export function CalorieRing({ consumed, target, size = 224 }: CalorieRingProps) {
  const r = (size / 2) - 12;
  const circumference = 2 * Math.PI * r;
  const progress = Math.min(consumed / target, 1);
  const remaining = Math.max(target - consumed, 0);
  const cx = size / 2;
  const cy = size / 2;

  return (
    <div className="relative flex items-center justify-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={cx} cy={cy} r={r} strokeWidth={12} fill="none" stroke="rgba(255,255,255,0.04)" />
        <circle
          cx={cx} cy={cy} r={r}
          strokeWidth={12}
          fill="none"
          stroke="#22c55e"
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={circumference * (1 - progress)}
          className="transition-all duration-700"
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-4xl font-semibold text-white">{remaining}</span>
        <span className="text-[10px] font-bold uppercase tracking-[0.15em] text-white/30 mt-1">RESTANTE</span>
      </div>
    </div>
  );
}
