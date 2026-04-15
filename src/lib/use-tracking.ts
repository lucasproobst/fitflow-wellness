import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";

function today() {
  return new Date().toISOString().split("T")[0];
}

// ─── Daily Log ───

export interface DailyLogMeal {
  name: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
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
