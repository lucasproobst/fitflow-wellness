import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { ACHIEVEMENTS, useAchievements } from "@/lib/use-achievements";
import { useAuth } from "@/lib/auth-context";
import { useStreak } from "@/lib/use-tracking";
import { useProfile } from "@/lib/use-profile";
import { supabase } from "@/integrations/supabase/client";
import { Trophy, Lock, Share2 } from "lucide-react";
import { AchievementShareCard } from "@/components/AchievementShareCard";
import { motion } from "framer-motion";

function useAchievementProgress() {
  const { user } = useAuth();
  const { data: streakCount = 0 } = useStreak();

  return useQuery({
    queryKey: ["achievement-progress", user?.id, streakCount],
    enabled: !!user,
    queryFn: async () => {
      const [dailyRes, workoutRes, weightRes, sleepRes] = await Promise.all([
        supabase.from("daily_log").select("meals, water_glasses").eq("user_id", user!.id),
        supabase.from("workout_sessions").select("id", { count: "exact", head: true }).eq("user_id", user!.id),
        supabase.from("weight_logs").select("weight_kg").eq("user_id", user!.id).order("date", { ascending: true }),
        supabase.from("sleep_logs").select("id", { count: "exact", head: true }).eq("user_id", user!.id),
      ]);

      const totalMeals = (dailyRes.data || []).reduce((total, r) => {
        const meals = r.meals as unknown as any[];
        return total + (Array.isArray(meals) ? meals.length : 0);
      }, 0);

      const maxWater = Math.max(0, ...(dailyRes.data || []).map(r => r.water_glasses ?? 0));
      const workoutCount = workoutRes.count ?? 0;
      const weights = (weightRes.data || []).map(r => Number(r.weight_kg));
      const weightLost = weights.length >= 2 ? weights[0] - Math.min(...weights) : 0;
      const sleepCount = sleepRes.count ?? 0;

      return { totalMeals, maxWater, workoutCount, weights, weightLost, sleepCount, streak: streakCount };
    },
  });
}

function getProgress(key: string, stats: ReturnType<typeof useAchievementProgress>["data"]): { current: number; target: number } | null {
  if (!stats) return null;
  switch (key) {
    case "first_meal": return { current: Math.min(stats.totalMeals, 1), target: 1 };
    case "first_workout": return { current: Math.min(stats.workoutCount, 1), target: 1 };
    case "first_weight": return { current: Math.min(stats.weights.length, 1), target: 1 };
    case "sleep_logged": return { current: Math.min(stats.sleepCount, 1), target: 1 };
    case "streak_3": return { current: Math.min(stats.streak, 3), target: 3 };
    case "streak_7": return { current: Math.min(stats.streak, 7), target: 7 };
    case "streak_14": return { current: Math.min(stats.streak, 14), target: 14 };
    case "streak_30": return { current: Math.min(stats.streak, 30), target: 30 };
    case "lost_1kg": return { current: Math.min(Number(stats.weightLost.toFixed(1)), 1), target: 1 };
    case "lost_5kg": return { current: Math.min(Number(stats.weightLost.toFixed(1)), 5), target: 5 };
    case "lost_10kg": return { current: Math.min(Number(stats.weightLost.toFixed(1)), 10), target: 10 };
    case "water_8": return { current: Math.min(stats.maxWater, 8), target: 8 };
    case "meals_10": return { current: Math.min(stats.totalMeals, 10), target: 10 };
    case "workouts_10": return { current: Math.min(stats.workoutCount, 10), target: 10 };
    default: return null;
  }
}

export default function Achievements() {
  const { data: unlocked } = useAchievements();
  const { data: stats, isLoading } = useAchievementProgress();
  const { data: profile } = useProfile();
  const [shareAchievement, setShareAchievement] = useState<{ key: string; unlockedAt: string } | null>(null);
  const unlockedCount = unlocked?.size ?? 0;

  return (
    <div className="px-4 lg:px-8 py-6 max-w-4xl mx-auto">
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        className="flex items-center justify-between mb-1"
      >
        <h1 className="text-2xl font-bold tracking-tight text-white">Conquistas</h1>
        <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/[0.04] border border-white/[0.06]">
          <Trophy size={12} className="text-[#22c55e]" />
          <span className="text-[11px] font-bold text-white/50 tabular-nums">{unlockedCount}/{ACHIEVEMENTS.length}</span>
        </div>
      </motion.div>
      <motion.p
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.05 }}
        className="text-xs text-white/30 mb-6"
      >
        Acompanhe seus marcos e desbloqueie medalhas
      </motion.p>

      {/* Summary bar */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="rounded-2xl bg-[#16181f] border border-white/[0.06] p-5 mb-6"
      >
        <div className="flex items-center gap-3 mb-3">
          <div className="text-2xl">🏅</div>
          <div>
            <p className="text-sm font-bold text-white">
              {unlockedCount === 0
                ? "Comece sua jornada"
                : unlockedCount === ACHIEVEMENTS.length
                ? "Todas as medalhas desbloqueadas! 🎉"
                : `${ACHIEVEMENTS.length - unlockedCount} medalha${ACHIEVEMENTS.length - unlockedCount !== 1 ? "s" : ""} restante${ACHIEVEMENTS.length - unlockedCount !== 1 ? "s" : ""}`}
            </p>
            <p className="text-[11px] text-white/30 mt-0.5">
              {unlockedCount > 0
                ? `Você desbloqueou ${Math.round((unlockedCount / ACHIEVEMENTS.length) * 100)}% de todas as conquistas`
                : "Registre refeições, treinos e peso para ganhar medalhas"}
            </p>
          </div>
        </div>
        <div className="h-1.5 bg-white/[0.04] rounded-full overflow-hidden">
          <div
            className="h-full rounded-full bg-[#22c55e] transition-all duration-700"
            style={{ width: `${(unlockedCount / ACHIEVEMENTS.length) * 100}%` }}
          />
        </div>
      </motion.div>

      {/* Achievement grid */}
      <div className="space-y-2">
        {ACHIEVEMENTS.map((a, idx) => {
          const isUnlocked = unlocked?.has(a.key);
          const unlockedAt = unlocked?.get(a.key);
          const progress = getProgress(a.key, stats);
          const pct = progress ? Math.min((progress.current / progress.target) * 100, 100) : 0;

          return (
            <motion.div
              key={a.key}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.05 + idx * 0.03 }}
              className={`rounded-2xl bg-[#16181f] border p-4 transition-all ${
                isUnlocked ? "border-[#22c55e]/10" : "border-white/[0.04] opacity-60"
              }`}
            >
              <div className="flex items-start gap-3.5">
                <div className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 text-xl ${
                  isUnlocked ? "bg-[#22c55e]/[0.08]" : "bg-white/[0.03] grayscale"
                }`}>
                  {isUnlocked ? a.icon : <Lock size={18} className="text-white/15" />}
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2 mb-0.5">
                    <p className="text-xs font-bold text-white">{a.title}</p>
                    {isUnlocked && (
                      <button
                        onClick={() => setShareAchievement({ key: a.key, unlockedAt: unlockedAt! })}
                        className="p-1.5 rounded-lg bg-white/[0.04] text-white/30 hover:bg-white/[0.08] hover:text-white/50 transition-colors shrink-0"
                      >
                        <Share2 size={12} />
                      </button>
                    )}
                  </div>
                  <p className="text-[11px] text-white/30 mb-2">{a.description}</p>

                  {progress && (
                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-[10px] text-white/20 tabular-nums">
                          {progress.current}/{progress.target}
                        </span>
                        <span className="text-[10px] text-white/20 tabular-nums">
                          {Math.round(pct)}%
                        </span>
                      </div>
                      <div className="h-1 bg-white/[0.04] rounded-full overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all duration-500 ${
                            isUnlocked ? "bg-[#22c55e]" : "bg-white/10"
                          }`}
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                    </div>
                  )}

                  {isUnlocked && unlockedAt && (
                    <p className="text-[10px] text-white/15 mt-1.5">
                      Conquistado em {new Date(unlockedAt).toLocaleDateString("pt-BR", { month: "short", day: "numeric", year: "numeric" })}
                    </p>
                  )}
                </div>
              </div>
            </motion.div>
          );
        })}
      </div>

      {shareAchievement && (() => {
        const def = ACHIEVEMENTS.find(a => a.key === shareAchievement.key);
        if (!def) return null;
        return (
          <AchievementShareCard
            achievement={def}
            unlockedAt={shareAchievement.unlockedAt}
            userName={profile?.display_name ?? undefined}
            open
            onClose={() => setShareAchievement(null)}
          />
        );
      })()}
    </div>
  );
}
