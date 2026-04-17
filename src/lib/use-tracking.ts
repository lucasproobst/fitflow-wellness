import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";

function today() {
  return new Date().toISOString().split("T")[0];
}

// ─── Daily Log ───

export type MealType = "breakfast" | "lunch" | "snack" | "dinner";

export interface DailyLogMeal {
  name: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  mealType?: MealType;
}

export interface DailyLog {
  id: string;
  user_id: string;
  date: string;
  meals: DailyLogMeal[];
  water_glasses: number;
  calories_total: number;
}

export function useDailyLog(date?: string) {
  const { user } = useAuth();
  const d = date || today();
  return useQuery({
    queryKey: ["daily-log", user?.id, d],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("daily_log")
        .select("*")
        .eq("user_id", user!.id)
        .eq("date", d)
        .maybeSingle();
      if (error) throw error;
      if (!data) return null;
      return {
        ...data,
        meals: (data.meals as unknown as DailyLogMeal[]) || [],
        water_glasses: data.water_glasses ?? 0,
        calories_total: Number(data.calories_total) || 0,
      } as DailyLog;
    },
  });
}

export function useUpsertDailyLog() {
  const { user } = useAuth();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (updates: {
      date?: string;
      meals?: DailyLogMeal[];
      water_glasses?: number;
      calories_total?: number;
    }) => {
      const d = updates.date || today();
      const { data: existing } = await supabase
        .from("daily_log")
        .select("id, meals, water_glasses, calories_total")
        .eq("user_id", user!.id)
        .eq("date", d)
        .maybeSingle();

      if (existing) {
        const merged: any = {};
        if (updates.meals !== undefined) {
          merged.meals = updates.meals;
          merged.calories_total = updates.meals.reduce((s, m) => s + m.calories, 0);
        }
        if (updates.water_glasses !== undefined) merged.water_glasses = updates.water_glasses;
        if (updates.calories_total !== undefined) merged.calories_total = updates.calories_total;

        const { error } = await supabase
          .from("daily_log")
          .update(merged)
          .eq("id", existing.id);
        if (error) throw error;
      } else {
        const meals = updates.meals || [];
        const { error } = await supabase.from("daily_log").insert({
          user_id: user!.id,
          date: d,
          meals: meals as unknown as any,
          water_glasses: updates.water_glasses ?? 0,
          calories_total: updates.calories_total ?? meals.reduce((s, m) => s + m.calories, 0),
        });
        if (error) throw error;
      }
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["daily-log"] }),
  });
}

export function useAddWater() {
  const { user } = useAuth();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async () => {
      const d = today();
      const { data: existing } = await supabase
        .from("daily_log")
        .select("id, water_glasses")
        .eq("user_id", user!.id)
        .eq("date", d)
        .maybeSingle();

      if (existing) {
        const { error } = await supabase
          .from("daily_log")
          .update({ water_glasses: (existing.water_glasses ?? 0) + 1 })
          .eq("id", existing.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("daily_log").insert({
          user_id: user!.id,
          date: d,
          water_glasses: 1,
          meals: [] as unknown as any,
          calories_total: 0,
        });
        if (error) throw error;
      }
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["daily-log"] }),
  });
}

// ─── Weight Logs ───

export function useWeightLogs(days = 30) {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["weight-logs", user?.id, days],
    enabled: !!user,
    queryFn: async () => {
      const since = new Date();
      since.setDate(since.getDate() - days);
      const { data, error } = await supabase
        .from("weight_logs")
        .select("*")
        .eq("user_id", user!.id)
        .gte("date", since.toISOString().split("T")[0])
        .order("date", { ascending: true });
      if (error) throw error;
      return data.map(r => ({ ...r, weight_kg: Number(r.weight_kg) }));
    },
  });
}

export function useLogWeight() {
  const { user } = useAuth();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (weight_kg: number) => {
      const d = today();
      const { data: existing } = await supabase
        .from("weight_logs")
        .select("id")
        .eq("user_id", user!.id)
        .eq("date", d)
        .maybeSingle();

      if (existing) {
        const { error } = await supabase
          .from("weight_logs")
          .update({ weight_kg })
          .eq("id", existing.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("weight_logs").insert({
          user_id: user!.id,
          date: d,
          weight_kg,
        });
        if (error) throw error;
      }
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["weight-logs"] }),
  });
}

// ─── Sleep Logs ───

export function useSleepLogs(days = 14) {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["sleep-logs", user?.id, days],
    enabled: !!user,
    queryFn: async () => {
      const since = new Date();
      since.setDate(since.getDate() - days);
      const { data, error } = await supabase
        .from("sleep_logs")
        .select("*")
        .eq("user_id", user!.id)
        .gte("date", since.toISOString().split("T")[0])
        .order("date", { ascending: true });
      if (error) throw error;
      return data.map(r => ({ ...r, hours_slept: Number(r.hours_slept) }));
    },
  });
}

export function useLogSleep() {
  const { user } = useAuth();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (hours: number) => {
      const d = today();
      const { data: existing } = await supabase
        .from("sleep_logs")
        .select("id")
        .eq("user_id", user!.id)
        .eq("date", d)
        .maybeSingle();

      if (existing) {
        const { error } = await supabase
          .from("sleep_logs")
          .update({ hours_slept: hours })
          .eq("id", existing.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("sleep_logs").insert({
          user_id: user!.id,
          date: d,
          hours_slept: hours,
        });
        if (error) throw error;
      }
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["sleep-logs"] }),
  });
}

// ─── Measurement Logs ───

export function useMeasurementLogs(days = 90) {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["measurement-logs", user?.id, days],
    enabled: !!user,
    queryFn: async () => {
      const since = new Date();
      since.setDate(since.getDate() - days);
      const { data, error } = await supabase
        .from("measurement_logs")
        .select("*")
        .eq("user_id", user!.id)
        .gte("date", since.toISOString().split("T")[0])
        .order("date", { ascending: true });
      if (error) throw error;
      return data.map(r => ({
        ...r,
        waist_cm: r.waist_cm ? Number(r.waist_cm) : null,
        chest_cm: r.chest_cm ? Number(r.chest_cm) : null,
        arms_cm: r.arms_cm ? Number(r.arms_cm) : null,
      }));
    },
  });
}

export function useLogMeasurements() {
  const { user } = useAuth();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (m: { waist_cm?: number; chest_cm?: number; arms_cm?: number }) => {
      const d = today();
      const { data: existing } = await supabase
        .from("measurement_logs")
        .select("id")
        .eq("user_id", user!.id)
        .eq("date", d)
        .maybeSingle();

      if (existing) {
        const { error } = await supabase
          .from("measurement_logs")
          .update(m)
          .eq("id", existing.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("measurement_logs").insert({
          user_id: user!.id,
          date: d,
          ...m,
        });
        if (error) throw error;
      }
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["measurement-logs"] }),
  });
}

// ─── Streak ───

export function useStreak() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["streak", user?.id],
    enabled: !!user,
    queryFn: async () => {
      // Fetch last 90 days of daily_log (meals) and workout_sessions
      const since = new Date();
      since.setDate(since.getDate() - 90);
      const sinceStr = since.toISOString().split("T")[0];

      const [logRes, workoutRes] = await Promise.all([
        supabase
          .from("daily_log")
          .select("date, meals")
          .eq("user_id", user!.id)
          .gte("date", sinceStr),
        supabase
          .from("workout_sessions")
          .select("date")
          .eq("user_id", user!.id)
          .gte("date", sinceStr),
      ]);

      if (logRes.error) throw logRes.error;
      if (workoutRes.error) throw workoutRes.error;

      // Days with at least 1 meal
      const mealDays = new Set(
        (logRes.data || [])
          .filter(r => {
            const meals = r.meals as unknown as any[];
            return Array.isArray(meals) && meals.length > 0;
          })
          .map(r => r.date)
      );

      // Days with at least 1 workout session
      const workoutDays = new Set((workoutRes.data || []).map(r => r.date));

      // Count consecutive days going backwards from yesterday
      // (today might still be in progress, so start from yesterday)
      let streak = 0;
      const d = new Date();
      d.setDate(d.getDate() - 1);

      // But if today already qualifies, check today first
      const todayStr = today();
      if (mealDays.has(todayStr) && workoutDays.has(todayStr)) {
        streak = 1;
        // still check backwards from yesterday
      } else {
        // Check if today is still "in progress" — don't break streak
        // Start counting from yesterday
      }

      for (let i = 0; i < 90; i++) {
        const checkDate = new Date();
        checkDate.setDate(checkDate.getDate() - 1 - i);
        const ds = checkDate.toISOString().split("T")[0];
        if (mealDays.has(ds) && workoutDays.has(ds)) {
          streak++;
        } else {
          break;
        }
      }

      return streak;
    },
  });
}

// ─── Weekly Summary ───

export interface WeeklySummary {
  totalCalories: number;
  avgCaloriesPerDay: number;
  workoutsCompleted: number;
  weightChange: number | null; // kg, negative = lost
  daysLogged: number;
}

export function useWeeklySummary() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["weekly-summary", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const now = new Date();
      const dayOfWeek = now.getDay(); // 0=Sun
      const mondayOffset = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
      const weekStart = new Date(now);
      weekStart.setDate(now.getDate() - mondayOffset);
      const weekStartStr = weekStart.toISOString().split("T")[0];
      const todayStr = now.toISOString().split("T")[0];

      const [logRes, workoutRes, weightRes] = await Promise.all([
        supabase
          .from("daily_log")
          .select("date, calories_total, meals")
          .eq("user_id", user!.id)
          .gte("date", weekStartStr)
          .lte("date", todayStr),
        supabase
          .from("workout_sessions")
          .select("id")
          .eq("user_id", user!.id)
          .gte("date", weekStartStr)
          .lte("date", todayStr),
        supabase
          .from("weight_logs")
          .select("date, weight_kg")
          .eq("user_id", user!.id)
          .gte("date", weekStartStr)
          .lte("date", todayStr)
          .order("date", { ascending: true }),
      ]);

      if (logRes.error) throw logRes.error;
      if (workoutRes.error) throw workoutRes.error;
      if (weightRes.error) throw weightRes.error;

      const logs = logRes.data || [];
      const totalCalories = logs.reduce((s, r) => s + (Number(r.calories_total) || 0), 0);
      const daysLogged = logs.filter(r => {
        const meals = r.meals as unknown as any[];
        return Array.isArray(meals) && meals.length > 0;
      }).length;

      const weights = (weightRes.data || []).map(r => Number(r.weight_kg));
      let weightChange: number | null = null;
      if (weights.length >= 2) {
        weightChange = weights[weights.length - 1] - weights[0];
      }

      return {
        totalCalories,
        avgCaloriesPerDay: daysLogged > 0 ? Math.round(totalCalories / daysLogged) : 0,
        workoutsCompleted: (workoutRes.data || []).length,
        weightChange,
        daysLogged,
      } as WeeklySummary;
    },
  });
}
