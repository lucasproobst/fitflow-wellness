import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import { useEffect } from "react";
import { toast } from "sonner";
import confetti from "canvas-confetti";

export interface AchievementDef {
  key: string;
  title: string;
  description: string;
  icon: string;
}

export const ACHIEVEMENTS: AchievementDef[] = [
  { key: "first_meal", title: "Primeira Mordida", description: "Registre sua primeira refeição", icon: "🍽️" },
  { key: "first_workout", title: "Primeira Rep", description: "Complete seu primeiro treino", icon: "💪" },
  { key: "first_weight", title: "Na Balança", description: "Registre seu primeiro peso", icon: "⚖️" },
  { key: "streak_3", title: "Hat Trick", description: "Alcance uma sequência de 3 dias", icon: "🔥" },
  { key: "streak_7", title: "Semana Completa", description: "Alcance uma sequência de 7 dias", icon: "🏆" },
  { key: "streak_14", title: "Duas Semanas Forte", description: "Alcance uma sequência de 14 dias", icon: "⭐" },
  { key: "streak_30", title: "Mestre Mensal", description: "Alcance uma sequência de 30 dias", icon: "👑" },
  { key: "lost_1kg", title: "Primeiro Quilo", description: "Perca 1 kg do peso inicial", icon: "📉" },
  { key: "lost_5kg", title: "Cinco a Menos", description: "Perca 5 kg do peso inicial", icon: "🎯" },
  { key: "lost_10kg", title: "Grande Marco", description: "Perca 10 kg do peso inicial", icon: "🌟" },
  { key: "water_8", title: "Hidratado", description: "Beba 8 copos de água em um dia", icon: "💧" },
  { key: "meals_10", title: "Planejador", description: "Registre 10 refeições no total", icon: "📋" },
  { key: "workouts_10", title: "Frequentador", description: "Complete 10 treinos", icon: "🏋️" },
  { key: "sleep_logged", title: "Rastreador de Sono", description: "Registre sua primeira noite de sono", icon: "😴" },
];

export function useAchievements() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["achievements", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("user_achievements")
        .select("achievement_key, unlocked_at")
        .eq("user_id", user!.id);
      if (error) throw error;
      return new Map(data.map(r => [r.achievement_key, r.unlocked_at]));
    },
  });
}

export function useUnlockAchievement() {
  const { user } = useAuth();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (key: string) => {
      const { error } = await supabase
        .from("user_achievements")
        .insert({ user_id: user!.id, achievement_key: key });
      if (error && !error.message.includes("duplicate")) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["achievements"] }),
  });
}

export function useCheckAchievements() {
  const { user } = useAuth();
  const { data: unlocked } = useAchievements();
  const unlock = useUnlockAchievement();

  useEffect(() => {
    if (!user || !unlocked) return;

    const check = async () => {
      const toUnlock: string[] = [];
      const has = (k: string) => unlocked.has(k);

      const [dailyRes, workoutRes, weightRes, sleepRes] = await Promise.all([
        supabase.from("daily_log").select("meals, water_glasses", { count: "exact" }).eq("user_id", user.id),
        supabase.from("workout_sessions").select("id", { count: "exact" }).eq("user_id", user.id),
        supabase.from("weight_logs").select("weight_kg, date").eq("user_id", user.id).order("date", { ascending: true }),
        supabase.from("sleep_logs").select("id", { count: "exact", head: true }).eq("user_id", user.id),
      ]);

      const allMeals = (dailyRes.data || []).reduce((total, r) => {
        const meals = r.meals as unknown as any[];
        return total + (Array.isArray(meals) ? meals.length : 0);
      }, 0);
      if (!has("first_meal") && allMeals > 0) toUnlock.push("first_meal");
      if (!has("meals_10") && allMeals >= 10) toUnlock.push("meals_10");

      const maxWater = Math.max(0, ...(dailyRes.data || []).map(r => r.water_glasses ?? 0));
      if (!has("water_8") && maxWater >= 8) toUnlock.push("water_8");

      const workoutCount = workoutRes.count ?? 0;
      if (!has("first_workout") && workoutCount > 0) toUnlock.push("first_workout");
      if (!has("workouts_10") && workoutCount >= 10) toUnlock.push("workouts_10");

      const weights = (weightRes.data || []).map(r => Number(r.weight_kg));
      if (!has("first_weight") && weights.length > 0) toUnlock.push("first_weight");
      if (weights.length >= 2) {
        const lost = weights[0] - Math.min(...weights);
        if (!has("lost_1kg") && lost >= 1) toUnlock.push("lost_1kg");
        if (!has("lost_5kg") && lost >= 5) toUnlock.push("lost_5kg");
        if (!has("lost_10kg") && lost >= 10) toUnlock.push("lost_10kg");
      }

      if (!has("sleep_logged") && (sleepRes.count ?? 0) > 0) toUnlock.push("sleep_logged");

      const since = new Date();
      since.setDate(since.getDate() - 90);
      const sinceStr = since.toISOString().split("T")[0];
      const [logRes2, workoutRes2] = await Promise.all([
        supabase.from("daily_log").select("date, meals").eq("user_id", user.id).gte("date", sinceStr),
        supabase.from("workout_sessions").select("date").eq("user_id", user.id).gte("date", sinceStr),
      ]);
      const mealDays = new Set(
        (logRes2.data || [])
          .filter(r => { const m = r.meals as unknown as any[]; return Array.isArray(m) && m.length > 0; })
          .map(r => r.date)
      );
      const workoutDays = new Set((workoutRes2.data || []).map(r => r.date));
      let streak = 0;
      for (let i = 0; i < 90; i++) {
        const d = new Date();
        d.setDate(d.getDate() - i);
        const ds = d.toISOString().split("T")[0];
        if (mealDays.has(ds) && workoutDays.has(ds)) streak++;
        else if (i > 0) break;
      }
      if (!has("streak_3") && streak >= 3) toUnlock.push("streak_3");
      if (!has("streak_7") && streak >= 7) toUnlock.push("streak_7");
      if (!has("streak_14") && streak >= 14) toUnlock.push("streak_14");
      if (!has("streak_30") && streak >= 30) toUnlock.push("streak_30");

      for (const key of toUnlock) {
        const def = ACHIEVEMENTS.find(a => a.key === key);
        unlock.mutate(key, {
          onSuccess: () => {
            if (def) {
              toast(
                `${def.icon} ${def.title} Desbloqueado!`,
                {
                  description: def.description,
                  duration: 5000,
                  className: "achievement-toast",
                }
              );
            }
          },
        });
      }
    };

    check();
  }, [user, unlocked]); // eslint-disable-line react-hooks/exhaustive-deps
}
