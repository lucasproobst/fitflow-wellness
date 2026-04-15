import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { GlassCard } from "@/components/GlassCard";
import { RefreshCw } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import { toast } from "sonner";

const dayNames = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];
const shortDays = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
const mealTypes = ["breakfast", "lunch", "dinner", "snack"] as const;
const filters = ["All", "Vegetarian", "Low-carb", "High-protein"];

interface Meal {
  name: string;
  description: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
}

interface DayPlan {
  day: string;
  meals: Record<string, Meal>;
}

interface MealPlanData {
  days: DayPlan[];
}

function getWeekStart() {
  const today = new Date();
  const dayOfWeek = today.getDay();
  const monday = new Date(today);
  monday.setDate(today.getDate() - ((dayOfWeek + 6) % 7));
  return monday.toISOString().split("T")[0];
}

export default function DietPlan() {
  const [selectedDay, setSelectedDay] = useState(0);
  const [activeFilter, setActiveFilter] = useState("All");
  const { user } = useAuth();
  const qc = useQueryClient();

  const { data: planData, isLoading } = useQuery({
    queryKey: ["meal-plan", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const weekStart = getWeekStart();
      const { data, error } = await supabase
        .from("meal_plans")
        .select("plan_data")
        .eq("user_id", user!.id)
        .eq("week_start", weekStart)
        .maybeSingle();
      if (error) throw error;
      return (data?.plan_data as unknown) as MealPlanData | null;
    },
  });

  const generate = useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase.functions.invoke("generate-meal-plan");
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      return data as MealPlanData;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["meal-plan"] });
      toast.success("Meal plan generated!");
    },
    onError: (err: any) => {
      toast.error(err.message || "Failed to generate plan");
    },
  });

  const currentDay = planData?.days?.[selectedDay];

  return (
    <div className="px-4 lg:px-8 py-6 max-w-4xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-foreground">Meal Plan</h1>
          <p className="text-sm text-foreground/50">Your personalized weekly plan</p>
        </div>
        <button
          onClick={() => generate.mutate()}
          disabled={generate.isPending}
          className="flex items-center gap-2 px-4 py-2 rounded-full bg-fitflow-primary text-white text-xs font-semibold active:scale-95 transition-all disabled:opacity-50"
        >
          <RefreshCw size={14} className={generate.isPending ? "animate-spin" : ""} />
          {generate.isPending ? "Generating..." : planData ? "Regenerate" : "Generate Plan"}
        </button>
      </div>

      {/* Day selector */}
      <div className="flex gap-2 mb-4 overflow-x-auto pb-2">
        {shortDays.map((d, i) => (
          <button
            key={d}
            onClick={() => setSelectedDay(i)}
            className={`px-4 py-2 rounded-full text-xs font-semibold whitespace-nowrap transition-all active:scale-95 ${
              selectedDay === i
                ? "bg-fitflow-primary text-white"
                : "border border-white/10 text-foreground/50 hover:bg-white/5"
            }`}
          >
            {d}
          </button>
        ))}
      </div>

      {/* Filters */}
      <div className="flex gap-2 mb-6 overflow-x-auto pb-2">
        {filters.map(f => (
          <button
            key={f}
            onClick={() => setActiveFilter(f)}
            className={`px-3 py-1.5 rounded-full text-[10px] font-medium uppercase tracking-wider transition-all active:scale-95 ${
              activeFilter === f
                ? "bg-fitflow-accent/20 text-fitflow-accent"
                : "border border-white/10 text-foreground/40 hover:bg-white/5"
            }`}
          >
            {f}
          </button>
        ))}
      </div>

      {/* Loading */}
      {(isLoading || generate.isPending) && !planData && (
        <div className="space-y-3">
          {[1, 2, 3, 4].map(i => (
            <div key={i} className="glass-card p-4 space-y-3">
              <div className="h-3 w-16 bg-white/5 rounded animate-pulse" />
              <div className="h-4 w-48 bg-white/5 rounded animate-pulse" />
              <div className="h-3 w-64 bg-white/5 rounded animate-pulse" />
              <div className="flex gap-4">
                <div className="h-3 w-12 bg-white/5 rounded animate-pulse" />
                <div className="h-3 w-12 bg-white/5 rounded animate-pulse" />
                <div className="h-3 w-12 bg-white/5 rounded animate-pulse" />
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Empty state */}
      {!isLoading && !generate.isPending && !planData && (
        <GlassCard className="py-12 text-center">
          <p className="text-foreground/40 text-sm mb-4">No meal plan yet</p>
          <button
            onClick={() => generate.mutate()}
            className="px-6 py-3 rounded-xl bg-fitflow-primary text-white text-sm font-semibold active:scale-95 transition-all"
          >
            Generate Your Plan
          </button>
        </GlassCard>
      )}

      {/* Meals */}
      {currentDay && (
        <div className="space-y-3">
          {mealTypes.map(type => {
            const meal = currentDay.meals?.[type];
            if (!meal) return null;
            return (
              <GlassCard key={type}>
                <div className="flex items-center justify-between mb-2">
                  <span className="label-style text-[10px]">{type.toUpperCase()}</span>
                  <span className="text-sm font-semibold text-fitflow-accent">{meal.calories} cal</span>
                </div>
                <p className="text-sm font-semibold text-foreground mb-1">{meal.name}</p>
                <p className="text-xs text-foreground/50 mb-3">{meal.description}</p>
                <div className="flex items-center justify-between">
                  <div className="flex gap-4">
                    {[
                      { l: "P", v: meal.protein },
                      { l: "C", v: meal.carbs },
                      { l: "F", v: meal.fat },
                    ].map(m => (
                      <div key={m.l} className="text-center">
                        <span className="text-[10px] text-foreground/30 uppercase">{m.l}</span>
                        <p className="text-xs font-semibold text-foreground">{m.v}g</p>
                      </div>
                    ))}
                  </div>
                  <button className="px-3 py-1 rounded-full border border-white/10 text-[10px] uppercase tracking-wider font-medium text-foreground/50 hover:bg-white/5 active:scale-95 transition-all">
                    Swap
                  </button>
                </div>
              </GlassCard>
            );
          })}
        </div>
      )}
    </div>
  );
}
