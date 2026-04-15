import { ACHIEVEMENTS, useAchievements } from "@/lib/use-achievements";
import { GlassCard } from "./GlassCard";

export function AchievementBadges() {
  const { data: unlocked, isLoading } = useAchievements();

  if (isLoading) return null;

  const unlockedCount = unlocked?.size ?? 0;

  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <h2 className="label-style text-[10px]">CONQUISTAS</h2>
        <span className="text-[10px] font-semibold text-foreground/40">
          {unlockedCount} / {ACHIEVEMENTS.length}
        </span>
      </div>
      <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
        {ACHIEVEMENTS.map(a => {
          const isUnlocked = unlocked?.has(a.key);
          return (
            <div
              key={a.key}
              className={`rounded-xl p-3 text-center transition-all ${
                isUnlocked
                  ? "glass-card border-fitflow-primary/20"
                  : "bg-white/[0.02] border border-white/5 opacity-40 grayscale"
              }`}
            >
              <div className="text-2xl mb-1">{a.icon}</div>
              <p className="text-[10px] font-semibold text-foreground leading-tight">{a.title}</p>
              <p className="text-[8px] text-foreground/40 mt-0.5 leading-tight">{a.description}</p>
            </div>
          );
        })}
      </div>
    </div>
  );
}
