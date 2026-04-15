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
        <circle cx={cx} cy={cy} r={r} strokeWidth={12} fill="none" className="stroke-white/5" />
        <circle
          cx={cx} cy={cy} r={r}
          strokeWidth={12}
          fill="none"
          stroke="#0D9E75"
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={circumference * (1 - progress)}
          className="transition-all duration-700"
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-4xl font-semibold text-foreground">{remaining}</span>
        <span className="label-style text-[10px] mt-1">RESTANTE</span>
      </div>
    </div>
  );
}
