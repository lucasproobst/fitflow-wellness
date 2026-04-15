import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import { useEffect } from "react";
import { toast } from "sonner";

export interface AchievementDef {
  key: string;
  title: string;
  description: string;
  icon: string; // emoji
}

export const ACHIEVEMENTS: AchievementDef[] = [
  { key: "first_meal", title: "First Bite", description: "Log your first meal", icon: "🍽️" },
  { key: "first_workout", title: "First Rep", description: "Complete your first workout", icon: "💪" },
  { key: "first_weight", title: "On the Scale", description: "Log your first weight entry", icon: "⚖️" },
  { key: "streak_3", title: "Hat Trick", description: "Reach a 3-day streak", icon: "🔥" },
  { key: "streak_7", title: "Full Week", description: "Reach a 7-day streak", icon: "🏆" },
  { key: "streak_14", title: "Two Weeks Strong", description: "Reach a 14-day streak", icon: "⭐" },
  { key: "streak_30", title: "Monthly Master", description: "Reach a 30-day streak", icon: "👑" },
  { key: "lost_1kg", title: "First Kilo Down", description: "Lose 1 kg from your starting weight", icon: "📉" },
  { key: "lost_5kg", title: "Five Down", description: "Lose 5 kg from your starting weight", icon: "🎯" },
  { key: "lost_10kg", title: "Major Milestone", description: "Lose 10 kg from your starting weight", icon: "🌟" },
  { key: "water_8", title: "Hydrated", description: "Drink 8 glasses of water in a day", icon: "💧" },
  { key: "meals_10", title: "Meal Prepper", description: "Log 10 meals total", icon: "📋" },
  { key: "workouts_10", title: "Gym Regular", description: "Complete 10 workouts", icon: "🏋️" },
  { key: "sleep_logged", title: "Sleep Tracker", description: "Log your first sleep entry", icon: "😴" },
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
      // ignore unique violation (already unlocked)
      if (error && !error.message.includes("duplicate")) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["achievements"] }),
  });
}

/**
 * Hook that checks milestones against real data and unlocks badges automatically.
 * Call this on the Dashboard so it runs on each visit.
 */
export function useCheckAchievements() {
  const { user } = useAuth();
  const { data: unlocked } = useAchievements();
  const unlock = useUnlockAchievement();

  useEffect(() => {
    if (!user || !unlocked) return;

    const check = async () => {
      const toUnlock: string[] = [];
      const has = (k: string) => unlocked.has(k);

      // Fetch counts in parallel
      const [dailyRes, workoutRes, weightRes, sleepRes] = await Promise.all([
        supabase.from("daily_log").select("meals, water_glasses", { count: "exact" }).eq("user_id", user.id),
        supabase.from("workout_sessions").select("id", { count: "exact" }).eq("user_id", user.id),
        supabase.from("weight_logs").select("weight_kg, date").eq("user_id", user.id).order("date", { ascending: true }),
        supabase.from("sleep_logs").select("id", { count: "exact", head: true }).eq("user_id", user.id),
      ]);

      // First meal
      const allMeals = (dailyRes.data || []).reduce((total, r) => {
        const meals = r.meals as unknown as any[];
        return total + (Array.isArray(meals) ? meals.length : 0);
      }, 0);
      if (!has("first_meal") && allMeals > 0) toUnlock.push("first_meal");
      if (!has("meals_10") && allMeals >= 10) toUnlock.push("meals_10");

      // Water
      const maxWater = Math.max(0, ...(dailyRes.data || []).map(r => r.water_glasses ?? 0));
      if (!has("water_8") && maxWater >= 8) toUnlock.push("water_8");

      // Workouts
      const workoutCount = workoutRes.count ?? 0;
      if (!has("first_workout") && workoutCount > 0) toUnlock.push("first_workout");
      if (!has("workouts_10") && workoutCount >= 10) toUnlock.push("workouts_10");

      // Weight
      const weights = (weightRes.data || []).map(r => Number(r.weight_kg));
      if (!has("first_weight") && weights.length > 0) toUnlock.push("first_weight");
      if (weights.length >= 2) {
        const lost = weights[0] - Math.min(...weights);
        if (!has("lost_1kg") && lost >= 1) toUnlock.push("lost_1kg");
        if (!has("lost_5kg") && lost >= 5) toUnlock.push("lost_5kg");
        if (!has("lost_10kg") && lost >= 10) toUnlock.push("lost_10kg");
      }

      // Sleep
      if (!has("sleep_logged") && (sleepRes.count ?? 0) > 0) toUnlock.push("sleep_logged");

      // Streak (fetch from existing data)
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
        else if (i > 0) break; // allow today to be incomplete
      }
      if (!has("streak_3") && streak >= 3) toUnlock.push("streak_3");
      if (!has("streak_7") && streak >= 7) toUnlock.push("streak_7");
      if (!has("streak_14") && streak >= 14) toUnlock.push("streak_14");
      if (!has("streak_30") && streak >= 30) toUnlock.push("streak_30");

      // Unlock all new achievements
      for (const key of toUnlock) {
        unlock.mutate(key);
      }
    };

    check();
  }, [user, unlocked]); // eslint-disable-line react-hooks/exhaustive-deps
}
