import { motion } from "framer-motion";
import { evaluatePasswordStrength } from "@/lib/password-strength";

interface Props {
  password: string;
}

export function PasswordStrengthMeter({ password }: Props) {
  if (!password) return null;
  const r = evaluatePasswordStrength(password);
  // 4 segments, fill based on score (1-4); score 0 = first segment red
  const filled = Math.max(1, r.score);

  return (
    <div className="space-y-1.5">
      <div className="flex gap-1.5">
        {[0, 1, 2, 3].map(i => (
          <div key={i} className="flex-1 h-1 rounded-full bg-white/10 overflow-hidden">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: i < filled ? "100%" : "0%" }}
              transition={{ duration: 0.25, ease: "easeOut" }}
              className="h-full rounded-full"
              style={{ backgroundColor: r.color }}
            />
          </div>
        ))}
      </div>
      <div className="flex items-center justify-between px-0.5">
        <span className="text-[11px] font-medium" style={{ color: r.color }}>
          {r.label}
        </span>
        {r.hint && (
          <span className="text-[11px] text-foreground/40 truncate ml-2 max-w-[60%] text-right">
            {r.hint}
          </span>
        )}
      </div>
    </div>
  );
}
